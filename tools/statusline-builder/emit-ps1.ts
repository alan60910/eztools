/**
 * S5-T2.5（magi/05-statusline-builder/PLAN.md §產生器契約 1–12＋§格式化
 * 對等規則 ps1 面／.t23-report §5 join 虛擬碼＋§7 ps1 實測＋sp5/join.ps1
 * 藍本）：emitPs1——BuilderConfig → 自足 `.ps1` 腳本文字。
 *
 * 產生器分工（emit 期 vs 執行期）：色值／autoFg／閾值桶陣列／glyph 碼位／
 * 前綴 escaping 全在 **emit 期以 TS 單源預算**（與 resolve.ts／emit-ansi
 * oracle 同一 color.ts 建構規則）；產出腳本執行期只做——取值、null 政策
 * 分流、數值格式化（帶 `[double]` 轉型）、閾值桶索引查表、二趟 join。
 * 目標：`emitPs1(config)` 產出的 `.ps1` 之 stdout 與
 * `emit-ansi.toAnsi(resolve(config, data))` **byte-exact**（SP-5 已證兩
 * shell 同構可實作；本檔為其產生器化）。
 *
 * ── PS 5.1 底線（契約 7／8／9；.t15＋.t23 §7 實證）──
 * - 檔頭三行：`[Console]::InputEncoding`／`OutputEncoding` 皆
 *   `UTF8Encoding($false)`（無 BOM 輸出＋stdin CJK 無損）＋`$e=[char]27`。
 * - 讀入：`[Console]::In.ReadToEnd() | ConvertFrom-Json`（契約 1）。
 * - 禁 `?:`／`??`／`?.`；**不得 Set-StrictMode**（缺席屬性鏈須靜默 $null）；
 *   null 判定一律顯式 `$null -eq/-ne`（0% 不可被 truthiness 誤殺）。
 * - 數值取值 `[double]` 轉型**於 `$null` 判定之後**（PS 5.1
 *   ConvertFrom-Json 小數回 Decimal，`0.0029×10⁴` Decimal floor=29≠
 *   double=28；`[double]$null=0` 會誤殺 null——.t23 §7）。
 * - 結尾顯式 `exit 0`（覆蓋 git 原生 `$LASTEXITCODE` 洩漏；try/catch 僅
 *   管 cmdlet／解析例外面）。
 * - 輸出 `[Console]::Out.Write($out)`（無換行、無 BOM）。
 *
 * ── escaping（契約 6）──
 * 使用者文字（前綴、自訂分隔符）走**單引號 context**：`'`→`''`；`$()`／
 * backtick 於單引號內不插值（emit-ps1.test.ts 以 `$(...)` 對抗案實證
 * 走單引號非雙引號）。glyph／CJK 以 UTF-8 字面嵌入（檔案 BOM 保 parser
 * 正確解讀——契約 8）。
 *
 * 純函式、零 DOM import，node 可測。
 */
import { autoFg, colorSgrParams, type ColorSpec } from './color.js'
import type { BuilderConfig, SegmentConfig } from './config.js'
import type { FormatKind, SegmentDescriptor } from './segments.js'
import { autoFgBuckets, type ThresholdRule } from './threshold.js'

/** emitPs1 的目錄注入面＝descriptor by id（resolve 用的 DESCRIPTORS_BY_ID 直接可餵）。 */
export type SegmentDescriptorCatalog = Readonly<Record<string, SegmentDescriptor>>

// ── ps1 片段小工具（emit 期字串建構） ──

/** 使用者文字 → ps1 單引號字面（契約 6：`'`→`''`；`$()`／backtick 不插值）。 */
function psSingleQuote(s: string): string {
  return `'${s.replace(/'/g, "''")}'`
}

/**
 * ColorSpec → SGR「尾」（`5;226`／`2;r;g;b`；default→''）——箭頭交接以
 * `38;<尾>`／`48;<尾>` 派生（.t23 §5 儲存形約定）。
 */
function bgTail(spec: ColorSpec): string {
  const params = colorSgrParams(spec, 'bg')
  return params === null ? '' : params.slice(3) // 去 '48;'
}

/** 已知 SGR 參數 → ps1 雙引號內片段 `$e[<params>m`（"$e[…" 插值安全，.t23 §7）。 */
function sgrLit(params: string | null): string {
  return params === null ? '' : `$e[${params}m`
}

/**
 * reset＋fg＋bg 常數前綴的 ps1 雙引號字面 `"$e[0m…"`（fg 先 bg、default
 * 不 emit——emit-ansi 規則 1／2／4 的產生器面）。fg/bg 為 null 時該層略過。
 */
function styledPrefix(fg: ColorSpec | null, bg: ColorSpec | null): string {
  const fgParams = fg !== null ? colorSgrParams(fg, 'fg') : null
  const bgParams = bg !== null ? colorSgrParams(bg, 'bg') : null
  return `"$e[0m${sgrLit(fgParams)}${sgrLit(bgParams)}"`
}

/** ps1 運算式串接（去空片段，以 ` + ` 連）；全空 → 空字串字面。 */
function concatExpr(parts: readonly string[]): string {
  const nonEmpty = parts.filter((p) => p !== '')
  return nonEmpty.length === 0 ? "''" : nonEmpty.join(' + ')
}

/** ps1 陣列字面 `@('a', 'b', …)`（元素為 SGR 參數，無特殊字元）。 */
function psArray(items: readonly string[]): string {
  return `@(${items.map((s) => `'${s}'`).join(', ')})`
}

// ── 段內 emit-time 素材 ──

/** 段前綴＋icon glyph（emit 期常數；plain 閾值分裂時 head 另成 run）。 */
function segmentHead(seg: SegmentConfig, descriptor: SegmentDescriptor): string {
  const prefix = seg.prefix ?? ''
  const icon = seg.icon ? `${descriptor.icon.glyph} ` : ''
  return prefix + icon
}

/** head → ps1 單引號字面片段（空 head→''，concatExpr 會濾除）。 */
function headExpr(seg: SegmentConfig, descriptor: SegmentDescriptor): string {
  const head = segmentHead(seg, descriptor)
  return head === '' ? '' : psSingleQuote(head)
}

/** powerline 段主色（bg）；plain 不設 bg。 */
function segBg(mode: BuilderConfig['mode'], seg: SegmentConfig): ColorSpec | null {
  return mode === 'powerline' ? seg.color : null
}

/** powerline 非閾值段的 fg：fgOverride ?? autoFg(段主色)；plain fg＝段主色。 */
function segFg(mode: BuilderConfig['mode'], seg: SegmentConfig): ColorSpec | null {
  if (mode === 'powerline') return seg.fgOverride ?? autoFg(seg.color)
  return seg.color
}

// ── 產生器狀態 ──

interface EmitState {
  mode: BuilderConfig['mode']
  /** 已用之 helper 函式名（emit 期收斂，只印用到的）。 */
  helpers: Set<string>
  /** 閾值段常數陣列宣告（依 emit 序）。 */
  thresholdDecls: string[]
  /** 下一個閾值段的陣列名索引。 */
  thresholdCount: number
}

/** 閾值段 → 常數陣列名＋宣告（plain＝桶 fg 陣列；powerline＝桶 bg 尾＋成對 auto-fg fg）。 */
function declareThreshold(state: EmitState, rule: ThresholdRule, fgOverride: ColorSpec | undefined): {
  fgVar: string
  bgVar: string | null
} {
  const k = state.thresholdCount++
  const fgVar = `$Th${k}Fg`
  if (state.mode === 'powerline') {
    const bgVar = `$Th${k}Bg`
    const bgTails = rule.buckets.map((b) => bgTail(b))
    const fgParams = autoFgBuckets(rule, fgOverride).map((f) => colorSgrParams(f, 'fg') ?? '')
    state.thresholdDecls.push(`${bgVar} = ${psArray(bgTails)}`)
    state.thresholdDecls.push(`${fgVar} = ${psArray(fgParams)}`)
    return { fgVar, bgVar }
  }
  // plain：桶色作 fg
  const fgParams = rule.buckets.map((b) => colorSgrParams(b, 'fg') ?? '')
  state.thresholdDecls.push(`${fgVar} = ${psArray(fgParams)}`)
  return { fgVar, bgVar: null }
}

// ── helper 函式庫（只印用到的；契約沉默處：與 segments.ts 格式器同語意） ──

const HELPER_BODIES: Readonly<Record<string, string>> = {
  // cost：單次浮點乘 floor＋clamp0，其後全整數＋「+10⁴→切片」補尾零。
  // [double] 轉型恢復「同一 JSON number→同一 double」同構（.t23 §7）。
  'Format-Cost': [
    'function Format-Cost($c) {',
    '  $s = [long][math]::Floor([double]$c * 10000)',
    '  if ($s -lt 0) { $s = 0 }',
    '  $w = [long][math]::Floor($s / 10000)',
    "  $f = ([string]($s % 10000 + 10000)).Substring(1)",
    "  return '$' + $w + '.' + $f",
    '}',
  ].join('\n'),
  // duration：整數除法 h/m/s 三階（[double] 轉型避 Decimal 分岔）。
  'Format-Duration': [
    'function Format-Duration($ms) {',
    '  $x = [double]$ms',
    '  $h = [long][math]::Floor($x / 3600000)',
    '  $m = [long][math]::Floor($x / 60000) % 60',
    '  $s = [long][math]::Floor($x / 1000) % 60',
    "  if ($h -gt 0) { return [string]$h + 'h' + [string]$m + 'm' }",
    "  if ($m -gt 0) { return [string]$m + 'm' + [string]$s + 's' }",
    "  return [string]$s + 's'",
    '}',
  ].join('\n'),
  // context-size：in+out 總和 → ≥10⁶ M else k。
  'Format-ContextSize': [
    'function Format-ContextSize($node) {',
    '  $n = [double]$node.total_input_tokens + [double]$node.total_output_tokens',
    "  if ($n -ge 1000000) { return ([string][long][math]::Floor($n / 1000000)) + 'M' }",
    "  return ([string][long][math]::Floor($n / 1000)) + 'k'",
    '}',
  ].join('\n'),
  // lines-changed：+A/-R 原整數。
  'Format-Lines': [
    'function Format-Lines($node) {',
    "  return '+' + [string]$node.total_lines_added + '/-' + [string]$node.total_lines_removed",
    '}',
  ].join('\n'),
  // pr：#<number>。
  'Format-Pr': [
    'function Format-Pr($node) {',
    "  return '#' + [string]$node.number",
    '}',
  ].join('\n'),
  // repo：<owner>/<name>。
  'Format-Repo': [
    'function Format-Repo($node) {',
    "  return [string]$node.owner + '/' + [string]$node.name",
    '}',
  ].join('\n'),
  // resets_at 後綴（契約 12：DateTimeOffset.FromUnixTimeSeconds→本地 HH:mm）。
  'Format-ResetsAt': [
    'function Format-ResetsAt($epoch) {',
    "  if ($null -eq $epoch) { return '' }",
    '  $t = [DateTimeOffset]::FromUnixTimeSeconds([long]$epoch).ToLocalTime()',
    "  return ' (' + $t.ToString('HH:mm') + ')'",
    '}',
  ].join('\n'),
}

function useHelper(state: EmitState, name: string): void {
  state.helpers.add(name)
}

// ── 存活判定 idiom（isValueDead 同語意；型別敏感——0 為費用/百分比合法值） ──

/**
 * hide/empty 政策段的存活條件（isValueDead 三後端同構）：字串段 null/''
 * 死；boolean flag 段僅 true 存活；其餘（number/node）僅 null 死（0 存活）。
 * PS `0 -eq $false` 為真——故不可用單一 `-ne $false` 濾 number（會誤殺 0）。
 */
function aliveGuard(format: FormatKind): string {
  switch (format) {
    case 'text':
    case 'path':
      return "$null -ne $v -and $v -ne ''"
    case 'flag':
      return '$v -eq $true'
    default:
      return '$null -ne $v'
  }
}

// ── 值格式化運算式（$v 已持有存活主值；回傳顯示字串運算式或多行前置） ──

interface ValueEmit {
  /** 設定 $disp 前需要的前置行（如 path basename 拆解）；已含縮排相對段內。 */
  pre: string[]
  /** 顯示值運算式（不含 head／suffix）。 */
  expr: string
}

/** 非百分比段的值格式化（契約沉默處：path variant emit 期特化）。 */
function valueEmit(state: EmitState, seg: SegmentConfig, descriptor: SegmentDescriptor): ValueEmit {
  switch (descriptor.format) {
    case 'text':
      return { pre: [], expr: '$v' }
    case 'cost':
      useHelper(state, 'Format-Cost')
      return { pre: [], expr: '(Format-Cost $v)' }
    case 'duration':
      useHelper(state, 'Format-Duration')
      return { pre: [], expr: '(Format-Duration $v)' }
    case 'context-size':
      useHelper(state, 'Format-ContextSize')
      return { pre: [], expr: '(Format-ContextSize $v)' }
    case 'lines-changed':
      useHelper(state, 'Format-Lines')
      return { pre: [], expr: '(Format-Lines $v)' }
    case 'pr':
      useHelper(state, 'Format-Pr')
      return { pre: [], expr: '(Format-Pr $v)' }
    case 'repo':
      useHelper(state, 'Format-Repo')
      return { pre: [], expr: '(Format-Repo $v)' }
    case 'flag':
      return { pre: [], expr: "'on'" }
    case 'path':
      return pathEmit(seg)
    default:
      // clock/dirty/percentage 不走此路徑（各有專屬 emit）。
      throw new TypeError(`valueEmit 不支援 format：${descriptor.format}`)
  }
}

/**
 * cwd path variant（full 原樣／basename 末節／tilde 縮 home＝$env:USERPROFILE）。
 * pre 行以段內基準縮排（呼叫端統一加段層縮排；巢狀相對再縮 2）。
 */
function pathEmit(seg: SegmentConfig): ValueEmit {
  const variant = seg.variant ?? 'full'
  if (variant === 'basename') {
    return {
      pre: [
        "$parts = @($v -split '[\\\\/]+' | Where-Object { $_ -ne '' })",
        '$pv = $v',
        'if ($parts.Count -gt 0) { $pv = $parts[$parts.Count - 1] }',
      ],
      expr: '$pv',
    }
  }
  if (variant === 'tilde') {
    return {
      pre: [
        '$hm = $env:USERPROFILE',
        '$pv = $v',
        "if ($hm -ne '') {",
        "  if ($v -eq $hm) { $pv = '~' }",
        "  elseif ($v.StartsWith($hm + '/') -or $v.StartsWith($hm + '\\')) { $pv = '~' + $v.Substring($hm.Length) }",
        '}',
      ],
      expr: '$pv',
    }
  }
  return { pre: [], expr: '$v' }
}

// ── 段 emit（第一趟：存活評估＋累加器 push） ──

function pushLines(
  state: EmitState,
  segExpr: string,
  bgTailExpr: string,
  indent: string,
): string[] {
  const out = [`${indent}$Segs += ${segExpr}`]
  if (state.mode === 'powerline') out.push(`${indent}$BgT += ${bgTailExpr}`)
  return out
}

/** shell-out 段（git-branch／git-dirty／clock）；命令防禦包裹＋exit-0 安全（契約 9／10）。 */
function emitShellOut(state: EmitState, seg: SegmentConfig, descriptor: SegmentDescriptor): string[] {
  const head = headExpr(seg, descriptor)
  const prefix = styledPrefix(segFg(state.mode, seg), segBg(state.mode, seg))
  const tail = `'${bgTail(seg.color)}'`
  const lines: string[] = [`# ${descriptor.id} — shell-out/${descriptor.nullPolicy}`]

  if (descriptor.id === 'clock') {
    // 恆存活（empty 政策、值恆非空）。
    lines.push("$ck = (Get-Date -Format 'HH:mm')")
    lines.push(`$disp = ${concatExpr([head, '$ck'])}`)
    lines.push(`$Segs += ${prefix} + $disp`)
    if (state.mode === 'powerline') lines.push(`$BgT += ${tail}`)
    return lines
  }

  const cmd = descriptor.shellOut!.ps1
  const isDirty = descriptor.format === 'dirty'
  const valueExpr = isDirty ? "'*'" : '$so'
  lines.push('$so = \'\'')
  lines.push(`try { $so = [string](& ${cmd} 2>$null | Select-Object -First 1) } catch { }`)
  // 存活守衛須顯式排 $null：命令無 stdout（乾淨 repo 的 git status／detached
  // ／unborn 的 git branch）時 pipeline 產生 AutomationNull，`[string]` 於此
  // 回 $null 非 ''（`[string]$null` 才是 ''）；而 PS `$null -ne ''` 為 $true，
  // 單用 `-ne ''` 會令空輸出誤存活（乾淨 repo 誤顯 '*'／detached 誤留空段）。
  // 與 emit-bash `[ -n "$v" ]`／oracle isValueDead('') 對齊（T2.7 真執行實證）。
  lines.push("if ($null -ne $so -and $so -ne '') {")
  lines.push(`  $disp = ${concatExpr([head, valueExpr])}`)
  lines.push(`  $Segs += ${prefix} + $disp`)
  if (state.mode === 'powerline') lines.push(`  $BgT += ${tail}`)
  lines.push('}')
  return lines
}

/** 一般 hide/empty 段（text/path/cost/duration/context-size/lines/pr/repo/flag）。 */
function emitOther(state: EmitState, seg: SegmentConfig, descriptor: SegmentDescriptor): string[] {
  const head = headExpr(seg, descriptor)
  const prefix = styledPrefix(segFg(state.mode, seg), segBg(state.mode, seg))
  const tail = `'${bgTail(seg.color)}'`
  const { pre, expr } = valueEmit(state, seg, descriptor)
  const lines: string[] = [`# ${descriptor.id} — ${descriptor.category}/${descriptor.nullPolicy}`]
  lines.push(`$v = ${descriptor.ps1Path}`)
  lines.push(`if (${aliveGuard(descriptor.format)}) {`)
  for (const p of pre) lines.push(`  ${p}`)
  lines.push(`  $disp = ${concatExpr([head, expr])}`)
  lines.push(...pushLines(state, `${prefix} + $disp`, tail, '  '))
  lines.push('}')
  return lines
}

/** 百分比段（dash 政策；可掛閾值＋resets 後綴）。 */
function emitPercentage(state: EmitState, seg: SegmentConfig, descriptor: SegmentDescriptor): string[] {
  const head = headExpr(seg, descriptor)
  const tail = `'${bgTail(seg.color)}'`
  const hasThreshold = seg.threshold !== undefined
  const suffix =
    descriptor.resetsAt !== undefined && seg.variant === 'percent-reset'
      ? ((): string => {
          useHelper(state, 'Format-ResetsAt')
          return `(Format-ResetsAt ${descriptor.resetsAt!.ps1Path})`
        })()
      : ''
  const lines: string[] = [`# ${descriptor.id} — percentage/dash${hasThreshold ? '＋threshold' : ''}`]
  lines.push(`$v = ${descriptor.ps1Path}`)
  if (suffix !== '') lines.push(`$sfx = ${suffix}`)
  const sfxRef = suffix !== '' ? '$sfx' : ''

  if (!hasThreshold) {
    // 無閾值：dash 與數值同段主色。
    const prefix = styledPrefix(segFg(state.mode, seg), segBg(state.mode, seg))
    lines.push('if ($null -eq $v) {')
    lines.push(`  $vt = '--'`)
    lines.push('} else {')
    lines.push("  $vt = ([string][long][math]::Floor([double]$v)) + '%'")
    lines.push('}')
    lines.push(`$disp = ${concatExpr([head, '$vt', sfxRef])}`)
    lines.push(...pushLines(state, `${prefix} + $disp`, tail, ''))
    return lines
  }

  // 有閾值：dash → 段主色（不套閾值色）；數值 → 桶索引查表。
  const { fgVar, bgVar } = declareThreshold(state, seg.threshold!, seg.fgOverride)
  const dashPrefix = styledPrefix(segFg(state.mode, seg), segBg(state.mode, seg))
  lines.push('if ($null -eq $v) {')
  lines.push(`  $disp = ${concatExpr([head, "'--'", sfxRef])}`)
  lines.push(`  $Segs += ${dashPrefix} + $disp`)
  if (state.mode === 'powerline') lines.push(`  $BgT += ${tail}`)
  lines.push('} else {')
  lines.push('  $p = [double]$v')
  lines.push("  $vt = ([string][long][math]::Floor($p)) + '%'")
  lines.push('  $idx = [long][math]::Floor($p / 10)')
  lines.push('  if ($idx -gt 9) { $idx = 9 }')
  lines.push('  if ($idx -lt 0) { $idx = 0 }')

  if (state.mode === 'powerline') {
    lines.push(`  $fg = ${fgVar}[$idx]`)
    lines.push(`  $bg = ${bgVar}[$idx]`)
    lines.push('  $s = "$e[0m"')
    lines.push("  if ($fg -ne '') { $s += \"$e[\" + $fg + 'm' }")
    lines.push("  if ($bg -ne '') { $s += \"$e[48;\" + $bg + 'm' }")
    lines.push(`  $s += ${concatExpr([head, '$vt', sfxRef])}`)
    lines.push('  $Segs += $s')
    lines.push('  $BgT += $bg')
  } else {
    // plain 閾值：head 非空 → 兩 run（head 隨段主色 + reset、value 隨桶色）；
    // head 空 → 單 run（僅 value run 的前置 reset），與 oracle（resolve.ts
    // 175-178 單 run）＋bash（emit-bash.ts 274-278 pushLine reset='1'）同構。
    // 第二個 reset 收進 head!=='' 分支——head 空時勿補、否則多吐 ESC[0m 破
    // byte-exact（CR2 覆蓋盲區 #2）。
    const headPrefix = styledPrefix(seg.color, null)
    lines.push(`  $fg = ${fgVar}[$idx]`)
    if (head !== '') {
      lines.push(`  $s = ${headPrefix} + ${head}`)
      lines.push('  $s += "$e[0m"')
    } else {
      lines.push('  $s = "$e[0m"')
    }
    lines.push("  if ($fg -ne '') { $s += \"$e[\" + $fg + 'm' }")
    lines.push(`  $s += ${concatExpr(['$vt', sfxRef])}`)
    lines.push('  $Segs += $s')
  }
  lines.push('}')
  return lines
}

function emitSegment(state: EmitState, seg: SegmentConfig, descriptor: SegmentDescriptor): string[] {
  if (descriptor.category === 'shell-out') return emitShellOut(state, seg, descriptor)
  if (descriptor.category === 'percentage') return emitPercentage(state, seg, descriptor)
  return emitOther(state, seg, descriptor)
}

// ── 第二趟：join（.t23 §5 機械展開；powerline 箭頭交接／cap／plain 分隔符） ──

function joinPowerline(lastArrowCap: boolean): string[] {
  const lines = [
    "$out = ''",
    '$n = $Segs.Count',
    'for ($i = 0; $i -lt $n; $i++) {',
    '  if ($i -gt 0) {',
    '    $out += "$e[0m"',
    "    if ($BgT[$i - 1] -ne '') { $out += \"$e[38;\" + $BgT[$i - 1] + 'm' }",
    "    if ($BgT[$i] -ne '') { $out += \"$e[48;\" + $BgT[$i] + 'm' }",
    '    $out += $ARROW',
    '  }',
    '  $out += $Segs[$i]',
    '}',
  ]
  if (lastArrowCap) {
    lines.push(
      'if ($n -gt 0) {',
      '  $out += "$e[0m"',
      "  if ($BgT[$n - 1] -ne '') { $out += \"$e[38;\" + $BgT[$n - 1] + 'm' }",
      '  $out += $ARROW',
      '}',
    )
  }
  lines.push('$out += "$e[0m"')
  return lines
}

function joinPlain(separator: string): string[] {
  const lines = ["$out = ''", '$n = $Segs.Count', 'for ($i = 0; $i -lt $n; $i++) {']
  if (separator !== '') {
    lines.push(`  if ($i -gt 0) { $out += "$e[0m" + ${psSingleQuote(separator)} }`)
  }
  lines.push('  $out += $Segs[$i]', '}', '$out += "$e[0m"')
  return lines
}

// ── 主入口 ──

/**
 * BuilderConfig → 自足 `.ps1` 腳本文字（**不含** 檔案 BOM——BOM 屬檔案
 * 下載／簽入層職責，契約 8；本函式回傳純腳本內容，LF 換行）。未知
 * segment id＝programmer error（config 應先經 deserializeConfig 對真
 * catalog 清洗）→ TypeError（對齊 resolve）。
 */
export function emitPs1(config: BuilderConfig, catalog: SegmentDescriptorCatalog): string {
  const state: EmitState = {
    mode: config.mode,
    helpers: new Set(),
    thresholdDecls: [],
    thresholdCount: 0,
  }

  // 第一趟段 emit 先跑（收斂 helpers／閾值陣列宣告），再組檔頭。
  const segmentBlocks: string[] = []
  for (const seg of config.segments) {
    if (!seg.enabled) continue
    const descriptor = catalog[seg.id]
    if (descriptor === undefined) {
      throw new TypeError(`未知 segment id：${seg.id}（config 應先經 deserializeConfig 清洗）`)
    }
    segmentBlocks.push(emitSegment(state, seg, descriptor).join('\n'))
  }

  const out: string[] = []
  out.push('# Claude Code statusline — 由 EZTools statusline-builder 產生')
  out.push('# PowerShell 5.1+ / 7；請以 UTF-8（含 BOM）儲存。')
  out.push('[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)')
  out.push('[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)')
  out.push('$e = [char]27')
  if (state.mode === 'powerline') out.push('$ARROW = [string][char]0xE0B0')

  // 閾值段常數陣列（emit 期預算、執行期只索引）。
  for (const decl of state.thresholdDecls) out.push(decl)

  // helper 函式（只印用到的；印序固定＝HELPER_BODIES 宣告序）。
  for (const name of Object.keys(HELPER_BODIES)) {
    if (state.helpers.has(name)) out.push('', HELPER_BODIES[name])
  }

  out.push('')
  out.push('$raw = [Console]::In.ReadToEnd()')
  out.push('$d = $null')
  out.push('try { $d = $raw | ConvertFrom-Json -ErrorAction Stop } catch { }')
  out.push('')
  out.push('$Segs = @()')
  if (state.mode === 'powerline') out.push('$BgT = @()')

  for (const block of segmentBlocks) {
    out.push('')
    out.push(block)
  }

  out.push('')
  const join =
    state.mode === 'powerline'
      ? joinPowerline(config.lastArrowCap)
      : joinPlain(config.separator.value)
  out.push(...join)

  out.push('')
  out.push('[Console]::Out.Write($out)')
  out.push('exit 0')

  return out.join('\n') + '\n'
}
