#!/usr/bin/env node
/**
 * measure-real.mjs — S-b（T1.3）真實 dist 量測（項目 1／3／4）。
 *
 * 對 `npm run build` 產物（`npx vite preview`）跑的
 * http://localhost:4180/tools/statusline-builder/ 以 CDP 量測：
 *   (1) 真實頁首 <header> 渲染高度（1280×800）；
 *   (3) sprint14 現行三欄版面「工作欄」（.builder-columns__list）可用高
 *       （clientHeight，載入完成＋穩態捲距），順帶量中欄 .preview-section／
 *       左欄 .builder-columns__settings 可用高供對照；
 *   (4) #global-section 的 scrollHeight（自然內容高，定 OQ-2 用）。
 *
 * 前提：另一個終端機已跑 `npx vite preview --port 4180`（本腳本不自行
 * 啟動 preview server，避免與呼叫者的生命週期管理衝突）。
 *
 * 用法：
 *   node measure-real.mjs --url http://localhost:4180/tools/statusline-builder/ --viewport 1280x800
 *
 * debug port：9950–9969 區段（同 measure-s-b.mjs）。
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { tmpdir } from 'node:os'

function parseArgs(argv) {
  const out = { url: null, viewport: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--url') out.url = argv[++i]
    else if (a === '--viewport') out.viewport = argv[++i]
  }
  return out
}

function fail(msg) {
  console.error(`[measure-real] ERROR: ${msg}`)
  process.exit(1)
}

const args = parseArgs(process.argv.slice(2))
if (!args.url) fail('--url 為必填')
if (!args.viewport) fail('--viewport 為必填，格式 WxH')
const viewportMatch = /^(\d+)x(\d+)$/.exec(args.viewport)
if (!viewportMatch) fail(`--viewport 格式須為 WxH，收到：${args.viewport}`)
const VIEWPORT = { width: Number(viewportMatch[1]), height: Number(viewportMatch[2]) }

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe') : null,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter((p) => p !== null)

function detectBrowser() {
  for (const p of EDGE_CANDIDATES) if (existsSync(p)) return p
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
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else resolve(msg.result)
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
  }
}

function launchBrowser(browserPath, { headless, userDataDir, url, port, viewport }) {
  const cliArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
  ]
  if (headless) {
    cliArgs.push('--headless=new')
  } else {
    cliArgs.push('--window-position=2400,50', `--window-size=${viewport.width},${viewport.height}`)
  }
  cliArgs.push(url)
  return spawn(browserPath, cliArgs, { stdio: 'ignore' })
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

const port = 9950 + Math.floor(Math.random() * 20)

const SNAPSHOT_EXPR = `
  (() => {
    function rect(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    }
    function clientH(sel) {
      const el = document.querySelector(sel);
      return el ? el.clientHeight : null;
    }
    function scrollH(sel) {
      const el = document.querySelector(sel);
      return el ? el.scrollHeight : null;
    }
    return {
      innerHeight: window.innerHeight,
      scrollY: window.scrollY,
      headerRect: rect('header'),
      mainTop: rect('main') ? rect('main').top : null,
      columnTopVar: getComputedStyle(document.documentElement).getPropertyValue('--column-top'),
      settingsCol: { clientHeight: clientH('.builder-columns__settings'), scrollHeight: scrollH('.builder-columns__settings') },
      previewCol: { clientHeight: clientH('.preview-section'), scrollHeight: scrollH('.preview-section') },
      listCol: { clientHeight: clientH('.builder-columns__list'), scrollHeight: scrollH('.builder-columns__list') },
      globalSection: { clientHeight: clientH('#global-section'), scrollHeight: scrollH('#global-section') },
    };
  })()
`

async function run() {
  const browserPath = detectBrowser()
  if (browserPath === null) fail('no local Edge/Chromium executable found')

  const userDataDir = join(tmpdir(), 'eztools-sprint15-sb-real-measure', String(port))
  mkdirSync(userDataDir, { recursive: true })

  const child = launchBrowser(browserPath, {
    headless: process.env.MEASURE_HEADED !== '1',
    userDataDir,
    url: args.url,
    port,
    viewport: VIEWPORT,
  })

  let ws
  try {
    await waitForEndpoint(port)
    const target = await waitForPageTarget(port, 'http://localhost')
    ws = await connectWs(target.webSocketDebuggerUrl)
    const client = makeClient(ws)

    await client.send('Page.enable')
    await client.send('Runtime.enable')
    await client.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false })

    async function evaluate(expression) {
      const result = await client.send('Runtime.evaluate', { expression, returnByValue: true })
      if (result.exceptionDetails) throw new Error(`evaluate failed: ${JSON.stringify(result.exceptionDetails)}`)
      return result.result.value
    }

    await new Promise((resolve) => {
      function onMessage(ev) {
        const msg = JSON.parse(ev.data)
        if (msg.method === 'Page.loadEventFired') {
          ws.removeEventListener('message', onMessage)
          resolve()
        }
      }
      ws.addEventListener('message', onMessage)
      client.send('Page.navigate', { url: args.url })
    })
    // 讓 main.ts init()／syncColumnTop() 等同步邏輯與首次 paint 完全穩定
    // （比照 proto/measure.mjs 的 150ms 但真實頁 JS bundle 較大，加倍保守）。
    await delay(400)

    // 初載（scrollY=0）先量一次真實頁首高度（項目 1，未受任何捲動影響）。
    const initial = await evaluate(SNAPSHOT_EXPR)

    // 穩態捲距＝頁首高（同 measure-s-b.mjs 定義）。
    const headerHeight = initial.headerRect.height
    let steadyScrollY = Math.ceil(headerHeight) + 1
    await evaluate(`window.scrollTo(0, ${steadyScrollY})`)
    await evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`)
    const steady = await evaluate(SNAPSHOT_EXPR)

    return { url: args.url, viewport: VIEWPORT, initial, steadyScrollY, steady }
  } finally {
    try {
      ws?.close()
    } catch {
      // ignore
    }
    killProcessTree(child.pid)
    await delay(300)
    try {
      rmSync(userDataDir, { recursive: true, force: true })
    } catch {
      // best-effort cleanup only
    }
  }
}

const result = await run()
console.log(JSON.stringify(result, null, 2))
