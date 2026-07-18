// @vitest-environment jsdom
/**
 * T4.1（magi/09-statusline-ux-refactor/PLAN.md §D4 A-1／A-3；TASKS.md
 * T4.1）：即時預覽抽出三欄版面，成為 `<main>` 之前的全寬 sticky 頂帶，
 * 取代 T5.8 的 .builder-columns__aside 右欄定位。回歸網比照既有
 * default-hint.dom.test.ts 的「先以 jsdom 剖析真實 index.html 取得
 * <body>、動態 import main.ts 觸發其 init()」全頁面整合測試形（見該檔
 * 檔頭說明，不重複抄錄）。
 *
 * 本檔涵蓋 TASKS.md T4.1「※測：jsdom 停點數量／role 案」＋任務指示的
 * 「頂帶存在＋mock hint 文字渲染」＋既有 8 個 dom.test 之外、專屬本
 * task 的版面結構斷言（aside 退役、產出區安置於 main 內）。
 *
 * T4.2 更新：產出區已由過渡期的 #output-section 收進
 * `<dialog id="output-dialog">`（PLAN §D4 A-2），下方「結構與位置」
 * describe 區塊的斷言同步改為新結構；dialog 焦點管理／live region
 * 常駐位置等 T4.2 專屬案見新檔 output-dialog.dom.test.ts。
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'

const HTML_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'index.html')
const RAW_HTML = readFileSync(HTML_PATH, 'utf-8')
const BODY_MATCH = /<body[^>]*>([\s\S]*)<\/body>/.exec(RAW_HTML)
if (BODY_MATCH === null) throw new Error('index.html 缺少 <body>，無法取得測試骨架')
const BODY_HTML = BODY_MATCH[1]

/** 清空 localStorage＋重灌乾淨 DOM＋重置模組快取後啟動 main.ts（同既有 dom.test 慣例）。 */
async function boot(): Promise<void> {
  localStorage.clear()
  document.body.innerHTML = BODY_HTML
  vi.resetModules()
  await import('./main.js')
}

describe('T4.1 頂帶版面：捲動停點契約', () => {
  beforeAll(async () => {
    await boot()
  })

  it('.builder-columns__aside 已退役（不存在於 DOM）', () => {
    expect(document.querySelector('.builder-columns__aside')).toBeNull()
  })

  it('#preview-section 接手 role="region"／tabindex="0"（頂帶捲動停點之一）', () => {
    const preview = document.getElementById('preview-section')
    expect(preview).not.toBeNull()
    expect(preview!.getAttribute('role')).toBe('region')
    expect(preview!.getAttribute('tabindex')).toBe('0')
  })

  it('#preview-terminal 維持 tabindex="0"（頂帶捲動停點之二，總數維持 2）', () => {
    const terminal = document.getElementById('preview-terminal')
    expect(terminal).not.toBeNull()
    expect(terminal!.getAttribute('tabindex')).toBe('0')

    // 「兩個捲動停點」機械斷言：全頁恰有 1 個 role="region"+tabindex="0"
    // 節點（頂帶本身），加上已知的 #preview-terminal，總數維持 2、不
    // 多不少（不新增不遺失，PLAN §D4 A-3）。
    const regionStops = document.querySelectorAll('[role="region"][tabindex="0"]')
    expect(regionStops.length).toBe(1)
    expect(regionStops[0]).toBe(document.getElementById('preview-section'))
  })
})

describe('T4.1 頂帶版面：結構與位置', () => {
  beforeAll(async () => {
    await boot()
  })

  it('#preview-section 為 <header> 與 <main> 之間的全寬頂帶（<main> 之前）', () => {
    const header = document.querySelector('header')
    const main = document.querySelector('main')
    const preview = document.getElementById('preview-section')
    expect(header).not.toBeNull()
    expect(main).not.toBeNull()
    expect(preview).not.toBeNull()
    expect(preview!.previousElementSibling).toBe(header)
    expect(preview!.nextElementSibling).toBe(main)
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

  it('底色／情境控件仍在 #preview-section 內（收斂為單列緊湊形，結構不變、DOM 位置隨頂帶搬移）', () => {
    const preview = document.getElementById('preview-section')!
    expect(preview.querySelector('#preview-bg-dark')).not.toBeNull()
    expect(preview.querySelector('#preview-bg-light')).not.toBeNull()
    expect(preview.querySelector('#scenario-full')).not.toBeNull()
    expect(preview.querySelector('#scenario-windows-cjk')).not.toBeNull()
  })
})

describe('T4.1 頂帶版面：mock 時鐘常駐說明（G4）', () => {
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
