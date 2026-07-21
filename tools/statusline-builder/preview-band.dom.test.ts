// @vitest-environment jsdom
/**
 * T2.1（magi/14-statusline-ux-round2/PLAN.md §D2 中欄；TASKS.md T2.1，
 * 取代 09-PLAN §D4 A-1／A-3「即時預覽抽出為 <main> 之前的全寬 sticky
 * 頂帶」前身）：即時預覽自全寬頂帶「降級」入三欄終形的中欄——`<main>`
 * 內第二個 grid 欄（DOM 序＝設定→預覽→清單）。回歸網比照既有
 * default-hint.dom.test.ts 的「先以 jsdom 剖析真實 index.html 取得
 * <body>、動態 import main.ts 觸發其 init()」全頁面整合測試形（見該檔
 * 檔頭說明，不重複抄錄）。
 *
 * 本檔涵蓋 TASKS.md T2.1「捲動停點條件式判定」＋「skip-nav／preview-band
 * dom 案同步改寫」的版面結構斷言（既有 8 個 dom.test 之外、專屬本 task
 * 的版面結構斷言：aside/catalog/selected 舊 wrapper 退役、產出區安置於
 * main 內、三欄 DOM 序）。
 *
 * T2.1 條件式捲動停點判定（本檔核心斷言依據，見 index.html
 * `#preview-section` 節點自身註解的完整論證）：40dvh 高度預算已自本
 * 節點遷出、改掛 `#preview-terminal` 自身 `max-height`（style.css）；
 * 本節點不再帶 `overflow:hidden`／`max-height`，故不再是自身的 CSS
 * 捲動容器——**移除 tabindex，僅保留 role="region"**，捲動停點總數由
 * 2（頂帶自身＋#preview-terminal）降為 1（僅 #preview-terminal）。
 *
 * T4.2 沿革：產出區已由過渡期的 #output-section 收進
 * `<dialog id="output-dialog">`（PLAN §D4 A-2），下方「結構與位置」
 * describe 區塊的斷言同步改為新結構；dialog 焦點管理／live region
 * 常駐位置等 T4.2 專屬案見新檔 output-dialog.dom.test.ts。
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const HTML_PATH = path.resolve(DIR, 'index.html')
const RAW_HTML = readFileSync(HTML_PATH, 'utf-8')
const BODY_MATCH = /<body[^>]*>([\s\S]*)<\/body>/.exec(RAW_HTML)
if (BODY_MATCH === null) throw new Error('index.html 缺少 <body>，無法取得測試骨架')
const BODY_HTML = BODY_MATCH[1]

const STYLE_CSS = readFileSync(path.resolve(DIR, 'style.css'), 'utf-8')

/** 取 style.css 原始文字中，選擇器第一次出現處對應的規則區塊內文（不含大括號、假設無巢狀大括號，同 layout-columns.dom.test.ts 慣例）。 */
function firstRuleBlock(css: string, selectorPattern: RegExp): string {
  const match = selectorPattern.exec(css)
  if (match === null) throw new Error(`style.css 找不到符合 ${selectorPattern} 的規則`)
  const openIndex = css.indexOf('{', match.index)
  const closeIndex = css.indexOf('}', openIndex)
  return css.slice(openIndex + 1, closeIndex)
}

/** 清空 localStorage＋重灌乾淨 DOM＋重置模組快取後啟動 main.ts（同既有 dom.test 慣例）。 */
async function boot(): Promise<void> {
  localStorage.clear()
  document.body.innerHTML = BODY_HTML
  vi.resetModules()
  await import('./main.js')
}

describe('T2.1 三欄版面：舊 wrapper 退役', () => {
  beforeAll(async () => {
    await boot()
  })

  it('.builder-columns__aside 已退役（不存在於 DOM，T4.1 沿革）', () => {
    expect(document.querySelector('.builder-columns__aside')).toBeNull()
  })

  it('.builder-columns__catalog 已退役（T2.1 起改名 .builder-columns__settings，且目錄已搬出）', () => {
    expect(document.querySelector('.builder-columns__catalog')).toBeNull()
  })

  it('.builder-columns__selected 已退役（T2.1 起 #selected-section 不再自帶此 class，改巢在 .builder-columns__list 內）', () => {
    expect(document.querySelector('.builder-columns__selected')).toBeNull()
  })
})

describe('T2.1 三欄版面：捲動停點契約（條件式判定）', () => {
  beforeAll(async () => {
    await boot()
  })

  it('#preview-section 保留 role="region"，但移除 tabindex（自身不再是捲動容器，見 T2.1 條件式判定）', () => {
    const preview = document.getElementById('preview-section')
    expect(preview).not.toBeNull()
    expect(preview!.getAttribute('role')).toBe('region')
    expect(preview!.hasAttribute('tabindex')).toBe(false)
  })

  it('#preview-terminal 維持 tabindex="0"（T2.1 起唯一捲動停點，40dvh 高度預算亦自 #preview-section 遷入本節點自身）', () => {
    const terminal = document.getElementById('preview-terminal')
    expect(terminal).not.toBeNull()
    expect(terminal!.getAttribute('tabindex')).toBe('0')

    // 「捲動停點降為 1」機械斷言：全頁恰無 role="region"+tabindex="0"
    // 節點（T2.1 判定：外層預覽節點不再自身捲動，tabindex 已移除，
    // 不再有任一節點同時具備兩者）。
    const regionStops = document.querySelectorAll('[role="region"][tabindex="0"]')
    expect(regionStops.length).toBe(0)
  })
})

describe('T2.1 三欄版面：結構與 DOM 序', () => {
  beforeAll(async () => {
    await boot()
  })

  it('#preview-section 為 <main> 內三欄之中欄（設定→預覽→清單 DOM 序，不再是 <main> 前的獨立頂帶）', () => {
    const main = document.querySelector('main')
    const preview = document.getElementById('preview-section')
    const settingsCol = document.querySelector('.builder-columns__settings')
    const listCol = document.getElementById('list-column')
    expect(main).not.toBeNull()
    expect(preview).not.toBeNull()
    expect(settingsCol).not.toBeNull()
    expect(listCol).not.toBeNull()
    expect(main!.contains(preview)).toBe(true)

    // DOM 序：設定 → 預覽 → 清單（PLAN §D2 三欄終形，無 order／grid-area 重映射）。
    expect(
      Boolean(settingsCol!.compareDocumentPosition(preview!) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true)
    expect(
      Boolean(preview!.compareDocumentPosition(listCol!) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true)
  })

  // T4.2：#output-section 已收進 <dialog id="output-dialog">（產出腳本
  // 單一按鈕收斂，見 magi/09-statusline-ux-refactor/PLAN.md §D4 A-2）；
  // 本案同步改斷言新結構，位置仍在 <main> 內。
  it('#output-dialog 位於 <main> 內（產出腳本收斂為 dialog，非已退役的 aside）', () => {
    const main = document.querySelector('main')
    const output = document.getElementById('output-dialog')
    expect(main).not.toBeNull()
    expect(output).not.toBeNull()
    expect(output!.tagName).toBe('DIALOG')
    expect(main!.contains(output)).toBe(true)
  })

  it('底色／情境控件仍在 #preview-section 內（收斂為單列緊湊形，結構不變、DOM 位置隨中欄搬移）', () => {
    const preview = document.getElementById('preview-section')!
    expect(preview.querySelector('#preview-bg-dark')).not.toBeNull()
    expect(preview.querySelector('#preview-bg-light')).not.toBeNull()
    expect(preview.querySelector('#scenario-full')).not.toBeNull()
    expect(preview.querySelector('#scenario-windows-cjk')).not.toBeNull()
  })
})

describe('T2.1 三欄版面：.preview-section 繪序保護（style.css 原始文字檢核，MAGI review 🟡-4）', () => {
  it('.preview-section 規則塊含 z-index: 2（沿革自舊頂帶 z-index:5 的繪序保護，T2.1 遷移時遺失；防 <1100px 捲動下 DOM 序在後的 positioned 後代——如 .color-swatch——繪於 sticky 預覽之上，見 style.css 該規則旁註解完整論證）', () => {
    const block = firstRuleBlock(STYLE_CSS, /(?:^|\n)\.preview-section\s*\{/)
    expect(block).toMatch(/z-index:\s*2\b/)
  })
})

describe('T2.1 三欄版面：mock 時鐘常駐說明（G4，T4.1 沿革）', () => {
  beforeAll(async () => {
    await boot()
  })

  it('#preview-mock-clock-hint 渲染出常駐提示文字（示範時鐘／真時鐘皆提及）', () => {
    const hint = document.getElementById('preview-mock-clock-hint')
    expect(hint).not.toBeNull()
    expect(hint!.textContent).toBeTruthy()
    expect(hint!.textContent).toMatch(/示範時鐘/)
    expect(hint!.textContent).toMatch(/真時鐘/)
  })
})
