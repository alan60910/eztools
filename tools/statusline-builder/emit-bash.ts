/**
 * S5-T2.4（magi/05-statusline-builder/PLAN.md §產生器契約 1–12／§格式化
 * 對等規則／§D2／.t23-report §5 join 藍本）：emit-bash 產生器——吃
 * BuilderConfig＋descriptor catalog，吐**自足** bash 腳本字串。產出腳本
 * 執行後 stdout 與 `emit-ansi.toAnsi(resolve(config, scenario))` byte-exact
 * （SP-5 已證此可行；本檔的 join 演算法照 sp5/join.sh 同語意展開）。
 *
 * ── 契約落點對照 ──
 * 1  讀入：`input=$(cat)`。
 * 2  jq 缺件：`command -v jq` 失敗 → 提示字串＋`exit 0`。**僅在有 jq
 *    消費段（非 shell-out）啟用時 emit 此守衛**（契約 10 最小化精神；
 *    純 shell-out／空 config 不需 jq，不應誤判空白）。
 * 3  null 三態 idiom（依 descriptor.nullPolicy）：
 *    - dash（百分比）：jq `// "--"`＋number 分支顯示 `⌊p⌋%`；桶索引另一
 *      jq，`-1` 哨值由 bash 分流（bash 零數學）。
 *    - hide／empty：jq `// empty`＋bash `[ -n "$v" ]` 剔段（false 亦被
 *      jq `//` 剔除——thinking 同構）。
 * 4  執行期兩趟 join（平行陣列 texts/fgs/bgs 或 texts/fgs/segstart）：
 *    第一趟依啟用段序 push 存活者；第二趟逐 run 拼
 *    `ESC[0m + fg + bg + text`（stateless、fg 先 bg）、powerline 箭頭
 *    fg=前段bg/bg=後段bg＋cap 兩態、plain 分隔符、行尾無條件 reset。
 * 5  閾值：桶索引 jq floor＋clamp；powerline 成對 auto-fg 陣列 emit 期
 *    預算、執行期只索引（bash 零亮度數學）。
 * 6  escaping：使用者文字（prefix／custom separator）以 bash 單引號
 *    context 嵌入，`'`→`'\''`；jq 程式與使用者文字皆不進 `printf` 格式
 *    位（輸出 `printf '%s' "$out"`，$out 在引數位）。
 * 7  ESC=$'\033'；ansi256 `38;5;n`／`48;5;n`、truecolor `38;2;r;g;b`。
 * 9  exit-0 不變量：禁 `set -e`；每個 shell-out `… 2>/dev/null || true`；
 *    結尾顯式 `exit 0`。
 * 10 shell-out 最小化：僅啟用段 emit 對應呼叫；jq 守衛條件 emit（見 2）。
 * 12 時間（resets_at HH:mm）：percent-reset variant 段於主值後 emit resets
 *    後綴——jq `strflocaltime("%H:%M")` 直吃 epoch（.t26 定案，jq 1.8.1
 *    可用），`type=="number"→" (HH:mm)"`、否則 ''（鏡像 resetsAtSuffix／
 *    emit-ps1 Format-ResetsAt；三後端同機同 TZ 一致）。後綴附於 value 部、
 *    與主值 dash 正交（`-- (HH:mm)`），閾值分裂時隨值色。
 *
 * 純函式、零 DOM import，node 可測。與 emit-ps1（T2.5）為平行後端、互不
 * 依賴；兩者共用 color.ts 的 SGR 建構規則與 resolve/segments/threshold
 * 的取值語意單一來源。
 */
import { autoFg, colorSgrParams, type ColorSpec } from './color.js'
import type { BuilderConfig, SegmentConfig } from './config.js'
import { POWERLINE_ARROW } from './resolve.js'
import { defaultVariant, type FormatKind, type SegmentDescriptor } from './segments.js'
import { autoFgBuckets, type ThresholdRule } from './threshold.js'

/** emitBash 的 descriptor 注入面（呼叫端傳 segments.ts 的 DESCRIPTORS_BY_ID）。 */
export type SegmentDescriptorCatalog = Readonly<Record<string, SegmentDescriptor>>

/** jq 缺件時的單行提示（ASCII，任何終端可讀；contract 2）。 */
export const JQ_MISSING_HINT = 'statusline: jq not found - install jq: https://jqlang.github.io/jq/'

// ── escaping／SGR 字面 helper ──

/** bash 單引號 context 逸出（契約 6）：`'`→`'\''`，其餘（含 `$`/`` ` ``/`!`/`\`/`%`/`"`）字面。 */
function bashSingleQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`
}

/** SGR 參數段（`38;5;16` 等）→ bash 單引號字面；空字串（default）→ `''`。 */
function sgrLit(params: string): string {
  return `'${params}'`
}

/** ColorSpec → fg SGR 參數段（`38;5;n`／`38;2;r;g;b`）；default → ''（不 emit）。 */
function fgParams(spec: ColorSpec): string {
  return colorSgrParams(spec, 'fg') ?? ''
}

/**
 * ColorSpec → bg／箭頭參數「尾」（`5;n`／`2;r;g;b`）：同一尾可派生段 bg
 * `48;<尾>`、箭頭 fg `38;<尾>`（前段）與 bg `48;<尾>`（後段）。default → ''。
 */
function sgrTail(spec: ColorSpec): string {
  const params = colorSgrParams(spec, 'bg')
  return params === null ? '' : params.slice(params.indexOf(';') + 1)
}

/** powerline 段主色的 fg：fgOverride 優先、否則 auto-fg（D2；default → ''）。 */
function powerlineMainFg(seg: SegmentConfig): string {
  return fgParams(seg.fgOverride ?? autoFg(seg.color))
}

/** bash 陣列字面 `name=('a' 'b' …)`（元素單引號；SGR 參數不含 `'`）。 */
function bashArray(name: string, elems: readonly string[]): string {
  return `${name}=(${elems.map((e) => `'${e}'`).join(' ')})`
}

// ── 格式化 jq 尾段（§格式化對等規則；bash 零數學、全 jq 產出最終字串） ──

/**
 * FormatKind → 接在 `<jqPath> // empty` 之後的 jq 尾段（含前導 ` | `；
 * 'text'／path-full 為空字串）。percentage／dirty／clock 不走此函式
 * （dash 政策／shell-out 另處理）。variant 僅 path 需要。
 *
 * 補尾零 cost idiom（`+10⁴→tostring→切片`）、duration 整數除法三階、
 * context-size M/k 門檻、lines-changed、pr/repo 皆為 §格式化對等規則
 * 的 jq 端鏡像；SP-5 §6 實測 cost idiom byte-exact。
 */
function jqFormatSuffix(format: FormatKind, variant: string | undefined): string {
  switch (format) {
    case 'text':
      return ''
    case 'path':
      if (variant === 'basename') {
        // JS `p.split(/[\\/]+/).filter(x=>x!=='')` 的 jq 鏡像；全分隔 → 原值。
        // 分隔 regex 需四層跳脫：JS `\\\\\\\\`（8）→ .sh 字面 `\\\\`（4）→ jq
        // 字串解為 `\\`（2）→ oniguruma char-class `[/\\]` 收兩字元（`/`／`\`）。
        // 三層（.sh `\\`）會被 jq 解成 `[/\]`，`]` 遭跳脫 → char-class 不收口
        // （"premature end of char-class"）→ jq 出錯、段死。
        return ' | . as $p | ($p | split("[/\\\\\\\\]+"; "")) | map(select(. != "")) | if length > 0 then .[-1] else $p end'
      }
      if (variant === 'tilde') {
        // home 為空 → 原值；相等 → "~"；前綴（/ 或 \）→ "~"+尾段（jq slice 以
        // codepoint 計，ASCII home 與 JS UTF-16 一致；astral home 為已知邊界）。
        return ' | . as $p | (if $home == "" then $p elif $p == $home then "~" elif ($p | startswith($home + "/")) or ($p | startswith($home + "\\\\")) then "~" + $p[($home | length):] else $p end)'
      }
      return '' // full：原值
    case 'cost':
      // $⌊usd×10⁴⌋ 插點、4 位補尾零、負值 clamp 0（§格式化對等規則；SP-5 §6）。
      return ' | (. * 10000 | floor) | (if . < 0 then 0 else . end) | ("$" + (. / 10000 | floor | tostring) + "." + ((. % 10000 + 10000) | tostring | .[1:]))'
    case 'duration':
      return ' | (. / 3600000 | floor) as $h | ((. / 60000 | floor) % 60) as $m | ((. / 1000 | floor) % 60) as $s | if $h > 0 then "\\($h)h\\($m)m" elif $m > 0 then "\\($m)m\\($s)s" else "\\($s)s" end'
    case 'context-size':
      return ' | (.total_input_tokens + .total_output_tokens) | if . >= 1000000 then ((. / 1000000 | floor | tostring) + "M") else ((. / 1000 | floor | tostring) + "k") end'
    case 'lines-changed':
      return ' | ("+" + (.total_lines_added | tostring) + "/-" + (.total_lines_removed | tostring))'
    case 'flag':
      // `// empty` 已剔 false/null；存活者恆 true → "on"（thinking）。
      return ' | "on"'
    case 'pr':
      return ' | ("#" + (.number | tostring))'
    case 'repo':
      return ' | (.owner + "/" + .name)'
    case 'percentage':
    case 'dirty':
    case 'clock':
      throw new TypeError(`jqFormatSuffix 不處理 ${format}（dash／shell-out 另處理）`)
  }
}

// ── 桶陣列預算（emit 期；執行期只索引，D2） ──

/** powerline 閾值：bg 尾陣列＋成對 auto-fg 參數陣列（fgOverride 存在時全桶用之）。 */
function powerlineBuckets(rule: ThresholdRule, fgOverride: ColorSpec | undefined): {
  bg: string[]
  fg: string[]
} {
  return {
    bg: rule.buckets.map(sgrTail),
    fg: autoFgBuckets(rule, fgOverride).map(fgParams),
  }
}

/** plain 閾值：桶色作 fg 參數陣列（plain 閾值套 fg，不套 bg）。 */
function plainBucketFg(rule: ThresholdRule): string[] {
  return rule.buckets.map(fgParams)
}

// ── 段內 head（prefix＋icon glyph；resolve composition 同源） ──

function segmentHead(seg: SegmentConfig, descriptor: SegmentDescriptor): string {
  const prefix = seg.prefix ?? ''
  const glyph = seg.icon ? `${descriptor.icon.glyph} ` : ''
  return prefix + glyph
}

// ── 單段 emission ──

interface Emitter {
  mode: BuilderConfig['mode']
}

/** 存活 push 一列（依 mode 決定平行陣列）。dynamic：value 在 `$v`；靜態則直接給 textExpr。 */
function pushLine(
  em: Emitter,
  textExpr: string,
  fg: string,
  bgOrSegstart: string,
): string {
  return em.mode === 'powerline'
    ? `texts+=(${textExpr}); fgs+=(${fg}); bgs+=(${bgOrSegstart})`
    : `texts+=(${textExpr}); fgs+=(${fg}); segstart+=(${bgOrSegstart})`
}

/**
 * head 非空 → `'<head>'<valueRef>`；head 空 → `<valueRef>`。valueRef 預設
 * `"$v"`；percentage 段掛 resets 後綴時傳 `"$v$sfx"`（值＋後綴同 run）。
 */
function textDynamic(headLit: string, valueRef = '"$v"'): string {
  return headLit === '' ? valueRef : `${headLit}${valueRef}`
}

function emitSegment(
  seg: SegmentConfig,
  descriptor: SegmentDescriptor,
  em: Emitter,
): string[] {
  const lines: string[] = []
  const head = segmentHead(seg, descriptor)
  const headLit = head === '' ? '' : bashSingleQuote(head)
  const mainFg = em.mode === 'powerline' ? powerlineMainFg(seg) : fgParams(seg.color)
  const mainBg = sgrTail(seg.color)
  // 段主色的 push 尾參（powerline：bg 尾；plain：segstart）。
  const mainTail = em.mode === 'powerline' ? sgrLit(mainBg) : '1'

  lines.push(`# ${descriptor.id}`)

  if (descriptor.category === 'shell-out') {
    if (descriptor.shellOut === undefined) {
      throw new TypeError(`shell-out 段缺 shellOut：${descriptor.id}`)
    }
    // 防禦包裹（契約 9）：非 git 目錄／date 失敗皆不傳播。
    lines.push(`v=$(${descriptor.shellOut.bash} 2>/dev/null || true)`)
    lines.push(`if [ -n "$v" ]; then`)
    // dirty＝存活即 '*'（$v 僅作非空判定）；其餘＝head+值。
    const textExpr = descriptor.format === 'dirty' ? bashSingleQuote(head + '*') : textDynamic(headLit)
    lines.push(`  ${pushLine(em, textExpr, sgrLit(mainFg), mainTail)}`)
    lines.push(`fi`)
    return lines
  }

  if (descriptor.category === 'percentage') {
    // dash 政策（null → '--' 不套閾值色）＋可選閾值。
    const dashProg = `${descriptor.jqPath} // "--" | if type == "number" then (floor | tostring) + "%" else . end`
    lines.push(`v=$(jq -r ${bashSingleQuote(dashProg)} <<<"$input")`)

    // resets 後綴（契約 12；variant 'percent-reset' 且 descriptor 有 resetsAt）：
    // 附於 value 部、與主值 dash 正交（`-- (HH:mm)`），閾值分裂時隨值色。jq
    // strflocaltime 直吃 epoch → 本地 HH:mm（.t26 定案；三後端同機同 TZ 一致）；
    // number → ` (HH:mm)`、null／缺席鏈 → ''（jq null 傳播不報錯，鏡像
    // resetsAtSuffix 語意）。與 emit-ps1 的 Format-ResetsAt 對照同構。
    const hasResets = descriptor.resetsAt !== undefined && seg.variant === 'percent-reset'
    let valueRef = '"$v"'
    if (hasResets) {
      const sfxProg = `${descriptor.resetsAt!.jqPath} | if type == "number" then " (" + strflocaltime("%H:%M") + ")" else "" end`
      lines.push(`sfx=$(jq -r ${bashSingleQuote(sfxProg)} <<<"$input")`)
      valueRef = '"$v$sfx"'
    }

    if (seg.threshold === undefined) {
      // 無閾值：單 run 主色（dash 與數值同色）。
      lines.push(pushLine(em, textDynamic(headLit, valueRef), sgrLit(mainFg), mainTail))
      return lines
    }

    // 有閾值：桶索引 jq（-1＝dash 哨值，bash 分流零數學）。
    const idxProg = `${descriptor.jqPath} | if type == "number" then ((. / 10 | floor) | (if . > 9 then 9 elif . < 0 then 0 else . end)) else -1 end`
    lines.push(`idx=$(jq -r ${bashSingleQuote(idxProg)} <<<"$input")`)

    if (em.mode === 'powerline') {
      const { bg, fg } = powerlineBuckets(seg.threshold, seg.fgOverride)
      lines.push(bashArray('tb', bg))
      lines.push(bashArray('tf', fg))
      lines.push(`if [ "$idx" = "-1" ]; then`)
      lines.push(`  ${pushLine(em, textDynamic(headLit, valueRef), sgrLit(mainFg), sgrLit(mainBg))}`)
      lines.push(`else`)
      lines.push(`  ${pushLine(em, textDynamic(headLit, valueRef), '"${tf[$idx]}"', '"${tb[$idx]}"')}`)
      lines.push(`fi`)
      return lines
    }

    // plain：桶色套 fg。head 非空且數值 → 分裂兩 run（head 主色、value 桶色）。
    lines.push(bashArray('tf', plainBucketFg(seg.threshold)))
    if (head !== '') {
      lines.push(`if [ "$idx" = "-1" ]; then`)
      lines.push(`  ${pushLine(em, textDynamic(headLit, valueRef), sgrLit(mainFg), '1')}`)
      lines.push(`else`)
      lines.push(`  ${pushLine(em, headLit, sgrLit(mainFg), '1')}`)
      lines.push(`  ${pushLine(em, valueRef, '"${tf[$idx]}"', '0')}`)
      lines.push(`fi`)
      return lines
    }
    lines.push(`if [ "$idx" = "-1" ]; then`)
    lines.push(`  ${pushLine(em, valueRef, sgrLit(mainFg), '1')}`)
    lines.push(`else`)
    lines.push(`  ${pushLine(em, valueRef, '"${tf[$idx]}"', '1')}`)
    lines.push(`fi`)
    return lines
  }

  // always／conditional（hide／empty 政策）：jq `// empty`＋格式尾＋剔空。
  const variant = seg.variant ?? defaultVariant(descriptor)
  const suffix = jqFormatSuffix(descriptor.format, variant)
  const prog = `${descriptor.jqPath} // empty${suffix}`
  const needsHome = descriptor.format === 'path' && variant === 'tilde'
  const argHome = needsHome ? '--arg home "$HOME" ' : ''
  lines.push(`v=$(jq -r ${argHome}${bashSingleQuote(prog)} <<<"$input")`)
  lines.push(`if [ -n "$v" ]; then`)
  lines.push(`  ${pushLine(em, textDynamic(headLit), sgrLit(mainFg), mainTail)}`)
  lines.push(`fi`)
  return lines
}

// ── join 段（第二趟；oracle emission 規則的機械展開，.t23 §5） ──

function joinPowerline(lastArrowCap: boolean): string[] {
  const lines = [
    'out=""',
    'n=${#texts[@]}',
    'for ((i = 0; i < n; i++)); do',
    '  if [ "$i" -gt 0 ]; then',
    '    out+="${ESC}[0m"',
    '    if [ -n "${bgs[$((i - 1))]}" ]; then out+="${ESC}[38;${bgs[$((i - 1))]}m"; fi',
    '    if [ -n "${bgs[$i]}" ]; then out+="${ESC}[48;${bgs[$i]}m"; fi',
    '    out+="$ARROW"',
    '  fi',
    '  out+="${ESC}[0m"',
    '  if [ -n "${fgs[$i]}" ]; then out+="${ESC}[${fgs[$i]}m"; fi',
    '  if [ -n "${bgs[$i]}" ]; then out+="${ESC}[48;${bgs[$i]}m"; fi',
    '  out+="${texts[$i]}"',
    'done',
  ]
  if (lastArrowCap) {
    // 收尾箭頭：fg=末段bg、bg 缺席＝對終端底色（Q1）。
    lines.push(
      'if [ "$n" -gt 0 ]; then',
      '  out+="${ESC}[0m"',
      '  if [ -n "${bgs[$((n - 1))]}" ]; then out+="${ESC}[38;${bgs[$((n - 1))]}m"; fi',
      '  out+="$ARROW"',
      'fi',
    )
  }
  lines.push('out+="${ESC}[0m"')
  return lines
}

function joinPlain(): string[] {
  // 分隔符插於段首 run（segstart==1）之前、i>0、SEP 非空（無 leading/trailing/雙分隔）。
  return [
    'out=""',
    'n=${#texts[@]}',
    'for ((i = 0; i < n; i++)); do',
    '  if [ "$i" -gt 0 ] && [ "${segstart[$i]}" = "1" ] && [ -n "$SEP" ]; then',
    '    out+="${ESC}[0m${SEP}"',
    '  fi',
    '  out+="${ESC}[0m"',
    '  if [ -n "${fgs[$i]}" ]; then out+="${ESC}[${fgs[$i]}m"; fi',
    '  out+="${texts[$i]}"',
    'done',
    'out+="${ESC}[0m"',
  ]
}

// ── 產生器主體 ──

/**
 * BuilderConfig＋descriptor catalog → 自足 bash 腳本字串（UTF-8、LF、
 * 尾隨換行）。未知 segment id＝programmer error（config 應先經
 * deserializeConfig 對真 catalog 清洗）→ TypeError（對齊 resolve）。
 */
export function emitBash(config: BuilderConfig, catalog: SegmentDescriptorCatalog): string {
  const enabled = config.segments.filter((seg) => seg.enabled)
  const resolved = enabled.map((seg) => {
    const descriptor = catalog[seg.id]
    if (descriptor === undefined) {
      throw new TypeError(`未知 segment id：${seg.id}（config 應先經 deserializeConfig 清洗）`)
    }
    return { seg, descriptor }
  })
  const needsJq = resolved.some(({ descriptor }) => descriptor.category !== 'shell-out')
  const em: Emitter = { mode: config.mode }

  const out: string[] = []
  out.push('#!/usr/bin/env bash')
  out.push(`# Claude Code statusline（${config.mode} 模式）— 由 EZTools statusline-builder 產生。`)
  out.push('# 讀取 stdin 的 session JSON、輸出單行狀態列；自足腳本，可置於')
  out.push('# ~/.claude/ 並於 settings.json 的 statusLine.command 指向之。')
  if (needsJq) out.push('# 需要 jq（https://jqlang.github.io/jq/）。')
  out.push('')
  // 契約 1：讀入。
  out.push('input=$(cat)')
  // 契約 2：jq 缺件守衛（僅在有 jq 消費段時 emit）。
  if (needsJq) {
    out.push('if ! command -v jq >/dev/null 2>&1; then')
    out.push(`  printf '%s' ${bashSingleQuote(JQ_MISSING_HINT)}`)
    out.push('  exit 0')
    out.push('fi')
  }
  out.push('')
  // 契約 7：ANSI 組碼常數。
  out.push("ESC=$'\\033'")
  if (config.mode === 'powerline') out.push(`ARROW=${bashSingleQuote(POWERLINE_ARROW)}`)
  if (config.mode === 'plain') out.push(`SEP=${bashSingleQuote(config.separator.value)}`)
  out.push('')
  // 平行陣列（第一趟累加器）。
  out.push('texts=()')
  out.push('fgs=()')
  if (config.mode === 'powerline') out.push('bgs=()')
  if (config.mode === 'plain') out.push('segstart=()')
  out.push('')
  out.push('# ── 段求值（第一趟：存活段 push） ──')
  for (const { seg, descriptor } of resolved) {
    out.push(...emitSegment(seg, descriptor, em))
  }
  out.push('')
  out.push('# ── join（第二趟：逐 run 拼接） ──')
  out.push(...(config.mode === 'powerline' ? joinPowerline(config.lastArrowCap) : joinPlain()))
  out.push('')
  // 契約 6：使用者文字不進格式位——$out 在引數位。契約 9：結尾顯式 exit 0。
  out.push(`printf '%s' "$out"`)
  out.push('exit 0')

  return `${out.join('\n')}\n`
}
