/**
 * S5-T3.3（magi/05-statusline-builder/PLAN.md §Builder UI a11y 契約／
 * §預覽契約／§產生器契約 8）：工具頁 UI 全流程狀態機（browser-only）。
 *
 * 職責分工（不重複既有模組）：
 * - 預覽渲染 → render-preview.ts 的 createPreview controller（本檔只呼
 *   setConfig/setScenario/setTheme，不自碰預覽 DOM、不自行 resolve）。
 * - resolve／emit-ansi／aria-label 純函式在 controller 內；三後端產生器
 *   emitBash／emitPs1／emitSettings 於本檔呼叫填三 <pre>。
 * - config 型別／清洗、色盤色表、閾值模板、輸入驗證皆用既有純函式模組。
 *
 * 單一真相＝BuilderConfig：localStorage 讀（deserializeConfig＋清洗，重整
 * 不丟）／寫（變更即存）；任何控件變動 → 改 config → persist → 刷預覽＋
 * 三產物。DOM 結構契約見 .t31-report.md §3（<template> 生成／token 取代／
 * 節點命名）；controller API 見 .t32-report.md §4。
 *
 * 掛載：檔尾 <script type="module">（deferred，執行時 DOM 已解析）；仍以
 * readyState 守衛使初始化嚴格於 DOMContentLoaded 後（PLAN 明訂）。
 */
// T4.2（magi/06-statusline-ui-refresh/PLAN.md §D4）：主題模組於任何渲染前
// import——<head> 的 inline script 已在解析階段套用 data-theme（防 FOUC），
// 這裡只需接上 toggle 鈕的 wiring 與 aria-pressed 同步，故在檔案最上方、
// 其餘功能邏輯（含下方 init() 的實際渲染）之前完成。
import { initThemeToggle } from '../../src/theme.js'

import '../../src/style.css'
import './style.css'

import {
  ansi256SwatchName,
  ansi256ToHex,
  clampAnsi256Index,
  normalizeHex,
  type ColorSpec,
} from './color.js'
import {
  defaultConfig,
  deserializeConfig,
  normalizeRows,
  serializeConfig,
  type BuilderConfig,
  type SegmentConfig,
  type SeparatorPresetValue,
} from './config.js'
import {
  DESCRIPTORS_BY_ID,
  SEGMENT_CATALOG,
  SEGMENT_DESCRIPTORS,
  type SegmentCategory,
  type SegmentDescriptor,
  type SegmentId,
} from './segments.js'
import {
  THRESHOLD_BUCKET_COUNT,
  THRESHOLD_TEMPLATES,
  type ThresholdBuckets,
  type ThresholdTemplateId,
} from './threshold.js'
import { validateCustomText, type CustomTextRejectReason } from './validate.js'
import { containsPua } from './resolve.js'
import { emitBash } from './emit-bash.js'
import { emitPs1 } from './emit-ps1.js'
import { emitSettings, type SettingsTarget } from './emit-settings.js'
import { createPreview, type PreviewController } from './render-preview.js'
import type { MockScenarioId } from './mock-data.js'
import {
  computeCrossRowMove,
  computeRowDeletion,
  computeRowGroups,
  computeRowSwap,
  formatMoveAnnouncement,
  resolveBlankAreaInsertIndex,
  resolveDropSide,
  rowGroupsEqual,
  type RowGroup,
  type RowSwapResult,
} from './row-groups.js'
import {
  clampReenableRow,
  computeRowSelectOptionOps,
  type RowSelectOption,
  type RowSelectOptionOp,
} from './row-select.js'
import {
  appendPendingSlot,
  planSegmentMove,
  realIndexOfSlot,
  reconcileRealSlots,
  removeSlotAt,
  slotIndexOfRealRow,
  slotsEqual,
  type DropTarget,
  type RowSlot,
} from './row-slots.js'
import { buildCatalogGroups } from './catalog.js'

// T5.14（PLAN Rev 11「列耗盡保留＋暫存列位置制」）：統一移動入口
// commitSegmentMove 的落點型別＝`DropTarget`（見 row-slots.ts：`real`＝
// 落在既有真實列，`pending`＝落在某 UI 暫存空列）——跨列拖曳（li／gap／
// 容器空白處）與 select 指派共用同一型別，語意一致（見 commitSegmentMove）。
//
// MAGI code review I-3（magi/07-statusline-multirow-layout/MAGI_CODE_
// REVIEW.md，2026-07-12 使用者裁決「修」）：型別原宣告於本檔（T5.14
// TASKS.md「若想放共用處，放 main.ts 即可」之選項），因決策層
// `planSegmentMove`（row-slots.ts）需要此型別作參數，改移入 row-slots.ts
// 單一事實來源、本檔改 import type——擇一並記於此，不重複宣告。

// ── 常數／查表 ──

/** localStorage 鍵（BuilderConfig 序列化存放）。 */
const STORAGE_KEY = 'eztools:statusline-builder:config'

/** UTF-8 BOM（U+FEFF）：前置於 .ps1 下載內容 → Blob 編碼為 EF BB BF（PLAN 契約 8）。 */
const UTF8_BOM = String.fromCharCode(0xfeff)

/** 分區顯示順序＝目錄類別序（永在→百分比→條件→shell-out）；DOM order 亦此序。 */
const SECTION_ORDER: readonly SegmentCategory[] = ['always', 'percentage', 'conditional', 'shell-out']

/** variant 值 → 可讀顯示名（select option 文字；缺表則原值）。 */
const VARIANT_LABELS: Readonly<Record<string, string>> = {
  full: '完整路徑',
  basename: '僅目錄名',
  tilde: '以 ~ 縮寫家目錄',
  percent: '僅百分比',
  'percent-reset': '百分比＋重置時間',
}

/** 拒收集 R（validate.ts，含 PUA）reason → role=alert 文案。 */
const REJECT_MESSAGES: Readonly<Record<CustomTextRejectReason, string>> = {
  newline: '不可包含換行字元',
  control: '不可包含控制字元',
  'bidi-format': '不可包含雙向文字格式控制字元',
  'lone-surrogate': '不可包含不成對的代理字元（無效的 Unicode）',
  pua: '不可包含私用區（PUA）字元',
  'too-long': '長度不可超過 8 個字元',
}
const PUA_REJECT_MESSAGE = REJECT_MESSAGES.pua

/** 色選三態（對齊 ColorSpec.kind）。 */
type ColorMode = 'default' | 'ansi256' | 'truecolor'

interface ColorPickerHandle {
  element: HTMLElement
  /** 程式化設值（初始化／閾值模板套用）；**不觸發 onChange**。 */
  setValue(spec: ColorSpec): void
}

// ── 模組狀態 ──

let config: BuilderConfig
let preview: PreviewController
let draggingId: string | null = null
/**
 * T5.5 起：拖曳起手時的原容器＋原下一個手足節點。與 draggingId 同步生滅
 * （dragstart 設值、dragend／drop 完成後清空）。
 *
 * T5.10（PLAN Rev 5「跨列 drop＝實際移動」）：跨列 drop 已改為真正移動
 * （見 performCrossRowMove），本欄位不再用於「吸附回原位」——有效落點
 * （同列／跨列，皆有對應 drop handler）一律經 commitConfig 落地新排列，
 * 節點只在該路徑下才會被搬動。無效落點（如拖到左欄目錄／頁面其他未接線
 * 區域）因該處從未 `preventDefault()` dragover，瀏覽器不會觸發 `drop`
 * 事件、DOM 也從未被搬動（li 於整個拖曳期間只有 opacity 變化），故無需
 * 任何程式化復位；本欄位保留作為防禦性錨點（若未來新增更多 drop 目標時
 * 誤觸發非預期搬移，仍有原始位置可供追查／擴充復位邏輯）。
 */
let dragOrigin: { id: string; parent: HTMLElement | null; nextSibling: Element | null } | null = null
/**
 * T5.11（PLAN §排序與列指派 UX Rev 6「插入點挪空間視覺」）：dragover 期間
 * 顯示的 placeholder gap 節點——純 UI 態，絕不進 config、絕不承載任何段
 * 的狀態／監聽器（故整段搬移／重建皆安全，不違節點重用鐵律）。同一
 * 拖曳手勢全程只有一個實例（`ensureDropGap` 依目的容器型別〔`<ol>`→
 * `<li>`／其餘〔如暫存列 `<div>`〕→`<div>`〕惰性建立或重建），dragover
 * 期間隨指標位置以 `insertBefore` 在容器內搬移；drop／dragend 呼叫
 * `clearDropGap` 自 DOM 移除（見其文件）。
 */
let dropGapEl: HTMLElement | null = null
/**
 * dropGapEl 目前代表的落點（DropTarget，見其型別文件）——與 dropGapEl
 * 同步生滅（showDropGap 每次呼叫更新、clearDropGap 清空）。gap 自身的
 * drop handler（見 ensureDropGap）據此得知該提交到哪一列（真實列或暫存
 * 空列），因其為單一共用節點、可能於同一拖曳手勢中橫跨不同列容器（列
 * 群組 ↔ 暫存空列）移動，無法用建立時的閉包固定落點（對比
 * wireRowContainerDrop／wirePendingRowDrop 掛在恆定容器上、target 可安全
 * 閉包）。T5.14：由單一 `number`（列號）升級為 DropTarget（位置制下拖至
 * 中間暫存列須以 slotIndex 而非列號表達）。
 */
let dropGapTarget: DropTarget | null = null
/**
 * T5.6 驗收修復：`body.is-segment-dragging` 改為延遲一幀（`requestAnimationFrame`）
 * 才加上（見 wireDragAndDrop dragstart handler 文件其緣由），本欄位存放待執行
 * rAF 的 id，供 dragend 在極短拖曳時取消（避免 callback 晚於 dragend 才執行、
 * 把 class 永久殘留在 body 上）。與 draggingId 同步生滅（dragstart 設值、
 * dragend 執行或取消後清空為 null）。
 */
let dragClassRafId: number | null = null
let pickerCounter = 0
let thresholdCounter = 0

/**
 * T5.9：segment id → 其 `config.segments` 內既有 SegmentConfig 物件參照
 * （init() 建立一次，config.segments 陣列大小／物件身分終生不變——僅
 * 內部欄位被 mutate，見 buildSegmentRows／buildCatalogItems 皆從同一份
 * config.segments 取物件參照）。左欄目錄 checkbox 的 change handler
 * （setSegmentEnabled）據此查得目標段物件並直接 mutate `enabled`／
 * `row`，與既有色選/前綴等控件「直接 mutate 閉包捕捉的 seg 物件」慣例
 * 一致（見 T5.3 commitConfig 文件「正確性關鍵」段落：絕不整批替換
 * config.segments 或其元素物件，否則既有控件的閉包會寫壞孤兒物件）。
 */
let segmentConfigById: Map<string, SegmentConfig>

/**
 * T5.14（PLAN Rev 11「列耗盡保留＋暫存列位置制」，取代 T5.9 計數制
 * `pendingRowCount`）：中欄「列」的 UI 位置制 slots（純 DOM 態、不進
 * config——config 恆無空列）。每個元素為 `'real'`（承載真實渲染列，其第
 * k 個 real ↔ normalizeRows 後 config 第 k 個渲染列）或 `'pending'`（純
 * UI 暫存空列，可落在中間）。slot 的**位置**即顯示列序（「第 N 列」＝
 * slot index + 1）。各變異點（commitSegmentMove／setSegmentEnabled／
 * performRowDeletion／wirePendingRowButton／removePendingRow）顯式維護，
 * layoutSegmentContainers 以 reconcileRealSlots 作防禦收斂（見 row-slots.ts）。
 */
let rowSlots: RowSlot[] = []

/**
 * T5.14 追修（協調者 CDP 實證 S4「空列成真＋來源耗盡抵銷」，2026-07-12）：
 * 上次已同步至 DOM 的 rowSlots（純值快照，非同一參照）——與 `lastRowGroups`
 * 同性質的「已渲染基準」，commitConfig 據此以 slotsEqual 判斷 slots 是否
 * 實際變動（見 commitConfig 之重繪閘門文件：`rowGroupsEqual` 為真時 slots
 * 仍可能已變，如「指派入某空列」的 real+1 與「來源列同幀耗盡」的 real-1
 * 恰好抵銷、真實分組結構前後完全相同，僅靠 rowGroupsEqual 會漏重繪）。
 * layoutSegmentContainers 末端與 lastRowGroups 同點更新
 * （`lastRenderedSlots = rowSlots`）；不經 commitConfig 的兩條 slots 變異
 * 路徑（wirePendingRowButton／removePendingRow，直接重繪不經
 * layoutSegmentContainers）亦須各自同步更新，見其文件。初始為空陣列
 * （尚未同步過，同 lastRowGroups 慣例）。
 */
let lastRenderedSlots: RowSlot[] = []

/** segment id → 左欄目錄項 <li>（一次建置、永不重排——見 buildCatalogItems）。 */
const catalogItemElements = new Map<string, HTMLLIElement>()

/** segment id → 左欄目錄項的啟停 checkbox（唯一啟停入口，見 setSegmentEnabled）。 */
const catalogCheckboxElements = new Map<string, HTMLInputElement>()

/** segment id → 其列 <li>（重排以移動節點、保留內部接線與焦點，不重建）。 */
const rowElements = new Map<string, HTMLLIElement>()

/**
 * T5.4：segment id → 其「顯示於第 N 列」select（於 buildSegmentRow 建立
 * 一次，不隨列變動重建；refreshRowSelects 只原地更新既有 select 的
 * <option> 集合，見 row-select.ts）。T5.9：每段獨立「新增一列」按鈕
 * （原與 select 同放於此 map 的 value）已移除，map value 簡化為 select
 * 節點本身。
 */
const rowSelectElements = new Map<string, HTMLSelectElement>()

/**
 * T5.5：segment id → 其上/下移鈕（於 buildSegmentRow 建立一次，不隨列
 * 變動重建）。refreshMoveButtonStates 於分組/順序變動後（layoutSegment
 * Containers 內）依各列子序列位置同步兩鈕的 disabled 態（列首/列末停用、
 * 維持可見）。
 */
const moveButtonElements = new Map<string, { up: HTMLButtonElement; down: HTMLButtonElement }>()

/**
 * T5.3：目前的列群組容器（索引＝渲染列序，0-index、恆連續——由
 * applyRowNormalization 於每次 commitConfig／init 時維持啟用段 row 值
 * 連續 0..N-1，見下）。growRowGroupContainers／shrinkRowGroupContainers
 * 依渲染列數增減維護此陣列與其 DOM（#segment-row-groups 底下的
 * .segment-row-group <section>）。容器一經建立，其在本陣列的索引（＝
 * 渲染列序）終生穩定（growRowGroupContainers 僅於末端新增、
 * shrinkRowGroupContainers 僅自末端移除）——`deleteTrigger`（T5.11：
 * 「刪除此列」鈕，見 wireRowDeleteButton）之 click handler 於建立時以
 * 該索引為閉包，故無需在容器存活期間重新綁定。
 */
const rowGroupContainers: { section: HTMLElement; ol: HTMLOListElement; deleteTrigger: HTMLButtonElement }[] = []

/**
 * 上次已同步至 DOM 的分組結果（純函式 computeRowGroups 輸出）；commitConfig
 * 據此與最新分組結果比較（rowGroupsEqual），僅於「分組實際變動」時才重跑
 * 列群組容器生命週期／跨容器搬移（PLAN §D2 正規化接線 Rev 2 釘死：與 row
 * 無關的 commit 不得觸發全體刷新）。初始為空陣列（尚未同步過）。
 */
let lastRowGroups: RowGroup[] = []

/** 最新三產物字串（複製鈕來源）。 */
const lastOutputs = { bash: '', ps1: '', settings: '' }

/** 三下載鈕的既有 Blob URL（換發前撤銷，避免洩漏）。 */
const downloadState: Record<'bash' | 'ps1' | 'settings', string | null> = {
  bash: null,
  ps1: null,
  settings: null,
}

// ── DOM 取得工具 ──

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (el === null) throw new Error(`缺少必要節點 #${id}`)
  return el as T
}

function queryOne<T extends HTMLElement = HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector)
  if (el === null) throw new Error(`缺少必要節點 ${selector}`)
  return el
}

function outputCode(preId: string): HTMLElement {
  const code = byId(preId).querySelector('code')
  if (code === null) throw new Error(`#${preId} 缺少 <code>`)
  return code
}

function contextSpan(scope: Element): HTMLElement {
  const span = scope.querySelector<HTMLElement>('.control-name-context')
  if (span === null) throw new Error('缺少 .control-name-context')
  return span
}

/**
 * 顯隱切換：只切 `hidden` 屬性（同時移除 a11y tree ＋視覺隱藏）。src/style.css
 * reset 的 `[hidden]{display:none!important}` 已根治「作者 display:flex／
 * inline-block 蓋過 UA `[hidden]{display:none}`」的舊坑（CR3 裁定根治），故不再
 * 需 inline display workaround；一併消除 #separator-custom-field 的 pre-JS 閃現與
 * threshold panel 初始態的僥倖依賴（元素初始帶 hidden 即由 reset 規則收合）。
 */
function setHidden(el: HTMLElement, hidden: boolean): void {
  el.hidden = hidden
}

// ── 固定節點（頁面既有；main.ts 直接 query，見 .t31-report §3a） ──

const errorMessageEl = byId('error-message')
const globalLiveStatusEl = byId('global-live-status')
const modePlainEl = byId<HTMLInputElement>('mode-plain')
const modePowerlineEl = byId<HTMLInputElement>('mode-powerline')
const separatorPresetEl = byId<HTMLSelectElement>('separator-preset')
const separatorCustomFieldEl = byId('separator-custom-field')
const separatorCustomEl = byId<HTMLInputElement>('separator-custom')
const powerlineArrowEl = byId<HTMLInputElement>('powerline-arrow')
const lastArrowCapEl = byId<HTMLInputElement>('last-arrow-cap')
const powerlineNoBoundaryHintEl = byId('powerline-no-boundary-hint')
const settingsPathEl = byId<HTMLInputElement>('settings-path')
const segmentMoveStatusEl = byId('segment-move-status')
const previewBgDarkEl = byId<HTMLInputElement>('preview-bg-dark')
const previewBgLightEl = byId<HTMLInputElement>('preview-bg-light')
const previewTerminalEl = byId('preview-terminal')
const outputStatusEl = byId('output-status')
const copyBashEl = byId<HTMLButtonElement>('copy-bash')
const copyPs1El = byId<HTMLButtonElement>('copy-ps1')
const copySettingsEl = byId<HTMLButtonElement>('copy-settings')
const downloadBashEl = byId<HTMLAnchorElement>('download-bash')
const downloadPs1El = byId<HTMLAnchorElement>('download-ps1')
const downloadSettingsEl = byId<HTMLAnchorElement>('download-settings')
const outputBashCodeEl = outputCode('output-bash')
const outputPs1CodeEl = outputCode('output-ps1')
const outputSettingsCodeEl = outputCode('output-settings')
// segment 清單容器（無 id，以 class 取得）：mode 切換時作焦點移轉目標。
const segmentListsEl = queryOne<HTMLElement>('.segment-lists')
// T5.3：啟用段依渲染列分組的容器掛載點（雙區清單之「啟用區」；列群組
// <section> 由 main.ts 動態生成/銷毀於此節點下，見 index.html 註解）。
const segmentRowGroupsEl = byId('segment-row-groups')
// T5.14：UI 暫存空列不再有獨立容器（#segment-pending-rows 已移除）——
// 位置制下暫存列 <div> 依 slots 位置插進 #segment-row-groups 內（可落在
// 真實列之間），見 renderPendingRowContainers。
// T5.9：中欄頂部單一「新增一列」按鈕（取代 T5.4 每段獨立按鈕）。
const addPendingRowEl = byId<HTMLButtonElement>('add-pending-row')
// T5.9：停用段完整控件列的隱藏池（display:none，不銷毀；見其自身註解）。
const segmentHiddenPoolEl = byId('segment-hidden-pool')

// 主題切換鈕 wiring：模組層級立即執行，早於下方 init()（無論 init() 是同步
// 立即跑或掛在 DOMContentLoaded，這行都先執行——見上方 import 註解）。
initThemeToggle(queryOne<HTMLButtonElement>('.theme-toggle'))

const SEGMENT_LIST_BY_CATEGORY: Record<SegmentCategory, HTMLOListElement> = {
  always: byId<HTMLOListElement>('segment-list-always'),
  percentage: byId<HTMLOListElement>('segment-list-percentage'),
  conditional: byId<HTMLOListElement>('segment-list-conditional'),
  'shell-out': byId<HTMLOListElement>('segment-list-shellout'),
}

// ── <template> 實例化（token 取代；見 .t31-report §3e） ──

/**
 * clone 指定 <template> 並把其中所有 token（`__ID__`／`__PID__`／`__TID__`，
 * 只出現於屬性值、不出現於可見文字）替換為唯一 key，回傳根元素。
 */
function instantiateTemplate(templateId: string, token: string, key: string): HTMLElement {
  const template = byId<HTMLTemplateElement>(templateId)
  const wrapper = document.createElement('template')
  wrapper.innerHTML = template.innerHTML.replaceAll(token, key)
  const root = wrapper.content.firstElementChild
  if (root === null) throw new Error(`template #${templateId} 無根元素`)
  return root as HTMLElement
}

// ── 訊息／播報 ──

function showError(message: string): void {
  errorMessageEl.classList.remove('is-empty')
  errorMessageEl.textContent = message
}

function clearError(): void {
  errorMessageEl.classList.add('is-empty')
  errorMessageEl.textContent = ''
}

/** 全域提醒（mode 切換顏色語意翻轉、閾值模板批次套用）。 */
function announceGlobal(text: string): void {
  globalLiveStatusEl.textContent = text
}

/** segment 排序後位置回饋（與全域提醒分流，避免頻繁移位淹沒重要提醒）。 */
function announceMove(text: string): void {
  segmentMoveStatusEl.textContent = text
}

/** 複製／下載成功回饋。 */
function announceOutput(text: string): void {
  outputStatusEl.classList.remove('is-empty')
  outputStatusEl.textContent = text
}

// ── 輸入驗證（validate.ts 拒收集 R，含 PUA 單一咽喉） ──

function validateUserText(value: string): { ok: true } | { ok: false; message: string } {
  const result = validateCustomText(value)
  if (!result.ok) return { ok: false, message: REJECT_MESSAGES[result.reason] }
  // PUA 已併入 validateCustomText（reason 'pua'）為主防線——config 清洗與此
  // UI 驗證單一咽喉共擋。resolve.containsPua 於此保留為第二道（防未來 validate
  // 回歸；命中回同一 pua 文案），正常情況下 value 已無 PUA、此支不觸發。
  if (containsPua(value)) return { ok: false, message: PUA_REJECT_MESSAGE }
  return { ok: true }
}

// ── 色選元件（SP-6 pattern B：16 swatch＋0–255 spinbutton＋原生 color） ──

function specToMode(spec: ColorSpec): ColorMode {
  return spec.kind === 'default' ? 'default' : spec.kind === 'ansi256' ? 'ansi256' : 'truecolor'
}

/**
 * 生成一個色選實例（clone #color-picker-template）。nameContext＝群組可及
 * 名稱（legend），initial＝起始 ColorSpec，onChange＝使用者實際變更時回呼
 * （程式化 setValue 不回呼）。
 */
function createColorPicker(
  nameContext: string,
  initial: ColorSpec,
  onChange: (spec: ColorSpec) => void,
): ColorPickerHandle {
  const pid = `sb-pick-${(pickerCounter += 1)}`
  const root = instantiateTemplate('color-picker-template', '__PID__', pid)

  contextSpan(root.querySelector('.color-picker__legend')!).textContent = nameContext

  const modeRadios = Array.from(root.querySelectorAll<HTMLInputElement>('.color-picker__mode'))
  const ansiPanel = root.querySelector<HTMLElement>('[data-mode-panel="ansi256"]')!
  const truePanel = root.querySelector<HTMLElement>('[data-mode-panel="truecolor"]')!
  const swatchContainer = root.querySelector<HTMLElement>('[data-swatch-container]')!
  const spinControl = root.querySelector<HTMLElement>('.color-spinbutton__control')!
  const spinValue = root.querySelector<HTMLElement>('.color-spinbutton__value')!
  const decBtn = root.querySelector<HTMLButtonElement>('.color-spinbutton__dec')!
  const incBtn = root.querySelector<HTMLButtonElement>('.color-spinbutton__inc')!
  const previewChip = root.querySelector<HTMLElement>('.color-swatch--preview')!
  const nativeInput = root.querySelector<HTMLInputElement>('.color-picker__native')!

  let mode: ColorMode = 'default'
  let ansiIndex = 0
  let hex = '#000000'

  // 16 基本色 swatch（radio；accessible name＝ansi256SwatchName，chip 裝飾）。
  const swatchInputs: HTMLInputElement[] = []
  for (let i = 0; i < 16; i++) {
    const label = document.createElement('label')
    label.className = 'color-swatch'
    const input = document.createElement('input')
    input.type = 'radio'
    input.name = `${pid}-swatch`
    input.value = String(i)
    input.setAttribute('aria-label', ansi256SwatchName(i))
    const chip = document.createElement('span')
    chip.className = 'color-swatch__chip'
    chip.setAttribute('aria-hidden', 'true')
    chip.style.backgroundColor = ansi256ToHex(i)
    label.append(input, chip)
    input.addEventListener('change', () => {
      if (!input.checked) return
      setAnsiIndex(i)
      report()
    })
    swatchContainer.appendChild(label)
    swatchInputs.push(input)
  }

  function syncSwatchChecked(): void {
    for (let i = 0; i < swatchInputs.length; i++) {
      swatchInputs[i].checked = mode === 'ansi256' && ansiIndex === i
    }
  }

  function updateAnsiUi(): void {
    spinControl.setAttribute('aria-valuenow', String(ansiIndex))
    spinControl.setAttribute('aria-valuetext', ansi256SwatchName(ansiIndex))
    spinValue.textContent = String(ansiIndex)
    previewChip.style.backgroundColor = ansi256ToHex(ansiIndex)
    syncSwatchChecked()
  }

  function setAnsiIndex(next: number): void {
    ansiIndex = clampAnsi256Index(next)
    updateAnsiUi()
  }

  function currentSpec(): ColorSpec {
    if (mode === 'ansi256') return { kind: 'ansi256', index: ansiIndex }
    if (mode === 'truecolor') return { kind: 'truecolor', hex }
    return { kind: 'default' }
  }

  function report(): void {
    onChange(currentSpec())
  }

  function applyMode(next: ColorMode): void {
    mode = next
    setHidden(ansiPanel, mode !== 'ansi256')
    setHidden(truePanel, mode !== 'truecolor')
    for (const radio of modeRadios) radio.checked = radio.value === mode
    syncSwatchChecked()
  }

  for (const radio of modeRadios) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return
      applyMode(radio.value as ColorMode)
      report()
    })
  }

  // spinbutton：↑/↓（±1）、PageUp/Down（±16）、Home/End（0/255）、數字直入。
  let typeBuffer = ''
  let typeTimer: number | undefined
  spinControl.addEventListener('keydown', (event) => {
    let handled = true
    if (event.key === 'ArrowUp') setAnsiIndex(ansiIndex + 1)
    else if (event.key === 'ArrowDown') setAnsiIndex(ansiIndex - 1)
    else if (event.key === 'PageUp') setAnsiIndex(ansiIndex + 16)
    else if (event.key === 'PageDown') setAnsiIndex(ansiIndex - 16)
    else if (event.key === 'Home') setAnsiIndex(0)
    else if (event.key === 'End') setAnsiIndex(255)
    else if (/^[0-9]$/.test(event.key)) {
      typeBuffer += event.key
      setAnsiIndex(Number.parseInt(typeBuffer, 10))
      window.clearTimeout(typeTimer)
      typeTimer = window.setTimeout(() => {
        typeBuffer = ''
      }, 900)
    } else {
      handled = false
    }
    if (handled) {
      event.preventDefault()
      report()
    }
  })

  decBtn.addEventListener('click', () => {
    setAnsiIndex(ansiIndex - 1)
    report()
  })
  incBtn.addEventListener('click', () => {
    setAnsiIndex(ansiIndex + 1)
    report()
  })

  nativeInput.addEventListener('input', () => {
    hex = normalizeHex(nativeInput.value) ?? '#000000'
    report()
  })

  function setValue(spec: ColorSpec): void {
    if (spec.kind === 'ansi256') ansiIndex = clampAnsi256Index(spec.index)
    if (spec.kind === 'truecolor') {
      hex = spec.hex
      nativeInput.value = spec.hex
    }
    applyMode(specToMode(spec))
    updateAnsiUi()
  }

  setValue(initial)

  return { element: root, setValue }
}

// ── 閾值編輯器（disclosure；10 桶各一色選；模板批次套用） ──

function buildThresholdEditor(
  mount: HTMLElement,
  seg: SegmentConfig,
  descriptor: SegmentDescriptor,
): void {
  const tid = `sb-th-${(thresholdCounter += 1)}`
  const root = instantiateTemplate('threshold-editor-template', '__TID__', tid)

  const toggle = root.querySelector<HTMLButtonElement>('.threshold__toggle')!
  const panel = root.querySelector<HTMLElement>('.threshold__panel')!
  const templateSelect = root.querySelector<HTMLSelectElement>('.threshold__template')!
  const bucketContainer = root.querySelector<HTMLElement>('[data-bucket-container]')!

  contextSpan(toggle).textContent = `${descriptor.label} 閾值 `
  contextSpan(templateSelect.closest('.threshold__template-field')!).textContent = `${descriptor.label} 閾值 `

  // disclosure：展開才進 tab 序；播報＋展開時焦點移入面板首控件。
  toggle.addEventListener('click', () => {
    const next = toggle.getAttribute('aria-expanded') !== 'true'
    toggle.setAttribute('aria-expanded', String(next))
    setHidden(panel, !next)
    announceGlobal(`${descriptor.label} 閾值設定已${next ? '展開' : '收合'}`)
    if (next) templateSelect.focus()
  })

  // 10 桶色選（0–9%…90–100%；legend 承載「<段名> 閾值 <範圍>」＝控件命名）。
  const bucketHandles: ColorPickerHandle[] = []
  for (let i = 0; i < THRESHOLD_BUCKET_COUNT; i++) {
    const low = i * 10
    const high = i === THRESHOLD_BUCKET_COUNT - 1 ? 100 : i * 10 + 9
    const range = `${low}–${high}%`
    const initial = seg.threshold?.buckets[i] ?? { kind: 'default' }
    const handle = createColorPicker(`${descriptor.label} 閾值 ${range}`, initial, (spec) => {
      // 逐桶手改 → 材料化 threshold（若尚無）並回填；模板標記回「（自訂）」。
      updateBucket(seg, i, spec)
      templateSelect.value = ''
    })
    bucketContainer.appendChild(handle.element)
    bucketHandles.push(handle)
  }

  // 模板套用＝批次寫 10 桶＋更新 10 色選＋常駐 live region 播報。
  templateSelect.addEventListener('change', () => {
    const value = templateSelect.value
    if (value === '') return // 「（自訂）」為狀態標記、非動作。
    const template = THRESHOLD_TEMPLATES[value as ThresholdTemplateId]
    const buckets = [...template.buckets] as ColorSpec[]
    seg.threshold = { buckets: buckets as unknown as ThresholdBuckets }
    for (let i = 0; i < THRESHOLD_BUCKET_COUNT; i++) bucketHandles[i].setValue(buckets[i])
    const label = templateSelect.options[templateSelect.selectedIndex]?.textContent ?? value
    announceGlobal(`已套用${label}，10 段顏色已更新`)
    commitConfig()
  })

  mount.appendChild(root)
}

/** 逐桶寫入（材料化 threshold 為恰 10 桶不可變 tuple）。 */
function updateBucket(seg: SegmentConfig, index: number, spec: ColorSpec): void {
  const buckets: ColorSpec[] = seg.threshold
    ? [...seg.threshold.buckets]
    : Array.from({ length: THRESHOLD_BUCKET_COUNT }, () => ({ kind: 'default' }) as ColorSpec)
  buckets[index] = spec
  seg.threshold = { buckets: buckets as unknown as ThresholdBuckets }
  commitConfig()
}

// ── segment 目錄（左欄，輕量常駐項；T5.9） ──

/**
 * 建立單一左欄目錄項（clone #catalog-item-template）。checkbox 為唯一
 * 啟停入口：change → setSegmentEnabled（mutate config、切換本項灰化態＋
 * 中欄完整控件列的容器歸屬）。本函式只建立節點與接線，不設初始
 * checked／灰化態——由呼叫端 buildCatalogItems 依 catalog.ts 之
 * buildCatalogGroups 計算結果統一設定（單一事實來源，避免兩處各自
 * 判斷 enabled 而漂移）。
 */
function buildCatalogItem(id: string, label: string): HTMLLIElement {
  const li = instantiateTemplate('catalog-item-template', '__CID__', id) as HTMLLIElement
  li.dataset.segmentId = id
  const checkbox = li.querySelector<HTMLInputElement>('.catalog-item__checkbox')!
  li.querySelector<HTMLElement>('.catalog-item__name')!.textContent = label
  checkbox.addEventListener('change', () => setSegmentEnabled(id, checkbox.checked))
  catalogCheckboxElements.set(id, checkbox)
  catalogItemElements.set(id, li)
  return li
}

/**
 * 建置左欄四類目錄（一次性，init() 呼叫；目錄項本身終生不重建、不重排
 * ——見 PLAN §D3-R4「目錄順序恆定…永不重排、無拖曳」）。分組與 view-
 * model 計算交給 catalog.ts 之 buildCatalogGroups 純函式（依
 * SEGMENT_DESCRIPTORS 目錄定義序，非 config.segments 陣列序，見其
 * 文件），本函式只機械消費輸出、掛載 DOM。
 */
function buildCatalogItems(): void {
  for (const category of SECTION_ORDER) SEGMENT_LIST_BY_CATEGORY[category].textContent = ''
  catalogCheckboxElements.clear()
  catalogItemElements.clear()
  const groups = buildCatalogGroups(SEGMENT_DESCRIPTORS, config.segments, SECTION_ORDER)
  for (const category of SECTION_ORDER) {
    for (const item of groups[category]) {
      const li = buildCatalogItem(item.id, item.label)
      catalogCheckboxElements.get(item.id)!.checked = item.enabled
      li.classList.toggle('catalog-item--enabled', item.enabled)
      setHidden(li.querySelector<HTMLElement>('.catalog-item__badge')!, !item.enabled)
      SEGMENT_LIST_BY_CATEGORY[category].appendChild(li)
    }
  }
}

/**
 * 段啟停狀態的視覺同步（T5.9 抽出、T5.11 擴充）：原地更新左欄目錄項
 * （灰化＋徽章＋ checkbox 勾選態）與中欄完整控件列（.segment-row--enabled
 * class／移位鈕欄／移除鈕顯隱）——皆為既有節點原地更新，不搬移、不重建
 * （中欄 <li> 的實際容器歸屬〔列群組 ↔ 隱藏池〕交由 commitConfig →
 * layoutSegmentContainers 的分組變動偵測統一處理，見其文件）。純 DOM
 * 同步，**不** mutate SegmentConfig、**不**呼叫 commitConfig／不處理焦點
 * ——供 setSegmentEnabled（單段、逐次 commit＋回焦）與 performRowDeletion
 * （T5.11：整列批次停用、單次 commit，見其文件「避免 N 次 relayout」）
 * 共用。
 *
 * checkbox.checked 同步（T5.6 UI 驗收期間發現，2026-07-11 補）：T5.11
 * 新增的「中欄 ✕ 移除」／「整列刪除」兩條停用路徑皆繞過左欄 checkbox 本身
 * （不像使用者直接點 checkbox 時，瀏覽器已原生先切換其 .checked 才觸發
 * change），故本函式須顯式補 `checkbox.checked = enabled`，否則左欄勾勾
 * 會殘留與 seg.enabled 不一致的視覺假象。程式設定 `.checked` 屬性**不會**
 * 觸發 change 事件（僅使用者互動或 `.click()` 才會）——故此處賦值不會
 * 迴圈呼叫 buildCatalogItem 的 change handler、不會重入 setSegmentEnabled。
 */
function syncSegmentEnabledUi(id: string, enabled: boolean): void {
  const rowLi = rowElements.get(id)
  if (rowLi !== undefined) {
    rowLi.classList.toggle('segment-row--enabled', enabled)
    const moveField = rowLi.querySelector<HTMLElement>('.segment-row__move')
    if (moveField !== null) setHidden(moveField, !enabled)
    const removeBtn = rowLi.querySelector<HTMLElement>('.segment-row__remove')
    if (removeBtn !== null) setHidden(removeBtn, !enabled)
  }

  const catalogLi = catalogItemElements.get(id)
  if (catalogLi !== undefined) {
    catalogLi.classList.toggle('catalog-item--enabled', enabled)
    const badge = catalogLi.querySelector<HTMLElement>('.catalog-item__badge')
    if (badge !== null) setHidden(badge, !enabled)
  }

  const checkbox = catalogCheckboxElements.get(id)
  if (checkbox !== undefined) checkbox.checked = enabled
}

/**
 * 段啟停的唯一入口（T5.9；取代原 buildSegmentRow 內 li 自身 enable
 * checkbox 的 change handler）：mutate `segmentConfigById` 查得的既有
 * SegmentConfig 物件參照（非替換物件本身，理由同 applyRowNormalization
 * 「正確性關鍵」註解——既有控件閉包握著同一物件參照）；啟用時比照原邏輯
 * 先套用 clampReenableRow（見其文件，須在 commitConfig 的 normalizeRows
 * 升冪壓縮介入前完成）；接著呼叫 syncSegmentEnabledUi 原地同步視覺；
 * 最後 commitConfig 並顯式回焦左欄 checkbox（連續勾選 N 段時焦點不跳失
 * ——PLAN 驗收語意）。
 *
 * T5.11（PLAN §排序與列指派 UX Rev 6「中欄每段『移除』鈕」）：移除鈕
 * （removeSegment）與左欄目錄取消勾選走**同一路徑**——皆呼叫本函式
 * （enabled=false），故回焦左欄 checkbox 之焦點策略對兩者一致（「回歸
 * 位」語意：使用者無論從左欄取消或中欄移除，皆回到左欄可再次勾選的
 * 位置，不落 body）。
 *
 * T5.6 UI 驗收回饋（2026-07-11，兩欄斷點 ~1100–1400px「目錄＋已選擇」
 * 上下堆疊於左欄）：中欄「✕ 移除」鈕距目錄區可能有一整欄之遙，
 * `.focus()` 預設會捲動視口至目標可見處，導致滑鼠使用者按下 ✕ 後畫面
 * 跳離原操作點（取消動作預期停留原地）。裁決＝依輸入模態區分：
 * `preventScroll=true`（滑鼠觸發，呼叫端依 click 事件 detail>0 判斷）
 * 時改用 `focus({ preventScroll: true })`——焦點語意與 SR 播報不變、
 * 但不捲動視口；鍵盤觸發（Enter/Space 合成 click，detail===0）維持
 * `preventScroll=false`（預設 focus() 行為），讓鍵盤使用者仍能看到
 * 焦點落點。左欄 checkbox 自身取消勾選（見 buildCatalogItem 的
 * change handler）呼叫本函式時不傳第三參數＝ false——該路徑的回焦
 * 目標與觸發元素相同（checkbox 取消勾選當下已持有焦點），不會捲動，
 * 故不需模態區分。
 */
function setSegmentEnabled(id: string, enabled: boolean, preventScroll = false): void {
  const seg = segmentConfigById.get(id)
  if (seg === undefined) return

  if (!enabled) {
    // T5.14：✕移除／左欄取消勾選——若該段是其列唯一啟用段（該列即將
    // 消失），維持**壓縮語意**：removeSlotAt 於該真實列的 slot 位置移除、
    // 不留空列（Rev 11 明文——與拖曳搬空的「原地保留」不同語意）。於
    // commitConfig 前做（此刻 rowSlots／config 尚為停用前狀態，slot 位置
    // 正確）。
    const row = seg.row ?? 0
    const drains = !config.segments.some(
      (other) => other.id !== id && other.enabled && (other.row ?? 0) === row,
    )
    if (drains) rowSlots = removeSlotAt(rowSlots, slotIndexOfRealRow(rowSlots, row))
  }

  seg.enabled = enabled
  if (enabled) {
    const clamped = clampReenableRow(seg.row, lastRowGroups.length)
    if (clamped === undefined) delete seg.row
    else seg.row = clamped
    // T5.14：僅當啟用前尚無任何渲染列（lastRowGroups.length === 0，此段
    // 即首個啟用段、渲染列 0→1）時於 slot 0 插入 'real'；其他啟用情形
    // clampReenableRow 保證落入既有列、不成長渲染列數，slots 不動。
    if (lastRowGroups.length === 0) rowSlots = ['real', ...rowSlots]
  }

  syncSegmentEnabledUi(id, enabled)

  commitConfig()
  catalogCheckboxElements.get(id)?.focus(preventScroll ? { preventScroll: true } : undefined)
}

/**
 * T5.11（PLAN §排序與列指派 UX Rev 6「中欄每段『移除』鈕」）：中欄控件列
 * 「移除」鈕的入口——走 setSegmentEnabled(id, false) 同一路徑（含焦點回
 * 左欄 checkbox），額外補一則 #segment-move-status 播報「〈段名〉已從
 * 清單移除」（checkbox 取消勾選本身不額外播報——取消動作的語意已由
 * checkbox unchecked 狀態呈現；移除鈕則是使用者於中欄的「隱性」操作，
 * 段從中欄消失需明確告知去向）。
 *
 * `preventScroll`（T5.6 UI 驗收回饋，見 setSegmentEnabled 文件）：呼叫端
 * （removeBtn click handler）依 MouseEvent.detail 判斷輸入模態後轉交，
 * 本函式只原樣透傳，不自行判斷。
 */
function removeSegment(id: string, preventScroll: boolean): void {
  const descriptor = DESCRIPTORS_BY_ID[id as SegmentId]
  setSegmentEnabled(id, false, preventScroll)
  announceMove(`${descriptor.label} 已從清單移除`)
}

// ── segment 列（複合控件） ──

function buildSegmentRow(seg: SegmentConfig, descriptor: SegmentDescriptor): HTMLLIElement {
  const li = instantiateTemplate('segment-row-template', '__ID__', descriptor.id) as HTMLLIElement
  li.dataset.segmentId = descriptor.id

  // T5.9：段名為純視覺標籤（啟停唯一入口＝左欄目錄 checkbox，見
  // buildCatalogItem／setSegmentEnabled，本列自身不再有 enable
  // checkbox）。
  li.querySelector<HTMLElement>('.segment-row__name')!.textContent = descriptor.label
  li.classList.toggle('segment-row--enabled', seg.enabled)
  // T5.5：上/下移鈕移至 .segment-row__enable-field 尾端（不在自動收合的
  // .segment-row__controls 塊內），故顯隱須於此與 setSegmentEnabled 內
  // 顯式同步（僅啟用列顯示；見 index.html 模板註解 10.）。
  const moveField = li.querySelector<HTMLElement>('.segment-row__move')!
  setHidden(moveField, !seg.enabled)

  // 上/下移鈕（鍵盤等效；aria-label＝段名＋角色）；T5.5：列首/列末停用態
  // 由 refreshMoveButtonStates（分組/順序變動後）同步，此處僅建立節點與
  // 事件、存進 moveButtonElements 供該函式查找。
  const moveUp = li.querySelector<HTMLButtonElement>('.segment-row__move-up')!
  const moveDown = li.querySelector<HTMLButtonElement>('.segment-row__move-down')!
  moveUp.setAttribute('aria-label', `${descriptor.label} — 上移`)
  moveDown.setAttribute('aria-label', `${descriptor.label} — 下移`)
  moveUp.addEventListener('click', () => moveSegment(descriptor.id, 'up'))
  moveDown.addEventListener('click', () => moveSegment(descriptor.id, 'down'))
  moveButtonElements.set(descriptor.id, { up: moveUp, down: moveDown })

  // T5.11：移除鈕——與上/下移鈕同屬 .segment-row__enable-field（不在
  // .segment-row__controls 收合塊內），顯隱須於此與 setSegmentEnabled／
  // syncSegmentEnabledUi 內顯式同步（僅啟用列顯示；見 index.html 模板
  // 註解 12.）。
  const removeBtn = li.querySelector<HTMLButtonElement>('.segment-row__remove')!
  removeBtn.setAttribute('aria-label', `${descriptor.label} — 從清單移除`)
  setHidden(removeBtn, !seg.enabled)
  // T5.6 UI 驗收回饋（2026-07-11）：以 MouseEvent.detail 區分輸入模態
  // ——瀏覽器原生語意，真滑鼠點擊 detail 恆 ≥1（連按次數），鍵盤
  // Enter/Space 觸發之合成 click 事件 detail 恆為 0。滑鼠觸發時回焦
  // 左欄 checkbox 改 preventScroll（見 removeSegment／setSegmentEnabled
  // 文件），修正兩欄堆疊斷點下視口捲動跳躍；鍵盤觸發維持可捲動。
  removeBtn.addEventListener('click', (event) => removeSegment(descriptor.id, event.detail > 0))

  // T5.4／T5.9（PLAN §D2「列選擇 UI」／§D3-R4「新增一列（第三修）」）：
  // 「顯示於第 N 列」select（S7 裁決：新增一列不放進 select option，
  // 避免 Windows 閉合 select 方向鍵導航逐按即提交造成無限誤觸建列；
  // T5.9 起改中欄頂部單一按鈕，見 wirePendingRowButton）。select 的
  // <option> 集合本身於此僅建立空殼——實際內容由 refreshRowSelects
  // （分組或暫存列數實際變動時才呼叫）以 row-select.ts 之
  // computeRowSelectOptionOps 原地填入/更新（枚舉含暫存列），不在此處
  // 預先枚舉（此刻尚不知全域列數）。
  const rowSelect = li.querySelector<HTMLSelectElement>('.segment-row__row-select')!
  contextSpan(rowSelect.closest('.segment-row__field')!).textContent = `${descriptor.label} — `
  rowSelectElements.set(descriptor.id, rowSelect)
  // T5.14：select value 現為 **slot index**（非渲染列序）——依 rowSlots
  // 判定該 slot 為 real／pending，轉為 DropTarget 交統一移動入口
  // commitSegmentMove（與拖曳同語意：來源列搬空則原地保留空列、指入
  // 中間空列則於該位置插入真實列，見其文件）。
  //
  // MAGI code review I-1（magi/07-statusline-multirow-layout/MAGI_CODE_
  // REVIEW.md，2026-07-12 使用者裁決「修」）：commitSegmentMove →
  // layoutSegmentContainers 以 appendChild 把該段 `<li>`（含此 select）
  // 重新定位至目標容器——聚焦中的 select 因此 blur，若不顯式回焦會落
  // body（PLAN Rev 5 明訂 select 為鍵盤跨列路徑之一；S7 spike 實證
  // Windows 閉合 select 方向鍵導航逐按即提交，落 body 即斷航，等同鍵盤
  // 陷阱）。回焦目標＝select 自身（節點重用：appendChild 搬移不銷毀，
  // rowSelectElements 持有的仍是同一節點）；select 觸發本質上鍵盤／滑鼠
  // 皆可能，但回焦自身不會造成視口跳躍疑慮——它只是換了容器、頁面內位置
  // 通常仍在可視範圍附近，不比照 setSegmentEnabled／removeSegment 的
  // preventScroll 模態區分。
  rowSelect.addEventListener('change', () => {
    const slotIndex = Number.parseInt(rowSelect.value, 10)
    if (Number.isNaN(slotIndex)) return
    if (rowSlots[slotIndex] === 'pending') {
      commitSegmentMove(descriptor.id, { kind: 'pending', slotIndex }, undefined)
    } else {
      commitSegmentMove(descriptor.id, { kind: 'real', row: realIndexOfSlot(rowSlots, slotIndex) }, undefined)
    }
    rowSelectElements.get(descriptor.id)?.focus()
  })

  // 顯示文字 checkbox（T5.12 措辭更名；M1.5 起 icon.glyph 皆 ASCII 文字前綴）。
  const iconInput = li.querySelector<HTMLInputElement>('.segment-row__icon')!
  contextSpan(iconInput.closest('.segment-row__field')!).textContent = `${descriptor.label} — `
  iconInput.checked = seg.icon
  iconInput.addEventListener('change', () => {
    seg.icon = iconInput.checked
    commitConfig()
  })

  // 前綴（≤8；過 validate.ts＋PUA 補判；拒收→role=alert）。
  const prefixInput = li.querySelector<HTMLInputElement>('.segment-row__prefix')!
  contextSpan(prefixInput.closest('.segment-row__field')!).textContent = `${descriptor.label} — `
  prefixInput.value = seg.prefix ?? ''
  prefixInput.addEventListener('input', () => {
    const result = validateUserText(prefixInput.value)
    if (!result.ok) {
      showError(`前綴${result.message}`)
      return
    }
    clearError()
    seg.prefix = prefixInput.value === '' ? undefined : prefixInput.value
    commitConfig()
  })

  // variant（僅有 variants 之段保留；否則移除整組）。
  const variantField = li.querySelector<HTMLElement>('.segment-row__variant-field')!
  if (descriptor.variants !== undefined) {
    const variantSelect = li.querySelector<HTMLSelectElement>('.segment-row__variant')!
    contextSpan(variantField).textContent = `${descriptor.label} — `
    for (const variant of descriptor.variants) {
      const option = document.createElement('option')
      option.value = variant
      option.textContent = VARIANT_LABELS[variant] ?? variant
      variantSelect.appendChild(option)
    }
    variantSelect.value = seg.variant ?? descriptor.variants[0]
    variantSelect.addEventListener('change', () => {
      seg.variant = variantSelect.value
      commitConfig()
    })
  } else {
    variantField.remove()
  }

  // base 色（plain=前景／powerline=背景；mode 切換值不重映射）。
  const baseMount = li.querySelector<HTMLElement>('.segment-row__color-mount')!
  const basePicker = createColorPicker(`${descriptor.label} — 顏色`, seg.color, (spec) => {
    seg.color = spec
    commitConfig()
  })
  baseMount.appendChild(basePicker.element)

  // powerline 前景覆寫（「終端預設」態＝清除覆寫→回 auto-fg）。
  const fgMount = li.querySelector<HTMLElement>('.segment-row__fg-mount')!
  const fgPicker = createColorPicker(
    `${descriptor.label} — 前景色`,
    seg.fgOverride ?? { kind: 'default' },
    (spec) => {
      seg.fgOverride = spec.kind === 'default' ? undefined : spec
      commitConfig()
    },
  )
  fgMount.appendChild(fgPicker.element)

  // 閾值（僅百分比段）。
  const thresholdMount = li.querySelector<HTMLElement>('.segment-row__threshold-mount')!
  if (descriptor.category === 'percentage') {
    buildThresholdEditor(thresholdMount, seg, descriptor)
  } else {
    thresholdMount.remove()
  }

  wireDragAndDrop(li, descriptor)
  return li
}

// ── 插入點挪空間視覺（T5.11；PLAN §排序與列指派 UX Rev 6「插入點挪 ──
// ── 空間視覺」） ──

/**
 * 自 `node`（段 `<li>` 或插入點 gap placeholder 自身）之後，找下一個
 * 「真實段」id：跳過 placeholder gap（`.segment-drop-gap`）與
 * `excludeId`（通常為被拖曳段本身——同列相鄰情形下，其原位可能恰為
 * `node` 之後的下一個手足節點，須排除以免誤傳其 id 給
 * `computeCrossRowMove`，見其 no-op 防衛文件）。找不到（`node` 已是列尾
 * 前的最後一個真實段）→ `undefined`（供 `computeCrossRowMove`「無
 * beforeId＝插入列尾」語意直接使用）。`resolveInsertBeforeId`（li 級
 * drop）與 gap 節點自身的 drop handler（見 ensureDropGap）共用本函式。
 */
function nextSegmentId(node: Element, excludeId: string): string | undefined {
  let sibling = node.nextElementSibling
  while (sibling !== null) {
    const id = (sibling as HTMLElement).dataset.segmentId
    if (sibling.classList.contains('segment-drop-gap') || id === excludeId) {
      sibling = sibling.nextElementSibling
      continue
    }
    return id
  }
  return undefined
}

/**
 * 惰性建立／必要時重建 dropGapEl：目的容器為 `<ol>`／`<ul>`（列群組
 * `.segment-list`）時建 `<li>`（HTML 語意要求 list 只能直接容納 `<li>`）；
 * 其餘（暫存空列 `<div>` 容器）建 `<div>`。同一拖曳手勢跨越不同類型容器
 * （如自列群組拖到暫存空列上方）時，既有節點型別不符則整個重建——本
 * 元素恆為純 UI 節點、無監聽器無承載狀態（僅下方兩個拖放 listener 之
 * 閉包讀取模組層級的 `draggingId`／`dropGapTarget`，非節點自身狀態），
 * 重建不違節點重用鐵律（該鐵律的保護對象是承載狀態的段 `<li>`，見
 * rowElements 文件）。
 *
 * 新建節點時就地接線自身的 dragover／drop（**刻意不用
 * `pointer-events:none` 讓事件穿透至下層真實目標**——曾考慮該做法，但
 * gap 一旦成長至可視高度會在版面中佔據實際區塊，使用者的指標常會靜止
 * 於該區塊內〔它正是視覺提示的「放這裡」〕，若指標事件穿透，會落到
 * 其父容器 `<ol>`／`<div>` 本身、被 wireRowContainerDrop 的「空白處＝
 * 落列尾」邏輯誤判，導致 gap 在使用者尚未移動指標的情況下自行跳到
 * 列尾——故改為 gap 自身即為合法 drop 目標，`stopPropagation()` 防止
 * 冒泡至容器重複判定，維持指標靜止時插入點不漂移）：dragover 僅
 * `preventDefault()`＋維持現狀（不重新定位，故指標留在 gap 內時插入點
 * 穩定不跳動）；drop 依 `dropGapTarget`＋`nextSegmentId(gap, movedId)`
 * 交 commitSegmentMove 提交（等同「維持目前視覺插入點」）。
 */
function ensureDropGap(container: HTMLElement): HTMLElement {
  const wantTag = container.tagName === 'OL' || container.tagName === 'UL' ? 'li' : 'div'
  if (dropGapEl !== null && dropGapEl.tagName.toLowerCase() === wantTag) return dropGapEl
  dropGapEl?.remove()
  // 明確標註 HTMLElement（而非讓 TS 由 'li'|'div' 聯集字面推得 HTMLLIElement
  // | HTMLDivElement）：後者在部分 TS 版本下對聯集型別呼叫多載泛型方法
  // （如 addEventListener）會退化推導為非泛型簽章，導致下方 DragEvent
  // 專屬欄位（dataTransfer）型別檢查失敗。
  const el: HTMLElement = wantTag === 'li' ? document.createElement('li') : document.createElement('div')
  el.className = 'segment-drop-gap'
  el.setAttribute('aria-hidden', 'true')
  el.addEventListener('dragover', (event) => {
    if (draggingId === null) return
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  })
  el.addEventListener('drop', (event) => {
    if (draggingId === null || dropGapTarget === null) return
    event.preventDefault()
    event.stopPropagation()
    const movedId = draggingId
    const target = dropGapTarget
    // pending target 的 gap 落在暫存列 <div> 內、無段 <li> → nextSegmentId
    // 回 undefined（＝落列尾）；real target 則跳過 gap／被拖曳段自身取下一
    // 真實段 id。見 commitSegmentMove（統一移動入口）。
    const beforeId = nextSegmentId(el, movedId)
    draggingId = null
    dragOrigin = null
    const dragged = rowElements.get(movedId)
    if (dragged !== undefined) dragged.style.opacity = ''
    clearDropGap()
    commitSegmentMove(movedId, target, beforeId)
  })
  dropGapEl = el
  return el
}

/**
 * 於 `container` 內、`beforeNode`（`null`＝容器末端）之前顯示插入點
 * placeholder，並記錄 `targetRow`（供 gap 自身 drop handler 使用，見
 * ensureDropGap 文件）：首次出現（新建立／新容器）時強制 reflow 後才加
 * `--visible` 修飾類別，確保 CSS 高度過渡有「前一狀態」可過渡（新插入
 * 節點若初始狀態與終態同幀套用，瀏覽器不會播放 transition）；已存在且
 * 位置未變時略過重插（避免 dragover 高頻觸發造成不必要 DOM 抖動）。
 * `prefers-reduced-motion: reduce` 由 src/style.css 全站規則將
 * transition-duration 收斂至 0.01ms，此處不需額外分支。
 */
function showDropGap(container: HTMLElement, beforeNode: Element | null, target: DropTarget): void {
  dropGapTarget = target
  const gap = ensureDropGap(container)
  if (gap.parentElement !== container || gap.nextElementSibling !== beforeNode) {
    container.insertBefore(gap, beforeNode)
  }
  if (!gap.classList.contains('segment-drop-gap--visible')) {
    void gap.getBoundingClientRect() // 強制 reflow，見上方文件。
    gap.classList.add('segment-drop-gap--visible')
  }
}

/** 拖曳結束（drop／dragend）清除插入點 placeholder；冪等（節點已移除時安全）。 */
function clearDropGap(): void {
  dropGapEl?.remove()
  dropGapEl?.classList.remove('segment-drop-gap--visible')
  dropGapTarget = null
}

/**
 * 依插入方向解析 `computeCrossRowMove` 所需的 `beforeId`：`'before'`＝
 * 目標段本身；`'after'`＝目標段之後的下一個真實段（`nextSegmentId`，
 * 跳過 placeholder gap 與被拖曳段本身）。
 */
function resolveInsertBeforeId(li: HTMLElement, side: 'before' | 'after', movedId: string): string | undefined {
  if (side === 'before') return li.dataset.segmentId
  return nextSegmentId(li, movedId)
}

/**
 * 拖曳排序（鍵盤等效由上/下移鈕承擔）。整列可拖，但自 value 控件
 * （input/select/button/spinbutton）起手則取消，以免干擾控件互動。
 *
 * T5.11（PLAN §排序與列指派 UX Rev 6「拖曳統一插入制」，取代 T5.5「同列
 * ＝交換」／T5.10「跨列＝實際移動」的雙軌分支）：drop 在任一段 `<li>`
 * 上——無論同列或跨列——一律走**插入**語意：targetRow＝drop 目標所在的
 * 列群組容器（`rowIndexOfOl(li.parentElement)`，同列時即被拖曳段的原
 * 列——`computeCrossRowMove` 本身涵蓋此情形，見其文件）；`beforeId`
 * 依指標在目標段矩形之上/下半（`resolveDropSide`）解析（上半＝插其
 * 前，下半＝插其後）。上/下移**按鈕**（moveSegment／performSwap）維持
 * 相鄰交換語意不變。li 級 dragover 一律 `preventDefault()` 令 drop 事件
 * 觸發、`dropEffect` 一律 `'move'`（同列／跨列插入皆為合法搬移，不再有
 * `'none'` 分支），並同步顯示插入點 gap placeholder（見上方
 * showDropGap）。「列容器空白處／暫存空列＝落列尾」分支由
 * wireRowContainerDrop（掛在列群組 `<ol>`／暫存列容器本身）承接，見其
 * 文件；兩者共用 performCrossRowMove 核心。
 */
function wireDragAndDrop(li: HTMLLIElement, descriptor: SegmentDescriptor): void {
  li.draggable = true
  li.addEventListener('dragstart', (event) => {
    const target = event.target as HTMLElement
    if (target.closest('input, select, button, textarea, [role="spinbutton"]')) {
      event.preventDefault()
      return
    }
    draggingId = descriptor.id
    dragOrigin = { id: descriptor.id, parent: li.parentElement, nextSibling: li.nextElementSibling }
    event.dataTransfer?.setData('text/plain', descriptor.id)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    li.style.opacity = '0.5' // opacity 不影響版面（layout），可與上方同步設定，無此限制。
    // T5.11：拖曳期間放寬列尾命中區（scoped class，見 style.css；不動共用 .segment-list）。
    // T5.6 驗收修復：Chromium 會在 dragstart 派發期間偵測「來源元素」版面
    // （layout）位移，一旦偵測到即立即中止原生拖曳（表現為 dragstart 後數 ms
    // 內即 dragend、拖曳 session 從未建立），且此偵測不限第一列——只要來源 li
    // 在 dragstart 派發的同一幀內因版面變動而位移即會觸發。若在此同步加上
    // is-segment-dragging，其 CSS 規則（見 style.css）會讓「上方每一個」列
    // 群組清單立即長高，導致非第一列的來源 li 同幀下移，故拖曳一定被中止；
    // 第一列因其上方無其他列群組清單增高，位移量為 0，故不受影響（與回報
    // 「第一列永遠正常、其餘列一定失敗」完全吻合）。故必須延後至下一幀
    // （dragstart 派發已完成、瀏覽器判定拖曳 session 已建立之後）才加上，
    // 對命中區放寬的時機僅晚一幀，肉眼不可辨。
    dragClassRafId = requestAnimationFrame(() => {
      dragClassRafId = null
      if (draggingId !== null) document.body.classList.add('is-segment-dragging')
    })
  })
  li.addEventListener('dragend', () => {
    draggingId = null
    dragOrigin = null
    li.style.opacity = ''
    clearDropGap()
    if (dragClassRafId !== null) {
      cancelAnimationFrame(dragClassRafId)
      dragClassRafId = null
    }
    document.body.classList.remove('is-segment-dragging')
  })
  li.addEventListener('dragover', (event) => {
    if (draggingId === null || draggingId === descriptor.id) return
    const dragged = rowElements.get(draggingId)
    if (dragged === undefined) return
    // 一律接受（含跨列）；T5.10 起跨列亦為合法搬移，dropEffect 一律 'move'。
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    const container = li.parentElement
    if (container === null) return
    const targetRow = rowIndexOfOl(container)
    if (targetRow === null) return // 防禦：理論上不會發生（啟用段恆屬某列群組）。
    const rect = li.getBoundingClientRect()
    const side = resolveDropSide(event.clientY, rect.top, rect.height)
    const beforeNode = side === 'before' ? li : li.nextElementSibling
    showDropGap(container, beforeNode, { kind: 'real', row: targetRow })
  })
  li.addEventListener('drop', (event) => {
    if (draggingId === null || draggingId === descriptor.id) return
    const dragged = rowElements.get(draggingId)
    if (dragged === undefined) return
    event.preventDefault()
    event.stopPropagation() // 防冒泡至列容器（wireRowContainerDrop）重複處理同一次 drop。
    const movedId = draggingId
    const targetRow = rowIndexOfOl(li.parentElement) // li.parentElement 恆為某 rowGroupContainers[i].ol（真實列容器）。
    const rect = li.getBoundingClientRect()
    const side = resolveDropSide(event.clientY, rect.top, rect.height)
    const beforeId = resolveInsertBeforeId(li, side, movedId)
    draggingId = null
    dragOrigin = null
    dragged.style.opacity = ''
    clearDropGap()
    if (targetRow === null) return // 防禦：理論上不會發生（啟用段恆屬某列群組）。
    commitSegmentMove(movedId, { kind: 'real', row: targetRow }, beforeId)
  })
}

/**
 * 依 `<ol>` 節點反查其在 `rowGroupContainers` 的索引（＝渲染列序，
 * 0-index）——容器建立後位置終生穩定（growRowGroupContainers 僅於末端
 * 新增、shrinkRowGroupContainers 僅自末端移除，見兩者文件），故此查找
 * 結果對容器生命週期內任一時點皆正確。找不到（防禦；理論上不會發生）
 * 回傳 `null`。
 */
function rowIndexOfOl(ol: Element | null): number | null {
  if (ol === null) return null
  const index = rowGroupContainers.findIndex((container) => container.ol === ol)
  return index === -1 ? null : index
}

/**
 * T5.14（PLAN Rev 11「列耗盡保留＋暫存列位置制」）：**統一移動入口**——
 * 跨列拖曳（li／gap／真實列容器空白處／暫存列容器）與 select 指派皆收斂
 * 至此，實現三大語意：
 * (1) 來源列耗盡（moved 是其列唯一啟用段）→ 該列**原地保留為空列**
 *     （位置不變）；
 * (2) 落點為中間暫存列 → 於該位置**插入真實列**（其下真實列 row +1，讓
 *     normalizeRows 收斂後 moved 正落該位）；
 * (3) 其餘列的顯示編號不因搬空／插入而漂移（slot 位置制保證）。
 *
 * MAGI code review I-3（magi/07-statusline-multirow-layout/MAGI_CODE_
 * REVIEW.md，2026-07-12 使用者裁決「修」）：原內含步驟 1–4 的全部決策
 * 邏輯（sourceRow／srcDrains 判定、pending 分支 targetRow／bump／
 * consumePendingSlot、srcDrains 轉 pending）已抽為純函式
 * `planSegmentMove`（row-slots.ts，含完整組合矩陣單元測試）。本函式現
 * 僅為**機械執行層**：
 * 1. 呼叫 `planSegmentMove(rowSlots, config.segments, movedId, target)`
 *    取得 `SegmentMovePlan`（`targetRow`／`nextSlots`／`bumpIds`）。
 * 2. 依 `bumpIds` 原地 bump 對應段的 `row +1`（既有 `segmentConfigById`
 *    物件參照 mutate 慣例，`planSegmentMove` 本身不 mutate 任何輸入）。
 * 3. `rowSlots = plan.nextSlots`。
 * 4. `performCrossRowMove`（既有：computeCrossRowMove＋seg.row 寫回＋
 *    commitConfig＋播報顯示編號）——行為與抽出前完全等價（`planSegmentMove`
 *    為原邏輯逐行搬遷，見其文件；本函式呼叫順序與原版一致：先決策、後
 *    mutate bump、再換 rowSlots、最後才 performCrossRowMove，未改變任何
 *    可觀察行為）。
 *
 * 不變量：pending consume（real +1）與來源耗盡 convert（real −1）任意
 * 組合後，realCount(rowSlots) 恆等於 commit 後實際渲染列數（見 row-slots.ts
 * reconcileRealSlots 為防禦收斂、理論上 no-op）；`beforeId === movedId` 由
 * computeCrossRowMove 既有 no-op 分支安全退化。
 */
function commitSegmentMove(movedId: string, target: DropTarget, beforeId?: string): void {
  const plan = planSegmentMove(rowSlots, config.segments, movedId, target)
  for (const id of plan.bumpIds) {
    const other = segmentConfigById.get(id)
    if (other !== undefined) other.row = (other.row ?? 0) + 1
  }
  rowSlots = plan.nextSlots
  performCrossRowMove(movedId, plan.targetRow, beforeId)
}

/**
 * T5.10（PLAN §排序與列指派 UX Rev 5「跨列 drop＝實際移動」）／T5.11
 * （Rev 6「拖曳統一插入制」，同列拖放亦改走本函式，targetRow＝原列）：
 * 拖放核心——computeCrossRowMove（row-groups.ts）→ 移動段 `row` 欄位
 * 原地寫回（segmentConfigById 既有物件參照，同 setSegmentEnabled／
 * applyRowNormalization mutate 慣例）＋整批寫回 config.segments（沿用
 * computeCrossRowMove 回傳之既有物件參照排列）→ commitConfig（分組偵測
 * 自然接手 DOM 搬移／select 刷新，見 layoutSegmentContainers）→ 播報
 * 「〈段名〉移至第 N 列第 M 位（共 K）」——同列插入與跨列移動共用同一
 * 播報格式，滿足 PLAN「播報沿用移動文案」。
 *
 * T5.14：rowSlots 已於呼叫端（commitSegmentMove）先行維護，commitConfig
 * 內 layoutSegmentContainers 依其重繪；播報之「第 N 列」須為**顯示編號**
 * ——computeCrossRowMove 回傳的 result.row 是 real 1-index，映射為 slot
 * 顯示編號 `slotIndexOfRealRow(rowSlots, result.row - 1) + 1`（rowSlots
 * 於 commit 前已更新，映射正確；formatMoveAnnouncement 本身不動）。
 *
 * 焦點策略（PLAN 要求「合理焦點處理」，拖曳為滑鼠操作，非鍵盤觸發）：
 * 刻意**不**額外 `.focus()` 任何節點——同列拖放交換（既有 performSwap
 * 呼叫路徑）本就不做此事、被搬移的 `<li>` 於 commitConfig 內以
 * appendChild 重新定位時瀏覽器原生不會使其失焦（如原本沒有焦點於其上，
 * 拖曳全程本就不涉及焦點；PLAN「重渲染＝節點重用」的顯式 re-focus
 * 條款針對的是鍵盤觸發的按鈕操作，見 moveSegment），故沿用既有拖放路徑
 * 慣例、不新增焦點管理。
 */
function performCrossRowMove(movedId: string, targetRow: number, beforeId: string | undefined): void {
  const result = computeCrossRowMove(config.segments, movedId, targetRow, beforeId)
  const seg = segmentConfigById.get(movedId)
  if (seg !== undefined) seg.row = targetRow
  config.segments = result.segments
  commitConfig()
  const descriptor = DESCRIPTORS_BY_ID[movedId as SegmentId]
  announceMove(
    formatMoveAnnouncement(descriptor.label, {
      ...result,
      row: slotIndexOfRealRow(rowSlots, result.row - 1) + 1,
    }),
  )
}

/**
 * T5.10／T5.14：**真實**列群組容器 `<ol>` 的「空白處」drop 目標——承接
 * PLAN「拖至列容器空白處＝落列尾」（UI 暫存空列 <div> 改由
 * wirePendingRowDrop 承接，見其文件；本函式僅掛在真實列 `<ol>` 上）。以
 * 冒泡事件委派：若拖放事件的實際目標（`event.target`）落在某個 `<li>`
 * 內，代表已由該 `<li>` 自身的 dragover／drop（wireDragAndDrop，含
 * `stopPropagation`）處理，本函式略過，避免同一次 drop 被處理兩次；gap
 * placeholder 自身亦接線獨立的 dragover／drop（見 ensureDropGap，含
 * `stopPropagation`），故指標停留於 gap 本身（如 li 級 dragover 已於中段
 * 插入 gap、指標仍在該可視區塊內）不會冒泡到此處被誤判為「空白處」而
 * 重置至列尾。`targetRow` 於呼叫端（createRowGroupContainer）以閉包捕捉
 * 之固定列號（＝real index）傳入——真實列容器位置終生穩定（見 rowIndexOfOl
 * 文件），故 targetRow 恆為呼叫當下的正確 real 列號，交 commitSegmentMove
 * 以 {kind:'real', row: targetRow} 提交。
 *
 * T5.11：dragover 期間於容器末端顯示插入點 gap placeholder（見
 * showDropGap）。
 *
 * T5.6 驗收修復（使用者裁決 2026-07-12）：「空白處＝落列尾」細化為——
 * 段間縫隙（`.segment-list` 的 flex gap 條帶，事件目標非任一 `<li>` 但
 * 落在其他段之間）依指標 Y 幾何解析插入點（與 li 級 `resolveDropSide`
 * 同一中線語意，見 `resolveBlankAreaInsertIndex`）；僅最末段中線以下的
 * 尾端空白（含拖曳中放寬的命中區）才真正落列尾。原邏輯對容器內全部
 * 非-li 目標一律視為列尾，使用者實測回報「拖一到兩個中間的黑區會預設
 * 到最後段，但拖到其他段上就 OK」——CDP 真機證實 gap 條帶
 * `elementFromPoint` 命中的正是容器本身。
 */
function wireRowContainerDrop(container: HTMLElement, targetRow: number): void {
  const isBlankAreaTarget = (event: Event): boolean =>
    draggingId !== null && (event.target as Element | null)?.closest('li') === null
  // dragover／drop 共用同一幾何解析：依指標 Y 對照當下各段 `<li>` 矩形
  // 中線，找出應插入之前的段（`null`＝落列尾 append）。`:scope > li.
  // segment-row` 天然排除 gap placeholder 本身（其 class 為
  // `segment-drop-gap`，非 `segment-row`）；**刻意不排除**被拖曳段自身
  // 的 `<li>`（拖曳期間它仍在原位佔版面，幾何需與使用者所見一致）——
  // `beforeNode` 恰為被拖曳段時，`performCrossRowMove` 內
  // `computeCrossRowMove` 之 `beforeId === id` 分支已安全退化為「維持
  // 原位、不重排」。暫存空列 `<div>` 容器無 `li.segment-row` 子節點 →
  // 恆回傳 `null` → 落列尾語意不變。
  const resolveBeforeNode = (event: DragEvent): HTMLLIElement | null => {
    const lis = [...container.querySelectorAll<HTMLLIElement>(':scope > li.segment-row')]
    const idx = resolveBlankAreaInsertIndex(
      event.clientY,
      lis.map((li) => {
        const rect = li.getBoundingClientRect()
        return { top: rect.top, height: rect.height }
      }),
    )
    return idx === null ? null : lis[idx]
  }
  container.addEventListener('dragover', (event) => {
    if (!isBlankAreaTarget(event)) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    showDropGap(container, resolveBeforeNode(event), { kind: 'real', row: targetRow })
  })
  container.addEventListener('drop', (event) => {
    if (!isBlankAreaTarget(event)) return
    event.preventDefault()
    const movedId = draggingId!
    const beforeNode = resolveBeforeNode(event)
    draggingId = null
    dragOrigin = null
    const dragged = rowElements.get(movedId)
    if (dragged !== undefined) dragged.style.opacity = ''
    clearDropGap()
    commitSegmentMove(movedId, { kind: 'real', row: targetRow }, beforeNode?.dataset.segmentId)
  })
}

/**
 * T5.14（PLAN Rev 11「暫存列位置制」）：UI 暫存空列 `<div>` 容器的 drop
 * 目標——落此列＝於該 slot 位置指派真實列（見 commitSegmentMove pending
 * 分支）。暫存列每次重繪（renderPendingRowContainers）重新接線，`slotIndex`
 * 以閉包捕捉當下位置（重繪時以最新 slot 序重算，故閉包安全——暫存列
 * `<div>` 無承載狀態的段 `<li>`，整段重繪不違節點重用鐵律）。dragover
 * 顯示插入點 gap（暫存列無段 → beforeNode 恆 null＝落此列）；drop 交
 * commitSegmentMove（beforeId undefined＝該空列尾）。
 */
function wirePendingRowDrop(container: HTMLElement, slotIndex: number): void {
  container.addEventListener('dragover', (event) => {
    if (draggingId === null) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    showDropGap(container, null, { kind: 'pending', slotIndex })
  })
  container.addEventListener('drop', (event) => {
    if (draggingId === null) return
    event.preventDefault()
    const movedId = draggingId
    draggingId = null
    dragOrigin = null
    const dragged = rowElements.get(movedId)
    if (dragged !== undefined) dragged.style.opacity = ''
    clearDropGap()
    commitSegmentMove(movedId, { kind: 'pending', slotIndex }, undefined)
  })
}

// ── 排序（config.segments 同 row 子序列索引運算；同列限定） ──

/**
 * 同列交換核心：computeRowSwap（row-groups.ts，T5.5）→ 成功則整批寫回
 * config.segments（沿用既有物件參照，非新建/複製）→ commitConfig（既有
 * <li> 節點經 layoutSegmentContainers／assignSegmentsToContainers 之
 * appendChild 重新定位，非銷毀重建）→ 播報「〈段名〉移至第 N 列第 M 位
 * （共 K）」。回傳結果供呼叫端（moveSegment）另行 re-focus 觸發鈕；
 * null＝已在列首/列末（理論上鈕已 disabled 不會觸發，仍防禦返回）。
 */
function performSwap(id: string, direction: 'up' | 'down'): RowSwapResult | null {
  const result = computeRowSwap(config.segments, id, direction)
  if (result === null) return null
  config.segments = result.segments
  commitConfig()
  const descriptor = DESCRIPTORS_BY_ID[id as SegmentId]
  // T5.14：播報之「第 N 列」須為顯示編號——result.row 是 real 1-index，
  // 映射為 slot 顯示編號（同列交換不改 slots，但若上方有暫存空列則顯示
  // 編號與 real index 不同，故仍須映射）。formatMoveAnnouncement 本身不動。
  announceMove(
    formatMoveAnnouncement(descriptor.label, {
      ...result,
      row: slotIndexOfRealRow(rowSlots, result.row - 1) + 1,
    }),
  )
  return result
}

function moveSegment(id: SegmentId, direction: 'up' | 'down'): void {
  const result = performSwap(id, direction)
  if (result === null) return
  // 移動的是同一元素、焦點自然保留；顯式再聚焦以防瀏覽器差異（PLAN
  // 「重渲染＝節點重用」節點重定位後 re-focus 觸發鈕之契約）。
  //
  // 邊界修正（PLAN §排序與列指派 UX Rev 9，2026-07-11 review 修訂）：段
  // 被移成列首/列末時，commitConfig（見 performSwap）已透過
  // refreshMoveButtonStates 把「觸發本次移動的同方向鈕」設 disabled——若
  // 仍聚焦該鈕會立即 blur 落 body（隨後對 disabled 鈕 .focus() 為
  // no-op）。改依 computeRowSwap 回傳的 1-index position/rowSize 判斷
  // 落點是否邊界（免查 DOM），是則改聚焦反方向鈕（邊界處必為 enabled，
  // 因 rowSize ≥ 2 才可能觸發 up/down——見 computeRowSwap 單段列回傳
  // null 的防禦）。
  const triggerLandedAtBoundary =
    (direction === 'up' && result.position === 1) ||
    (direction === 'down' && result.position === result.rowSize)
  const focusDirection = triggerLandedAtBoundary ? (direction === 'up' ? 'down' : 'up') : direction
  moveButtonElements.get(id)?.[focusDirection].focus()
}

/**
 * 列首/列末停用態同步（PLAN §排序與列指派 UX「段已是該列首/末時對應鈕
 * 停用」）：僅由 layoutSegmentContainers（分組/順序實際變動後）呼叫，
 * 依最新列群組之列內順序（segmentIds［0］＝列首、最後一個＝列末）逐段
 * 設定 disabled（維持可見，非 hidden）。與 row 分組無關的 commit（如
 * 改顏色）不觸發本函式（沿用 refreshRowSelects 同一收斂點慣例）。
 */
function refreshMoveButtonStates(groups: readonly RowGroup[]): void {
  for (const group of groups) {
    const ids = group.segmentIds
    for (let i = 0; i < ids.length; i++) {
      const handle = moveButtonElements.get(ids[i])
      if (handle === undefined) continue
      handle.up.disabled = i === 0
      handle.down.disabled = i === ids.length - 1
    }
  }
}

/**
 * 「刪除此列」鈕disabled 態同步（PLAN §排序與列指派 UX Rev 6「僅剩最後
 * 一個真實列時該鈕 disabled（維持可見，防清空）」）：僅由
 * layoutSegmentContainers（分組/順序實際變動後）呼叫，與 refreshMoveButtonStates
 * 同一收斂點——與 row 分組無關的 commit 不觸發本函式。
 */
function refreshRowDeleteButtons(): void {
  const disabled = rowGroupContainers.length <= 1
  for (const container of rowGroupContainers) {
    container.deleteTrigger.disabled = disabled
  }
}

/**
 * MAGI code review I-2（magi/07-statusline-multirow-layout/MAGI_CODE_
 * REVIEW.md，2026-07-12 使用者裁決「修」，「整列刪除 inline 確認態隨
 * 容器錯位復用殘留」）：**新不變量**——「確認刪除」的 inline 兩段式
 * 確認態**不跨 relayout 存活**。
 *
 * Root cause：`shrinkRowGroupContainers` 只從 `rowGroupContainers`
 * **末端**移除多餘容器；刪除非最後一列（或任何導致分組重排的操作，如
 * 拖曳／select 跨列移動）時，倖存容器（索引 < 新列數）的內容經
 * `assignSegmentsToContainers` 被**重新指派**成別的列——若某倖存容器的
 * 確認態原本已展開（trigger 隱、confirmGroup 顯），relayout 後其
 * 標題／label 雖經 `refreshRowNumbering` 刷成新列號，但「確認刪除」鈕
 * 仍是活體、仍會觸發 `performRowDeletion(index)`（`index` 為該容器閉包
 * 之固定渲染列序，其內容已換成別列）——形同「使用者本要刪 A 列、UI 卻
 * 對著已換成 B 列內容的確認鈕、稍後誤觸即刪掉 B 列」的一鍵誤刪陷阱。
 *
 * 修復：`layoutSegmentContainers` 每次呼叫皆對**全部**倖存容器復位確認
 * 態（純 DOM 態重設 hidden 屬性，不違節點重用鐵律——不銷毀任何節點、
 * 監聽器不重綁）。**焦點保全**：復位當下若 `document.activeElement`
 * 落在某個即將被隱藏的 confirmGroup 內（如確認框開著、使用者改以滑鼠
 * 拖曳觸發另一次 relayout），復位後把焦點移回該容器的 trigger（避免
 * 落 body——隱藏元素無法持有焦點，瀏覽器會將其 blur 至 body）。
 *
 * 與 `performRowDeletion` 焦點順序的相容性：本函式由
 * `layoutSegmentContainers`（`commitConfig` 內）呼叫，早於
 * `performRowDeletion` 尾端顯式 `addPendingRowEl.focus()`——縱使本函式
 * 於復位過程中挪動了焦點（如刪除列 A 導致容器 B 的確認態被復位＋回焦
 * 其 trigger），`performRowDeletion` 隨後的顯式回焦仍會覆蓋、最終落點
 * 正確為 `#add-pending-row`（不搶焦點）。
 */
function resetRowGroupDeleteConfirmStates(): void {
  for (const container of rowGroupContainers) {
    const confirmGroup = container.section.querySelector<HTMLElement>('.segment-row-group__delete-confirm')
    if (confirmGroup === null || confirmGroup.hidden) continue // 已是復位態，無需重複寫入 DOM。
    const wasFocusedInside = confirmGroup.contains(document.activeElement)
    setHidden(confirmGroup, true)
    setHidden(container.deleteTrigger, false)
    if (wasFocusedInside) container.deleteTrigger.focus()
  }
}

/**
 * T5.11（PLAN §排序與列指派 UX Rev 6「整列刪除」，confirm 鈕 click 觸發，
 * 見 wireRowDeleteButton）：確認後的批次刪除核心——computeRowDeletion
 * （row-groups.ts）取得該列全部段 id 集合，逐段 mutate `enabled=false`＋
 * syncSegmentEnabledUi（純視覺同步；**不**逐段呼叫 setSegmentEnabled／
 * **不**逐段 commitConfig，PLAN「批次路徑一次 commitConfig，避免 N 次
 * relayout」裁決）；批次完成後單次 commitConfig（分組偵測自然觸發該列
 * 容器銷毀，見 shrinkRowGroupContainers；左欄對應目錄項同步恢復可勾）
 * → 播報「第 N 列已刪除，M 個段已回到目錄」→ 焦點移至「新增一列」鈕
 * （#add-pending-row，恆存在；該列容器本身已隨 commitConfig 銷毀，無
 * 穩定的「前一列標題」可回焦，故選定此為落點——不落 body）。
 */
function performRowDeletion(rowIndex: number): void {
  const groups = computeRowGroups(config.segments)
  const info = computeRowDeletion(groups, rowIndex)
  if (info.segmentIds.length === 0 || info.isLastRow) return // 防禦：鈕已 disabled／列不存在，理論上不會觸發。
  // T5.14：整列刪除＝**真刪除**（壓縮語意，不留空列）——removeSlotAt 於該
  // 真實列的 slot 位置移除；播報之「第 N 列」用**刪除前**的顯示編號
  // （removeSlotAt 前計算）。
  const slot = slotIndexOfRealRow(rowSlots, rowIndex)
  const displayRow = slot + 1
  rowSlots = removeSlotAt(rowSlots, slot)
  for (const id of info.segmentIds) {
    const seg = segmentConfigById.get(id)
    if (seg === undefined) continue
    seg.enabled = false
    syncSegmentEnabledUi(id, false)
  }
  commitConfig()
  announceMove(`第 ${displayRow} 列已刪除，${info.segmentIds.length} 個段已回到目錄`)
  addPendingRowEl.focus()
}

// ── 產物：三後端 emit → 填 <pre>／下載 Blob（BOM 規則） ──

function inferSettingsTarget(path: string): SettingsTarget {
  // 契約沉默處：index.html 無 target 選擇器 → 以腳本路徑副檔名推斷
  // （.ps1 → Windows PowerShell wrapper；否則 POSIX 直呼）。
  return /\.ps1\s*$/i.test(path) ? 'windows-powershell' : 'posix'
}

function updateDownload(anchor: HTMLAnchorElement, key: 'bash' | 'ps1' | 'settings', blob: Blob): void {
  const prev = downloadState[key]
  if (prev !== null) URL.revokeObjectURL(prev)
  const url = URL.createObjectURL(blob)
  downloadState[key] = url
  anchor.href = url
}

function refreshOutputs(): void {
  const bash = emitBash(config, DESCRIPTORS_BY_ID)
  const ps1 = emitPs1(config, DESCRIPTORS_BY_ID)
  const path = settingsPathEl.value.trim()
  const settings = emitSettings(config, {
    target: inferSettingsTarget(path),
    scriptPath: path === '' ? undefined : path,
  })

  lastOutputs.bash = bash
  lastOutputs.ps1 = ps1
  lastOutputs.settings = settings
  outputBashCodeEl.textContent = bash
  outputPs1CodeEl.textContent = ps1
  outputSettingsCodeEl.textContent = settings

  // 下載 Blob 編碼契約（PLAN 產生器契約 8）：
  // - .sh：無 BOM＋LF（emitBash 已 LF；Blob 以 UTF-8 編碼、不加 BOM）。
  // - .ps1：UTF-8 BOM（前置 U+FEFF → EF BB BF；PS 5.1 無 BOM 會以 ANSI
  //   誤讀原始碼致 CJK/glyph 毀損）；LF（emitPs1 已 LF）。
  // - settings.json：一般 UTF-8（無 BOM）。
  updateDownload(downloadBashEl, 'bash', new Blob([bash], { type: 'text/x-shellscript;charset=utf-8' }))
  updateDownload(downloadPs1El, 'ps1', new Blob([UTF8_BOM + ps1], { type: 'application/octet-stream' }))
  updateDownload(
    downloadSettingsEl,
    'settings',
    new Blob([settings], { type: 'application/json;charset=utf-8' }),
  )
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeConfig(config))
  } catch {
    // localStorage 不可用（私密模式／配額）→ 靜默降級，不阻斷編輯。
  }
}

/**
 * 任何 config 變動的統一收束：正規化列＋（僅分組實際變動時）同步列群組
 * UI →存檔＋刷預覽（controller 內部 resolve）＋刷三產物。
 *
 * T5.3（PLAN §D2 正規化接線）：commitConfig 寫回點先套用 normalizeRows
 * （applyRowNormalization，原地改寫既有物件的 row 欄位），再以
 * computeRowGroups／rowGroupsEqual 判斷分組是否實際變動——僅變動時才
 * 呼叫 layoutSegmentContainers（列群組容器生命週期＋跨容器搬移既有
 * <li>）；與 row 分組無關的 commit（如改顏色、前綴）分組結果不變，
 * 不觸發此段 DOM 重排（Rev 2 釘死：不得觸發全體刷新）。
 *
 * T5.14（PLAN Rev 11「暫存列位置制」）：rowSlots 已於各變異點
 * （commitSegmentMove／setSegmentEnabled／performRowDeletion）顯式維護，
 * 此處**不再**推斷收斂（T5.9 的 nextPendingRowCount 計數推斷法已廢止）；
 * layoutSegmentContainers 內以 reconcileRealSlots 作防禦收斂（理論上
 * no-op），並依 rowSlots 重繪暫存列容器＋刷新 select 枚舉／顯示編號。
 *
 * T5.14 追修（協調者 CDP 實證 S4，2026-07-12「重繪閘門缺口」）：僅以
 * `rowGroupsEqual` 判斷「是否需重繪」不足——**空列成真＋來源列同幀耗盡**
 * 可使 real slot 的淨數量抵銷、真實分組結構（segments 依 row 分組後的
 * 內容）前後完全相同，但 `rowSlots` 本身已變（如把某段自其唯一列指派入
 * 另一個既有空列：目標空列 real+1、來源列 real-1，兩者位置不同，
 * `rowGroupsEqual` 看不出來——分組數與各列段集合前後一致）。故重繪條件
 * 改為「分組實際變動 **或** slots 實際變動」雙閘門（`slotsEqual` 見
 * row-slots.ts；與 row 分組、slots 皆無關的 commit——如改顏色／前綴——
 * 兩者皆為 true，仍不觸發重繪，Rev 2「不觸發全體刷新」語意不變）。
 */
function commitConfig(): void {
  applyRowNormalization()
  const nextRowGroups = computeRowGroups(config.segments)
  if (!rowGroupsEqual(lastRowGroups, nextRowGroups) || !slotsEqual(rowSlots, lastRenderedSlots)) {
    layoutSegmentContainers(nextRowGroups)
  }
  persist()
  try {
    preview.setConfig(config)
    refreshOutputs()
  } catch (error) {
    // config 恆經清洗、prefix/分隔符已擋 PUA，理論上 resolve/emit 不拋；
    // 防禦性顯示以免整頁凍結。
    showError(`產生輸出時發生非預期錯誤：${error instanceof Error ? error.message : String(error)}`)
  }
  updateNoBoundaryHint() // segment 色／啟用態亦可能改變 D1 無邊界提示條件，逐次收束時一併重算。
}

// ── 全域控制 ──

/**
 * D1「全段預設色＋powerline＋無箭頭」無色塊邊界提示判定（PLAN §D1 條件
 * 表末句）：純函式（無 DOM），main.ts 無既有測試環境（無 jsdom/happy-dom
 * 依賴，import 會在模組頂層即執行 DOM query 而在 node 測試環境拋錯），
 * 依 task brief 裁決保留於 main.ts 內、以簡單易於肉眼核對為原則，不另立
 * 測試檔。條件：powerline 模式＋箭頭未開＋至少一個啟用中 segment＋
 * 全部啟用中 segment 皆為終端預設色（無啟用 segment 時空集合視為
 * 「無色塊可言」，不構成邊界問題，故排除）。
 */
function hasNoBoundaryRisk(cfg: BuilderConfig): boolean {
  if (cfg.mode !== 'powerline' || cfg.powerlineArrow) return false
  const enabled = cfg.segments.filter((seg) => seg.enabled)
  if (enabled.length === 0) return false
  return enabled.every((seg) => seg.color.kind === 'default')
}

/** 依 hasNoBoundaryRisk 顯隱提示節點（hidden 屬性，非 live region，見 index.html 註解）。 */
function updateNoBoundaryHint(): void {
  setHidden(powerlineNoBoundaryHintEl, !hasNoBoundaryRisk(config))
}

function applyModeConstraints(): void {
  const powerline = config.mode === 'powerline'
  powerlineArrowEl.disabled = !powerline // 箭頭選項僅 powerline 有意義。
  lastArrowCapEl.disabled = !powerline || !config.powerlineArrow // D1 gating：false 時 cap 本身無效，一併停用。
  separatorCustomEl.disabled = powerline // powerline 以箭頭轉場，停用自訂分隔符（D3）。
  updateNoBoundaryHint()
}

function syncGlobalControls(): void {
  modePlainEl.checked = config.mode === 'plain'
  modePowerlineEl.checked = config.mode === 'powerline'
  document.body.dataset.mode = config.mode

  if (config.separator.kind === 'preset') {
    separatorPresetEl.value = `preset:${config.separator.value}`
    setHidden(separatorCustomFieldEl, true)
    separatorCustomEl.value = ''
  } else {
    separatorPresetEl.value = 'custom'
    setHidden(separatorCustomFieldEl, false)
    separatorCustomEl.value = config.separator.value
  }

  powerlineArrowEl.checked = config.powerlineArrow
  lastArrowCapEl.checked = config.lastArrowCap
  applyModeConstraints()
}

function handleModeChange(nextMode: 'plain' | 'powerline'): void {
  config.mode = nextMode
  document.body.dataset.mode = nextMode
  applyModeConstraints()
  commitConfig()
  announceGlobal(
    nextMode === 'powerline'
      ? '已切換至 Powerline 模式；顏色語意已翻轉（原前景色現作為背景色），自訂分隔符已停用，請檢視預覽。'
      : '已切換至純文字模式；顏色語意已翻轉（原背景色現作為前景色），請檢視預覽。',
  )
  // 視圖切換：焦點移至變動的控件群（segment 清單，powerline 下新增前景覆寫色選）。
  segmentListsEl.setAttribute('tabindex', '-1')
  segmentListsEl.focus()
}

function wireGlobalControls(): void {
  modePlainEl.addEventListener('change', () => {
    if (modePlainEl.checked) handleModeChange('plain')
  })
  modePowerlineEl.addEventListener('change', () => {
    if (modePowerlineEl.checked) handleModeChange('powerline')
  })

  separatorPresetEl.addEventListener('change', () => {
    const value = separatorPresetEl.value
    if (value === 'custom') {
      setHidden(separatorCustomFieldEl, false)
      const result = validateUserText(separatorCustomEl.value)
      if (result.ok) {
        clearError()
        config.separator = { kind: 'custom', value: separatorCustomEl.value }
        commitConfig()
      } else {
        showError(`分隔符${result.message}`)
      }
      separatorCustomEl.focus()
    } else if (value.startsWith('preset:')) {
      clearError()
      config.separator = {
        kind: 'preset',
        value: value.slice('preset:'.length) as SeparatorPresetValue,
      }
      setHidden(separatorCustomFieldEl, true)
      commitConfig()
    }
  })

  separatorCustomEl.addEventListener('input', () => {
    const result = validateUserText(separatorCustomEl.value)
    if (!result.ok) {
      showError(`分隔符${result.message}`)
      return
    }
    clearError()
    config.separator = { kind: 'custom', value: separatorCustomEl.value }
    commitConfig()
  })

  powerlineArrowEl.addEventListener('change', () => {
    config.powerlineArrow = powerlineArrowEl.checked
    applyModeConstraints() // 連動 last-arrow-cap 停用態＋無邊界提示重算。
    commitConfig()
  })

  lastArrowCapEl.addEventListener('change', () => {
    config.lastArrowCap = lastArrowCapEl.checked
    commitConfig()
  })

  settingsPathEl.addEventListener('input', () => {
    refreshOutputs()
  })
}

function wirePreviewControls(): void {
  previewBgDarkEl.addEventListener('change', () => {
    if (previewBgDarkEl.checked) preview.setTheme('dark')
  })
  previewBgLightEl.addEventListener('change', () => {
    if (previewBgLightEl.checked) preview.setTheme('light')
  })
  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="preview-scenario"]')) {
    radio.addEventListener('change', () => {
      if (radio.checked) preview.setScenario(radio.value as MockScenarioId)
    })
  }
}

async function copyOutput(text: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    announceOutput(`已複製 ${label}`)
  } catch {
    announceOutput(`複製失敗，請手動選取${label}內容後複製`)
  }
}

function wireOutputActions(): void {
  copyBashEl.addEventListener('click', () => void copyOutput(lastOutputs.bash, 'bash 腳本'))
  copyPs1El.addEventListener('click', () => void copyOutput(lastOutputs.ps1, 'PowerShell 腳本'))
  copySettingsEl.addEventListener('click', () => void copyOutput(lastOutputs.settings, 'settings 片段'))
}

// ── segment 清單建置 ──

/**
 * T5.9：完整控件列初始一律先掛進隱藏池（#segment-hidden-pool）——啟用段
 * 隨即由下方 layoutSegmentContainers（init() 內接於本函式之後呼叫）搬進
 * 其列群組，appendChild 為既有節點重定位，非二次建立。左欄目錄項的建置
 * 已分離為獨立函式 buildCatalogItems（見上，職責不重疊：本函式只建置
 * 中欄的重控件列）。
 */
function buildSegmentRows(): void {
  segmentHiddenPoolEl.textContent = ''
  rowElements.clear()
  for (const seg of config.segments) {
    const descriptor = DESCRIPTORS_BY_ID[seg.id as SegmentId] as SegmentDescriptor | undefined
    if (descriptor === undefined) continue // 清洗後不應發生；防禦。
    const li = buildSegmentRow(seg, descriptor)
    rowElements.set(seg.id, li)
    segmentHiddenPoolEl.appendChild(li)
  }
}

// ── 列群組容器（T5.3；啟用段依渲染列分組，PLAN §排序與列指派 UX） ──

/**
 * normalizeRows（T2.1，config.ts）套用：僅重寫 config.segments 內既有
 * SegmentConfig 物件的 row 欄位（原地 mutate，絕不整批替換陣列或物件
 * 參照）。各列 <li> 的事件監聽器閉包捕捉的正是 buildSegmentRows 逐元素
 * 遍歷 config.segments 時取得的物件參照；若改以 normalizeRows 回傳值
 * 整批取代 config.segments，閉包仍握著舊物件，後續互動（改色／前綴等）
 * 會寫壞已脫離 config.segments 的孤兒物件而非真正生效的設定。PLAN §D2
 * 「正規化落在 commitConfig() 寫回點直接改寫記憶體 config.segments[i].row」
 * 之字面即此意：改寫既有物件之欄位，非替換物件本身。
 */
function applyRowNormalization(): void {
  const normalized = normalizeRows(config.segments)
  for (let i = 0; i < config.segments.length; i++) {
    const seg = config.segments[i]
    const nextRow = normalized[i].row
    if (nextRow === undefined) delete seg.row
    else if (seg.row !== nextRow) seg.row = nextRow
  }
}

/**
 * T5.11（PLAN §排序與列指派 UX Rev 6「整列刪除」）：單一列群組標題旁
 * 「刪除此列」鈕接線——inline 兩段式確認（非原生 `confirm()`）：
 * trigger 顯示「刪除第 N 列」；click → 隱 trigger、顯 confirm/cancel
 * 鈕對，焦點移至「取消」（安全預設：確認刪除為破壞性動作，預設焦點落
 * 於非破壞性選項，避免使用者連按 Enter／方向鍵誤觸連續 click 觸發的
 * 焦點造成誤刪；此為本棒裁決之確認型式，理由：(a) 與全站零原生對話框
 * 慣例一致——此 codebase 未見任何 `confirm()`/`alert()` 用例，皆以既有
 * live region＋自訂 DOM 呈現互動回饋；(b) inline 型式的鍵盤/SR 焦點
 * 完全可控（顯式 .focus()），原生 confirm() 之焦點回歸行為則依瀏覽器
 * 而異、且會中斷/搶佔頁面自身的 live region 播報語境）＋播報確認提示。
 * confirm 鈕 click → performRowDeletion（批次停用＋單次 commit，見其
 * 文件）；cancel 鈕 click → 收合 confirm、trigger 復顯＋回焦 trigger
 * （不落 body）。`index` 為容器建立時的渲染列序閉包——容器位置終生
 * 穩定（見 rowIndexOfOl 文件），故此索引於容器存活期間恆正確，無需
 * 重新綁定。回傳 trigger 供 refreshRowDeleteButtons 同步 disabled 態
 * （僅剩最後一個真實列時停用，見其文件）。
 */
function wireRowDeleteButton(root: HTMLElement, index: number): HTMLButtonElement {
  const trigger = root.querySelector<HTMLButtonElement>('.segment-row-group__delete-trigger')!
  const confirmGroup = root.querySelector<HTMLElement>('.segment-row-group__delete-confirm')!
  const confirmBtn = root.querySelector<HTMLButtonElement>('.segment-row-group__delete-confirm-btn')!
  const cancelBtn = root.querySelector<HTMLButtonElement>('.segment-row-group__delete-cancel-btn')!
  // T5.14：trigger 文字／confirm・cancel aria-label 的「第 N 列」為**顯示
  // 編號**，隨 slots 變動——不於此烙定，交 refreshRowNumbering（每次 slots
  // 或分組變動後）以 slotIndexOfRealRow(rowSlots, index) 刷新。

  trigger.addEventListener('click', () => {
    if (trigger.disabled) return
    setHidden(trigger, true)
    setHidden(confirmGroup, false)
    cancelBtn.focus()
    // 點擊當下以 rowSlots 計算顯示編號（閉包持 real index，事件時查）。
    announceMove(`確定要刪除第 ${slotIndexOfRealRow(rowSlots, index) + 1} 列？該列全部段將回到目錄。`)
  })
  cancelBtn.addEventListener('click', () => {
    setHidden(confirmGroup, true)
    setHidden(trigger, false)
    trigger.focus()
  })
  confirmBtn.addEventListener('click', () => performRowDeletion(index))

  return trigger
}

/**
 * 建立單一列群組容器（clone #segment-row-group-template；index＝渲染列序，
 * 0-index）。T5.10：`<ol>` 本身接線 wireRowContainerDrop（「列容器空白處」
 * drop 目標，targetRow 即此 index——容器一經建立位置終生穩定，見
 * rowIndexOfOl 文件）。T5.11：一併接線「刪除此列」鈕（見
 * wireRowDeleteButton）。
 */
function createRowGroupContainer(index: number): {
  section: HTMLElement
  ol: HTMLOListElement
  deleteTrigger: HTMLButtonElement
} {
  const key = `row-group-${index}`
  const root = instantiateTemplate('segment-row-group-template', '__RID__', key)
  root.querySelector<HTMLElement>('.segment-section__heading')!.textContent = `第 ${index + 1} 列`
  const ol = root.querySelector<HTMLOListElement>('.segment-list')!
  wireRowContainerDrop(ol, index)
  const deleteTrigger = wireRowDeleteButton(root, index)
  return { section: root, ol, deleteTrigger }
}

/** 列群組容器數量成長至 count（缺者於 #segment-row-groups 末端新建並掛載）。 */
function growRowGroupContainers(count: number): void {
  while (rowGroupContainers.length < count) {
    const container = createRowGroupContainer(rowGroupContainers.length)
    rowGroupContainers.push(container)
    segmentRowGroupsEl.appendChild(container.section)
  }
}

/**
 * 列群組容器數量收縮至 count：多餘容器（索引 ≥ count）由末端往前移除。
 * 呼叫此函式前應已完成 assignSegmentsToContainers（見下）——此時多餘
 * 容器的 <ol> 理論上已空（最新分組結果中已無該列）。仍防禦式「先搬離
 * 再移除」：若容器內意外仍有 <li>，先搬到仍存活的最後一列（無存活列
 * 則退隱藏池 #segment-hidden-pool，T5.9 起完整控件列的停用態歸屬，避免
 * 節點遺失於 document 樹外），再移除 <section>——絕不連 <li> 一併丟棄
 * （PLAN §列群容器生命週期）。
 */
function shrinkRowGroupContainers(count: number): void {
  while (rowGroupContainers.length > count) {
    const container = rowGroupContainers.pop()!
    let orphan = container.ol.firstElementChild
    while (orphan !== null) {
      const fallback = rowGroupContainers.at(-1)?.ol ?? segmentHiddenPoolEl
      fallback.appendChild(orphan)
      orphan = container.ol.firstElementChild
    }
    container.section.remove()
  }
}

/**
 * 依最新分組結果，把既有 <li>（rowElements 既有節點，非新建）搬移至
 * 目的容器：啟用段 → 對應列群組 <ol>；停用段 → 隱藏池
 * #segment-hidden-pool（T5.9 起取代原「其類別 <ol>」歸屬——完整控件列
 * 已不住左欄四類分區，四類分區改由 buildCatalogItems 建置的輕量目錄項
 * 佔用，見其文件；停用段不再區分類別，統一收入單一隱藏池）。呼叫前須已
 * growRowGroupContainers 到位（各列容器已存在，故
 * rowGroupContainers[group.row] 恆存在）。純節點重定位
 * （appendChild：node reuse，絕不銷毀重建）——保留內部接線／焦點／
 * 閾值編輯器展開態（純 DOM 態，不在 config），監聽器不重綁。
 */
function assignSegmentsToContainers(groups: readonly RowGroup[]): void {
  for (const group of groups) {
    const ol = rowGroupContainers[group.row]!.ol
    for (const id of group.segmentIds) {
      const li = rowElements.get(id)
      if (li !== undefined) ol.appendChild(li)
    }
  }
  for (const seg of config.segments) {
    if (seg.enabled) continue
    const li = rowElements.get(seg.id)
    if (li !== undefined) segmentHiddenPoolEl.appendChild(li)
  }
}

/**
 * T5.4：把 row-select.ts 計算出的操作序列施作於既有 select 節點——原地
 * 更新／增補／裁剪 <option>，絕不重建 select 節點本身（S7 spike 實測：
 * 原地更新不搬焦點、不跳捲動、選取值不漂移；重建節點才會，故本函式
 * 不得使用 replaceChildren／innerHTML 整批替換）。
 */
function applyRowSelectOptionOps(select: HTMLSelectElement, ops: readonly RowSelectOptionOp[]): void {
  for (const op of ops) {
    if (op.kind === 'update') {
      const option = select.options[op.index]!
      option.value = op.value
      option.text = op.text
    } else if (op.kind === 'append') {
      const option = document.createElement('option')
      option.value = op.value
      option.text = op.text
      select.appendChild(option)
    } else {
      while (select.options.length > op.fromIndex) {
        select.remove(select.options.length - 1)
      }
    }
  }
}

/**
 * T5.4／T5.9／T5.14：依最新分組結果刷新每個啟用段的「顯示於第 N 列」
 * select——枚舉來源＝**rowSlots**（位置制，含中間空列；見 row-select.ts
 * rowSelectOptionsForSlots 文件：value＝slot index、pending 附「（新列）」
 * 字尾），以 computeRowSelectOptionOps 計算最小原地更新指令＋施作，並把
 * select 顯示值錨定為該段所在真實列的 slot index（`slotIndexOfRealRow`；
 * value 錨定，S7 已驗證安全）。只由 layoutSegmentContainers／暫存列增減
 * 路徑（wirePendingRowButton／removePendingRow）呼叫——與 row／slots 皆無
 * 關的 commit（如改顏色、前綴）不觸發，故不產生任何 select 刷新（PLAN
 * §D2 正規化接線 Rev 2 釘死）。停用段的 select 不在 groups 內、維持原狀
 * 不動（其 row 凍結，依 T5.3 雙區結構亦不可見）。
 */
function refreshRowSelects(groups: readonly RowGroup[]): void {
  for (const group of groups) {
    for (const id of group.segmentIds) {
      const select = rowSelectElements.get(id)
      if (select === undefined) continue
      const current: RowSelectOption[] = Array.from(select.options, (option) => ({
        value: option.value,
        text: option.text,
      }))
      // T5.14：枚舉來源＝rowSlots（位置制，含中間空列）；顯示值錨定為該段
      // 所在真實列的 slot index（group.row 為 real index）。
      applyRowSelectOptionOps(select, computeRowSelectOptionOps(current, rowSlots))
      select.value = String(slotIndexOfRealRow(rowSlots, group.row))
    }
  }
}

/**
 * T5.14（PLAN Rev 11「暫存列位置制」，取代 T5.9 計數制 renderPending-
 * RowContainers(count, rowCount)）：依 `slots`（位置制）重繪 UI 暫存空列
 * `<div>`——**插進 #segment-row-groups 內、正確位置**（可落在真實列
 * 之間），非另一獨立容器（#segment-pending-rows 已移除）。
 *
 * 節點重用鐵律不受影響：暫存列 `<div>` 恆不持有任何段 <li>（段一旦被
 * 指派入某暫存列即經 commitSegmentMove/commitConfig 收斂為真實渲染列、
 * 改由列群組 <section> 承載），故先移除既有全部 `.segment-pending-row`
 * 節點、再依 slots 逐個 pending slot 重繪，不違反該鐵律（其保護對象是
 * 承載狀態／監聽器的段 <li>）。真實列 <section> 彼此相對順序永不變
 * （grow 只在尾端 append、pending 每次整批重插），故 rowIndexOfOl 不受
 * 影響。
 *
 * 插入位置：pending slot s 之後的首個真實列 = 第 `realIndexOfSlot(slots, s)`
 * 個真實列容器（其 `.section`）；無（s 之後無真實列）→ 末端 append
 * （insertBefore(..., null)）。標題／刪除鈕 label 為 slot 顯示編號
 * 「第 s+1 列」；drop 接線 wirePendingRowDrop(root, s)（閉包持當下 slot
 * 位置，重繪即重算，安全）。
 */
function renderPendingRowContainers(slots: readonly RowSlot[]): void {
  for (const existing of segmentRowGroupsEl.querySelectorAll('.segment-pending-row')) {
    existing.remove()
  }
  for (let s = 0; s < slots.length; s++) {
    if (slots[s] !== 'pending') continue
    const root = instantiateTemplate('segment-pending-row-template', '__PRID__', `pending-row-${s}`)
    root.querySelector<HTMLElement>('.segment-section__heading')!.textContent = `第 ${s + 1} 列`
    const deleteBtn = root.querySelector<HTMLButtonElement>('.segment-pending-row__delete')!
    deleteBtn.textContent = `刪除第 ${s + 1} 列`
    deleteBtn.addEventListener('click', () => removePendingRow(s))
    wirePendingRowDrop(root, s)
    const before = rowGroupContainers[realIndexOfSlot(slots, s)]?.section ?? null
    segmentRowGroupsEl.insertBefore(root, before)
  }
}

/**
 * T5.14（PLAN Rev 11「暫存列刪除鈕點哪刪哪」，修正 T5.9 計數制「移除最高
 * 編號」怪癖）：暫存空列刪除鈕——removeSlotAt 於**被點擊者的 slot 位置**
 * 移除（純 UI 態、免確認），非「暫存池計數 -1／編號最大者消失」。重繪
 * 暫存列容器＋刷新 select 枚舉＋刷新顯示編號（中間空列被刪會使其下真實
 * 列的顯示編號上移一位）→ 播報「空列已移除」→ 焦點移至「新增一列」鈕
 * （不落 body；同 wirePendingRowButton 慣例）。
 */
function removePendingRow(slotIndex: number): void {
  if (rowSlots[slotIndex] !== 'pending') return // 防禦：只刪 pending slot。
  rowSlots = removeSlotAt(rowSlots, slotIndex)
  renderPendingRowContainers(rowSlots)
  refreshRowSelects(lastRowGroups)
  // T5.14：刪除「中間」空列會使其下方真實列的 slot 位置前移一格、顯示
  // 編號連動變化（見 refreshRowNumbering 文件），故本路徑須呼叫；同時本
  // 函式不經 commitConfig／layoutSegmentContainers（純 UI 態直接重繪），
  // 須自行同步「已渲染」基準，否則後續 commitConfig 的 slotsEqual 閘門
  // 會誤判「slots 未變」而漏重繪（協調者 CDP 實證 S4 追修同一 root cause
  // 類型——凡繞過 layoutSegmentContainers 逕改 rowSlots 的路徑皆須此步）。
  refreshRowNumbering()
  lastRenderedSlots = rowSlots
  announceMove('空列已移除')
  addPendingRowEl.focus()
}

/**
 * T5.14：顯示編號全面同步（新 helper）——每次 slots 或分組變動後，把每個
 * 真實列 `<section>` 標題／「刪除第 N 列」鈕 label／確認鈕對 aria-label
 * 更新為**顯示編號**（slotIndexOfRealRow(rowSlots, i)+1，i＝該容器 real
 * index＝rowGroupContainers 位置，終生穩定）。中間暫存列會把其下真實列
 * 的顯示編號往後推，故不能沿用建立時烙定的 index+1。
 */
function refreshRowNumbering(): void {
  for (let i = 0; i < rowGroupContainers.length; i++) {
    const container = rowGroupContainers[i]
    const displayRow = slotIndexOfRealRow(rowSlots, i) + 1
    const heading = container.section.querySelector<HTMLElement>('.segment-section__heading')
    if (heading !== null) heading.textContent = `第 ${displayRow} 列`
    const rowLabel = `刪除第 ${displayRow} 列`
    container.deleteTrigger.textContent = rowLabel
    const confirmBtn = container.section.querySelector<HTMLButtonElement>(
      '.segment-row-group__delete-confirm-btn',
    )
    const cancelBtn = container.section.querySelector<HTMLButtonElement>(
      '.segment-row-group__delete-cancel-btn',
    )
    if (confirmBtn !== null) confirmBtn.setAttribute('aria-label', `確認${rowLabel}`)
    if (cancelBtn !== null) cancelBtn.setAttribute('aria-label', `取消${rowLabel}`)
  }
}

/**
 * 列群組容器生命週期＋跨容器搬移的統一入口（T5.14 呼叫順序，見 TASKS.md
 * §layoutSegmentContainers）：成長容器→搬移既有 <li>→收縮多餘容器→
 * 復位「刪除此列」inline 確認態（I-2，見 resetRowGroupDeleteConfirmStates
 * 文件「確認態不跨 relayout 存活」新不變量）→reconcile slots（防禦收斂，
 * 理論上 no-op）→依 slots 重繪暫存列容器（插進 #segment-row-groups 正確
 * 位置）→刷新每段 select→刷新顯示編號→移位鈕／刪除鈕狀態，並更新
 * lastRowGroups（供下次 commitConfig 分組變動偵測之比較基準）。真實列
 * <section> 彼此相對順序永不變（grow 只在尾端 append、pending 每次整批
 * 重插），不違「容器位置終生穩定」invariant，rowIndexOfOl 不受影響。
 * commitConfig 僅於偵測到分組實際變動（rowGroupsEqual 為 false）時呼叫
 * 本函式；init() 於 buildSegmentRows 後亦呼叫一次。
 */
function layoutSegmentContainers(nextGroups: RowGroup[]): void {
  growRowGroupContainers(nextGroups.length)
  assignSegmentsToContainers(nextGroups)
  shrinkRowGroupContainers(nextGroups.length)
  resetRowGroupDeleteConfirmStates() // I-2：倖存容器可能已被重新指派內容，確認態不得跨 relayout 存活。
  rowSlots = reconcileRealSlots(rowSlots, nextGroups.length) // 防禦收斂（各變異點已顯式維護，理論上 no-op）。
  renderPendingRowContainers(rowSlots)
  refreshRowSelects(nextGroups)
  refreshRowNumbering() // T5.14：真實列標題／刪除鈕顯示編號隨 slots 同步。
  refreshMoveButtonStates(nextGroups) // T5.5：列首/列末停用態隨分組/順序變動同步。
  refreshRowDeleteButtons() // T5.11：僅剩最後一個真實列時「刪除此列」鈕 disabled。
  lastRowGroups = nextGroups
  // T5.14 追修：與 lastRowGroups 同點更新「已渲染」基準（純值快照，非同一
  // 參照——後續 rowSlots 被其他變異點重新賦值不影響此快照）。
  lastRenderedSlots = rowSlots
}

/**
 * T5.9／T5.14（PLAN §D3-R4「新增一列」／Rev 11「位置制」）：中欄頂部單一
 * 「＋ 新增一列」按鈕的接線——純 UI 狀態變動（appendPendingSlot：末端追加
 * 一個 pending slot），**不**呼叫 commitConfig（沒有任何 config 欄位變動；
 * config 恆無空列）。直接重繪暫存列容器＋刷新所有啟用段的 select 枚舉
 * （沿用目前 lastRowGroups，本次分組不變）。末端追加不改真實列顯示編號，
 * 故不需 refreshRowNumbering。事件處理後顯式回焦本按鈕（同 moveSegment／
 * setSegmentEnabled 慣例）。
 */
function wirePendingRowButton(): void {
  addPendingRowEl.addEventListener('click', () => {
    rowSlots = appendPendingSlot(rowSlots)
    renderPendingRowContainers(rowSlots)
    refreshRowSelects(lastRowGroups)
    // T5.14：本函式不經 commitConfig／layoutSegmentContainers（純 UI 態
    // 直接重繪），須自行同步「已渲染」基準，否則後續 commitConfig 的
    // slotsEqual 閘門會誤判「slots 未變」而漏重繪（見 removePendingRow
    // 同註解）。末端追加 pending 不改變任何既有真實列的 slot 位置／顯示
    // 編號，故不需 refreshRowNumbering。
    lastRenderedSlots = rowSlots
    addPendingRowEl.focus()
  })
}

// ── 初始化 ──

function init(): void {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    stored = null
  }
  // 讀取即以真 catalog 清洗（drop-unknown 續用、重整不丟）；無存檔→全停用預設。
  config = stored !== null ? deserializeConfig(stored, SEGMENT_CATALOG) : defaultConfig(SEGMENT_CATALOG)
  applyRowNormalization() // 存檔可能帶未正規化 row（如舊存檔／手改）；初始佈局前先歸一。
  // T5.9：id → SegmentConfig 物件參照查表，供左欄目錄 checkbox 的
  // setSegmentEnabled 直接 mutate（見其宣告處文件）。
  segmentConfigById = new Map(config.segments.map((seg) => [seg.id, seg]))

  preview = createPreview({
    container: previewTerminalEl,
    config,
    scenarioId: 'full',
    theme: 'dark',
  })

  buildCatalogItems() // T5.9：左欄輕量常駐目錄，一次建置、永不重排。
  buildSegmentRows()
  // 初始佈局：把預設啟用段（若有）自隱藏池搬進其列群組；lastRowGroups
  // 起始值為空陣列，故本次呼叫恆執行（無論是否有啟用段）。
  // T5.14：初始 rowSlots＝初始渲染列數個 'real'（config 恆無空列，初始
  // 亦無暫存列）——須於 layoutSegmentContainers 前設定（reconcileRealSlots
  // 屆時為 no-op）。
  const initialGroups = computeRowGroups(config.segments)
  rowSlots = Array<RowSlot>(initialGroups.length).fill('real')
  layoutSegmentContainers(initialGroups)
  syncGlobalControls()
  wireGlobalControls()
  wirePendingRowButton()
  wirePreviewControls()
  wireOutputActions()
  refreshOutputs()
}

// deferred module 執行時 DOM 已解析；仍以 readyState 守衛使初始化嚴格於
// DOMContentLoaded 後（PLAN「DOMContentLoaded 起始」）。
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
