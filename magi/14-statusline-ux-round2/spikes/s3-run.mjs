#!/usr/bin/env node
/**
 * S3 焦點模態矩陣 CDP 執行器（sprint 14 / T1.4）。
 *
 * 對 s3-focus-matrix.html 以 CDP（trusted 輸入路徑）逐控件實測四斷言：
 *   (a) 滑鼠點該控件 → 收納態是否維持（opacity 0）
 *   (b) Tab 進列至該控件 → 是否浮現（opacity 1）
 *   (c) 浮現前後列/控件 rect 是否零位移
 *   (d) 浮現態下模擬 move 重渲染＋程式化還焦 → 浮現是否延續
 * 外加：收納態下 move 鈕原位置 elementFromPoint／click no-op。
 *
 * ⚠️ caveat：CDP `Input.dispatchMouseEvent`／`dispatchKeyEvent` 為
 * **合成 trusted 輸入**（isTrusted=true，走同一輸入管線，:focus-visible
 * 模態啟發式會作用），但**非實體裝置**——與真人手勢的裝置級細節（如
 * pointer 種類、觸控 vs 滑鼠）不完全等同。本器結論須連同此 caveat 解讀。
 * headless 下另以 `Emulation.setFocusEmulationEnabled` 強制頁面為聚焦態，
 * 否則 :focus/:focus-visible 在無焦點視窗下不成立。
 *
 * 零依賴（Node ≥22 內建 fetch/WebSocket/child_process）；比照
 * scripts/e2e-statusline.mjs 的 CDP 範式（每案 fresh --user-data-dir）。
 *
 * 用法：node s3-run.mjs [edge|chrome]   （預設 edge）
 */
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HTML_PATH = join(__dirname, 's3-focus-matrix.html')
const FILE_URL = pathToFileURL(HTML_PATH).href
const HEADED = process.env.S3_HEADED === '1'

const BROWSERS = {
  edge: [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
  chrome: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
}

function detect(which) {
  for (const p of BROWSERS[which] ?? []) if (existsSync(p)) return p
  return null
}

async function waitForEndpoint(port, timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) return } catch {}
    await delay(150)
  }
  throw new Error('CDP endpoint timeout')
}
async function firstPageTarget(port, timeoutMs = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`)
      if (r.ok) { const list = await r.json(); const pg = list.find((t) => t.type === 'page'); if (pg) return pg }
    } catch {}
    await delay(150)
  }
  throw new Error('page target timeout')
}
function connectWs(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.addEventListener('open', () => resolve(ws))
    ws.addEventListener('error', (e) => reject(new Error('ws error ' + String(e))))
  })
}
function makeClient(ws) {
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result)
    }
  })
  return {
    send(method, params = {}) {
      const thisId = ++id
      return new Promise((resolve, reject) => { pending.set(thisId, { resolve, reject }); ws.send(JSON.stringify({ id: thisId, method, params })) })
    },
  }
}
function killTree(pid) {
  if (pid === undefined) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { process.kill(pid, 'SIGKILL') } catch {} }
}

async function run(which) {
  const path = detect(which)
  if (!path) return { browser: which, skipped: true, reason: 'not installed' }
  const port = 9820 + Math.floor(Math.random() * 100)
  const userDataDir = join(tmpdir(), `s3-spike-${which}-${port}`)
  mkdirSync(userDataDir, { recursive: true })
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  ]
  if (HEADED) args.push('--window-position=2400,50', '--window-size=1200,800')
  else args.push('--headless=new')
  args.push(FILE_URL)
  const child = spawn(path, args, { stdio: 'ignore' })
  let ws
  try {
    await waitForEndpoint(port)
    const target = await firstPageTarget(port)
    ws = await connectWs(target.webSocketDebuggerUrl)
    const client = makeClient(ws)
    await client.send('Page.enable')
    await client.send('Runtime.enable')
    // headless 焦點：強制頁面聚焦態，否則 :focus-visible 不成立。
    await client.send('Emulation.setFocusEmulationEnabled', { enabled: true })
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false })

    const evaluate = async (expression) => {
      const r = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (r.exceptionDetails) throw new Error('evaluate: ' + JSON.stringify(r.exceptionDetails))
      return r.result.value
    }
    // 等頁面就緒
    for (let i = 0; i < 50; i++) { if (await evaluate('!!window.__spikeReady')) break; await delay(100) }

    const clickAt = async (pt) => {
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y })
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', buttons: 1, clickCount: 1 })
      await delay(20)
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', buttons: 0, clickCount: 1 })
      await delay(60)
    }
    const pressTab = async () => {
      const base = { windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' }
      await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base })
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
      await delay(60)
    }

    const results = { browser: which, browserPath: path, headed: HEADED }

    // selector support (in real engine, sanity)
    results.selectorSupport = await evaluate('window.__spike.selectorSupport()')

    // ── (a) 每個「可見」控件滑鼠點擊 → 收納是否維持 ──
    results.mouseClick = {}
    const visibleCtls = ['remove', 'row-select', 'variant', 'icon', 'bar', 'extra-text']
    for (const ctl of visibleCtls) {
      await evaluate('window.__spike.blurAll()')
      await delay(30)
      const pt = await evaluate(`window.__spike.pointOf(${JSON.stringify(ctl)})`)
      await clickAt(pt)
      results.mouseClick[ctl] = await evaluate('window.__spike.revealState()')
    }

    // 收納態下 move-up 原位置 elementFromPoint ＋ click no-op（點擊收納鈕原位置無效果）
    await evaluate('window.__spike.blurAll(); window.__spike.resetLog()')
    await delay(30)
    const movePt = await evaluate(`window.__spike.pointOf('move-up')`)
    const elemAtMoveBefore = await evaluate('window.__spike.elementAtMovePoint()')
    await clickAt(movePt)
    results.collapsedMoveButton = {
      elementFromPoint: elemAtMoveBefore,
      afterClickState: await evaluate('window.__spike.revealState()'),
      moveUpClickedCount: await evaluate('window.__spike.elementAtMovePoint().moveUpClicked'),
    }

    // ── (b) Tab 走查全列 → 每控件是否浮現 ──
    await evaluate('window.__spike.blurAll(); window.__spike.resetLog()')
    await delay(30)
    // 先滑鼠點 sentinel（設 mouse 模態，sentinel 不應 focus-visible）
    const sentinelPt = await evaluate(`(() => { const r = document.getElementById('sentinel').getBoundingClientRect(); return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) }; })()`)
    await clickAt(sentinelPt)
    results.sentinelAfterMouseClick = await evaluate('window.__spike.revealState()')
    // Tab 走列（8 個控件）
    results.tabWalk = []
    for (let i = 0; i < 8; i++) {
      await pressTab()
      results.tabWalk.push(await evaluate('window.__spike.revealState()'))
    }
    results.focusEventLog = await evaluate('window.__spike.eventLog()')

    // ── (c) 零躍動：收納 rect vs 浮現 rect（Tab 到 remove 使其浮現） ──
    await evaluate('window.__spike.blurAll()')
    await delay(30)
    const collapsedRects = await evaluate('window.__spike.rectSnapshot()')
    const collapsedState = await evaluate('window.__spike.revealState()')
    // 走鍵盤模態使浮現：click sentinel(mouse) → Tab 一次到 move-up
    await clickAt(sentinelPt)
    await pressTab()
    const revealedState = await evaluate('window.__spike.revealState()')
    const revealedRects = await evaluate('window.__spike.rectSnapshot()')
    results.jumpCheck = {
      collapsedState, revealedState,
      rowRectCollapsed: collapsedRects.row, rowRectRevealed: revealedRects.row,
      rowIdentical: JSON.stringify(collapsedRects.row) === JSON.stringify(revealedRects.row),
      allControlRectsIdentical: JSON.stringify(collapsedRects) === JSON.stringify(revealedRects),
      collapsedRects, revealedRects,
    }

    // ── (d) 浮現態下模擬 move 重渲染＋程式化還焦 → 浮現延續？ ──
    // 情境1：Tab 到 move-up 浮現後，還焦 move-down（比照 main.ts:2363 邊界反向鈕還焦）
    results.refocus = {}
    await evaluate('window.__spike.blurAll()'); await delay(20)
    await clickAt(sentinelPt); await pressTab() // 到 move-up，浮現
    results.refocus.beforeMoveDown = await evaluate('window.__spike.revealState()')
    results.refocus.afterRefocusMoveDown = await evaluate(`window.__spike.simulateMoveRefocus('move-down')`)
    // 情境2：Tab 到 row-select 後還焦 row-select（比照 main.ts:1497 select 還焦）
    await evaluate('window.__spike.blurAll()'); await delay(20)
    await clickAt(sentinelPt)
    for (let i = 0; i < 4; i++) await pressTab() // move-up, move-down, remove, row-select
    results.refocus.beforeRowSelect = await evaluate('window.__spike.revealState()')
    results.refocus.afterRefocusRowSelect = await evaluate(`window.__spike.simulateMoveRefocus('row-select')`)

    return results
  } finally {
    try { ws?.close() } catch {}
    killTree(child.pid)
    await delay(300)
    try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}
  }
}

const wanted = process.argv[2] ? [process.argv[2]] : ['edge', 'chrome']
const all = {}
for (const w of wanted) {
  try { all[w] = await run(w) } catch (e) { all[w] = { browser: w, error: String(e && e.message ? e.message : e) } }
}
console.log(JSON.stringify(all, null, 2))
