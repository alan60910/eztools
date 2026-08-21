#!/usr/bin/env node
/**
 * measure-s-b.mjs — S-b（T1.3）專用量測腳本，供 spikes/s-b/ 副本內的
 * m1a.html（預設內容量）／m1a-worst-band.html（最壞頂帶組態）使用。
 *
 * 沿用 spikes/proto/measure.mjs 的 CDP bootstrap 手法（零依賴、Node ≥22
 * 內建 fetch/WebSocket/child_process，`--user-data-dir` 逐次全新，跑完
 * 強制關閉行程樹），但輸出契約與量測邏輯不同（本檔不是 measure.mjs 的
 * 修改版，是同目錄下的獨立量測腳本，因為 S-b 六項量測彼此需要的
 * selector／模式差異大，塞進單一 SNAPSHOT_EXPR 反而混淆）。
 *
 * 用法：
 *   node measure-s-b.mjs --file <html> --viewport WxH --mode <g9|band|mobile-overhead>
 *
 * --mode g9：G9 門檻量測（項目 6 系列）——穩態捲距（scrollY＝頁首高）下，
 *   目錄欄／列區欄可視 rect（＝欄自身 rect 與「頂帶下緣～視窗下緣」的
 *   交集，模擬頂帶不透明遮蔽），逐項目／逐列群組做 rect 完整落界計數。
 * --mode band：頂帶／終端框量測（項目 2／6）——scrollY=0（頂帶
 *   max-height:40dvh 為靜態 viewport 高度換算值，與捲動位置無關，見
 *   S-b-RESULT.md「方法說明」）。
 * --mode mobile-overhead：390 寬固定開銷量測（項目 5）——頂帶／教學帶／
 *   summary 三者獨立 rect 高度（同樣與捲動位置無關）。
 *
 * debug port：9950–9969（brief 指定區段，避免與其他並行 spike／
 * proto/measure.mjs 的 9800 起區段撞 port）。
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HEADED = process.env.MEASURE_HEADED === '1'

function parseArgs(argv) {
  const out = { file: null, viewport: null, mode: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--file') out.file = argv[++i]
    else if (a === '--viewport') out.viewport = argv[++i]
    else if (a === '--mode') out.mode = argv[++i]
  }
  return out
}

function fail(msg) {
  console.error(`[measure-s-b] ERROR: ${msg}`)
  console.error('[measure-s-b] usage: node measure-s-b.mjs --file <html> --viewport WxH --mode <g9|band|mobile-overhead>')
  process.exit(1)
}

const args = parseArgs(process.argv.slice(2))
if (!args.file) fail('--file 為必填（如 m1a.html／m1a-worst-band.html）')
if (!args.viewport) fail('--viewport 為必填，格式 WxH')
if (!args.mode || !['g9', 'g9-sweep', 'band', 'mobile-overhead'].includes(args.mode)) fail(`--mode 須為 g9|g9-sweep|band|mobile-overhead（收到：${args.mode ?? '(缺)'}）`)

const viewportMatch = /^(\d+)x(\d+)$/.exec(args.viewport)
if (!viewportMatch) fail(`--viewport 格式須為 WxH，收到：${args.viewport}`)
const VIEWPORT = { width: Number(viewportMatch[1]), height: Number(viewportMatch[2]) }

const HTML_PATH = join(__dirname, args.file)
if (!existsSync(HTML_PATH)) fail(`找不到檔案：${HTML_PATH}`)
const FILE_URL = pathToFileURL(HTML_PATH).href

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
    '--allow-file-access-from-files',
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

// debug port：9950–9969 區段（brief 指定），單一 process 生命週期內隨機取一。
const port = 9950 + Math.floor(Math.random() * 20)

// ── 各 mode 的量測運算式 ─────────────────────────────────────────────

const G9_EXPR = `
  (() => {
    function rect(el) {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    }
    const band = document.querySelector('.preview-band');
    const catalogCol = document.querySelector('.col--catalog');
    const listCol = document.querySelector('.col--list');
    const bandRect = rect(band);
    const catalogRect = rect(catalogCol);
    const listRect = rect(listCol);
    const innerHeight = window.innerHeight;

    // 欄可視 rect＝欄自身 rect 與「頂帶下緣～視窗下緣」的交集（頂帶
    // 不透明、z-index 高於欄，模擬實際視覺遮蔽——比照 S-a-RESULT.md
    // T3 判準：欄內容 top < 頂帶 bottom 即視為被遮）。
    function visibleRectOf(colRect) {
      const top = Math.max(colRect.top, bandRect.bottom, 0);
      const bottom = Math.min(colRect.bottom, innerHeight);
      return { top, bottom };
    }
    const catalogVisible = visibleRectOf(catalogRect);
    const listVisible = visibleRectOf(listRect);

    function fullyWithin(r, visible) {
      return r.top >= visible.top - 0.5 && r.bottom <= visible.bottom + 0.5;
    }

    const catalogItems = Array.from(document.querySelectorAll('.catalog-item-mock'));
    const itemRects = catalogItems.map((el) => rect(el));
    const visibleItemCount = itemRects.filter((r) => fullyWithin(r, catalogVisible)).length;

    const groups = Array.from(document.querySelectorAll('.row-group-mock'));
    const groupInfo = groups.map((g) => {
      const heading = g.querySelector('.row-group-mock__heading');
      const firstRow = g.querySelector('.segment-row-mock');
      return { heading: rect(heading), firstRow: firstRow ? rect(firstRow) : null };
    });
    const visibleGroupCount = groupInfo.filter(
      (g) => g.firstRow && fullyWithin(g.heading, listVisible) && fullyWithin(g.firstRow, listVisible),
    ).length;

    return {
      innerHeight,
      band: bandRect,
      catalogCol: { rect: catalogRect, clientHeight: catalogCol.clientHeight, scrollHeight: catalogCol.scrollHeight, visible: catalogVisible },
      listCol: { rect: listRect, clientHeight: listCol.clientHeight, scrollHeight: listCol.scrollHeight, visible: listVisible },
      catalogItemCount: catalogItems.length,
      visibleItemCount,
      itemRectsSample: itemRects.slice(0, 10),
      groupCount: groups.length,
      visibleGroupCount,
      groupInfo,
    };
  })()
`

const BAND_EXPR = `
  (() => {
    function rect(el) {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    }
    const band = document.querySelector('.preview-band');
    const terminal = document.querySelector('.preview-terminal-mock');
    const firstLine = terminal.querySelector('p');
    const cs = getComputedStyle(band);
    return {
      innerHeight: window.innerHeight,
      band: rect(band),
      bandMaxHeightComputedPx: cs.maxHeight,
      bandOverflow: cs.overflow,
      terminal: {
        rect: rect(terminal),
        clientHeight: terminal.clientHeight,
        scrollHeight: terminal.scrollHeight,
        lineCount: terminal.querySelectorAll('p').length,
        firstLineHeight: firstLine ? firstLine.getBoundingClientRect().height : null,
      },
    };
  })()
`

const MOBILE_OVERHEAD_EXPR = `
  (() => {
    function rect(el) {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    }
    const band = document.querySelector('.preview-band');
    const tutorial = document.querySelector('.tutorial-band-mock');
    const summary = document.querySelector('.catalog-collapse-mock__summary');
    return {
      innerHeight: window.innerHeight,
      band: rect(band),
      tutorial: rect(tutorial),
      summary: rect(summary),
    };
  })()
`

async function run() {
  const browserPath = detectBrowser()
  if (browserPath === null) {
    console.error('[measure-s-b] ERROR: no local Edge/Chromium executable found in known install paths:')
    for (const p of EDGE_CANDIDATES) console.error(`  - ${p}`)
    process.exit(1)
  }

  const userDataDir = join(tmpdir(), 'eztools-sprint15-sb-measure', `${args.mode}-${port}`)
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
    await client.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false })

    async function evaluate(expression) {
      const result = await client.send('Runtime.evaluate', { expression, returnByValue: true })
      if (result.exceptionDetails) throw new Error(`evaluate failed: ${JSON.stringify(result.exceptionDetails)}`)
      return result.result.value
    }

    await new Promise((resolve) => {
      // Page.loadEventFired 監聽（沿用 proto/measure.mjs 手法）。
      function onMessage(ev) {
        const msg = JSON.parse(ev.data)
        if (msg.method === 'Page.loadEventFired') {
          ws.removeEventListener('message', onMessage)
          resolve()
        }
      }
      ws.addEventListener('message', onMessage)
      client.send('Page.navigate', { url: FILE_URL })
    })
    await delay(150)

    let steadyScrollY = 0
    if (args.mode === 'g9') {
      // 穩態捲距＝頁首高（S-a T2 定義：scrollY ≥ 頁首高時頂帶 rect.top===0，
      // 取剛好達成的最小值，避免额外深捲導致 N4 遮蔽量被過度放大、低估
      // 「初始可見」容量——見 S-b-RESULT.md「方法說明」）。
      const headerHeight = await evaluate(`document.querySelector('header').getBoundingClientRect().height`)
      steadyScrollY = Math.ceil(headerHeight) + 1
      await evaluate(`window.scrollTo(0, ${steadyScrollY})`)
      await evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`)
      // 確認頂帶確實已黏住（rect.top===0），否則再多捲一點直到穩態。
      let bandTop = await evaluate(`document.querySelector('.preview-band').getBoundingClientRect().top`)
      let guard = 0
      while (bandTop > 0 && guard < 20) {
        steadyScrollY += 10
        await evaluate(`window.scrollTo(0, ${steadyScrollY})`)
        await evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`)
        bandTop = await evaluate(`document.querySelector('.preview-band').getBoundingClientRect().top`)
        guard++
      }
    }

    if (args.mode === 'g9-sweep') {
      // 敏感度掃描（非門檻本身，供覆核「初始可見」判讀的穩健度）：比照
      // S-a 的四個取樣點（0,200,400,max），逐點量 G9_EXPR，觀察 N4
      // 遮蔽量隨捲動加深時，可見項目／群組數如何變化。
      const maxScroll = await evaluate(
        `Math.max(0, document.documentElement.scrollHeight - window.innerHeight)`,
      )
      const points = [0, 200, 250, 269, 300, 350, 400, maxScroll]
      const samples = []
      for (const p of points) {
        await evaluate(`window.scrollTo(0, ${p})`)
        await evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`)
        const snap = await evaluate(G9_EXPR)
        samples.push({
          requestedScroll: p,
          actualScrollY: await evaluate('window.scrollY'),
          bandBottom: snap.band.bottom,
          catalogTop: snap.catalogCol.rect.top,
          listTop: snap.listCol.rect.top,
          visibleItemCount: snap.visibleItemCount,
          visibleGroupCount: snap.visibleGroupCount,
        })
      }
      return { file: args.file, mode: args.mode, viewport: VIEWPORT, maxScroll, samples }
    }

    const expr = args.mode === 'g9' ? G9_EXPR : args.mode === 'band' ? BAND_EXPR : MOBILE_OVERHEAD_EXPR
    const snapshot = await evaluate(expr)

    return { file: args.file, mode: args.mode, viewport: VIEWPORT, steadyScrollY, ...snapshot }
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
