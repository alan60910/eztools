/**
 * S5-T2.2（magi/05-statusline-builder/PLAN.md §產生器契約 4 執行期 join／
 * 契約 3 null 三態／契約 5 閾值／§D2 auto-fg 成對／§D3 mode 語意／
 * §型別契約 StyledRun／§預覽契約 aria-label）：決策核心 resolve——
 * BuilderConfig＋情境三通道 → StyledRun[]。與 emit-bash/emit-ps1 的
 * 執行期算式**同一 join 演算法**（宣告式包裝）；SP-5／§3 真執行以
 * `emit-ansi.toAnsi(resolve(...))` 為兩 shell stdout 的比對基準。
 *
 * ── 兩趟演算法（契約 4，兩後端同構）──
 * 第一趟：依 config.segments 序逐**啟用**段求值（tsPath／shell 通道→
 * nullPolicy→format→composition）。存活判定基準在 **value**：
 * hide/empty 政策下值死（isValueDead）→ 整段（含 prefix、icon）剔除，
 * 不殘留懸空前綴；dash 政策下主值 nullish → 顯示 '--' 仍存活、不套
 * 閾值色。段內 composition 單源：`prefix + icon-glyph + ' ' +
 * formatted-value (+ resets 後綴)`——prefix 與 icon 著色隨段主色
 * （非閾值色）。
 * 第二趟 join：plain＝存活段以分隔符串接（無 leading/trailing/雙分隔
 * 符）；powerline＝段間箭頭 `fg=前段bg, bg=後段bg`，lastArrowCap 為真
 * 時末段補 `fg=末段bg` 對終端底色的收尾箭頭。dash-null 段 bg 退回
 * SegmentConfig.color（fg=autoFg 或 fgOverride）——鏈上每存活段恆有
 * 定義的 bg（含 `default`＝不著色），箭頭交接色恆有定義。
 *
 * ── D1 gating（06a：`config.powerlineArrow`，僅 powerline 模式適用）──
 * `powerlineArrow=false`（v2 預設）：joinPowerline **不** emit 段間箭頭、
 * `lastArrowCap` 全面無效（cap 恆不 emit，與其值無關）；改為每段主 run
 * 收尾補一格右側空白（`head + value + suffix + ' '`，composition 單源，
 * 併入段的著色 run——色塊直接相接，行前無 padding，靠此格分隔避免視覺
 * 黏連）。`powerlineArrow=true`（v1 遷移沿襲）：joinPowerline 語意不變
 * （箭頭＋`lastArrowCap` 生效、run 不補格）。emit-bash／emit-ps1 對本欄
 * 同構鏡像（bash `$v` 尾綴空格／ps1 `$disp` 尾綴 `' '`，powerline 模式
 * 才適用；plain 模式完全不受 `powerlineArrow` 影響）。
 *
 * ── 契約沉默處選擇（T2.3/T2.4/T2.5/T3.2 依賴面，勿改動語意）──
 * 1. **run 粒度**：powerline 段恆為單 run（段只有一組 fg/bg，箭頭交接
 *    才有唯一 bg 可取）；plain 段單 run，**唯一分裂例外**＝閾值生效且
 *    head（prefix+icon）非空 → 兩 run（head fg=段主色、value+後綴
 *    fg=閾值桶色）。不做「色相同即合併」的深比較——粒度規則決定論，
 *    emitter 逐 head/value 兩次著色自然同構。
 * 2. **default 色不落 run 屬性**：fg/bg 只在非 `{kind:'default'}` 時
 *    設定（正規形，結構斷言穩定）；toAnsi 對缺席／default 皆不 emit。
 * 3. **resets 後綴獨立於主值**：variant 'percent-reset' 時後綴只看
 *    resets_at 自身（null→''、非 null→` (HH:mm)`）；主值 dash '--'
 *    仍可帶後綴（'-- (14:30)'）——composition 正交、emitter 無條件耦合。
 *    後綴附於 value 部（閾值分裂時隨值色）。
 * 4. **閾值只作用 percentage 類**：config 清洗保留任意段的 threshold
 *    （T1.3 契約 9），resolve 對非 percentage 段忽略之。
 * 5. **plain 分隔符 run ariaText=''**：分隔符與 powerline 箭頭同屬
 *    純裝飾，不進 aria-label；custom 空分隔符＝不產生 run（直接串接）。
 * 6. **resolve 輸入＝T2.1 三通道形**（data/shell/env）：MockScenario
 *    可整顆直傳（結構子集）；shell-out 段取 shell 通道（死值語意同
 *    isValueDead），tilde home 取 env 通道。
 * 7. **D1 padding 不增 run 數**（T2.3）：`powerlineArrow=false` 的右
 *    padding 併入既有段 run 的 text（`+ ' '`），不新開一個裝飾 run——
 *    「powerline 段恆單 run」的粒度規則（選擇 1）不受影響。
 *
 * ── StyledRun.ariaText 規則（型別契約；toAriaLabel 機械 enforcement）──
 * 凡 text 含 PUA／裝飾 glyph 之 run 一律顯式設 ariaText：裝飾箭頭／
 * 分隔符＝''、icon run＝glyph→icon.ariaText 機械代換（prefix 保留字面）。
 * 「省略→fallback text」僅限純可列印文字 run——toAriaLabel 對省略
 * ariaText 的 PUA run 拋 TypeError（.t17 §4 負向 enforcement 沿用）。
 *
 * 純函式、零 DOM import，node 可測。
 */
import { autoFg, type ColorSpec } from './color.js'
import type { BuilderConfig, SegmentConfig } from './config.js'
import type { MockShellChannel } from './mock-data.js'
import {
  DESCRIPTORS_BY_ID,
  defaultVariant,
  formatValue,
  isValueDead,
  resetsAtSuffix,
  type SegmentDescriptor,
  type SegmentId,
  type StatusData,
} from './segments.js'
import { autoFgBuckets, bucketIndex, type ThresholdRule } from './threshold.js'

// ── 型別（PLAN 型別契約） ──

export interface StyledRun {
  text: string
  /**
   * SR 文字通道。PUA／裝飾 run 一律顯式（箭頭・分隔符=''、icon run=
   * 代換文）；省略＝純文字 run 以 text fallback（PUA run 省略為
   * programmer error，toAriaLabel 拋 TypeError）。
   */
  ariaText?: string
  fg?: ColorSpec
  bg?: ColorSpec
}

/**
 * resolve 輸入＝mock-data.ts 三通道契約的結構子集（MockScenario 可
 * 整顆直傳）；T2.7 真執行 harness 不用 shell 通道（真跑命令），僅
 * 預覽／單元測試消費。
 */
export interface ResolveInput {
  data: StatusData
  shell: MockShellChannel
  env: { home: string }
}

/** powerline 轉場箭頭（v1 固定 U+E0B0，PLAN Non-Goals 記 minority）。 */
export const POWERLINE_ARROW = ''

/** dash 政策的 null 顯示形（契約 3：顯示 '--'、不套閾值色、段存活）。 */
export const DASH_TEXT = '--'

// ── 第一趟：逐段求值 ──

/** 存活段的 join 素材：runs＝段內 run 序；bg＝powerline 箭頭交接色（plain 不使用）。 */
interface ResolvedSegment {
  runs: StyledRun[]
  bg: ColorSpec
}

/** 主值來源：shell-out 段走 shell 通道（tsPath 恆 undefined），其餘走 tsPath。 */
function mainValue(descriptor: SegmentDescriptor, input: ResolveInput): unknown {
  if (descriptor.category === 'shell-out') {
    return input.shell[descriptor.id as keyof MockShellChannel]
  }
  return descriptor.tsPath(input.data)
}

/** default 不落屬性（正規形，沉默處選擇 2）；非 default 複製新物件（run 不別名 config）。 */
function assignColor(run: StyledRun, layer: 'fg' | 'bg', spec: ColorSpec): void {
  if (spec.kind !== 'default') run[layer] = { ...spec }
}

function resolveSegment(
  seg: SegmentConfig,
  descriptor: SegmentDescriptor,
  input: ResolveInput,
  mode: BuilderConfig['mode'],
  powerlineArrow: boolean,
): ResolvedSegment | null {
  const raw = mainValue(descriptor, input)
  const isDash = descriptor.nullPolicy === 'dash' && raw == null
  if (descriptor.nullPolicy !== 'dash' && isValueDead(raw)) return null

  const variant = seg.variant ?? defaultVariant(descriptor)
  const valueText = isDash
    ? DASH_TEXT
    : formatValue(descriptor.format, raw, { variant, home: input.env.home })
  const suffix =
    descriptor.resetsAt !== undefined && variant === 'percent-reset'
      ? resetsAtSuffix(descriptor.resetsAt.tsPath(input.data))
      : ''
  const prefix = seg.prefix ?? ''
  const head = prefix + (seg.icon ? `${descriptor.icon.glyph} ` : '')
  // icon run 的顯式 aria＝glyph 機械代換為 icon.ariaText（prefix 字面保留）；
  // icon 關閉＝null → 純文字 fallback（省略 ariaText）。
  const headAria = seg.icon ? prefix + descriptor.icon.ariaText : null

  // 閾值只作用 percentage 類（沉默處選擇 4）；dash 不套閾值色（契約 3）。
  const threshold: { rule: ThresholdRule; index: number } | null =
    descriptor.category === 'percentage' &&
    seg.threshold !== undefined &&
    !isDash &&
    typeof raw === 'number'
      ? { rule: seg.threshold, index: bucketIndex(raw) }
      : null

  if (mode === 'powerline') {
    // 段恆單 run：bg=閾值桶或段主色（dash-null 退主色），fg=成對 auto-fg
    // 陣列索引（D2）或 fgOverride；非閾值段同一派生規則。
    const bg = threshold !== null ? threshold.rule.buckets[threshold.index] : seg.color
    const fg =
      threshold !== null
        ? autoFgBuckets(threshold.rule, seg.fgOverride)[threshold.index]
        : (seg.fgOverride ?? autoFg(seg.color))
    // D1 gating：powerlineArrow=false → 每段 value 後補一格右側空白（併入
    // 著色 run，composition 單源）；ariaText 維持不補格——toAriaLabel 逐
    // chunk trim，補了也會被削掉，省略較不易誤導閱讀者「aria 有格」。
    const pad = powerlineArrow ? '' : ' '
    const run: StyledRun = { text: head + valueText + suffix + pad }
    if (headAria !== null) run.ariaText = `${headAria} ${valueText}${suffix}`
    assignColor(run, 'fg', fg)
    assignColor(run, 'bg', bg)
    return { runs: [run], bg }
  }

  // plain：唯一分裂例外＝閾值生效且 head 非空（沉默處選擇 1）。
  if (threshold !== null && head !== '') {
    const headRun: StyledRun = { text: head }
    if (headAria !== null) headRun.ariaText = headAria
    assignColor(headRun, 'fg', seg.color)
    const valueRun: StyledRun = { text: valueText + suffix }
    assignColor(valueRun, 'fg', threshold.rule.buckets[threshold.index])
    return { runs: [headRun, valueRun], bg: seg.color }
  }
  const run: StyledRun = { text: head + valueText + suffix }
  if (headAria !== null) run.ariaText = `${headAria} ${valueText}${suffix}`
  assignColor(run, 'fg', threshold !== null ? threshold.rule.buckets[threshold.index] : seg.color)
  return { runs: [run], bg: seg.color }
}

// ── 第二趟：join ──

function joinPlain(segments: readonly ResolvedSegment[], separator: string): StyledRun[] {
  const runs: StyledRun[] = []
  for (const segment of segments) {
    if (runs.length > 0 && separator !== '') runs.push({ text: separator, ariaText: '' })
    runs.push(...segment.runs)
  }
  return runs
}

/**
 * D1 gating：`powerlineArrow=false` → 不 emit 段間箭頭、`lastArrowCap`
 * 全面無效（cap 恆不 emit）；段本身的右 padding 已在 resolveSegment 併入
 * run.text，此函式僅需視 powerlineArrow 決定是否插箭頭／cap。
 */
function joinPowerline(
  segments: readonly ResolvedSegment[],
  lastArrowCap: boolean,
  powerlineArrow: boolean,
): StyledRun[] {
  const runs: StyledRun[] = []
  for (let i = 0; i < segments.length; i++) {
    if (powerlineArrow && i > 0) {
      const arrow: StyledRun = { text: POWERLINE_ARROW, ariaText: '' }
      assignColor(arrow, 'fg', segments[i - 1].bg)
      assignColor(arrow, 'bg', segments[i].bg)
      runs.push(arrow)
    }
    runs.push(...segments[i].runs)
  }
  if (powerlineArrow && lastArrowCap && segments.length > 0) {
    // 收尾箭頭：fg=末段bg、bg 缺席＝對終端底色 reset 過渡（Q1）。
    const cap: StyledRun = { text: POWERLINE_ARROW, ariaText: '' }
    assignColor(cap, 'fg', segments[segments.length - 1].bg)
    runs.push(cap)
  }
  return runs
}

/**
 * config＋情境三通道 → StyledRun[]。全隱藏 → []（toAnsi 仍出行尾
 * reset）。未知 segment id＝programmer error（config 應先經
 * deserializeConfig 對真 catalog 清洗）→ TypeError。
 */
export function resolve(config: BuilderConfig, input: ResolveInput): StyledRun[] {
  const alive: ResolvedSegment[] = []
  for (const seg of config.segments) {
    if (!seg.enabled) continue
    const descriptor = DESCRIPTORS_BY_ID[seg.id as SegmentId] as SegmentDescriptor | undefined
    if (descriptor === undefined) {
      throw new TypeError(`未知 segment id：${seg.id}（config 應先經 deserializeConfig 清洗）`)
    }
    const segment = resolveSegment(seg, descriptor, input, config.mode, config.powerlineArrow)
    if (segment !== null) alive.push(segment)
  }
  return config.mode === 'powerline'
    ? joinPowerline(alive, config.lastArrowCap, config.powerlineArrow)
    : joinPlain(alive, config.separator.value)
}

// ── aria-label 組裝純函式（§預覽契約；render-preview 只呼叫） ──

/**
 * BMP 私用區＋兩補充私用平面（Nerd Font glyph／powerline 箭頭皆落 BMP
 * PUA）。全範圍以顯式 `\u{...}` 轉義寫出、不嵌字面不可見字元——T1.4 裁定：
 * raw 不可見字元易被編輯器誤刪／正規化致 enforcement 靜默失效（與
 * validate.ts 的 PUA_RE 同一定義同一慣例）。
 */
const PUA_RE = /[\u{E000}-\u{F8FF}\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/u

export function containsPua(text: string): boolean {
  return PUA_RE.test(text)
}

/**
 * StyledRun[] → 預覽區 aria-label：逐 run 取 ariaText（省略＝純文字
 * fallback text，PUA run 省略→拋 TypeError）、修剪端空白、剔空 chunk、
 * 以單一空白串接（「空段落分隔以單一空白正規化」）。結果再做零 PUA
 * 機械斷言（顯式 ariaText 夾帶 PUA 亦拋）——兩層負向 enforcement 皆
 * 可測（.t17 §4 形沿用）。
 */
export function toAriaLabel(runs: readonly StyledRun[]): string {
  const chunks: string[] = []
  for (const run of runs) {
    let chunk: string
    if (run.ariaText !== undefined) {
      chunk = run.ariaText
    } else {
      if (containsPua(run.text)) {
        throw new TypeError(
          `PUA run 不得省略 ariaText（fallback 僅限純文字 run）：${JSON.stringify(run.text)}`,
        )
      }
      chunk = run.text
    }
    const trimmed = chunk.trim()
    if (trimmed !== '') chunks.push(trimmed)
  }
  const label = chunks.join(' ')
  if (containsPua(label)) {
    throw new TypeError('aria-label 不得含 PUA 碼位（顯式 ariaText 夾帶 glyph）')
  }
  return label
}
