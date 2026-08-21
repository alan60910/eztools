#!/usr/bin/env node
/**
 * tab-walk.mjs — S-c（T1.6）Tab 走查量測腳本，基於 `measure.mjs` 的 CDP
 * bootstrap 新寫（瀏覽器偵測／啟動／WS 連線／`waitForEndpoint`／
 * `waitForPageTarget` 等函式與 `measure.mjs` 同構，僅量測邏輯換成鍵盤
 * 走查而非幾何 rect，本檔不 import `measure.mjs`——兩檔皆為拋棄式 spike
 * 腳本，各自獨立執行，比照 T1.1 brief「零依賴 CDP 手法」慣例）。
 *
 * 只用 m1a 臂（`spikes/s-c/m1a.html`，brief 明定本 spike 僅測 m1a）。
 *
 * 用真實鍵盤（CDP `Input.dispatchKeyEvent`，`rawKeyDown`+`keyUp`，非 JS
 * `dispatchEvent` 模擬）連續送 Tab；`--path a` 額外在抵達「跳至設定」
 * skip link 時插入一次 Enter（原生 fragment navigation，無 JS focus
 * 管理攔截，見 m1a.html 對應節點註解），驗證 Enter 後下一次 Tab 的
 * `document.activeElement` 是否落於 `#global-section` 內（sequential
 * focus navigation starting point 是否生效）。
 *
 * 用法：
 *   node tab-walk.mjs --viewport WxH --path a|b [--max-steps N]
 *
 * 範例：
 *   node tab-walk.mjs --viewport 1400x1000 --path a
 *   node tab-walk.mjs --viewport 390x844   --path b --max-steps 260
 *
 * 環境變數：
 *   MEASURE_HEADED=1   headed 模式（人工除錯用；預設 headless=new）。
 *
 * 輸出：stdout 印一個 JSON 物件：
 *   {
 *     path, viewport, arrived, totalKeystrokes, maxSteps,
 *     enterStepIndex,               // path a 專用，null（path b）
 *     fragmentNavAssertion,         // path a 專用：{ insideGlobalSection, snapshot } | null
 *     trace: [ { n, key, tag, id, className, testid, textSnippet,
 *                insideGlobalSection, insideSkipNav } … ]
 *   }
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HEADED = process.env.MEASURE_HEADED === '1'

// ── CLI 參數解析 ───────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { viewport: null, path: null, maxSteps: 260 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--viewport') out.viewport = argv[++i]
    else if (a === '--path') out.path = argv[++i]
    else if (a === '--max-steps') out.maxSteps = Number(argv[++i])
  }
  return out
}

function fail(msg) {
  console.error(`[tab-walk] ERROR: ${msg}`)
  console.error('[tab-walk] usage: node tab-walk.mjs --viewport WxH --path a|b [--max-steps N]')
  process.exit(1)
}

const args = parseArgs(process.argv.slice(2))
if (!args.viewport) fail('--viewport 為必填，格式 WxH（如 1400x1000）')
if (args.path !== 'a' && args.path !== 'b') fail(`--path 須為 a|b（收到：${args.path ?? '(缺)'}）`)

const viewportMatch = /^(\d+)x(\d+)$/.exec(args.viewport)
if (!viewportMatch) fail(`--viewport 格式須為 WxH（如 1400x1000），收到：${args.viewport}`)
const VIEWPORT = { width: Number(viewportMatch[1]), height: Number(viewportMatch[2]) }

const HTML_PATH = join(__dirname, 'm1a.html')
if (!existsSync(HTML_PATH)) fail(`找不到 m1a.html：${HTML_PATH}`)
const FILE_URL = pathToFileURL(HTML_PATH).href

// ── 瀏覽器探測（比照 measure.mjs／scripts/e2e-statusline.mjs） ─────────

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe') : null,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter((p) => p !== null)

function detectBrowser() {
  for (const p of EDGE_CANDIDATES) {
    if (existsSync(p)) return p
  }
  return null
}

// ── CDP 基礎設施（同 measure.mjs bootstrap，逐字比照） ──────────────────

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

async function waitForPageTarget(port, urlPrefix, timeoutMs = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`)
      if (res.ok) {
        const list = await res.json()
        const page = list.find((t) => t.type === 'page' && typeof t.url === 'string' && t.url.startsWith(urlPrefix))
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
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else resolve(msg.result)
    } else if (msg.method) {
      for (const w of waiters) if (w.method === msg.method) w.resolve(msg.params)
    }
  })
  return {
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

function launchBrowser(browserPath, { headless, userDataDir, url, port, viewport }) {
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--allow-file-access-from-files',
  ]
  if (headless) {
    args.push('--headless=new')
  } else {
    args.push('--window-position=2400,50', `--window-size=${viewport.width},${viewport.height}`)
  }
  args.push(url)
  return spawn(browserPath, args, { stdio: 'ignore' })
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

// debug port：10000–10019 區段（brief 明定，S-c 專屬，避免與其他並行 lane
// 〔s-b／s-f／s-g／s-i／s-j，各自區段〕撞 port）。
const port = 10000 + Math.floor(Math.random() * 20)

// ── 鍵盤走查邏輯 ─────────────────────────────────────────────────────

const KEY_SPECS = {
  Tab: { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 },
  Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 },
}

// 每一步的 activeElement 快照運算式：tag/id/class/data-testid／文字摘要／
// 是否落於 #global-section 內／是否落於 .skip-nav 內。
const ACTIVE_ELEMENT_SNAPSHOT_EXPR = `
  (() => {
    const el = document.activeElement;
    if (!el) return { tag: null, id: null, className: null, testid: null, textSnippet: null, insideGlobalSection: false, insideSkipNav: false };
    const text = (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 24);
    return {
      tag: el.tagName || null,
      id: el.id || null,
      className: typeof el.className === 'string' ? el.className : null,
      testid: el.getAttribute ? el.getAttribute('data-testid') : null,
      textSnippet: text,
      insideGlobalSection: !!(el.closest && el.closest('#global-section')),
      insideSkipNav: !!(el.closest && el.closest('.skip-nav')),
    };
  })()
`

const CONTROL_TAGS = new Set(['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA', 'A'])

async function run() {
  const browserPath = detectBrowser()
  if (browserPath === null) {
    console.error('[tab-walk] ERROR: no local Edge/Chromium executable found in known install paths:')
    for (const p of EDGE_CANDIDATES) console.error(`  - ${p}`)
    process.exit(1)
  }

  const userDataDir = join(tmpdir(), 'eztools-sprint15-s-c-tabwalk', `${args.path}-${port}`)
  mkdirSync(userDataDir, { recursive: true })

  const child = launchBrowser(browserPath, {
    headless: !HEADED,
    userDataDir,
    url: FILE_URL,
    port,
    viewport: VIEWPORT,
  })

  let ws
  try {
    await waitForEndpoint(port)
    const target = await waitForPageTarget(port, 'file://')
    ws = await connectWs(target.webSocketDebuggerUrl)
    const client = makeClient(ws)

    await client.send('Page.enable')
    await client.send('Runtime.enable')
    await client.send('Emulation.setDeviceMetricsOverride', {
      ...VIEWPORT,
      deviceScaleFactor: 1,
      mobile: false,
    })

    async function evaluate(expression) {
      const result = await client.send('Runtime.evaluate', { expression, returnByValue: true })
      if (result.exceptionDetails) {
        throw new Error(`evaluate failed: ${JSON.stringify(result.exceptionDetails)}`)
      }
      return result.result.value
    }

    async function pressKey(name) {
      const base = KEY_SPECS[name]
      await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base })
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
      // 讓瀏覽器把 focus/nav 變更跑完一輪（fragment navigation 尤其可能跨一兩幀），
      // 雙 rAF 後再讀 activeElement（比照 measure.mjs 的等穩慣例）。
      await evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`)
    }

    const loaded = client.waitForEvent('Page.loadEventFired')
    await client.send('Page.navigate', { url: FILE_URL })
    await loaded
    await delay(150) // 讓首繪穩定（headless 偶見 flake，比照 measure.mjs）

    // 確認起始態：無殘留焦點（新載入頁面 activeElement 應為 body）。
    const initial = await evaluate(ACTIVE_ELEMENT_SNAPSHOT_EXPR)

    const trace = []
    let keystrokeCount = 0
    let enterSent = false
    let pendingEnter = false
    let enterStepIndex = null
    let arrived = false

    while (keystrokeCount < args.maxSteps) {
      const keyToSend = args.path === 'a' && pendingEnter ? 'Enter' : 'Tab'
      await pressKey(keyToSend)
      keystrokeCount++
      const snap = await evaluate(ACTIVE_ELEMENT_SNAPSHOT_EXPR)
      trace.push({ n: keystrokeCount, key: keyToSend, ...snap })

      if (keyToSend === 'Enter') {
        enterStepIndex = keystrokeCount
        pendingEnter = false
        continue // Enter 本身不判斷抵達，繼續下一輪送 Tab
      }

      if (args.path === 'a' && !enterSent && snap.testid === 'skip-to-settings') {
        pendingEnter = true // 下一輪改送 Enter
        enterSent = true
        continue
      }

      if (snap.insideGlobalSection && CONTROL_TAGS.has(snap.tag)) {
        arrived = true
        break
      }
    }

    let fragmentNavAssertion = null
    if (args.path === 'a' && enterStepIndex !== null) {
      const afterEnterTab = trace.find((t) => t.n === enterStepIndex + 1) ?? null
      fragmentNavAssertion = {
        insideGlobalSection: afterEnterTab ? afterEnterTab.insideGlobalSection : null,
        snapshot: afterEnterTab,
      }
    }

    return {
      path: args.path,
      viewport: VIEWPORT,
      initialActiveElement: initial,
      arrived,
      totalKeystrokes: keystrokeCount,
      maxSteps: args.maxSteps,
      enterStepIndex,
      fragmentNavAssertion,
      trace,
    }
  } finally {
    try {
      ws?.close()
    } catch {
      // ignore
    }
    killProcessTree(child.pid)
    await delay(300) // 讓 Windows 釋放 user-data-dir 檔案鎖
    try {
      rmSync(userDataDir, { recursive: true, force: true })
    } catch {
      // best-effort cleanup only
    }
  }
}

const result = await run()
console.log(JSON.stringify(result, null, 2))
