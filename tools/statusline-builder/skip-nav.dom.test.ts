// @vitest-environment jsdom
/**
 * T4.3（magi/09-statusline-ux-refactor/PLAN.md §D4 A-3；TASKS.md
 * T4.3）：skip-nav 改造回歸測試。T2.1（magi/14-statusline-ux-round2/
 * PLAN.md §D2；TASKS.md T2.1）追加更新：三欄終形落地後「跳至預覽」的
 * 行為描述隨條件式捲動停點判定調整（見下方該 describe 區塊）。
 *
 * 「跳至產出腳本」原 `href="#output-section"`，該 id 隨 T4.2 dialog 化
 * 消失、連結淪為 no-op（T4.2 report 交接明載）。本 task 改為 main.ts
 * 顯式 click handler（`wireSkipToOutput`）：`preventDefault()` 後聚焦
 * 「產出腳本」鈕（`#output-dialog-open`）本身，**不**自動開啟 dialog——
 * skip 的目的是「到達控制項」，非「觸發」。href 改指該鈕 id 僅作無 JS
 * 環境的語意化備援。T2.1 未改此節。
 *
 * 「跳至預覽」href 本身未改（`#preview-section`，T4.3／T2.1 皆未動）；
 * 但 T2.1 起 `#preview-section` 依「捲動停點條件式」判定移除了
 * tabindex="0"（見 index.html `#preview-section` 節點自身註解的完整
 * 論證：40dvh 高度預算已遷入 `#preview-terminal` 自身，外層不再自身
 * 捲動）——原生錨點跳轉的行為隨之從「捲動並聚焦」變為「僅捲動、不
 * 奪取焦點」（同「跳至已選擇」既有慣例），此檔下方對應斷言已同步改寫。
 *
 * 回歸網比照既有 preview-band.dom.test.ts／output-dialog.dom.test.ts 的
 * 「先以 jsdom 剖析真實 index.html 取得 <body>、動態 import main.ts
 * 觸發其 init()」全頁面整合測試形（見該二檔檔頭說明，不重複抄錄）。
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

function skipToOutputLink(): HTMLAnchorElement {
  return document.querySelector('[data-testid="skip-to-output"]') as HTMLAnchorElement
}

function outputOpenBtn(): HTMLButtonElement {
  return document.getElementById('output-dialog-open') as HTMLButtonElement
}

function outputDialogEl(): HTMLDialogElement {
  return document.getElementById('output-dialog') as HTMLDialogElement
}

describe('T4.3 skip-nav：「跳至產出腳本」聚焦鈕本身（不觸發開啟）', () => {
  beforeEach(async () => {
    await boot()
  })

  it('href 指向產出鈕 id（無 JS 環境語意化備援），非已消失的 #output-section', () => {
    expect(skipToOutputLink().getAttribute('href')).toBe('#output-dialog-open')
  })

  it('click → document.activeElement 為「產出腳本」鈕本身', () => {
    outputOpenBtn().blur() // 確保還原斷言不是「焦點本來就沒動過」的偽陽性
    skipToOutputLink().click()
    expect(document.activeElement).toBe(outputOpenBtn())
  })

  it('click → dialog 未開啟（skip 目的是到達控制項，非觸發）', () => {
    skipToOutputLink().click()
    expect(outputDialogEl().hasAttribute('open')).toBe(false)
  })

  it('click 事件被 preventDefault：不留下 location.hash 副作用（原生錨點跳轉未發生）', () => {
    const before = window.location.hash
    skipToOutputLink().click()
    expect(window.location.hash).toBe(before)
  })
})

describe('T4.3／T2.1 skip-nav：「跳至預覽」語意落點確認（href 未改，行為隨 T2.1 條件式停點判定調整）', () => {
  beforeEach(async () => {
    await boot()
  })

  it('href 仍指向 #preview-section', () => {
    const link = document.querySelector('nav.skip-nav a[href="#preview-section"]')
    expect(link).not.toBeNull()
  })

  it('#preview-section 為中欄預覽本身，role="region"（T2.1 起 tabindex 依條件式判定移除——原生錨點跳轉僅捲動、不再奪取焦點，同「跳至已選擇」既有慣例）', () => {
    const target = document.getElementById('preview-section')
    expect(target).not.toBeNull()
    expect(target!.getAttribute('role')).toBe('region')
    expect(target!.hasAttribute('tabindex')).toBe(false)
  })
})

describe('T4.3 skip-nav：結構完整性（三連結皆存在、「跳至已選擇」未變動）', () => {
  beforeEach(async () => {
    await boot()
  })

  it('nav.skip-nav 內恰有 3 個 .skip-link', () => {
    const nav = document.querySelector('nav.skip-nav')
    expect(nav).not.toBeNull()
    expect(nav!.querySelectorAll('.skip-link').length).toBe(3)
  })

  it('「跳至已選擇」連結未變動（href 仍指 #selected-section）', () => {
    const link = document.querySelector('nav.skip-nav a[href="#selected-section"]')
    expect(link).not.toBeNull()
  })
})
