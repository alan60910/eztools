#!/usr/bin/env node
/**
 * S-f spike 驗證腳本（magi/15-statusline-editor-layout/PLAN.md §D8／
 * TASKS.md T1.7）：驗證行動版（<1100px）segment 目錄可收合狀態機契約，於
 * 獨立小原型（`proto.html`／`proto.js`，同目錄）上跑，不碰
 * statusline-builder 正式頁面。
 *
 * CDP bootstrap（detectBrowser／launchBrowser 骨架／waitForEndpoint／
 * waitForPageTarget／connectWs／makeClient／killProcessTree）**複製自**
 * `scripts/e2e-statusline.mjs`（只 Read 未改動該檔——見該檔「零依賴 CDP
 * 全鏈」「headless(new) 為預設執行形態」「逐案全新瀏覽器＋全新
 * --user-data-dir」慣例），依本 spike 需求精簡＋新增：逐案可切換
 * viewport／mechanism／scriptExecutionDisabled／throwOnGetItem 等旗標。
 *
 * debug port 固定落 9860–9899 區段（sprint 15 多 lane 並行約定，避免與其他
 * spike 撞埠）。
 *
 * 用法：
 *   node verify.mjs
 *   E2E_HEADED=1 node verify.mjs   # 人工除錯用 headed（預設 headless=new）
 *
 * 找不到本機 Edge/Chromium → 印明確訊息、exit 0（不算失敗，比照
 * e2e-statusline.mjs 慣例）。任一案 FAIL → exit 1；全過 → exit 0。
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROTO_FILE_URL = `file:///${join(__dirname, 'proto.html').replace(/\\/g, '/')}`
const SCRATCH_ROOT = join(
  'C:\\Users\\alan6\\AppData\\Local\\Temp\\claude\\E--program-git-eztools\\73b9e6ba-c0fd-4910-b635-e512f01f0fde\\scratchpad',
  'sf-profiles',
)
const HEADED = process.env.E2E_HEADED === '1'
const STORAGE_KEY = 'eztools-statusline-builder-catalog-collapsed'

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe') : null,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter((p) => p !== null)

// ── CDP bootstrap（複製自 scripts/e2e-statusline.mjs，僅 Read 未改動該檔）──

function detectBrowser() {
  for (const p of EDGE_CANDIDATES) {
    if (existsSync(p)) return p
  }
  return null
}

async function waitForEndpoint(port, timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (res.ok) return
    } catch {
      // not up yet
    }
    await delay(200)
  }
  throw new Error('CDP endpoint not ready (timeout waiting for /json/version)')
}

// 本 spike 每個 session 皆從 about:blank 起手、以 CDP Page.navigate 導向
// proto.html（見下方 openSession），故不需要像 e2e-statusline.mjs 那樣依
// URL prefix 篩選 target——單分頁瀏覽器直接取第一個 page target 即可。
async function waitForPageTarget(port, timeoutMs = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`)
      if (res.ok) {
        const list = await res.json()
        const page = list.find((t) => t.type === 'page')
        if (page) return page
      }
    } catch {
      // not up yet
    }
    await delay(200)
  }
  throw new Error('page target not found under /json/list (timeout)')
}

function connectWs(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    ws.addEventListener('open', () => resolve(ws))
    ws.addEventListener('error', (err) => reject(new Error(`WebSocket error: ${String(err)}`)))
  })
}

function makeClient(ws) {
  let id = 0
  const pending = new Map()
  const waiters = []
  const eventLog = []
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else resolve(msg.result)
    } else if (msg.method) {
      eventLog.push(msg)
      for (const w of waiters) if (w.method === msg.method) w.resolve(msg.params)
    }
  })
  return {
    eventLog,
    send(method, params = {}) {
      const thisId = ++id
      return new Promise((resolve, reject) => {
        pending.set(thisId, { resolve, reject })
        ws.send(JSON.stringify({ id: thisId, method, params }))
      })
    },
    waitForEvent(method) {
      return new Promise((resolve) => waiters.push({ method, resolve }))
    },
  }
}

function killProcessTree(pid) {
  if (pid === undefined) return
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
  } else {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // already dead
    }
  }
}

function launchBrowser(browserPath, { userDataDir, port }) {
  // 每個 session 一律先開到 about:blank（CDP 連上、掛好 domains／overrides
  // 之後才由 openSession 呼叫 navigate() 導向 proto.html）——避免命令列直開
  // 目標 URL 時，CDP 尚未連上、Emulation 覆寫（viewport／
  // scriptExecutionDisabled／throwOnGetItem 注入腳本）來不及生效於第一次
  // 載入。
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
  ]
  if (HEADED) {
    args.push('--window-position=2400,50', '--window-size=1400,1000')
  } else {
    args.push('--headless=new')
  }
  args.push('about:blank')
  return spawn(browserPath, args, { stdio: 'ignore' })
}

// ── session 骨架（本 spike 專用）──

let portCounter = 9860
function nextPort() {
  const p = portCounter++
  if (p > 9899) throw new Error('S-f 埠段 9860–9899 已用盡（案數超出預期，需重新規劃）')
  return p
}

/**
 * 開一個全新瀏覽器 session（全新 --user-data-dir，比照 e2e-statusline.mjs
 * 「逐案全新瀏覽器」慣例），依需求掛好 CDP overrides，並完成第一次 navigate
 * 到 proto.html（帶 `?mechanism=`）。回傳的物件在整個 session 生命週期內
 * 可重覆呼叫 `navigate()`（重載）／`setViewport()`（斷點切換，同一份 DOM／
 * JS 狀態不重建）。
 */
async function openSession({
  id,
  browserPath,
  mechanism = 'a',
  viewport = { width: 390, height: 844 },
  scriptExecutionDisabled = false,
  throwOnGetItem = false,
}) {
  const port = nextPort()
  const userDataDir = join(SCRATCH_ROOT, id)
  rmSync(userDataDir, { recursive: true, force: true })
  mkdirSync(userDataDir, { recursive: true })
  const targetUrl = `${PROTO_FILE_URL}?mechanism=${mechanism}`

  const child = launchBrowser(browserPath, { userDataDir, port })
  await waitForEndpoint(port)
  const target = await waitForPageTarget(port)
  const ws = await connectWs(target.webSocketDebuggerUrl)
  const client = makeClient(ws)

  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('Accessibility.enable')
  // mobile:false 恆定（比照 e2e-statusline.mjs 既有慣例：只用 viewport 尺寸
  // 觸發 CSS 斷點，不需要觸控/裝置模擬的其餘副作用，例如 mobile:true 會改變
  // 滑鼠事件轉譯為觸控事件的行為，與本 spike 用真滑鼠點擊 summary 的手法
  // 衝突）。
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  })

  if (throwOnGetItem) {
    // 序列 6（localStorage 擲錯）：只讓本 spike 關心的 KEY 擲錯，其餘 key
    // 維持正常行為，避免波及 CDP 自身或瀏覽器內部可能存在的其他 storage 存取。
    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        (() => {
          const orig = Storage.prototype.getItem;
          Storage.prototype.getItem = function (key) {
            if (key === ${JSON.stringify(STORAGE_KEY)}) {
              throw new Error('sf-spike-injected-getItem-error');
            }
            return orig.call(this, key);
          };
        })();
      `,
    })
  }

  if (scriptExecutionDisabled) {
    // 診斷已確認（見 S-f-RESULT.md）：此旗標同時關閉 (a) 頁面自身 <script>
    // 執行、且 (b) HTML parser 的 scripting flag 亦視為停用（<noscript>
    // 內容因此被當成真實標記解析）；(c) CDP Runtime.evaluate 本身不受影響
    // ——仍可用於讀取頁面狀態做斷言。
    await client.send('Emulation.setScriptExecutionDisabled', { value: true })
  }

  async function evaluate(expression) {
    const result = await client.send('Runtime.evaluate', { expression, returnByValue: true })
    if (result.exceptionDetails) throw new Error(`evaluate failed: ${JSON.stringify(result.exceptionDetails)}`)
    return result.result.value
  }

  async function navigate() {
    const loaded = client.waitForEvent('Page.loadEventFired')
    await client.send('Page.navigate', { url: targetUrl })
    await loaded
    await delay(400)
  }

  async function setViewport(width, height) {
    await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    await delay(300)
  }

  async function getRect(selector) {
    return evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, width: r.width, height: r.height, cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2) };
      })()
    `)
  }

  async function realClick(x, y) {
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
  }

  const KEY_MAP = {
    Tab: { keyCode: 9, code: 'Tab', key: 'Tab' },
    Enter: { keyCode: 13, code: 'Enter', key: 'Enter' },
  }

  async function pressKey(keyName) {
    const k = KEY_MAP[keyName]
    if (!k) throw new Error(`unsupported key: ${keyName}`)
    await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: k.keyCode, code: k.code, key: k.key })
    if (keyName === 'Enter') {
      await client.send('Input.dispatchKeyEvent', { type: 'char', text: '\r' })
    }
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: k.keyCode, code: k.code, key: k.key })
  }

  async function close() {
    try {
      ws.close()
    } catch {
      // ignore
    }
    killProcessTree(child.pid)
  }

  // 首次載入（見上方 launchBrowser 文件：命令列只開到 about:blank，overrides
  // 掛好後才在此真正導向 proto.html）。
  await navigate()

  return { client, evaluate, navigate, setViewport, getRect, realClick, pressKey, close }
}

// ── 六序列 + 機制比較 + 桌面硬條件 + a11y + JS 失效態 + 防閃動 ──

async function readState(s) {
  const open = await s.evaluate(`document.getElementById('catalog-details').open`)
  const ls = await s.evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`)
  return { open, ls }
}

// 序列 1：<1100px 使用者收合 → 重載 → 斷言仍收合（持久化生效）。
async function runSeq1(browserPath, mechanism) {
  const id = `seq1-${mechanism}`
  const s = await openSession({ id, browserPath, mechanism, viewport: { width: 390, height: 844 } })
  try {
    const before = await readState(s)
    const rect = await s.getRect('#catalog-summary')
    await s.realClick(rect.cx, rect.cy)
    await delay(400)
    const afterClick = await readState(s)
    await s.navigate()
    const afterReload = await readState(s)

    const ok =
      before.open === true &&
      afterClick.open === false &&
      afterClick.ls === '1' &&
      afterReload.open === false &&
      afterReload.ls === '1'
    return { id, label: `序列1（${mechanism}）：<1100px 使用者收合→重載→仍收合`, ok, evidence: { before, afterClick, afterReload } }
  } finally {
    await s.close()
  }
}

// 序列 2+3（同一 session 連續操作）：收合 → 切桌面（強制展開且 localStorage
// 仍為 '1'）→ 切回行動版（恢復收合）。
async function runSeq2And3(browserPath, mechanism) {
  const id = `seq23-${mechanism}`
  const s = await openSession({ id, browserPath, mechanism, viewport: { width: 390, height: 844 } })
  try {
    const rect = await s.getRect('#catalog-summary')
    await s.realClick(rect.cx, rect.cy)
    await delay(400)
    const collapsedAtMobile = await readState(s)

    await s.setViewport(1400, 1000)
    await delay(200)
    const atDesktop = await readState(s)

    await s.setViewport(390, 844)
    await delay(200)
    const backAtMobile = await readState(s)

    const ok =
      collapsedAtMobile.open === false &&
      collapsedAtMobile.ls === '1' &&
      atDesktop.open === true &&
      atDesktop.ls === '1' &&
      backAtMobile.open === false &&
      backAtMobile.ls === '1'
    return {
      id,
      label: `序列2+3（${mechanism}）：收合→切桌面（強制展開＋偏好未清）→切回行動版（恢復收合）`,
      ok,
      evidence: { collapsedAtMobile, atDesktop, backAtMobile },
    }
  } finally {
    await s.close()
  }
}

// 序列 4：<1100px 使用者展開（自收合態）→ 重載 → 斷言仍展開且 key 已清除或非 '1'。
async function runSeq4(browserPath, mechanism) {
  const id = `seq4-${mechanism}`
  const s = await openSession({ id, browserPath, mechanism, viewport: { width: 390, height: 844 } })
  try {
    // 先種 key='1'（模擬「已收合的回訪者」），reload 使其真的以收合態載入。
    await s.evaluate(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, '1')`)
    await s.navigate()
    const onLoadCollapsed = await readState(s)

    const rect = await s.getRect('#catalog-summary')
    await s.realClick(rect.cx, rect.cy)
    await delay(400)
    const afterUserExpand = await readState(s)

    await s.navigate()
    const afterReload = await readState(s)

    const ok =
      onLoadCollapsed.open === false &&
      afterUserExpand.open === true &&
      afterUserExpand.ls !== '1' &&
      afterReload.open === true &&
      afterReload.ls !== '1'
    return {
      id,
      label: `序列4（${mechanism}）：行動版展開（自收合態）→重載→仍展開且 key 已清`,
      ok,
      evidence: { onLoadCollapsed, afterUserExpand, afterReload },
    }
  } finally {
    await s.close()
  }
}

// 序列 5 + 桌面 a11y 一致性：≥1100px 載入（無 key）→ 展開、summary 非 Tab
// 停點、不可點擊；並以 Accessibility.getFullAXTree 比對桌面（應無 summary
// 節點）與行動版對照組（應有）。
async function runSeq5AndA11y(browserPath) {
  const id = 'seq5-a11y'
  const s = await openSession({ id, browserPath, mechanism: 'a', viewport: { width: 1400, height: 1000 } })
  try {
    const onLoad = await readState(s)
    const summaryDisplay = await s.evaluate(`getComputedStyle(document.getElementById('catalog-summary')).display`)
    const summaryRect = await s.getRect('#catalog-summary')

    // Tab 走查：從已知起點（#topband-btn，summary 之前唯一的真實可 Tab
    // 停點）按 4 次 Tab，記錄每步 activeElement，斷言 catalog-summary 從未
    // 出現、且確實走到了 summary「後面」的 #rows-btn／#settings-btn（證明
    // Tab 走查本身有在前進、不是「反正沒有東西可以停」的恆真空比對——見
    // proto.html 對這兩個佔位按鈕的註解）。
    await s.evaluate(`document.getElementById('topband-btn').focus();`)
    const startActive = await s.evaluate(`document.activeElement.id`)
    const tabSequence = []
    for (let i = 0; i < 4; i++) {
      await s.pressKey('Tab')
      await delay(60)
      const active = await s.evaluate(`(() => { const el = document.activeElement; return el ? (el.id || el.tagName) : null; })()`)
      tabSequence.push(active)
    }
    const summaryNeverFocused = !tabSequence.includes('catalog-summary')
    const reachedRealStopsAfter = tabSequence.includes('rows-btn') && tabSequence.includes('settings-btn')

    // 不可點擊：display:none 下 summary 的 rect 應全零；並在 details 容器
    // 左上角（summary 若可見時的位置）做真實座標命中測試，斷言命中的不是
    // summary。
    const hitTest = await s.evaluate(`
      (() => {
        const details = document.getElementById('catalog-details');
        const r = details.getBoundingClientRect();
        const x = Math.round(r.left + 10);
        const y = Math.round(r.top + 10);
        const el = document.elementFromPoint(x, y);
        return { isSummary: el === document.getElementById('catalog-summary'), tag: el ? el.tagName : null, x, y };
      })()
    `)

    // a11y tree（桌面）：summary 不應以其 disclosure triangle 角色或可見文字
    // 出現在 AX tree。
    const axDesktop = await client_getFullAXTree(s)
    const axNodeDesktop = axDesktop.find(
      (n) => n.role?.value === 'DisclosureTriangle' || (n.name?.value ?? '').includes('段落目錄'),
    )

    // 對照組：切回行動版，summary 應重新出現在 AX tree（證明上面桌面態的
    // 「找不到」不是查詢方式本身有問題、而是真的因 display:none 從 a11y
    // tree 消失）；同時做行動版 Tab 走查對照組——summary 在行動版**應該**
    // 是真實停點，佐證上面桌面態「從未出現」的 Tab 走查方法本身有效（不是
    // pressKey('Tab') 這個手法本身壞掉、隨便測什麼都測不到）。
    await s.setViewport(390, 844)
    await delay(300)
    const axMobile = await client_getFullAXTree(s)
    const axNodeMobile = axMobile.find(
      (n) => n.role?.value === 'DisclosureTriangle' || (n.name?.value ?? '').includes('段落目錄'),
    )
    await s.evaluate(`document.getElementById('topband-btn').focus();`)
    const mobileTabSequence = []
    for (let i = 0; i < 4; i++) {
      await s.pressKey('Tab')
      await delay(60)
      const active = await s.evaluate(`(() => { const el = document.activeElement; return el ? (el.id || el.tagName) : null; })()`)
      mobileTabSequence.push(active)
    }
    const summaryFocusableAtMobile = mobileTabSequence.includes('catalog-summary')

    const ok =
      onLoad.open === true &&
      summaryDisplay === 'none' &&
      summaryRect.width === 0 &&
      summaryRect.height === 0 &&
      summaryNeverFocused &&
      reachedRealStopsAfter &&
      hitTest.isSummary === false &&
      axNodeDesktop === undefined &&
      axNodeMobile !== undefined &&
      summaryFocusableAtMobile === true
    return {
      id,
      label: '序列5＋a11y：桌面載入展開、summary 非 Tab 停點／不可點擊／a11y tree 一致',
      ok,
      evidence: {
        onLoad,
        summaryDisplay,
        summaryRect,
        startActive,
        tabSequence,
        summaryNeverFocused,
        reachedRealStopsAfter,
        hitTest,
        axNodeDesktopFound: axNodeDesktop !== undefined,
        axNodeMobileFound: axNodeMobile !== undefined,
        mobileTabSequence,
        summaryFocusableAtMobile,
      },
    }
  } finally {
    await s.close()
  }
}

async function client_getFullAXTree(s) {
  const result = await s.client.send('Accessibility.getFullAXTree', {})
  return result.nodes ?? []
}

// 序列 6：localStorage.getItem 擲錯 → 斷言展開（fail-open）且無未捕捉例外。
async function runSeq6(browserPath) {
  const id = 'seq6'
  const s = await openSession({ id, browserPath, mechanism: 'a', viewport: { width: 390, height: 844 }, throwOnGetItem: true })
  try {
    // 注意：本 session 的 Storage.prototype.getItem 對本 spike 的 KEY
    // **恆擲錯**（見 openSession throwOnGetItem 注入邏輯，非只擲一次）——
    // 故此處只能讀 `details.open`（走頁面內部 shouldCollapse 的 try/catch
    // fail-open 路徑），**不可**像 readState() 那樣另外直接呼叫
    // `localStorage.getItem(KEY)` 做診斷讀值，那本身會在 verify.mjs 這端的
    // Runtime.evaluate 呼叫中擲錯（此為本檔先前一版的測試碼臭蟲，非
    // proto.js 行為問題——proto.js 內部呼叫全都包了 try/catch）。
    const open = await s.evaluate(`document.getElementById('catalog-details').open`)
    const exceptions = s.client.eventLog.filter((e) => e.method === 'Runtime.exceptionThrown')
    const ok = open === true && exceptions.length === 0
    return {
      id,
      label: '序列6：localStorage.getItem 擲錯→展開（fail-open）且無未捕捉例外',
      ok,
      evidence: { open, exceptionCount: exceptions.length, exceptions: exceptions.map((e) => e.params?.exceptionDetails?.text) },
    }
  } finally {
    await s.close()
  }
}

// JS 失效態：兩個 viewport 各一，斷言 30 項目錄可見（HTML fail-open 方向）。
async function runJsDisabled(browserPath, label, viewport) {
  const id = `js-disabled-${label}`
  const s = await openSession({ id, browserPath, mechanism: 'a', viewport, scriptExecutionDisabled: true })
  try {
    const itemCount = await s.evaluate(`document.querySelectorAll('[data-testid="catalog-item"]').length`)
    const firstItemRect = await s.getRect('[data-testid="catalog-item"][data-index="0"]')
    const hit = await s.evaluate(`
      (() => {
        const el = document.querySelector('[data-testid="catalog-item"][data-index="0"]');
        const r = el.getBoundingClientRect();
        const hitEl = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
        return hitEl === el || (hitEl != null && (el.contains(hitEl) || hitEl.contains(el)));
      })()
    `)
    // proto.js 的 window.__sf__ 未定義，佐證 script 真的被停用（本項本身
    // 不失效才有意義）。
    const sfDefined = await s.evaluate(`typeof window.__sf__`)
    const htmlClass = await s.evaluate(`document.documentElement.className`)
    const ok = itemCount === 30 && firstItemRect !== null && firstItemRect.height > 0 && hit === true && sfDefined === 'undefined'
    return {
      id,
      label: `JS 失效態（${label}）：30 項目錄可見`,
      ok,
      evidence: { itemCount, firstItemRect, hit, sfDefined, htmlClass },
    }
  } finally {
    await s.close()
  }
}

// 加驗：防閃動機制——回訪收合態（key='1'）在 390×844 重載時，證明「初載
// 暫抑樣式解除」那一刻 details.open 已經是最終值（收合），而非先展開一瞬間
// 才收起。
async function runAntiFlash(browserPath) {
  const id = 'anti-flash'
  const s = await openSession({ id, browserPath, mechanism: 'a', viewport: { width: 390, height: 844 } })
  try {
    const rect = await s.getRect('#catalog-summary')
    await s.realClick(rect.cx, rect.cy)
    await delay(400)
    const beforeReload = await readState(s)

    await s.client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        (() => {
          window.__sf_antiflash__ = null;
          const origRemove = DOMTokenList.prototype.remove;
          DOMTokenList.prototype.remove = function (...tokens) {
            if (window.__sf_antiflash__ === null && this === document.documentElement.classList && tokens.includes('js-init-pending')) {
              const details = document.getElementById('catalog-details');
              window.__sf_antiflash__ = { t: performance.now(), openAtRemoval: details ? details.open : null };
            }
            return origRemove.apply(this, tokens);
          };
        })();
      `,
    })

    await s.navigate()
    const antiFlash = await s.evaluate(`window.__sf_antiflash__`)
    const classRemovedEventually = await s.evaluate(`!document.documentElement.classList.contains('js-init-pending')`)
    const afterReload = await readState(s)

    const ok =
      beforeReload.ls === '1' &&
      antiFlash !== null &&
      antiFlash.openAtRemoval === false &&
      classRemovedEventually === true &&
      afterReload.open === false
    return {
      id,
      label: '加驗：防閃動——暫抑樣式解除時 details.open 已是最終值（收合）',
      ok,
      evidence: { beforeReload, antiFlash, classRemovedEventually, afterReload },
    }
  } finally {
    await s.close()
  }
}

// ── main ──

async function main() {
  const browserPath = detectBrowser()
  if (!browserPath) {
    console.log('[S-f verify] 找不到本機 Edge/Chromium，略過（非失敗）。')
    process.exit(0)
  }
  console.log(`[S-f verify] 使用瀏覽器：${browserPath}`)
  console.log(`[S-f verify] proto URL：${PROTO_FILE_URL}`)
  console.log(`[S-f verify] headless=${!HEADED}`)

  rmSync(SCRATCH_ROOT, { recursive: true, force: true })
  mkdirSync(SCRATCH_ROOT, { recursive: true })

  const results = []
  const runners = [
    () => runSeq1(browserPath, 'a'),
    () => runSeq1(browserPath, 'b'),
    () => runSeq2And3(browserPath, 'a'),
    () => runSeq2And3(browserPath, 'b'),
    () => runSeq4(browserPath, 'a'),
    () => runSeq4(browserPath, 'b'),
    () => runSeq5AndA11y(browserPath),
    () => runSeq6(browserPath),
    () => runJsDisabled(browserPath, '1400x1000', { width: 1400, height: 1000 }),
    () => runJsDisabled(browserPath, '390x844', { width: 390, height: 844 }),
    () => runAntiFlash(browserPath),
  ]

  for (const run of runners) {
    const t0 = Date.now()
    let result
    try {
      result = await run()
    } catch (err) {
      result = { id: 'unknown', label: 'unknown', ok: false, evidence: { error: String(err && err.stack ? err.stack : err) } }
    }
    const ms = Date.now() - t0
    results.push({ ...result, ms })
    console.log(`  ${result.ok ? 'PASS' : 'FAIL'}  ${result.id.padEnd(22)}  ${ms}ms  ${result.label}`)
    if (!result.ok) {
      console.log(`    evidence: ${JSON.stringify(result.evidence)}`)
    }
  }

  console.log('\n=== SUMMARY ===')
  for (const r of results) {
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id.padEnd(22)}  ${r.ms}ms  ${r.label}`)
  }
  const passCount = results.filter((r) => r.ok).length
  console.log(`\n${passCount}/${results.length} passed`)

  // 供 S-f-RESULT.md 撰寫時貼證據用（完整結構化輸出）。
  console.log('\n=== FULL EVIDENCE (JSON) ===')
  console.log(JSON.stringify(results, null, 2))

  process.exitCode = passCount === results.length ? 0 : 1
}

await main()
