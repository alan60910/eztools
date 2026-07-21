// @vitest-environment jsdom
/**
 * T2.1／T2.2（magi/14-statusline-ux-round2/PLAN.md §D2 三欄終形；
 * TASKS.md T2.1／T2.2）：三欄版面「版面手術」批的新增最小結構案——
 * preview-band.dom.test.ts／skip-nav.dom.test.ts 已改寫既有斷言（見該
 * 二檔），本檔補三個既有檔案未涵蓋的面向：
 *
 * 1. 右欄（`.builder-columns__list`）內容序＝教學帶槽→目錄→已選擇
 *    （T2.2，PLAN §D2 右欄段）。
 * 2. `--column-top` CSS 變數接線（T2.2，main.ts `syncColumnTop()`）：
 *    jsdom 無真實 layout 引擎，`getBoundingClientRect()` 恆回全零矩形，
 *    改以 stub 驗證「依 <header> 高度寫入 :root CSS 變數」的接線本身。
 * 3. 40dvh 高度預算掛載點自 `#preview-section` 遷至 `.preview-terminal`
 *    （T2.1）＋右欄容器 CSS 屬性（overscroll-behavior／overflow-y／
 *    sticky／max-height calc()，T2.2）——jsdom 不套用外部 stylesheet
 *    （main.ts 的 `import './style.css'` 在 vitest 下為無 side-effect
 *    的模組匯入），無法靠 `getComputedStyle` 斷言，改讀 style.css
 *    原始文字比對規則區塊（同專案內 scripts/verify-dist-checks.mjs
 *    等既有工具的「原始文字比對」慣例，非新發明手法）。
 *
 * 回歸網比照既有 preview-band.dom.test.ts 的「先以 jsdom 剖析真實
 * index.html 取得 <body>、動態 import main.ts 觸發其 init()」全頁面
 * 整合測試形（見該檔檔頭說明，不重複抄錄）。
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const HTML_PATH = path.resolve(DIR, 'index.html')
const RAW_HTML = readFileSync(HTML_PATH, 'utf-8')
const BODY_MATCH = /<body[^>]*>([\s\S]*)<\/body>/.exec(RAW_HTML)
if (BODY_MATCH === null) throw new Error('index.html 缺少 <body>，無法取得測試骨架')
const BODY_HTML = BODY_MATCH[1]

const STYLE_CSS = readFileSync(path.resolve(DIR, 'style.css'), 'utf-8')

/** 清空 localStorage＋重灌乾淨 DOM＋重置模組快取後啟動 main.ts（同既有 dom.test 慣例）。 */
async function boot(html: string = BODY_HTML): Promise<void> {
  localStorage.clear()
  document.body.innerHTML = html
  vi.resetModules()
  await import('./main.js')
}

/** 取 style.css 原始文字中，選擇器第一次出現處對應的規則區塊內文（不含大括號、假設無巢狀大括號）。 */
function firstRuleBlock(css: string, selectorPattern: RegExp): string {
  const match = selectorPattern.exec(css)
  if (match === null) throw new Error(`style.css 找不到符合 ${selectorPattern} 的規則`)
  const openIndex = css.indexOf('{', match.index)
  const closeIndex = css.indexOf('}', openIndex)
  return css.slice(openIndex + 1, closeIndex)
}

/** 取 style.css 原始文字中，指定 class 選擇器（獨立成行，含逗號複選子句）每一次出現對應的規則區塊內文。 */
function allRuleBlocksForClassSelector(css: string, className: string): string[] {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(?:^|\\n)[ \\t]*\\.${escaped}\\s*\\{`, 'g')
  const blocks: string[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(css)) !== null) {
    const openIndex = css.indexOf('{', match.index)
    const closeIndex = css.indexOf('}', openIndex)
    blocks.push(css.slice(openIndex + 1, closeIndex))
  }
  return blocks
}

/**
 * MAGI review 🔴-1 連動：取 `@media` 規則在原始文字中的字面範圍
 * `[start, end)`（`start`＝`@media` 關鍵字起點、`end`＝其閉合 `}` 之後
 * 一位），以括號配對定位閉合（比起「找下一個頂層 selector」更不受
 * 區塊內巢狀規則數量影響，本檔多個 media 區塊皆巢有多條規則）。供下方
 * 「sticky 基準規則字面歸屬」測試比對規則起點是否落在此範圍內——純
 * source-text 索引比對，不依賴 CSS 解析器（同檔既有 firstRuleBlock／
 * allRuleBlocksForClassSelector 手法一致）。
 */
function mediaBlockRange(css: string, headerPattern: RegExp): { start: number; end: number } {
  const match = headerPattern.exec(css)
  if (match === null) throw new Error(`style.css 找不到符合 ${headerPattern} 的 @media 規則`)
  const openIndex = css.indexOf('{', match.index)
  let depth = 0
  let i = openIndex
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') {
      depth--
      if (depth === 0) break
    }
  }
  if (depth !== 0) throw new Error(`style.css 的 @media 規則（${headerPattern}）括號未配對閉合`)
  return { start: match.index, end: i + 1 }
}

describe('T2.2 右欄內容序（教學帶槽→目錄→已選擇）', () => {
  beforeAll(async () => {
    await boot()
  })

  it('#tutorial-band-slot → .segment-lists → #selected-section 依序為 #list-column 內容（T2.2 PLAN §D2 右欄段）', () => {
    const listCol = document.getElementById('list-column')
    expect(listCol).not.toBeNull()

    const tutorialSlot = document.getElementById('tutorial-band-slot')
    const segmentLists = listCol!.querySelector('.segment-lists')
    const selected = document.getElementById('selected-section')

    expect(tutorialSlot).not.toBeNull()
    expect(segmentLists).not.toBeNull()
    expect(selected).not.toBeNull()
    expect(listCol!.contains(tutorialSlot)).toBe(true)
    expect(listCol!.contains(segmentLists)).toBe(true)
    expect(listCol!.contains(selected)).toBe(true)

    expect(
      Boolean(tutorialSlot!.compareDocumentPosition(segmentLists!) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true)
    expect(
      Boolean(segmentLists!.compareDocumentPosition(selected!) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true)
  })

  it('#tutorial-band-slot 自 T2.6 起含教學帶內容（不再是空容器；完整結構斷言見 tutorial-band.dom.test.ts）', () => {
    const slot = document.getElementById('tutorial-band-slot')
    expect(slot).not.toBeNull()
    expect(slot!.children.length).toBeGreaterThan(0)
    expect(slot!.classList.contains('tutorial-band')).toBe(true)
  })

  it('#selected-section 保留 role="region"／aria-label，不帶 tabindex（本容器非捲動容器，縱向捲動隨外層 .builder-columns__list）', () => {
    const selected = document.getElementById('selected-section')
    expect(selected).not.toBeNull()
    expect(selected!.getAttribute('role')).toBe('region')
    expect(selected!.hasAttribute('aria-label')).toBe(true)
    expect(selected!.hasAttribute('tabindex')).toBe(false)
  })
})

describe('T2.2 --column-top CSS 變數接線（main.ts syncColumnTop，jsdom 下 stub 高度）', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.documentElement.style.removeProperty('--column-top')
  })

  it('init 時依 <header> 實際渲染高度（四捨五入）寫入 :root 的 --column-top CSS 變數', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const height = this.tagName === 'HEADER' ? 240.4 : 0
      return {
        height,
        width: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: height,
        x: 0,
        y: 0,
        toJSON() {
          return {}
        },
      } as DOMRect
    })

    await boot()

    // 240.4 四捨五入為 240（main.ts syncColumnTop 以 Math.round 取整）。
    expect(document.documentElement.style.getPropertyValue('--column-top')).toBe('240px')
  })

  it('<header> 高度變動（如語言切換／換行造成的高度差）於下次 init 反映新值——非寫死常數', async () => {
    const spy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const height = this.tagName === 'HEADER' ? 300 : 0
        return {
          height,
          width: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: height,
          x: 0,
          y: 0,
          toJSON() {
            return {}
          },
        } as DOMRect
      })

    await boot()
    expect(document.documentElement.style.getPropertyValue('--column-top')).toBe('300px')

    spy.mockRestore()
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const height = this.tagName === 'HEADER' ? 180 : 0
      return {
        height,
        width: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: height,
        x: 0,
        y: 0,
        toJSON() {
          return {}
        },
      } as DOMRect
    })
    await boot()
    expect(document.documentElement.style.getPropertyValue('--column-top')).toBe('180px')
  })

  it('缺少 <header> 節點時 no-op（防禦性；init() 不因此拋錯，理論上不會發生，見 main.ts syncColumnTop 文件）', async () => {
    // 只拔除 <header>／</header> 標籤本身（保留其子節點如 .theme-toggle／
    // .lang-toggle 仍在文件中，避免 initThemeToggle／initLangToggle 因
    // 找不到節點而拋錯——本案只想測 syncColumnTop 的 no-op 分支）。
    const bodyWithoutHeaderTag = BODY_HTML.replace('<header>', '').replace('</header>', '')
    expect(bodyWithoutHeaderTag).not.toBe(BODY_HTML)

    await boot(bodyWithoutHeaderTag)

    expect(document.querySelector('header')).toBeNull()
    expect(document.documentElement.style.getPropertyValue('--column-top')).toBe('')
  })
})

describe('T2.1 40dvh 高度預算掛載點（style.css 原始文字檢核：自 #preview-section 遷至 .preview-terminal）', () => {
  it('.preview-terminal 帶 max-height:40dvh', () => {
    const block = firstRuleBlock(STYLE_CSS, /\.preview-terminal\s*\{/)
    expect(block).toMatch(/max-height:\s*40dvh/)
  })

  it('.preview-section 本身不再帶 max-height:40dvh／overflow:hidden（高度預算已遷出，見 T2.1 條件式停點判定）', () => {
    const block = firstRuleBlock(STYLE_CSS, /(?:^|\n)\.preview-section\s*\{/)
    expect(block).not.toMatch(/max-height/)
    expect(block).not.toMatch(/overflow:\s*hidden/)
  })
})

describe('T2.2 右欄容器 CSS 契約（style.css 原始文字檢核）', () => {
  it('.builder-columns__list 基準規則具備 sticky／top:0／overflow-y:auto／overscroll-behavior:contain／max-height calc(100dvh - var(--column-top))', () => {
    const blocks = allRuleBlocksForClassSelector(STYLE_CSS, 'builder-columns__list')
    const stickyBlock = blocks.find((block) => /overscroll-behavior:\s*contain/.test(block))
    expect(stickyBlock).toBeDefined()
    expect(stickyBlock).toMatch(/position:\s*sticky/)
    expect(stickyBlock).toMatch(/top:\s*0/)
    expect(stickyBlock).toMatch(/overflow-y:\s*auto/)
    expect(stickyBlock).toMatch(/max-height:\s*calc\(100dvh\s*-\s*var\(--column-top/)
  })

  /*
   * MAGI review 🔴-1：存在性比對假綠教訓——改鎖層疊歸屬。原案僅驗證
   * 「<1100px 存在一條 position:static／max-height:none 的解除規則」，
   * 未驗證該解除規則是否真的贏得層疊（source order）：舊實作把無條件
   * 的 sticky 基準規則寫在 media 區塊「之後」，兩條規則 specificity
   * 相同（皆 0-1-0），源序後到者勝——基準規則因此整條蓋掉解除規則，
   * 行動版右欄恆為 sticky，1932 全綠與此 Critical 並存（假綠）。修法
   * 把基準規則遷入 `@media (min-width: 1100px)` 區塊本身（見 style.css
   * 該規則新位置的完整論證），從語法上消除「解除規則」存在的必要——
   * 本案不再驗證「解除規則是否存在」，改鎖「基準規則的字面位置歸屬
   * ≥1100px 區塊」與「media 外無條件 sticky 基準規則不存在」兩個不變
   * 量，直接對應本次 Critical 的層疊源序成因，防同型缺陷重演假綠。
   */
  it('MAGI review 🔴-1：sticky 基準規則的字面位置歸屬 @media (min-width: 1100px) 區塊內，且不存在 media 外的無條件 sticky 基準規則', () => {
    const mediaRange = mediaBlockRange(STYLE_CSS, /@media \(min-width:\s*1100px\)\s*\{/)

    const selectorPattern = /(?:^|\n)[ \t]*\.builder-columns__list\s*\{/g
    const stickyBaseSelectorIndexes: number[] = []
    let match: RegExpExecArray | null
    while ((match = selectorPattern.exec(STYLE_CSS)) !== null) {
      const openIndex = STYLE_CSS.indexOf('{', match.index)
      const closeIndex = STYLE_CSS.indexOf('}', openIndex)
      const block = STYLE_CSS.slice(openIndex + 1, closeIndex)
      const isStickyBase = /position:\s*sticky/.test(block) && /max-height:\s*calc\(100dvh/.test(block)
      if (isStickyBase) stickyBaseSelectorIndexes.push(match.index)
    }

    // 恰有一條 sticky 基準規則（不多不少——本測試假設此不變量，若未來
    // 拆成多條規則，本案需同步更新，非本輪範圍）。
    expect(stickyBaseSelectorIndexes.length).toBe(1)
    const [stickyBaseIndex] = stickyBaseSelectorIndexes

    // (a) 規則起點落在 @media (min-width: 1100px) 區塊字面範圍內。
    expect(stickyBaseIndex!).toBeGreaterThan(mediaRange.start)
    expect(stickyBaseIndex!).toBeLessThan(mediaRange.end)

    // (b) 不存在 media 外（無條件）的 .builder-columns__list sticky 基準規則
    // ——(a) 已保證唯一一條落在 media 內，此處為顯式重申該不變量本身。
    const outsideMedia = stickyBaseSelectorIndexes.filter(
      (index) => index <= mediaRange.start || index >= mediaRange.end,
    )
    expect(outsideMedia).toEqual([])
  })
})
