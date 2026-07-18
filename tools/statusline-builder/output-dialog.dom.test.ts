// @vitest-environment jsdom
/**
 * T4.2（magi/09-statusline-ux-refactor/PLAN.md §D4 A-2／A-3；TASKS.md
 * T4.2）：產出腳本收斂為單一「產出腳本」鈕（`#output-dialog-open`）開啟
 * 原生 `<dialog id="output-dialog">`（stacked 三區塊，不做分頁）。焦點
 * 管理為**顯式**——開＝聚焦 dialog 內第一個可聚焦元素、關＝顯式還原焦點
 * 至「產出腳本」鈕，不依賴瀏覽器原生 showModal／自動焦點還原演算法。
 *
 * jsdom（見 node_modules/jsdom/lib/jsdom/living/nodes/HTMLDialogElement-
 * impl.js）僅實作 `open` IDL 屬性、**未**實作 `showModal()`／`close()`／
 * `close`／`cancel` 事件——main.ts 的 `openOutputDialog`／
 * `closeOutputDialog` 皆以 `typeof el.showModal/close === 'function'`
 * 特徵偵測 fallback（僅切 `open` 屬性＋手動派送 `close` 事件），故本檔
 * 測試路徑走的正是 fallback 分支；真實瀏覽器下 showModal／原生 close 事件
 * 走同一段 `close` 監聽器（見 main.ts `wireOutputDialog` 文件），行為一致。
 *
 * 回歸網比照既有 preview-band.dom.test.ts 的「先以 jsdom 剖析真實
 * index.html 取得 <body>、動態 import main.ts 觸發其 init()」全頁面整合
 * 測試形（見該檔檔頭說明，不重複抄錄）。本檔各 `it` 皆會開關 dialog／
 * 搬移焦點，彼此互相隔離較安全，故採 `beforeEach` 每案重新 boot（非既有
 * 部分 dom.test 慣用的 `beforeAll`）。
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

function openBtn(): HTMLButtonElement {
  return document.getElementById('output-dialog-open') as HTMLButtonElement
}

function closeBtn(): HTMLButtonElement {
  return document.getElementById('output-dialog-close') as HTMLButtonElement
}

function dialogEl(): HTMLDialogElement {
  return document.getElementById('output-dialog') as HTMLDialogElement
}

describe('T4.2 產出 dialog：開啟＋焦點管理', () => {
  beforeEach(async () => {
    await boot()
  })

  it('click 產出鈕 → dialog 具 open 屬性（jsdom 無 showModal，走 main.ts 特徵偵測 fallback）', () => {
    expect(dialogEl().hasAttribute('open')).toBe(false)
    openBtn().click()
    expect(dialogEl().hasAttribute('open')).toBe(true)
  })

  it('click 產出鈕 → 焦點顯式落於 dialog 內第一個可聚焦元素（DOM 序最前之 bash 複製鈕）', () => {
    openBtn().click()
    // bash output-block 為 dialog 內第一個區塊，其複製鈕先於下載連結
    // （下載連結雖有 href 但仍排在複製鈕之後），故為第一個可聚焦元素。
    expect(document.activeElement).toBe(document.getElementById('copy-bash'))
  })

  it('開啟時保險重算一次 refreshOutputs：settings-path 開啟前已改值，dialog 內容仍為最新', () => {
    const input = document.getElementById('settings-path') as HTMLInputElement
    input.value = '/custom/statusline.ps1'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    openBtn().click()
    const settingsCode = document.querySelector('#output-settings code')!.textContent ?? ''
    expect(settingsCode).toContain('/custom/statusline.ps1')
  })
})

describe('T4.2 產出 dialog：關閉焦點還原（統一經 close 事件，不分關閉來源）', () => {
  beforeEach(async () => {
    await boot()
  })

  it('dispatch close（模擬 Esc 原生 cancel→close）→ 焦點顯式還原至「產出腳本」鈕', () => {
    openBtn().click()
    openBtn().blur() // 確保還原斷言不是「焦點本來就沒動過」的偽陽性
    dialogEl().dispatchEvent(new Event('close'))
    expect(document.activeElement).toBe(openBtn())
  })

  it('點擊顯式「關閉」鈕 → dialog 關閉屬性移除＋焦點還原', () => {
    openBtn().click()
    closeBtn().click()
    expect(dialogEl().hasAttribute('open')).toBe(false)
    expect(document.activeElement).toBe(openBtn())
  })

  it('backdrop click（event.target === dialog 本身）→ 關閉＋焦點還原', () => {
    openBtn().click()
    dialogEl().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(dialogEl().hasAttribute('open')).toBe(false)
    expect(document.activeElement).toBe(openBtn())
  })

  it('點擊 dialog 內部子元素（非 backdrop 本身）不觸發關閉', () => {
    openBtn().click()
    document.getElementById('copy-bash')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(dialogEl().hasAttribute('open')).toBe(true)
  })
})

describe('T4.2 #output-status live region 常駐 dialog 外（守 SPEC.md:102）', () => {
  beforeEach(async () => {
    await boot()
  })

  it('#output-status 不是 #output-dialog 的子孫節點', () => {
    const status = document.getElementById('output-status')!
    expect(dialogEl().contains(status)).toBe(false)
  })

  it('無論 dialog 開或關，#output-status 沿祖先鏈皆無 hidden 屬性（常駐 a11y tree，非以 hidden/display:none 承載）', () => {
    const status = document.getElementById('output-status')!
    const assertNoHiddenAncestor = (): void => {
      let el: HTMLElement | null = status
      while (el !== null) {
        expect(el.hasAttribute('hidden')).toBe(false)
        el = el.parentElement
      }
    }
    expect(status.getAttribute('role')).toBe('status')
    assertNoHiddenAncestor() // dialog 關閉狀態
    openBtn().click()
    assertNoHiddenAncestor() // dialog 開啟狀態
  })

  it('複製操作播報仍寫入 #output-status（即使 dialog 已開啟）', async () => {
    openBtn().click()
    const status = document.getElementById('output-status')!
    expect(status.classList.contains('is-empty')).toBe(true)
    document.getElementById('copy-bash')!.click()
    // copyOutput 為 async（navigator.clipboard 於 jsdom 缺席時走 catch
    // 分支播報「複製失敗」）；多讓幾個 microtask 跑完以求穩健。
    await Promise.resolve()
    await Promise.resolve()
    expect(status.classList.contains('is-empty')).toBe(false)
    expect(status.textContent).toBeTruthy()
  })
})

describe('T4.2 #settings-path 仍在左側 config 區（不入 dialog）', () => {
  beforeEach(async () => {
    await boot()
  })

  it('#settings-path 不是 #output-dialog 的子孫節點', () => {
    const input = document.getElementById('settings-path')!
    expect(dialogEl().contains(input)).toBe(false)
  })
})

describe('T4.2 三個 output-block 皆在 dialog 內 stacked（不分頁）＋複製/下載鈕接線', () => {
  beforeEach(async () => {
    await boot()
  })

  it('bash／ps1／settings 三個 .output-block 皆為 dialog 子孫、無 tablist 結構（stacked，非分頁）', () => {
    const blocks = dialogEl().querySelectorAll('.output-block')
    expect(blocks.length).toBe(3)
    expect(dialogEl().querySelector('[role="tablist"]')).toBeNull()
  })

  it('複製鈕接線正常（click 不拋錯）', () => {
    openBtn().click()
    expect(() => {
      ;(document.getElementById('copy-ps1') as HTMLButtonElement).click()
      ;(document.getElementById('copy-settings') as HTMLButtonElement).click()
    }).not.toThrow()
  })

  it('下載連結接線正常：三份皆為 blob URL（.ps1 BOM byte-exact 斷言沿既有案，見 emit-ps1.test.ts；本案僅驗證接線未斷）', () => {
    openBtn().click()
    expect((document.getElementById('download-bash') as HTMLAnchorElement).href).toMatch(/^blob:/)
    expect((document.getElementById('download-ps1') as HTMLAnchorElement).href).toMatch(/^blob:/)
    expect((document.getElementById('download-settings') as HTMLAnchorElement).href).toMatch(/^blob:/)
  })
})
