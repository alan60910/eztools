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
  serializeConfig,
  type BuilderConfig,
  type SegmentConfig,
  type SeparatorPresetValue,
} from './config.js'
import {
  DESCRIPTORS_BY_ID,
  SEGMENT_CATALOG,
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
let pickerCounter = 0
let thresholdCounter = 0

/** segment id → 其列 <li>（重排以移動節點、保留內部接線與焦點，不重建）。 */
const rowElements = new Map<string, HTMLLIElement>()

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

// ── segment 列（複合控件） ──

function buildSegmentRow(seg: SegmentConfig, descriptor: SegmentDescriptor): HTMLLIElement {
  const li = instantiateTemplate('segment-row-template', '__ID__', descriptor.id) as HTMLLIElement
  li.dataset.segmentId = descriptor.id

  // 啟用 checkbox（accessible name＝段名，識別該列）＋展開/收合重控件。
  const enableInput = li.querySelector<HTMLInputElement>('.segment-row__enable')!
  li.querySelector<HTMLElement>('.segment-row__name')!.textContent = descriptor.label
  enableInput.checked = seg.enabled
  li.classList.toggle('segment-row--enabled', seg.enabled)
  enableInput.addEventListener('change', () => {
    seg.enabled = enableInput.checked
    li.classList.toggle('segment-row--enabled', seg.enabled)
    commitConfig()
  })

  // 上/下移鈕（鍵盤等效；aria-label＝段名＋角色）。
  const moveUp = li.querySelector<HTMLButtonElement>('.segment-row__move-up')!
  const moveDown = li.querySelector<HTMLButtonElement>('.segment-row__move-down')!
  moveUp.setAttribute('aria-label', `${descriptor.label} — 上移`)
  moveDown.setAttribute('aria-label', `${descriptor.label} — 下移`)
  moveUp.addEventListener('click', () => moveSegment(descriptor.id, 'up'))
  moveDown.addEventListener('click', () => moveSegment(descriptor.id, 'down'))

  // 圖示 checkbox。
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

/**
 * 拖曳排序（鍵盤等效由上/下移鈕承擔）。整列可拖，但自 value 控件
 * （input/select/button/spinbutton）起手則取消，以免干擾控件互動；只限
 * 同類別 <ol> 內重排。
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
    event.dataTransfer?.setData('text/plain', descriptor.id)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    li.style.opacity = '0.5'
  })
  li.addEventListener('dragend', () => {
    draggingId = null
    li.style.opacity = ''
  })
  li.addEventListener('dragover', (event) => {
    if (draggingId === null || draggingId === descriptor.id) return
    const dragged = rowElements.get(draggingId)
    if (dragged === undefined || dragged.parentElement !== li.parentElement) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  })
  li.addEventListener('drop', (event) => {
    if (draggingId === null || draggingId === descriptor.id) return
    const dragged = rowElements.get(draggingId)
    const ol = li.parentElement
    if (dragged === undefined || ol === null || dragged.parentElement !== ol) return
    event.preventDefault()
    const rect = li.getBoundingClientRect()
    const after = event.clientY > rect.top + rect.height / 2
    ol.insertBefore(dragged, after ? li.nextElementSibling : li)
    const movedId = draggingId
    draggingId = null
    dragged.style.opacity = ''
    syncConfigOrderFromDom()
    commitConfig()
    announceReorder(ol, dragged, movedId)
  })
}

// ── 排序（DOM 為序、config.segments 同步；同類別內重排） ──

function moveSegment(id: SegmentId, direction: 'up' | 'down'): void {
  const li = rowElements.get(id)
  if (li === undefined) return
  const ol = li.parentElement
  if (ol === null) return
  if (direction === 'up') {
    const prev = li.previousElementSibling
    if (prev === null) return // 已在最前
    ol.insertBefore(li, prev)
  } else {
    const next = li.nextElementSibling
    if (next === null) return // 已在最後
    ol.insertBefore(next, li)
  }
  syncConfigOrderFromDom()
  commitConfig()
  announceReorder(ol, li, id)
  // 移動的是同一元素、焦點自然保留；顯式再聚焦以防瀏覽器差異。
  li.querySelector<HTMLButtonElement>(
    direction === 'up' ? '.segment-row__move-up' : '.segment-row__move-down',
  )?.focus()
}

function announceReorder(ol: Element, li: Element, id: string): void {
  const siblings = Array.from(ol.children)
  const pos = siblings.indexOf(li) + 1
  const descriptor = DESCRIPTORS_BY_ID[id as SegmentId]
  announceMove(`${descriptor.label} 移至第 ${pos} 位（共 ${siblings.length}）`)
}

/** DOM order（四分區固定序）→ 重建 config.segments，維持單一真相與輸出一致。 */
function syncConfigOrderFromDom(): void {
  const order: string[] = []
  for (const category of SECTION_ORDER) {
    for (const child of Array.from(SEGMENT_LIST_BY_CATEGORY[category].children)) {
      const id = (child as HTMLElement).dataset.segmentId
      if (id !== undefined) order.push(id)
    }
  }
  const byIdMap = new Map(config.segments.map((seg) => [seg.id, seg]))
  const next: SegmentConfig[] = []
  for (const id of order) {
    const seg = byIdMap.get(id)
    if (seg !== undefined) next.push(seg)
  }
  // 保底：DOM 未涵蓋者（理論上不會）附於末，確保恆為 catalog 全集排列。
  for (const seg of config.segments) if (!order.includes(seg.id)) next.push(seg)
  config.segments = next
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

/** 任何 config 變動的統一收束：存檔＋刷預覽（controller 內部 resolve）＋刷三產物。 */
function commitConfig(): void {
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

function buildSegmentRows(): void {
  for (const category of SECTION_ORDER) SEGMENT_LIST_BY_CATEGORY[category].textContent = ''
  rowElements.clear()
  for (const seg of config.segments) {
    const descriptor = DESCRIPTORS_BY_ID[seg.id as SegmentId] as SegmentDescriptor | undefined
    if (descriptor === undefined) continue // 清洗後不應發生；防禦。
    const li = buildSegmentRow(seg, descriptor)
    rowElements.set(seg.id, li)
    SEGMENT_LIST_BY_CATEGORY[descriptor.category].appendChild(li)
  }
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

  preview = createPreview({
    container: previewTerminalEl,
    config,
    scenarioId: 'full',
    theme: 'dark',
  })

  buildSegmentRows()
  syncGlobalControls()
  wireGlobalControls()
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
