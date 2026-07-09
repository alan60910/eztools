/**
 * S5-T3.2（magi/05-statusline-builder/PLAN.md §預覽契約／§D3 mode 邊界／
 * §Builder UI a11y 契約 預覽區＋Nerd Font 提示／§資產與授權 字型）：
 * 終端模擬預覽渲染模組（browser-only DOM）＋Nerd Font subset 接線。
 *
 * ── 職責 ──
 * 1. resolve(config, input)→StyledRun[]（已交付純函式，勿重算）→逐 run 建
 *    `<span>`，fg/bg 經 color.ts colorSpecToHex（ANSI256→hex／truecolor 直取／
 *    default 不著色）上 CSS `color`/`background-color`；powerline 箭頭 run 照樣
 *    渲染（字型有 glyph）。span 為裝飾、`aria-hidden`（T3.1 index.html 契約）。
 * 2. 預覽容器 `role="img"`＋`aria-label` ＝ toAriaLabel(runs)（resolve.ts 純
 *    函式，只呼叫）——**每次 render 後同步刷 label 防 stale**；**刻意不
 *    aria-live**（見 renderRuns 註解，防逐鍵吵雜）。
 * 3. 深/淺底：切 `#preview-terminal` 的 `preview-terminal--dark`／`--light`
 *    modifier class（T3.1 index.html 契約，實際底色由 T3.1 style.css 定；
 *    default 色 run 不落 color 屬性 → 繼承終端框基底前景）。不重播——切換僅
 *    改視覺，aria-label 沿用當前 resolve 快照。
 * 4. mock 情境切換：setScenario(id)→取 mock-data 對應 scenario→重新 render
 *    （radiogroup DOM 由 T3.1 出，本模組提供 setScenario API 供 main.ts 接線）。
 * 5. 字型接線：`import './preview-font.css'` 註冊 @font-face（Vite 資產管線把
 *    woff2 搬入 dist/assets/），終端框 font-family 堆疊以 inline style 鎖為
 *    `'Symbols Nerd Font Mono Subset', ui-monospace, monospace`（subset 優先，
 *    確保 PUA glyph 走 subset 而非 T3.1 樣式的泛等寬）。
 * 6. Nerd Font 提示：T3.1 的常駐橫幅 `#nerd-font-banner`（含文字＋安裝連結，
 *    常駐 a11y tree，非 display:none）。setNerdFontActive 只切
 *    `nerd-font-banner--active` class（視覺強調，**不重建橫幅內容**）；
 *    describeWithHint 讓 main.ts 把橫幅 id 綁到 icon／powerline 控件
 *    （aria-describedby，聚焦當下讀出，非 aria-live）。啟用態由 needsNerdFont
 *    純函式派生。SP-1 已簽入字型，常態走字型路徑；「字型缺失降級純文字」為
 *    backlog（不實作降級 UI）。
 *
 * ── 純函式接縫（render-preview.test.ts node 測試面；DOM-free）──
 * needsNerdFont／runInlineColors／themeModifierClass 抽為零 DOM 純函式，
 * node 可測；其餘 DOM 組裝（browser-only）不強制 node 測試（PLAN：browser-only
 * DOM 模組不強制 node 測試；視覺實渲染歸 T4.4 SP-3）。CSS 為 side-effect
 * import，node 環境（vitest）回空模組。
 */
import './preview-font.css'

import { colorSpecToHex } from './color.js'
import type { BuilderConfig } from './config.js'
import { MOCK_SCENARIOS, MOCK_SCENARIOS_BY_ID, type MockScenarioId } from './mock-data.js'
import { resolve, toAriaLabel, type ResolveInput, type StyledRun } from './resolve.js'

// ── 字型（preview-font.css @font-face 逐字一致） ──

/** @font-face family 名（preview-font.css 宣告同名；無 RFN 約束，見 T1.6 §7）。 */
export const PREVIEW_FONT_FAMILY_NAME = 'Symbols Nerd Font Mono Subset'

/** 終端框 font-family 堆疊（subset 優先，字型未就緒／缺 glyph 時退等寬 fallback）。 */
export const PREVIEW_FONT_STACK = `'${PREVIEW_FONT_FAMILY_NAME}', ui-monospace, monospace`

// ── 深/淺底主題（T3.1 index.html：preview-terminal--dark/--light modifier） ──

export type PreviewTheme = 'dark' | 'light'

/** 預設主題（T3.1 index.html 初始 class＝--dark）。 */
export const DEFAULT_PREVIEW_THEME: PreviewTheme = 'dark'

/** 兩主題 modifier class（切換時全移除、加當前）。 */
export const PREVIEW_THEME_CLASSES: Readonly<Record<PreviewTheme, string>> = Object.freeze({
  dark: 'preview-terminal--dark',
  light: 'preview-terminal--light',
})

/** 主題 → modifier class 名（純函式，node 可測）。 */
export function themeModifierClass(theme: PreviewTheme): string {
  return PREVIEW_THEME_CLASSES[theme]
}

// ── Nerd Font 提示（T3.1 常駐橫幅；active class 切視覺，不重建內容） ──

/** icon／powerline 啟用時加於橫幅的視覺強調 class（T3.1 index.html 契約）。 */
export const NERD_FONT_BANNER_ACTIVE_CLASS = 'nerd-font-banner--active'

/** 全隱藏（無存活段）時的預覽 aria-label fallback（避免 role=img 無名）。 */
export const EMPTY_PREVIEW_LABEL = '狀態列預覽：未啟用任何區段'

// ── 純函式接縫（node 可測） ──

/**
 * icon／powerline 啟用 → 需 Nerd Font（powerline 箭頭與 segment icon 皆 PUA
 * glyph）。純函式，供 render 派生提示啟用態、供 node 測試。停用段的 icon 不
 * 計入（只看 enabled 且 icon 的段，或 powerline 模式的箭頭）。
 */
export function needsNerdFont(config: BuilderConfig): boolean {
  if (config.mode === 'powerline') return true
  return config.segments.some((seg) => seg.enabled && seg.icon)
}

/**
 * StyledRun → inline 顏色（純函式，node 可測）：fg→color、bg→background-color，
 * 各經 colorSpecToHex（default／缺席→null＝不落屬性，沿用終端框基底）。粒度
 * 規則已在 resolve 定（default 不落 fg/bg），此處只機械轉 hex。
 */
export function runInlineColors(run: StyledRun): {
  color: string | null
  backgroundColor: string | null
} {
  return {
    color: run.fg ? colorSpecToHex(run.fg) : null,
    backgroundColor: run.bg ? colorSpecToHex(run.bg) : null,
  }
}

// ── DOM 套用小工具 ──

/**
 * 套用終端框 font-family 堆疊到容器（inline，確保 subset 優先於 T3.1 樣式的
 * 泛等寬——否則 PUA glyph 落 fallback 字型為豆腐字）。@font-face 由檔頭 CSS
 * import 註冊。
 */
function applyPreviewFontFamily(container: HTMLElement): void {
  container.style.fontFamily = PREVIEW_FONT_STACK
}

/** 切主題 modifier class（移除兩者、加當前）；僅視覺，不觸 aria-label（不重播）。 */
function applyTheme(container: HTMLElement, theme: PreviewTheme): void {
  for (const cls of Object.values(PREVIEW_THEME_CLASSES)) container.classList.remove(cls)
  container.classList.add(themeModifierClass(theme))
}

// ── run → DOM span ──

function buildRunSpan(run: StyledRun): HTMLSpanElement {
  const span = document.createElement('span')
  span.textContent = run.text // textContent（非 innerHTML）＝零注入面、glyph 字面嵌入
  span.setAttribute('aria-hidden', 'true') // 裝飾；a11y 由容器 role=img+aria-label 承載
  const { color, backgroundColor } = runInlineColors(run)
  if (color !== null) span.style.color = color
  if (backgroundColor !== null) span.style.backgroundColor = backgroundColor
  return span
}

/**
 * StyledRun[] → 容器 DOM＋aria-label。
 *
 * a11y：容器 `role="img"`＋`aria-label`＝toAriaLabel(runs)（PUA glyph／箭頭不
 * 進 label，由 resolve.ts 機械 enforcement 保證）；**每次 render 後同步刷
 * label 防 stale**。**刻意不 aria-live**——label 為隨動快照，逐鍵播報會吵雜
 * （PLAN 明述；情境／深淺底切換亦不另行播報）。內層 span 為裝飾、aria-hidden。
 * 全隱藏 → 空 label 以 EMPTY_PREVIEW_LABEL 兜底（避免 role=img 無名——契約
 * 沉默處選擇）。
 */
export function renderRuns(container: HTMLElement, runs: readonly StyledRun[]): void {
  container.setAttribute('role', 'img')
  applyPreviewFontFamily(container)
  container.replaceChildren(...runs.map(buildRunSpan))
  const label = toAriaLabel(runs)
  container.setAttribute('aria-label', label === '' ? EMPTY_PREVIEW_LABEL : label)
}

/**
 * config＋情境三通道（ResolveInput／MockScenario 結構子集） → 容器預覽。
 * 低階組合塊：resolve→renderRuns。main.ts 可直用，或用下方 controller。
 */
export function renderPreview(
  container: HTMLElement,
  config: BuilderConfig,
  input: ResolveInput,
): void {
  renderRuns(container, resolve(config, input))
}

// ── Controller（main.ts 接線主介面） ──

export interface PreviewInit {
  /** 預覽終端框（T3.1 `#preview-terminal`）；render 填 styled span、設 role=img＋aria-label。 */
  container: HTMLElement
  /**
   * 可選：T3.1 常駐 Nerd Font 提示橫幅（`#nerd-font-banner`）。setNerdFontActive
   * 只切其 active class（不重建內容）；main.ts 以 describeWithHint 綁
   * aria-describedby。
   */
  hint?: HTMLElement
  /** 初始 config（可缺；缺則首次 render 為空預覽，待 setConfig）。 */
  config?: BuilderConfig
  /** 初始情境 id（預設 canonical 首個＝'full'）。 */
  scenarioId?: MockScenarioId
  /** 初始深/淺底（預設 dark，對齊 T3.1 初始 class）。 */
  theme?: PreviewTheme
}

export interface PreviewController {
  /** 更新 config → 重新 resolve＋render＋刷提示啟用態。 */
  setConfig(config: BuilderConfig): void
  /** 切 mock 情境 → 取對應 scenario 重新 render（label 隨動快照）。 */
  setScenario(id: MockScenarioId): void
  /** 切深/淺底 → 僅切終端框 modifier class（不重播、不重 resolve、label 沿用）。 */
  setTheme(theme: PreviewTheme): void
  /** icon／powerline 啟用態 → 切橫幅 active class（不重建內容）；無 hint→no-op。 */
  setNerdFontActive(active: boolean): void
  /** 把提示綁到控件（aria-describedby）；無 hint 元素則 no-op。 */
  describeWithHint(control: Element): void
  /** 以當前 state 重繪（config 缺 → 空預覽）。 */
  render(): void
  /** 當前提示元素 id（無 hint→null）；main.ts 亦可自行 describeWithHint。 */
  readonly hintId: string | null
}

let hintIdCounter = 0

/** 確保提示元素有 id（T3.1 已給 `nerd-font-banner`；缺則指派穩定 id）。 */
function ensureHintId(hintEl: HTMLElement): string {
  if (hintEl.id === '') hintEl.id = `statusline-nerdfont-hint-${(hintIdCounter += 1)}`
  return hintEl.id
}

/**
 * 建立預覽 controller。持有 container／hint／config／scenarioId／theme，
 * setXxx 各自最小重繪：setTheme／setNerdFontActive 不重 resolve（僅視覺），
 * setConfig／setScenario 重 resolve＋刷 label＋依 needsNerdFont 切提示。
 */
export function createPreview(init: PreviewInit): PreviewController {
  const { container, hint } = init
  let config: BuilderConfig | null = init.config ?? null
  let scenarioId: MockScenarioId = init.scenarioId ?? MOCK_SCENARIOS[0].id
  let theme: PreviewTheme = init.theme ?? DEFAULT_PREVIEW_THEME
  const hintId = hint !== undefined ? ensureHintId(hint) : null

  function setNerdFontActive(active: boolean): void {
    if (hint !== undefined) hint.classList.toggle(NERD_FONT_BANNER_ACTIVE_CLASS, active)
  }

  applyTheme(container, theme)

  function render(): void {
    if (config === null) {
      // 空預覽：仍為具名 role=img，不落 span。
      renderRuns(container, [])
      setNerdFontActive(false)
      return
    }
    const scenario = MOCK_SCENARIOS_BY_ID[scenarioId]
    renderPreview(container, config, scenario)
    setNerdFontActive(needsNerdFont(config))
  }

  render()

  return {
    hintId,
    setConfig(next) {
      config = next
      render()
    },
    setScenario(id) {
      scenarioId = id
      render()
    },
    setTheme(next) {
      theme = next
      applyTheme(container, next) // 僅視覺；不重 resolve、不動 aria-label
    },
    setNerdFontActive,
    describeWithHint(control) {
      if (hintId !== null) control.setAttribute('aria-describedby', hintId)
    },
    render,
  }
}

// ── 產出碼區塊填充（可選；main.ts 亦可直塞 textContent） ──

/**
 * 填三份產出碼區塊（bash／ps1／settings）——**textContent 直塞**（非
 * innerHTML：產出碼含 `<`、`$`、glyph 等，textContent 零轉義／零注入面）。
 * 主軸為預覽渲染；此為便利函式，main.ts 可繞過直接 `el.textContent = code`
 * （T3.1 的 `<pre><code>` 結構＝傳入各 `<code>` 節點；見 .t32-report 約定）。
 */
export function renderOutputs(
  targets: { bash: HTMLElement; ps1: HTMLElement; settings: HTMLElement },
  codes: { bash: string; ps1: string; settings: string },
): void {
  targets.bash.textContent = codes.bash
  targets.ps1.textContent = codes.ps1
  targets.settings.textContent = codes.settings
}
