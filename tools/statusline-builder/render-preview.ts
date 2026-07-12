/**
 * S5-T3.2／S6-T3.2（magi/05-statusline-builder/PLAN.md §預覽契約／§D3 mode
 * 邊界／magi/06-statusline-ui-refresh/PLAN.md §D1 Round 2）：終端模擬預覽
 * 渲染模組（browser-only DOM）。
 *
 * ── 職責 ──
 * 1. resolve(config, input)→rows: StyledRun[][]（已交付純函式，勿重算）
 *    →逐列建一個子容器，容器內逐 run 建 `<span>`：一般文字 run 以
 *    textContent 嵌字面，fg/bg 經 color.ts
 *    colorSpecToHex（ANSI256→hex／truecolor 直取／default 不著色）上 CSS
 *    `color`/`background-color`；powerline 箭頭 run（`text===POWERLINE_ARROW`，
 *    resolve.ts 匯出常數）**不落文字節點**，改渲染為 CSS `clip-path` 三角形
 *    （字型已刪除，PUA glyph 必為豆腐——見下方「箭頭三角形」）。span 為裝飾、
 *    `aria-hidden`（T3.1 index.html 契約）。
 * 2. 預覽容器雙層結構（M4：`role="img"`→`role="group"` 重構，PLAN §多列
 *    預覽 a11y；img 為葉節點角色、子代被多數 AT 忽略，故此為必要改動）：
 *    外層固定 `role="group"`＋`aria-label="狀態列預覽"`（PREVIEW_GROUP_LABEL，
 *    不隨內容重算，故不再需要「每次 render 後刷 label 防 stale」）；內部
 *    **每列一個 `role="img"` 子容器**、`aria-label="第 N 列：〈該列
 *    toAriaLabel 結果〉"`（N＝渲染列序，前綴由本模組自加，toAriaLabel
 *    簽章不變、只吃單列 StyledRun[]）——AT 使用者可逐列導覽，不再是單一
 *    長句。全隱藏 `[[]]`（resolve 恆回長度 ≥1，永不 `[]`）時：外層 group
 *    保留、內部渲染**單一**子容器（同逐列容器結構）承載
 *    `EMPTY_PREVIEW_LABEL`（不加「第 N 列」前綴——語意上不存在「第幾
 *    列」）。箭頭 run 的 ariaText 恆為 `''`（resolve.ts 既定），三角形視覺
 *    不新增 aria 內容。**刻意不 aria-live**（見 renderRuns 註解，防逐鍵
 *    吵雜）。
 * 3. 深/淺底：切 `#preview-terminal` 的 `preview-terminal--dark`／`--light`
 *    modifier class（T3.1 index.html 契約，實際底色由 T3.1 style.css 定；
 *    default 色 run 不落 color 屬性 → 繼承終端框基底前景）。不重播——切換僅
 *    改視覺，aria-label 沿用當前 resolve 快照。
 * 4. mock 情境切換：setScenario(id)→取 mock-data 對應 scenario→重新 render
 *    （radiogroup DOM 由 T3.1 出，本模組提供 setScenario API 供 main.ts 接線）。
 * 5. 箭頭三角形（PLAN D1 Round 2）：三角形本體色＝run.fg（掛 `--arrow-fg`
 *    CSS 變數，style.css `.preview-terminal__arrow::before` 以
 *    `background-color: var(--arrow-fg, currentColor)` 讀取＋`clip-path`
 *    裁出右尖三角；default fg（CSS 變數未設）時 fallback `currentColor`，
 *    對齊真終端以預設前景繪出箭頭的行為，T4.2 由 `transparent` 改此值）；
 *    外框 `background-color`＝run.bg（過渡目標色，cap 箭頭無 bg → 不落屬性
 *    ＝透明，退回終端底色）。終端框 font-family 由 style.css
 *    `.preview-terminal` 字族棧統一決定（T4.2：移除本模組原本以 inline
 *    style 蓋掉該字族棧的 `applyPreviewFontFamily` 死重，讓 CSS fallback
 *    鏈自然生效，不再單獨鎖 `ui-monospace, monospace`）。
 *
 * ── 純函式接縫（render-preview.test.ts node 測試面；DOM-free）──
 * runInlineColors／runRenderSpec／themeModifierClass／buildPreviewSpec 抽
 * 為零 DOM 純函式，node 可測（buildPreviewSpec 為 M4 新增：把「rows→雙層
 * 容器結構＋逐列 aria-label」的決策抽成純函式，讓逐列容器結構／aria-label
 * 前綴／`[[]]` 兜底可在無 DOM 環境下斷言，DOM 組裝端只機械消費此規格）；
 * 其餘 DOM 組裝（browser-only）不強制 node 測試（PLAN：browser-only DOM
 * 模組不強制 node 測試；視覺實渲染歸 T4.4 SP-3）。
 */
import { colorSpecToHex } from './color.js'
import type { BuilderConfig } from './config.js'
import { MOCK_SCENARIOS, MOCK_SCENARIOS_BY_ID, type MockScenarioId } from './mock-data.js'
import { POWERLINE_ARROW, resolve, toAriaLabel, type ResolveInput, type StyledRun } from './resolve.js'

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

/**
 * 外層預覽容器（`role="group"`）的固定 aria-label（M4：PLAN §多列預覽
 * a11y）。與內容無關、不隨 resolve 結果重算——群組本身只是逐列子容器的
 * 容器，可及名稱由內部每列的 `role="img"` 子容器承載。
 */
export const PREVIEW_GROUP_LABEL = '狀態列預覽'

/** 全隱藏（無存活段）時的預覽 aria-label fallback（避免 role=img 無名）。 */
export const EMPTY_PREVIEW_LABEL = '狀態列預覽：未啟用任何區段'

/** 箭頭三角形容器的 class（style.css `.preview-terminal__arrow` `::before` 三角）。 */
export const PREVIEW_ARROW_CLASS = 'preview-terminal__arrow'

// ── 純函式接縫（node 可測） ──

/**
 * StyledRun → inline 顏色（純函式，node 可測）：fg→color、bg→background-color，
 * 各經 colorSpecToHex（default／缺席→null＝不落屬性，沿用終端框基底）。粒度
 * 規則已在 resolve 定（default 不落 fg/bg），此處只機械轉 hex。箭頭 run 的
 * 三角形掛色（runRenderSpec）亦復用本函式，只是掛法不同（fg 走 CSS 變數而
 * 非 `color`，見下方）。
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

/** run → DOM 渲染規格：一般文字落文字節點；箭頭（PUA glyph）改三角形，無文字節點。 */
export type RunRenderSpec =
  | { kind: 'text'; text: string; color: string | null; backgroundColor: string | null }
  | { kind: 'arrow'; background: string | null; arrowFg: string | null }

/**
 * StyledRun → 渲染規格（純函式，node 可測；buildRunSpan 依此建 DOM）。箭頭 run
 * （`text===POWERLINE_ARROW`，resolve.ts 匯出常數；字型已刪除，PUA glyph 必為
 * 豆腐）改為 CSS `clip-path` 三角形：三角形本體色＝run.fg（掛 `--arrow-fg` CSS
 * 變數，style.css `::before` 讀取）、外框 background-color＝run.bg（過渡目標；
 * cap 箭頭無 bg → null＝透明，退回終端底色）——回傳形無 `text` 欄位，機械保證
 * 呼叫端不落文字節點。一般文字 run 沿用既有 fg→color／bg→backgroundColor 掛法
 * （runInlineColors）。
 */
export function runRenderSpec(run: StyledRun): RunRenderSpec {
  const { color, backgroundColor } = runInlineColors(run)
  if (run.text === POWERLINE_ARROW) {
    return { kind: 'arrow', background: backgroundColor, arrowFg: color }
  }
  return { kind: 'text', text: run.text, color, backgroundColor }
}

/** 逐列子容器渲染規格：`role="img"` 承載的 aria-label＋列內 run 序（純函式）。 */
export interface PreviewRowSpec {
  ariaLabel: string
  runs: readonly StyledRun[]
}

/**
 * 預覽雙層容器渲染規格（純函式，node 可測；renderRuns 依此建 DOM）：外層
 * `role="group"` 固定 label＋逐列 `role="img"` 子容器規格陣列。
 */
export interface PreviewSpec {
  groupLabel: string
  rows: readonly PreviewRowSpec[]
}

/**
 * rows: StyledRun[][] → PreviewSpec（純函式，node 可測；DOM 組裝端只機械
 * 消費此規格）。
 *
 * 逐列 aria-label＝`第 N 列：${toAriaLabel(row)}`（N＝渲染列序，1 起算；
 * toAriaLabel 簽章不變，只吃單列 StyledRun[]，前綴由本函式自加）。
 *
 * `[[]]`（resolve 全隱藏退化，恆單一空列）為結構性特例：外層 group 保留，
 * 但只渲染**單一**子容器、aria-label 直接是 `EMPTY_PREVIEW_LABEL`（不加
 * 「第 N 列」前綴——語意上不存在「第幾列」，比照逐列容器結構僅指沿用同一
 * 種 `role="img"` 子容器形狀）。resolve() 的分組不變量保證：非此特例時，
 * 每個渲染列的 runs 恆非空（空桶不進 Map、不佔渲染列序），故一般分支不需
 * 另行處理逐列空陣列。
 */
export function buildPreviewSpec(rows: readonly (readonly StyledRun[])[]): PreviewSpec {
  const isEmptyFallback = rows.length === 1 && rows[0].length === 0
  return {
    groupLabel: PREVIEW_GROUP_LABEL,
    rows: isEmptyFallback
      ? [{ ariaLabel: EMPTY_PREVIEW_LABEL, runs: [] }]
      : rows.map((row, index) => ({
          ariaLabel: `第 ${index + 1} 列：${toAriaLabel(row)}`,
          runs: row,
        })),
  }
}

// ── DOM 套用小工具 ──

/** 切主題 modifier class（移除兩者、加當前）；僅視覺，不觸 aria-label（不重播）。 */
function applyTheme(container: HTMLElement, theme: PreviewTheme): void {
  for (const cls of Object.values(PREVIEW_THEME_CLASSES)) container.classList.remove(cls)
  container.classList.add(themeModifierClass(theme))
}

// ── run → DOM span ──

/**
 * runRenderSpec → `<span>`（裝飾、aria-hidden；a11y 由容器 role=img+aria-label
 * 承載）。text 形＝textContent 嵌字面（非 innerHTML＝零注入面）＋fg/bg inline
 * color／background-color；arrow 形＝**不設 textContent**（無 PUA 文字節點），
 * class 掛 `PREVIEW_ARROW_CLASS`（style.css 三角形 `::before`）、background
 * inline 設外框過渡色、`--arrow-fg` CSS 變數供 `::before` 三角形本體上色。
 */
function buildRunSpan(run: StyledRun): HTMLSpanElement {
  const span = document.createElement('span')
  span.setAttribute('aria-hidden', 'true')
  const spec = runRenderSpec(run)
  if (spec.kind === 'arrow') {
    span.className = PREVIEW_ARROW_CLASS
    if (spec.background !== null) span.style.backgroundColor = spec.background
    if (spec.arrowFg !== null) span.style.setProperty('--arrow-fg', spec.arrowFg)
  } else {
    span.textContent = spec.text
    if (spec.color !== null) span.style.color = spec.color
    if (spec.backgroundColor !== null) span.style.backgroundColor = spec.backgroundColor
  }
  return span
}

/**
 * rows: StyledRun[][] → 雙層容器 DOM＋aria-label（M4：PLAN §多列預覽
 * a11y）。
 *
 * a11y：外層容器固定 `role="group"`＋`aria-label="狀態列預覽"`
 * （PREVIEW_GROUP_LABEL，不隨內容重算，不再有「render 後刷 label 防
 * stale」的必要）；內部每列一個 `role="img"` 子容器＋逐列 aria-label（見
 * buildPreviewSpec）。**刻意不 aria-live**——label 為隨動快照，逐鍵播報會
 * 吵雜（PLAN 明述；情境／深淺底切換亦不另行播報）。列內 span 為裝飾、
 * aria-hidden。`[[]]` 全隱藏 → 外層 group 保留、單一子容器承載
 * EMPTY_PREVIEW_LABEL（buildPreviewSpec 兜底，避免 role=img 無名）。
 */
export function renderRuns(container: HTMLElement, rows: readonly (readonly StyledRun[])[]): void {
  const spec = buildPreviewSpec(rows)
  container.setAttribute('role', 'group')
  container.setAttribute('aria-label', spec.groupLabel)
  container.replaceChildren(
    ...spec.rows.map((rowSpec) => {
      const rowEl = document.createElement('div')
      rowEl.setAttribute('role', 'img')
      rowEl.setAttribute('aria-label', rowSpec.ariaLabel)
      rowEl.replaceChildren(...rowSpec.runs.map(buildRunSpan))
      return rowEl
    }),
  )
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
  /**
   * 預覽終端框（T3.1 `#preview-terminal`）；render 填雙層結構——外層固定
   * role=group＋aria-label，內部逐列 role=img 子容器（M4）。
   */
  container: HTMLElement
  /** 初始 config（可缺；缺則首次 render 為空預覽，待 setConfig）。 */
  config?: BuilderConfig
  /** 初始情境 id（預設 canonical 首個＝'full'）。 */
  scenarioId?: MockScenarioId
  /** 初始深/淺底（預設 dark，對齊 T3.1 初始 class）。 */
  theme?: PreviewTheme
}

export interface PreviewController {
  /** 更新 config → 重新 resolve＋render。 */
  setConfig(config: BuilderConfig): void
  /** 切 mock 情境 → 取對應 scenario 重新 render（label 隨動快照）。 */
  setScenario(id: MockScenarioId): void
  /** 切深/淺底 → 僅切終端框 modifier class（不重播、不重 resolve、label 沿用）。 */
  setTheme(theme: PreviewTheme): void
  /** 以當前 state 重繪（config 缺 → 空預覽）。 */
  render(): void
}

/**
 * 建立預覽 controller。持有 container／config／scenarioId／theme，setXxx 各自
 * 最小重繪：setTheme 不重 resolve（僅視覺），setConfig／setScenario 重
 * resolve＋刷 label。
 */
export function createPreview(init: PreviewInit): PreviewController {
  const { container } = init
  let config: BuilderConfig | null = init.config ?? null
  let scenarioId: MockScenarioId = init.scenarioId ?? MOCK_SCENARIOS[0].id
  let theme: PreviewTheme = init.theme ?? DEFAULT_PREVIEW_THEME

  applyTheme(container, theme)

  function render(): void {
    if (config === null) {
      // 空預覽：`[[]]` 兜底——外層 group 保留、單一子容器承載 EMPTY_PREVIEW_LABEL。
      renderRuns(container, [[]])
      return
    }
    const scenario = MOCK_SCENARIOS_BY_ID[scenarioId]
    renderPreview(container, config, scenario)
  }

  render()

  return {
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
