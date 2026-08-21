#!/usr/bin/env node
/**
 * measure.mjs — T1.1 CDP 量測腳本底座（magi/15-statusline-editor-layout）。
 *
 * 對 `proto/{m1a,m1b,m2}.html` 三臂原型以 CDP 量測頂帶／三欄幾何，供
 * 後續任務（S-a 黏著幾何／S-b 垂直預算／S-g 可捲命中面積／S-j 軌寬／
 * S-c Tab 走查）在此底座上加各自的斷言與門檻判定。**本腳本本身不做任何
 * 門檻判定**，只負責「開頁→捲到指定 scrollY→量 rect／scrollHeight→印
 * JSON」，比照 `magi/14-statusline-ux-round2/spikes/s3-run.mjs` 與
 * `scripts/e2e-statusline.mjs` 的零依賴 CDP 手法（Node ≥22 內建
 * fetch/WebSocket/child_process，`--user-data-dir` 逐次全新，跑完強制
 * 關閉行程樹）。
 *
 * 用法：
 *   node measure.mjs --arm m1a|m1b|m2 --viewport WxH [--scrolls 0,200,400,max]
 *
 * 範例：
 *   node measure.mjs --arm m1a --viewport 1280x800
 *   node measure.mjs --arm m1a --viewport 1280x800 --scrolls 0,200,400,max
 *   node measure.mjs --arm m2 --viewport 390x844 --scrolls 0
 *
 * 環境變數：
 *   MEASURE_HEADED=1   headed 模式（人工除錯用；預設 headless=new）。
 *
 * 輸出：stdout 印一個 JSON 陣列（見檔尾 `main()`），每個元素對應一個
 * scrollY 取樣點，欄位契約詳見 README.md「輸出格式」。
 *
 * 找不到本機 Edge/Chromium → 印明確錯誤訊息、exit 1（本腳本無 e2e 那種
 * 「找不到瀏覽器即略過視為通過」語意——量測底座找不到瀏覽器就是不能跑，
 * 不是「本次沒有東西要測」）。
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
  const out = { arm: null, viewport: null, scrolls: '0,200,400,max' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--arm') out.arm = argv[++i]
    else if (a === '--viewport') out.viewport = argv[++i]
    else if (a === '--scrolls') out.scrolls = argv[++i]
  }
  return out
}

function fail(msg) {
  console.error(`[measure] ERROR: ${msg}`)
  console.error(
    '[measure] usage: node measure.mjs --arm m1a|m1b|m2 --viewport WxH [--scrolls 0,200,400,max]',
  )
  process.exit(1)
}

const ARM_FILES = {
  m1a: 'm1a.html',
  m1b: 'm1b.html',
  m2: 'm2.html',
}

const args = parseArgs(process.argv.slice(2))
if (!args.arm || !ARM_FILES[args.arm]) fail(`--arm 須為 m1a|m1b|m2（收到：${args.arm ?? '(缺)'}）`)
if (!args.viewport) fail('--viewport 為必填，格式 WxH（如 1280x800）')

const viewportMatch = /^(\d+)x(\d+)$/.exec(args.viewport)
if (!viewportMatch) fail(`--viewport 格式須為 WxH（如 1280x800），收到：${args.viewport}`)
const VIEWPORT = { width: Number(viewportMatch[1]), height: Number(viewportMatch[2]) }

// 'max' 為特殊字面值（載入後才依實際 document.documentElement.scrollHeight
// 解出實際 px），其餘一律 parse 為整數 px。
const SCROLL_SPECS = args.scrolls.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
for (const spec of SCROLL_SPECS) {
  if (spec !== 'max' && !/^\d+$/.test(spec)) fail(`--scrolls 每項須為非負整數或 'max'，收到：${spec}`)
}

const HTML_PATH = join(__dirname, ARM_FILES[args.arm])
if (!existsSync(HTML_PATH)) fail(`找不到臂原型檔：${HTML_PATH}`)
const FILE_URL = pathToFileURL(HTML_PATH).href

// ── 瀏覽器探測（比照 scripts/e2e-statusline.mjs EDGE_CANDIDATES） ──────

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

// ── CDP 基礎設施（自 scripts/e2e-statusline.mjs 複製最小 bootstrap——該檔
// 不 export，spike 為拋棄式碼，允許重複，見 T1.1 brief） ──────────────

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

// debug port：9800 起（T1.1 brief 明定，避免與其他並行 spike 撞
// port）——本腳本每次呼叫僅開一個瀏覽器行程，用「9800 + 隨機偏移」而非
// 單純遞增計數器：遞增計數器只在單一 process 內連續呼叫多次才有意義
// （比照 scripts/e2e-statusline.mjs 單一長行程逐案遞增），但本腳本設計
// 為每次 CLI 呼叫皆為獨立 process（S-a/S-b/S-g/S-j/S-c 等後續任務可能
// 平行各自呼叫），跨 process 的計數器無法共享狀態，改用「9800 起的區間
// ＋隨機偏移」達到同樣的撞 port 迴避效果。
const port = 9800 + Math.floor(Math.random() * 150)

// ── 量測邏輯 ───────────────────────────────────────────────────────────

// 单一取樣點的量測運算式：回傳 rect（top/bottom/left/right/width/height）
// 與可捲容器的 scrollHeight/clientHeight。三臂共用同一組 selector
// （.preview-band／.col--catalog／.col--list／.col--settings／header／
// footer），即使 M1′-b 把頂帶與三欄多包一層 `.editor`、M2 三欄皆走
// overflow-y:auto，selector 本身在三臂 HTML 皆存在且唯一，見
// proto/{m1a,m1b,m2}.html。
const SNAPSHOT_EXPR = `
  (() => {
    function rectOf(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    }
    function scrollableOf(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
    }
    return {
      scrollY: window.scrollY,
      innerHeight: window.innerHeight,
      band: rectOf('.preview-band'),
      catalogCol: rectOf('.col--catalog'),
      listCol: rectOf('.col--list'),
      settingsCol: rectOf('.col--settings'),
      header: rectOf('header'),
      footer: rectOf('footer'),
      catalogScrollable: scrollableOf('.col--catalog'),
      listScrollable: scrollableOf('.col--list'),
    };
  })()
`

const MAX_SCROLL_EXPR = `
  Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
`

async function run() {
  const browserPath = detectBrowser()
  if (browserPath === null) {
    console.error('[measure] ERROR: no local Edge/Chromium executable found in known install paths:')
    for (const p of EDGE_CANDIDATES) console.error(`  - ${p}`)
    process.exit(1)
  }

  const userDataDir = join(tmpdir(), 'eztools-sprint15-proto-measure', `${args.arm}-${port}`)
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

    // 啟動參數已直接開到 FILE_URL；等一次 load 完成再量（比照
    // scripts/e2e-statusline.mjs `navigate()` 起手式）。
    const loaded = client.waitForEvent('Page.loadEventFired')
    await client.send('Page.navigate', { url: FILE_URL })
    await loaded
    await delay(150) // 讓 layout/paint 穩定（headless 下偶見首繪未完成即讀 rect 的 flake）

    const maxScroll = await evaluate(MAX_SCROLL_EXPR)

    const samples = []
    for (const spec of SCROLL_SPECS) {
      const target = spec === 'max' ? maxScroll : Number(spec)
      await evaluate(`window.scrollTo(0, ${target})`)
      // 雙 rAF 等版面穩定後再讀 rect（sticky/overflow 重排可能跨一兩幀）。
      await evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`)
      const snapshot = await evaluate(SNAPSHOT_EXPR)
      samples.push({ requestedScroll: spec, ...snapshot })
    }

    return { arm: args.arm, viewport: VIEWPORT, maxScroll, samples }
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
