#!/usr/bin/env node
/**
 * T2.3（S4） — bar run 粒度 byte 驗證 spike。
 * magi/08-statusline-catalog-expansion/PLAN.md §4（bar 契約全文，oracle
 * 規格）＋ TASKS.md T2.3。
 *
 * bar 功能本身（resolve.ts／emit-bash.ts／emit-ps1.ts 的實作）尚未落地
 * （M4 待辦）——本腳本是「動工前」驗證：依 PLAN §4 契約手構 bar 4-run
 * 的 StyledRun rows，唯讀 import 現行 `emit-ansi.ts`／`color.ts`
 * （不改動任何 production 檔），驗證：
 *   (a) 手推的 4-run 結構餵給既有 `toAnsi` 是否吐出「紙上規則手推」的
 *       bytes（驗證 toAnsi 既有的逐 run reset+fg+bg+text 規則套用在
 *       「同段 4 個 run 相鄰」這個未來才會出現的形狀上，行為與預期一致）；
 *   (b) 依 PLAN §4「emitter 累加器粒度」段落，分別對 bash／ps1 ×
 *       plain／powerline 四格模擬「未來 emit-bash/emit-ps1 會怎麼組裝
 *       這 4 個 run 進累加器」，比對其位元組是否與 (a) 的 oracle bytes
 *       等價。
 *
 * ── 手推方法論（誠實揭露，供覆核）──
 * 「先手寫預期 bytes、不是跑 toAnsi 再抄回來」的要求，在本腳本中以兩層
 * 落實：
 *   1. **對每一案，run 的數量／文字／fg／bg 皆由本檔案作者依 PLAN §4
 *      契約逐條手推**（見各案上方註解的推導過程）——這是本 spike 真正
 *      要驗證的東西（run 粒度、bg 均一、fgOverride 停用、pad/suffix
 *      併入 run4 等契約細節），不是由程式反推。
 *   2. 「ColorSpec → SGR bytes」與「單一 run → reset+fg+bg+text」的機械
 *      轉換，本檔另寫一組**獨立於 production 的小函式**（`sgrParams`／
 *      `runBytes`，未 import color.ts 的 sgrSequence／colorSgrParams），
 *      依 emit-ansi.ts 檔頭鎖死的規則（reset 前綴、fg 先 bg、default 不
     *      emit）與 ANSI SGR 標準重新刻一份，避免手動輸入數十組跳脫序列的
 *      謄寫錯誤——為求可覆核，額外對兩個代表案（bar 0% plain、bar null
 *      plain）逐字元手打「純字串常數」版本（`LITERAL_*`）與此函式版本
 *      交叉比對，證明兩者一致。emit-ansi.test.ts 既有先例（如
 *      `'\x1b[0m\x1b[38;5;196mx\x1b[0m'`）採同一手打字串常數風格。
 *
 * auto 展開後的 fg（autoFg(135) 等）依 PLAN 指示直接呼叫 color.ts 的
 * `autoFg` 並記錄結果（非重新推導 WCAG 對比公式——該數學已由
 * color.test.ts 把關，非本 spike 範圍）。
 *
 * 執行：node magi/08-statusline-catalog-expansion/sp4/verify.mjs
 */

import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// 唯讀 import 現行 emit-ansi.ts／color.ts：node 24 原生 TS type-stripping
// 對相對 `./x.js` import 需改寫至實存 `./x.ts`（機制同 scripts/golden-
// statusline.mjs 之 registerHooks，本腳本不寫入 production 檔、僅讀）。
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.startsWith('.') &&
      specifier.endsWith('.js') &&
      context.parentURL !== undefined &&
      context.parentURL.startsWith('file:')
    ) {
      const candidate = new URL(`${specifier.slice(0, -3)}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(candidate))) {
        return { url: candidate.href, shortCircuit: true }
      }
    }
    return nextResolve(specifier, context)
  },
})

const { toAnsi } = await import(
  new URL('../../../tools/statusline-builder/emit-ansi.ts', import.meta.url).href
)
const { autoFg } = await import(
  new URL('../../../tools/statusline-builder/color.ts', import.meta.url).href
)

// ── 測試 harness ──────────────────────────────────────────────────────

let passCount = 0
let failCount = 0
const failures = []

function esc(s) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b/g, '\\x1b')
}

function fmt(v) {
  return typeof v === 'string' ? esc(v) : JSON.stringify(v)
}

/** 字串走字面相等；其餘（ColorSpec 物件／undefined）走結構相等（JSON 比較，
 * autoFg 等呼叫每次回傳新物件實例，不能用 `===` 比參照）。 */
function isEqual(a, b) {
  if (typeof a === 'string' && typeof b === 'string') return a === b
  return JSON.stringify(a) === JSON.stringify(b)
}

function check(label, actual, expected) {
  if (isEqual(actual, expected)) {
    passCount++
    console.log(`  PASS  ${label}`)
  } else {
    failCount++
    failures.push(label)
    console.log(`  FAIL  ${label}`)
    console.log(`    expected: ${fmt(expected)}`)
    console.log(`    actual:   ${fmt(actual)}`)
  }
}

function section(name) {
  console.log(`\n=== ${name} ===`)
}

// ── 獨立 ANSI 手推工具（不 import production join 邏輯；依 emit-ansi.ts
// 檔頭鎖死規則＋ANSI SGR 標準自寫，供「手推」使用，見檔頭方法論說明）──

const ESC = '\x1b'
const ARROW = '' // powerline 箭頭字面（resolve.ts POWERLINE_ARROW／emit-ps1.ts 0xE0B0 同值，未 import，直接沿用已知碼位）

/** ColorSpec → SGR 參數段（`38;5;n`／`48;5;n`／`38;2;r;g;b`）；default／undefined → null。 */
function sgrParams(spec, layer) {
  if (spec === undefined || spec.kind === 'default') return null
  const lead = layer === 'fg' ? '38' : '48'
  if (spec.kind === 'ansi256') return `${lead};5;${spec.index}`
  const hex = spec.hex
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  return `${lead};2;${r};${g};${b}`
}

/** 單一 run → 手推 bytes：reset 前綴＋fg 先於 bg＋text（oracle 規則 1/2/4 的獨立重刻）。 */
function runBytes(text, fg, bg) {
  let s = `${ESC}[0m`
  const fp = sgrParams(fg, 'fg')
  if (fp !== null) s += `${ESC}[${fp}m`
  const bp = sgrParams(bg, 'bg')
  if (bp !== null) s += `${ESC}[${bp}m`
  return s + text
}

/** StyledRun[]（單列）→ 手推 bytes（含列尾 reset，規則 3）。 */
function rowBytes(runs) {
  return runs.map((r) => runBytes(r.text, r.fg, r.bg)).join('') + `${ESC}[0m`
}

// ── PLAN §4 bar 契約：手構 4-run（主值存活）／單 run（null 退化） ──────

function bucketIdx(pct) {
  return Math.max(0, Math.min(9, Math.floor(pct / 10)))
}

/** spike 自訂桶色（非正式模板值，見 threshold.ts 之 4 套模板——本案只需
 * 「桶色隨 pct 變化且與段主色可肉眼區分」，不驗證 bucketIndex／模板配色
 * 本身，那是 threshold.test.ts 的範圍）。 */
function bucketColor(pct) {
  return { kind: 'ansi256', index: 100 + bucketIdx(pct) }
}

/** 填格數：max(0, min(20, floor(pct/5)))（PLAN §4 釘死公式）。 */
function fillCount(pct) {
  return Math.max(0, Math.min(20, Math.floor(pct / 5)))
}

const FILLED_CHAR = '█'
const EMPTY_CHAR = '░'

/**
 * 依 PLAN §4 手構 bar 4-run：
 * run1=head、run2=filled（桶色）、run3=empty（default 色）、
 * run4=' '+pct%+suffix+pad（桶色）。
 * plain：run1 fg=segColor、run3 無 fg（default）、run2/run4 fg=桶色，
 *   全段無 bg（plain 不設 bg，沿既有 resolve.ts 慣例）。
 * powerline：bg 全段維持段主色（4 run 均一）；fgOverride 停用 → run1/
 *   run3 fg=autoFg(segColor)（run3 仍無 fg，「default 色」＝不著色，即便
 *   bg 有值）；run2/run4 fg=桶色（直接套用，非經 autoFg 轉換）。
 */
function buildBarRuns(mode, { pct, segColor, head = '', suffix = '', pad = '' }) {
  const n = fillCount(pct)
  const filledText = FILLED_CHAR.repeat(n)
  const emptyText = EMPTY_CHAR.repeat(20 - n)
  const bColor = bucketColor(pct)
  const valueText = ` ${Math.floor(pct)}%${suffix}${pad}`

  if (mode === 'plain') {
    return [
      { text: head, fg: segColor },
      { text: filledText, fg: bColor },
      { text: emptyText },
      { text: valueText, fg: bColor },
    ]
  }

  const headFg = autoFg(segColor) // fgOverride 停用（契約釘死）→ 恆 autoFg，非 fgOverride ?? autoFg
  return [
    { text: head, fg: headFg, bg: segColor },
    { text: filledText, fg: bColor, bg: segColor },
    { text: emptyText, bg: segColor },
    { text: valueText, fg: bColor, bg: segColor },
  ]
}

/** 主值 null → 整段退單 run（契約 3；'--' 不套閾值色）。假設 fgOverride
 * 停用對 bar 段係整段屬性（非僅 4-run 路徑才生效）——見 REPORT「契約
 * 縫隙」第 1 條，此為本 spike 採用的保守解讀。 */
function buildDashRun(mode, { segColor, head = '', suffix = '' }) {
  const text = `${head}--${suffix}`
  if (mode === 'plain') return [{ text, fg: segColor }]
  return [{ text, fg: autoFg(segColor), bg: segColor }]
}

// ── 累加器模擬：四格（bash/ps1 × plain/powerline）─────────────────────

/**
 * bash-plain：bar 的 4 run **逐一 push 四元素**＋segstart 1/0/0/0（分隔符
 * 只插段首）。此函式模擬 emit-bash.ts 既有 joinPlain 迴圈（bash:403-419）
 * 套用在「本案累加器元素陣列」上的結果——迴圈演算法本身未變, 只是（未來）
 * emitSegment 的 bar 分支要 push 4 個而非 1 個元素。
 * elements: [{ text, fg, segstart }]
 */
function simulateBashPlain(elements, sep) {
  let out = ''
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]
    if (i > 0 && el.segstart === 1 && sep !== '') out += `${ESC}[0m${sep}`
    out += `${ESC}[0m`
    const fp = sgrParams(el.fg, 'fg')
    if (fp !== null) out += `${ESC}[${fp}m`
    out += el.text
  }
  out += `${ESC}[0m`
  return out
}

/**
 * ps1-plain：bar 的 4 run **併單一 `$s` 元素**（沿既有閾值分裂先例
 * emit-ps1.ts:487-497，2-run 精確延伸為 4-run）：每個 run 的
 * reset+fg+text（plain 恆無 bg）逐一烘進同一字串，push 一次。
 * runs: StyledRun[]（bar 的 4 個 run，或非 bar 段的 1 個 run）
 */
function mergeBarPlainBaked(runs) {
  return runs.map((r) => runBytes(r.text, r.fg, undefined)).join('')
}

/**
 * ps1-plain 的 join（emit-ps1.ts:593-600）：`$Segs` 陣列本就「一段一
 * 元素」（非 bar 段亦是單一 baked 字串），join 迴圈僅在元素間插分隔符，
 * 元素本身不再套 reset/fg（因為已烘好）。
 * elements: string[]（每元素＝一整段已烘好的 bytes）
 */
function simulatePs1Plain(elements, sep) {
  let out = ''
  for (let i = 0; i < elements.length; i++) {
    if (i > 0 && sep !== '') out += `${ESC}[0m${sep}`
    out += elements[i]
  }
  out += `${ESC}[0m`
  return out
}

/**
 * bash-powerline／ps1-powerline：bar 的 4 run **併單一累加器元素**（「元素
 * ＝段」、箭頭迴圈不動）。推導（見 REPORT §四格結論）：累加器的
 * fg/bg 欄位只能承載「一組」顏色——取 run1（head）的 fg/bg 放進該欄位
 * （bg 對 bar 段全段均一＝segColor，故 run1.bg 即代表整段，箭頭交接色
 * 正確）；run1 的 text 保持「裸文字」（不烘 reset/fg/bg，因為外層 join
 * 迴圈已經會補上這組 reset+fg+bg）；run2–4 因為各自可能有不同 fg，只能
 * 把「完整 reset+fg+bg+text」烘進 text 尾端。
 * 回傳 { fg, bg, text } 供 push 進 texts/fgs/bgs（bash）或
 * $Segs/$BgT（ps1，$s 組字串同構）。
 */
function mergeBarPowerlineElement(runs) {
  const [r1, ...rest] = runs
  let text = r1.text
  for (const r of rest) text += runBytes(r.text, r.fg, r.bg)
  return { fg: r1.fg, bg: r1.bg, text }
}

/**
 * powerline join（bash emit-bash.ts:361-397／ps1 emit-ps1.ts:522-552，
 * 兩者演算法逐位元組同構，見 PLAN §4「emitter 累加器粒度」段——本函式
 * 同時代表兩後端）：逐**元素**插箭頭（fg=前元素 bg、bg=本元素 bg）＋
 * lastArrowCap 收尾。
 * elements: [{ fg, bg, text }]（text 可能已內含烘好的子 run bytes，見
 * mergeBarPowerlineElement）
 */
function simulatePowerlineJoin(elements, arrowOn, lastArrowCap) {
  let out = ''
  const n = elements.length
  for (let i = 0; i < n; i++) {
    if (arrowOn && i > 0) {
      out += `${ESC}[0m`
      const fp = sgrParams(elements[i - 1].bg, 'fg')
      if (fp !== null) out += `${ESC}[${fp}m`
      const bp = sgrParams(elements[i].bg, 'bg')
      if (bp !== null) out += `${ESC}[${bp}m`
      out += ARROW
    }
    out += `${ESC}[0m`
    const fp = sgrParams(elements[i].fg, 'fg')
    if (fp !== null) out += `${ESC}[${fp}m`
    const bp = sgrParams(elements[i].bg, 'bg')
    if (bp !== null) out += `${ESC}[${bp}m`
    out += elements[i].text
  }
  if (arrowOn && lastArrowCap && n > 0) {
    out += `${ESC}[0m`
    const fp = sgrParams(elements[n - 1].bg, 'fg')
    if (fp !== null) out += `${ESC}[${fp}m`
    out += ARROW
  }
  out += `${ESC}[0m`
  return out
}

// ── 案定義用色票（spike 自訂，非正式產品配色） ─────────────────────────

const SEG_MAIN = { kind: 'ansi256', index: 244 } // 段主色（灰階 #808080，autoFg 走黑端點 16——巧與 color.test.ts 既有邊界案同值，見下方 spot-check）
const OTHER_FG = { kind: 'ansi256', index: 15 } // 佔位比較段的 fg（任選值，非驗證對象）
const OTHER_BG = { kind: 'ansi256', index: 33 } // 佔位比較段的 bg（任選值，非驗證對象）
const SEP = '|'

// ════════════════════════════════════════════════════════════════════
// 案 1：bar 60%（12 格）plain，2 段（otherSeg + barSeg）驗證 bash-plain
//       segstart 邊界與 ps1-plain 併元素兩者。
// ════════════════════════════════════════════════════════════════════
section('案 1：bar 60% plain（2 段，驗 bash-plain segstart／ps1-plain 併元素）')
{
  const barRuns = buildBarRuns('plain', { pct: 60, segColor: SEG_MAIN, head: 'ctx:' })
  // fillCount(60)=12 → filled='█'x12, empty='░'x8（20-12）
  const otherRun = { text: 'M ', fg: OTHER_FG }
  const sepRun = { text: SEP } // resolve.ts joinPlain 分隔符 run：fg/bg 皆缺席
  const rows = [[otherRun, sepRun, ...barRuns]]

  const oracleBytes = toAnsi(rows)
  const handBytes = rowBytes(rows[0])
  check('oracle 自洽（hand rowBytes === toAnsi）', handBytes, oracleBytes)

  // bash-plain：otherSeg 1 元素 + bar 4 元素（segstart=1,0,0,0）
  const bashElements = [
    { text: otherRun.text, fg: otherRun.fg, segstart: 1 },
    { text: barRuns[0].text, fg: barRuns[0].fg, segstart: 1 },
    { text: barRuns[1].text, fg: barRuns[1].fg, segstart: 0 },
    { text: barRuns[2].text, fg: barRuns[2].fg, segstart: 0 },
    { text: barRuns[3].text, fg: barRuns[3].fg, segstart: 0 },
  ]
  check('bash-plain 累加器 === oracle', simulateBashPlain(bashElements, SEP), oracleBytes)

  // ps1-plain：otherSeg 1 個 baked 元素 + bar 併 1 個 baked 元素
  const ps1Elements = [
    runBytes(otherRun.text, otherRun.fg, undefined),
    mergeBarPlainBaked(barRuns),
  ]
  check('ps1-plain 累加器 === oracle', simulatePs1Plain(ps1Elements, SEP), oracleBytes)
}

// ════════════════════════════════════════════════════════════════════
// 案 2：bar 60% powerline（arrow=true），2 段＋lastArrowCap，驗箭頭／
//       cap 與「元素＝段」合併不衝突。
// ════════════════════════════════════════════════════════════════════
section('案 2：bar 60% powerline arrow=true（2 段＋cap，驗合併元素與箭頭/cap）')
{
  const barRuns = buildBarRuns('powerline', { pct: 60, segColor: SEG_MAIN, head: 'ctx:' })
  const otherRun = { text: 'M ', fg: OTHER_FG, bg: OTHER_BG }
  const arrowRun = { text: ARROW, fg: OTHER_BG, bg: SEG_MAIN }
  const capRun = { text: ARROW, fg: SEG_MAIN } // 無 bg（收尾對終端底色）
  const rows = [[otherRun, arrowRun, ...barRuns, capRun]]

  const oracleBytes = toAnsi(rows)
  const handBytes = rowBytes(rows[0])
  check('oracle 自洽（hand rowBytes === toAnsi）', handBytes, oracleBytes)

  const elements = [
    { fg: otherRun.fg, bg: otherRun.bg, text: otherRun.text },
    mergeBarPowerlineElement(barRuns),
  ]
  const simBytes = simulatePowerlineJoin(elements, true, true)
  check('bash/ps1-powerline 併元素累加器 === oracle（arrow+cap）', simBytes, oracleBytes)
}

// ════════════════════════════════════════════════════════════════════
// 案 3：bar 60% powerline-noarrow（powerlineArrow=false），2 段，驗 pad
//       併入 run4、無箭頭/cap。
// ════════════════════════════════════════════════════════════════════
section('案 3：bar 60% powerline-noarrow（2 段，驗 pad 併入 run4／無箭頭）')
{
  const barRuns = buildBarRuns('powerline', {
    pct: 60,
    segColor: SEG_MAIN,
    head: 'ctx:',
    pad: ' ', // D1 gating：powerlineArrow=false → 右 padding 併入 run4（契約釘死落點）
  })
  const otherRun = { text: 'M  ', fg: OTHER_FG, bg: OTHER_BG } // 非 bar 段：pad 直接併入其自身唯一 run
  const rows = [[otherRun, ...barRuns]] // 無箭頭 run、無 cap（D1 gating 全面停用）

  const oracleBytes = toAnsi(rows)
  const handBytes = rowBytes(rows[0])
  check('oracle 自洽（hand rowBytes === toAnsi）', handBytes, oracleBytes)

  const elements = [
    { fg: otherRun.fg, bg: otherRun.bg, text: otherRun.text },
    mergeBarPowerlineElement(barRuns),
  ]
  const simBytes = simulatePowerlineJoin(elements, false, true) // arrowOn=false → lastArrowCap 值不影響（gating）
  check('bash/ps1-powerline 併元素累加器 === oracle（noarrow）', simBytes, oracleBytes)
}

// ════════════════════════════════════════════════════════════════════
// 案 4：bar 0%（單段 plain，head 皆空 → run1 空文字佔位）
// ════════════════════════════════════════════════════════════════════
section('案 4：bar 0% plain（單段，head 空 → run1 空文字佔位；含逐字手打 spot-check）')
{
  const barRuns = buildBarRuns('plain', { pct: 0, segColor: SEG_MAIN, head: '' })
  // fillCount(0)=0 → filled=''（0 字元）, empty='░'x20
  const rows = [barRuns]

  const oracleBytes = toAnsi(rows)
  const handBytes = rowBytes(rows[0])
  check('oracle 自洽（hand rowBytes === toAnsi）', handBytes, oracleBytes)

  // 逐字手打字串常數 spot-check（不經 runBytes/rowBytes 輔助函式，純手key）：
  // run1: head='' fg=SEG_MAIN(244) → reset+38;5;244（text 空）
  // run2: filled='' fg=bucket(100) → reset+38;5;100（text 空，0 格）
  // run3: empty='░'x20 無 fg → reset + 20 個 ░
  // run4: ' 0%' fg=bucket(100) → reset+38;5;100+' 0%'
  // 列尾 reset。
  const LITERAL =
    '\x1b[0m\x1b[38;5;244m' +
    '\x1b[0m\x1b[38;5;100m' +
    '\x1b[0m' +
    '░'.repeat(20) +
    '\x1b[0m\x1b[38;5;100m 0%' +
    '\x1b[0m'
  check('逐字手打字串常數 === toAnsi', LITERAL, oracleBytes)

  const bashElements = barRuns.map((r, i) => ({ text: r.text, fg: r.fg, segstart: i === 0 ? 1 : 0 }))
  check('bash-plain 累加器 === oracle', simulateBashPlain(bashElements, SEP), oracleBytes)

  const ps1Elements = [mergeBarPlainBaked(barRuns)]
  check('ps1-plain 累加器 === oracle', simulatePs1Plain(ps1Elements, SEP), oracleBytes)
}

// ════════════════════════════════════════════════════════════════════
// 案 5/6/7：bar 49%／50%／100% plain（單段，掃填格邊界：9/10/20 格）
// ════════════════════════════════════════════════════════════════════
for (const pct of [49, 50, 100]) {
  section(`案：bar ${pct}% plain（單段，填格數字錨點）`)
  const barRuns = buildBarRuns('plain', { pct, segColor: SEG_MAIN, head: 'ctx:' })
  const n = fillCount(pct)
  check(`填格數 floor(${pct}/5) clamp[0,20] = 預期`, n, pct === 49 ? 9 : pct === 50 ? 10 : 20)

  const rows = [barRuns]
  const oracleBytes = toAnsi(rows)
  const handBytes = rowBytes(rows[0])
  check('oracle 自洽（hand rowBytes === toAnsi）', handBytes, oracleBytes)

  const bashElements = barRuns.map((r, i) => ({ text: r.text, fg: r.fg, segstart: i === 0 ? 1 : 0 }))
  check('bash-plain 累加器 === oracle', simulateBashPlain(bashElements, SEP), oracleBytes)

  const ps1Elements = [mergeBarPlainBaked(barRuns)]
  check('ps1-plain 累加器 === oracle', simulatePs1Plain(ps1Elements, SEP), oracleBytes)
}

// ════════════════════════════════════════════════════════════════════
// 案 8：bar null（主值 null → 整段退單 run，不成 4-run），plain 與
//       powerline 各一，powerline 另測 cap（單段仍可觸發收尾箭頭）。
// ════════════════════════════════════════════════════════════════════
section('案 8a：bar null plain（單段退化為單 run "--"；含逐字手打 spot-check）')
{
  const runs = buildDashRun('plain', { segColor: SEG_MAIN, head: 'ctx:' })
  const rows = [runs]
  const oracleBytes = toAnsi(rows)
  const handBytes = rowBytes(rows[0])
  check('oracle 自洽（hand rowBytes === toAnsi）', handBytes, oracleBytes)

  // 逐字手打：'ctx:--' fg=SEG_MAIN(244)
  const LITERAL = '\x1b[0m\x1b[38;5;244mctx:--\x1b[0m'
  check('逐字手打字串常數 === toAnsi', LITERAL, oracleBytes)

  const bashElements = [{ text: runs[0].text, fg: runs[0].fg, segstart: 1 }]
  check('bash-plain 累加器 === oracle', simulateBashPlain(bashElements, SEP), oracleBytes)
  const ps1Elements = [mergeBarPlainBaked(runs)]
  check('ps1-plain 累加器 === oracle', simulatePs1Plain(ps1Elements, SEP), oracleBytes)
}

section('案 8b：bar null powerline arrow=true（單段＋cap）')
{
  const runs = buildDashRun('powerline', { segColor: SEG_MAIN, head: 'ctx:' })
  const capRun = { text: ARROW, fg: SEG_MAIN }
  const rows = [[...runs, capRun]]
  const oracleBytes = toAnsi(rows)
  const handBytes = rowBytes(rows[0])
  check('oracle 自洽（hand rowBytes === toAnsi）', handBytes, oracleBytes)

  const elements = [{ fg: runs[0].fg, bg: runs[0].bg, text: runs[0].text }]
  const simBytes = simulatePowerlineJoin(elements, true, true)
  check('bash/ps1-powerline 累加器 === oracle（單元素＋cap）', simBytes, oracleBytes)
}

// ════════════════════════════════════════════════════════════════════
// 案 9：percent-reset × bar（run4 帶 resets 後綴 ' (14:30)'），plain。
// ════════════════════════════════════════════════════════════════════
section('案 9：percent-reset × bar（run4 帶後綴 " (14:30)"，plain）')
{
  const barRuns = buildBarRuns('plain', {
    pct: 60,
    segColor: SEG_MAIN,
    head: 'ctx:',
    suffix: ' (14:30)',
  })
  check('run4 文字＝\' \'+pct%+suffix（無 pad）', barRuns[3].text, ' 60% (14:30)')

  const rows = [barRuns]
  const oracleBytes = toAnsi(rows)
  const handBytes = rowBytes(rows[0])
  check('oracle 自洽（hand rowBytes === toAnsi）', handBytes, oracleBytes)

  const bashElements = barRuns.map((r, i) => ({ text: r.text, fg: r.fg, segstart: i === 0 ? 1 : 0 }))
  check('bash-plain 累加器 === oracle', simulateBashPlain(bashElements, SEP), oracleBytes)
  const ps1Elements = [mergeBarPlainBaked(barRuns)]
  check('ps1-plain 累加器 === oracle', simulatePs1Plain(ps1Elements, SEP), oracleBytes)
}

// ════════════════════════════════════════════════════════════════════
// 案 10/11：auto(model=opus→135) × powerline，arrow／noarrow 各一，驗
//           auto 展開＋autoFg 對比＋併元素在「auto 色」情境下仍成立。
// ════════════════════════════════════════════════════════════════════
const AUTO_OPUS = { kind: 'ansi256', index: 135 } // PLAN §3 auto 色票：model Opus=135
const autoHeadFg = autoFg(AUTO_OPUS) // 依指示直接呼叫 production autoFg，記錄展開後 index
console.log(`\n[auto 展開] autoFg({ansi256,135}) = ${JSON.stringify(autoHeadFg)}`)

section('案 10：auto(opus→135) × powerline arrow=true（單段＋cap，驗 autoFg 對比）')
{
  const barRuns = buildBarRuns('powerline', { pct: 60, segColor: AUTO_OPUS, head: 'ctx:' })
  check('run1 head fg === autoFg(135)（fgOverride 停用恆用 autoFg）', barRuns[0].fg, autoHeadFg)
  check('run3 empty 無 fg（default 色，即便 auto bg）', barRuns[2].fg, undefined)
  check('run3 empty bg === segColor（bg 全段均一，auto 亦同）', barRuns[2].bg, AUTO_OPUS)

  const capRun = { text: ARROW, fg: AUTO_OPUS }
  const rows = [[...barRuns, capRun]]
  const oracleBytes = toAnsi(rows)
  const handBytes = rowBytes(rows[0])
  check('oracle 自洽（hand rowBytes === toAnsi）', handBytes, oracleBytes)

  const elements = [mergeBarPowerlineElement(barRuns)]
  const simBytes = simulatePowerlineJoin(elements, true, true)
  check('bash/ps1-powerline 併元素累加器 === oracle（auto+cap）', simBytes, oracleBytes)
}

section('案 11：auto(opus→135) × powerline-noarrow（單段，pad 併入 run4）')
{
  const barRuns = buildBarRuns('powerline', {
    pct: 60,
    segColor: AUTO_OPUS,
    head: 'ctx:',
    pad: ' ',
  })
  check('run4 文字含尾 pad', barRuns[3].text, ' 60% ')

  const rows = [barRuns]
  const oracleBytes = toAnsi(rows)
  const handBytes = rowBytes(rows[0])
  check('oracle 自洽（hand rowBytes === toAnsi）', handBytes, oracleBytes)

  const elements = [mergeBarPowerlineElement(barRuns)]
  const simBytes = simulatePowerlineJoin(elements, false, true)
  check('bash/ps1-powerline 併元素累加器 === oracle（auto+noarrow）', simBytes, oracleBytes)
}

// ── 收尾 ────────────────────────────────────────────────────────────
console.log(`\n${passCount} passed, ${failCount} failed (${passCount + failCount} total)`)
if (failCount > 0) {
  console.log('\nFAILED:')
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
process.exit(0)
