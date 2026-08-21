#!/usr/bin/env node
/**
 * S-i spike 驗證腳本（magi/15-statusline-editor-layout/TASKS.md T1.8）。
 *
 * 驗證對象：`proto.html`／`proto.js`——兩個「各自獨立捲動容器」（左＝目錄
 * 欄、右＝列區欄）之間的 HTML5 DnD，sprint 15 版面手術（左右並置）新引入
 * 的幾何。既有 `scripts/e2e-statusline.mjs` 是單一捲動容器版面下的拖曳，
 * 未覆蓋此幾何——本腳本補這塊機械證據。
 *
 * CDP 全鏈手法（bootstrap／`Input.setInterceptDrags`／
 * `Input.dispatchDragEvent`）**複製自** `scripts/e2e-statusline.mjs`
 * `dragBySelector`（約其檔案 :1169-1202）與檔頭 CDP 基礎設施段落
 * （`detectBrowser`／`launchBrowser`／`waitForEndpoint`／`connectWs`／
 * `makeClient`），僅 Read 未改動該檔——本檔為獨立 spike 產物，不與該檔
 * 共用模組（該檔為 statusline-builder 專用測試網，字面重複優於跨檔耦合）。
 *
 * 用法：
 *   node magi/15-statusline-editor-layout/spikes/s-i/verify.mjs
 *   E2E_HEADED=1 node ...verify.mjs   # 人工除錯用 headed
 *
 * 找不到本機 Edge/Chromium → 印明確 skip 訊息、exit 0。
 * 任一驗證式邏輯拋錯 → exit 1；全部跑完（無論各驗證內部斷言是否達成，
 * 本腳本目的是「量測平台行為」而非傳統紅綠測試）→ 印出完整量測資料供人工
 * 判讀、写入 `S-i-RESULT.md`，exit 0。
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROTO_URL = pathToFileURL(join(__dirname, 'proto.html')).href
const SCRATCH_ROOT = join(tmpdir(), 'eztools-s-i-spike-profiles')
const HEADED = process.env.E2E_HEADED === '1'

// ── 瀏覽器探測（複製自 scripts/e2e-statusline.mjs EDGE_CANDIDATES／detectBrowser） ──

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

function sweepOrphanBrowser() {
  if (process.platform !== 'win32') return
  const marker = 'eztools-s-i-spike-profiles'
  const script = `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${marker}') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
  spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'ignore' })
}

// ── CDP 基礎設施（複製自 scripts/e2e-statusline.mjs） ────────────────────

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
    // 校準筆記：checkC 改「每 offset 全新拖曳 session」後，實跑一輪曾發生
    // 整支腳本卡死逾 3 分鐘（`Bash` 逾時強殺）——研判某次 CDP 指令的回應
    // 遺失（大量連續 mousePressed/dispatchDragEvent/drop 快速輪替，瀏覽器
    // 內部拖曳狀態機或自動捲動動畫可能仍在收尾）。原始 `send()` 無逾時、
    // 卡住即整支腳本永久掛起。加上單指令 10 秒逾時＋自 `pending` 清除，讓
    // 呼叫端能 catch 後續處理（`trialAtOffset` 已包 try/catch），而非讓一次
    // 個別指令卡死拖垮全部驗證。
    send(method, params = {}) {
      const thisId = ++id
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(thisId)
          reject(new Error(`CDP command timed out after 10000ms: ${method}`))
        }, 10000)
        pending.set(thisId, {
          resolve: (v) => {
            clearTimeout(timer)
            resolve(v)
          },
          reject: (e) => {
            clearTimeout(timer)
            reject(e)
          },
        })
        ws.send(JSON.stringify({ id: thisId, method, params }))
      })
    },
    waitForEvent(method) {
      return new Promise((resolve) => waiters.push({ method, resolve }))
    },
  }
}

// viewport 定案：sprint 15 的預算基準 1280×800（見 brief）。
const VIEWPORT = { width: 1280, height: 800 }

function launchBrowser(browserPath, { userDataDir, url, port }) {
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
  ]
  if (HEADED) {
    args.push('--window-position=2400,50', `--window-size=${VIEWPORT.width},${VIEWPORT.height}`)
  } else {
    args.push('--headless=new')
  }
  args.push(url)
  return spawn(browserPath, args, { stdio: 'ignore' })
}

// ── 幾何輔助（點座標一律「取得元素 rect 中心 / 指定比例」，本腳本刻意
// 只在「元素本就在可視範圍內」的情境使用 scrollIntoView（block:'nearest' —
// 已在視野內則不動，避免如 e2e-statusline.mjs modeRadioClickPointExpr 文件
// 所載 block:'center' 的無條件置中副作用汙染捲動位置訊號）；(c)/(d) 的邊緣
// 自動捲動與源欄誤捲驗證則刻意**不**對目標元素呼叫 scrollIntoView，直接由
// 容器 rect 算座標，才是在測「拖曳本身」而非「JS 主動捲動」。──

function catalogItemPointExpr(name) {
  return `(() => { const el = [...document.querySelectorAll('[data-testid="catalog-item"]')].find((e) => e.dataset.name === ${JSON.stringify(name)}); el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`
}

function rowPointExpr(rowId, verticalFrac) {
  return `(() => { const el = document.querySelector('[data-testid="row"][data-row-id=${JSON.stringify(rowId)}]'); el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height * ${verticalFrac}) }; })()`
}

function rowColumnEdgePointExpr(offsetFromBottom) {
  return `(() => { const c = document.getElementById('row-column'); const r = c.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.bottom - ${offsetFromBottom}) }; })()`
}

const CATALOG_SCROLLTOP_EXPR = `document.getElementById('catalog-column').scrollTop`
const ROW_SCROLLTOP_EXPR = `document.getElementById('row-column').scrollTop`
const WINDOW_SCROLLY_EXPR = `window.scrollY`
const ROW_COLUMN_METRICS_EXPR = `(() => { const c = document.getElementById('row-column'); const r = c.getBoundingClientRect(); return { scrollTop: c.scrollTop, scrollHeight: c.scrollHeight, clientHeight: c.clientHeight, maxScrollTop: c.scrollHeight - c.clientHeight, rectTop: Math.round(r.top), rectBottom: Math.round(r.bottom) }; })()`
const THREE_METRICS_EXPR = `(() => ({ windowScrollY: window.scrollY, catalogScrollTop: document.getElementById('catalog-column').scrollTop, rowScrollTop: document.getElementById('row-column').scrollTop }))()`

// ── 單一頁面 session 包裝（逐驗證獨立瀏覽器行程，避免跨驗證污染） ────────

let portCounter = 9900

async function withPage(checkId, fn) {
  const port = portCounter++
  const userDataDir = join(SCRATCH_ROOT, checkId)
  const child = launchBrowser(detectedBrowserPath, { userDataDir, url: PROTO_URL, port })
  let ws
  try {
    await waitForEndpoint(port)
    const target = await waitForPageTarget(port, 'file://')
    ws = await connectWs(target.webSocketDebuggerUrl)
    const client = makeClient(ws)
    await client.send('Page.enable')
    await client.send('Runtime.enable')
    await client.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false })
    await client.send('Input.setInterceptDrags', { enabled: true })

    async function evaluate(expression) {
      const result = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: false })
      if (result.exceptionDetails) throw new Error(`evaluate failed: ${JSON.stringify(result.exceptionDetails)}`)
      return result.result.value
    }

    async function navigate() {
      const loaded = client.waitForEvent('Page.loadEventFired')
      await client.send('Page.navigate', { url: PROTO_URL })
      await loaded
      await delay(300)
    }

    await navigate()

    function takeIntercepted() {
      const hits = client.eventLog.filter((m) => m.method === 'Input.dragIntercepted')
      client.eventLog.length = 0
      return hits
    }

    /**
     * 建立拖曳 session（複製自 e2e-statusline.mjs dragBySelector 前半段：
     * mouseMoved→mousePressed→十步 mouseMoved 建立拖曳）。`sampleExpr` 非空
     * 時，逐步（每個 mouseMoved 之後）取樣一次，回傳於 `steps`——供 (d)-i
     * 「建立拖曳階段左欄 scrollTop 是否被擾動」使用。
     */
    async function establishDrag(fromPointExpr, sampleExpr) {
      const from = await evaluate(fromPointExpr)
      const steps = []
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x, y: from.y })
      await delay(50)
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 })
      await delay(60)
      for (let i = 1; i <= 10; i++) {
        await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x + i * 6, y: from.y + i * 3, button: 'left', buttons: 1 })
        await delay(40)
        if (sampleExpr) steps.push({ i, value: await evaluate(sampleExpr) })
      }
      await delay(300)
      const intercepted = takeIntercepted()
      if (intercepted.length === 0) {
        await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: from.x, y: from.y, button: 'left', clickCount: 1 })
        return { ok: false, from, steps }
      }
      return { ok: true, from, steps, data: intercepted[0].params.data }
    }

    async function dragEnterAt(x, y, data) {
      await client.send('Input.dispatchDragEvent', { type: 'dragEnter', x, y, data })
    }
    async function dragOverAt(x, y, data) {
      await client.send('Input.dispatchDragEvent', { type: 'dragOver', x, y, data })
    }
    async function dropAt(x, y, data) {
      await client.send('Input.dispatchDragEvent', { type: 'drop', x, y, data })
    }
    async function releaseMouse(x, y) {
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
    }

    return await fn({ evaluate, establishDrag, dragEnterAt, dragOverAt, dropAt, releaseMouse })
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

// ── (a) 跨容器事件鏈 + drop 資料落地 + 「無需捲動之正常拖曳」三指標基線 ──

async function checkA(ctx) {
  const { evaluate, establishDrag, dragEnterAt, dragOverAt, dropAt, releaseMouse } = ctx
  const sourceName = '目錄項-05'
  const targetRowId = 'row-1'

  await evaluate(`window.__resetProto()`)
  const before = await evaluate(THREE_METRICS_EXPR)

  const est = await establishDrag(catalogItemPointExpr(sourceName))
  if (!est.ok) return { ok: false, reason: 'drag session not established (no Input.dragIntercepted)' }

  const pt = await evaluate(rowPointExpr(targetRowId, 0.5))
  await dragEnterAt(pt.x, pt.y, est.data)
  await delay(80)
  await dragOverAt(pt.x, pt.y, est.data)
  await delay(200)
  const pt2 = await evaluate(rowPointExpr(targetRowId, 0.5))
  await dragOverAt(pt2.x, pt2.y, est.data)
  await delay(80)
  await dropAt(pt2.x, pt2.y, est.data)
  await delay(150)
  await releaseMouse(pt2.x, pt2.y)
  await delay(150)

  const after = await evaluate(THREE_METRICS_EXPR)
  const log = await evaluate(`window.__dndLog`)
  const rowContent = await evaluate(
    `document.querySelector('[data-testid="row"][data-row-id=${JSON.stringify(targetRowId)}] [data-testid="row-content"]').textContent`,
  )

  const dragenterHit = log.some((e) => e.type === 'dragenter' && e.rowId === targetRowId)
  const dragoverHit = log.some((e) => e.type === 'dragover' && e.rowId === targetRowId)
  const dropEvt = log.find((e) => e.type === 'drop' && e.rowId === targetRowId)
  const dataLanded = Boolean(dropEvt) && dropEvt.name === sourceName && rowContent === sourceName

  return {
    ok: dragenterHit && dragoverHit && Boolean(dropEvt) && dataLanded,
    sourceName,
    targetRowId,
    dragenterHit,
    dragoverHit,
    dropEvt: dropEvt ?? null,
    rowContent,
    before,
    after,
    scrollDelta: {
      windowScrollY: after.windowScrollY - before.windowScrollY,
      catalogScrollTop: after.catalogScrollTop - before.catalogScrollTop,
      rowScrollTop: after.rowScrollTop - before.rowScrollTop,
    },
  }
}

// ── (b) 插入指示定位：同一列「上半」vs「下半」dragover 應落 top/bottom ──

async function checkB(ctx) {
  const { evaluate, establishDrag, dragEnterAt, dragOverAt, dropAt, releaseMouse } = ctx
  const sourceName = '目錄項-08'
  const targetRowId = 'row-2'

  await evaluate(`window.__resetProto()`)
  const est = await establishDrag(catalogItemPointExpr(sourceName))
  if (!est.ok) return { ok: false, reason: 'drag session not established (no Input.dragIntercepted)' }

  const topPt = await evaluate(rowPointExpr(targetRowId, 0.2))
  await dragEnterAt(topPt.x, topPt.y, est.data)
  await delay(80)
  await dragOverAt(topPt.x, topPt.y, est.data)
  await delay(120)
  const stateAtTop = await evaluate(`window.__indicatorState`)

  const bottomPt = await evaluate(rowPointExpr(targetRowId, 0.8))
  await dragOverAt(bottomPt.x, bottomPt.y, est.data)
  await delay(120)
  const stateAtBottom = await evaluate(`window.__indicatorState`)

  await dropAt(bottomPt.x, bottomPt.y, est.data)
  await delay(100)
  await releaseMouse(bottomPt.x, bottomPt.y)

  const ok =
    Boolean(stateAtTop) && stateAtTop.rowId === targetRowId && stateAtTop.position === 'top' &&
    Boolean(stateAtBottom) && stateAtBottom.rowId === targetRowId && stateAtBottom.position === 'bottom'

  return { ok, targetRowId, stateAtTop, stateAtBottom }
}

// ── (c) 邊緣自動捲動：觸發距離掃描 + 固定邊緣點長時間取樣（捲速／window 連鎖／停止條件） ──
//
// 實測校準筆記：第一輪原型（單一拖曳 session 內連續掃過全部 offset、C2
// 沿用同一 session）量到不可解讀的資料——offset=8px 六次 dragover（~780ms）
// 內即衝頂（scrollTopAfter=maxScrollTop），但緊接著同一 session 內
// offset=4px 卻回落到 0、且 C2 選的 offset=6px 在同一 session 內連續
// dragover 近 3 秒仍全程 0（與 offset=8 的結果矛盾，8 與 6 僅差 2px）。
// 懷疑是 Chromium `AutoscrollController` 內部狀態（是否已判定「這個
// scrollable 已捲到底／本次拖曳已消費過的捲動意圖」）**跨座標點殘留**，
// 而非單純的「距邊緣多少 px」函式——即同一個原生拖曳 session 內先在某個
// 會觸發的 offset 讓它捲到底，之後即使把 scrollTop 用 JS 直接歸零、換一個
// 座標再送 dragover，瀏覽器內部的 autoscroll 狀態機不會重新評估。改為
// **每個 offset 試驗皆用全新拖曳 session**（全新 mousePressed…mouseMoved
// 建立、試驗結束 drop 收尾）後，資料轉為單調、可重現（見 RESULT.md 完整
// 數據與 reproResults 的三次重跑）。
async function checkC(ctx) {
  const { evaluate, establishDrag, dragEnterAt, dragOverAt, dropAt, releaseMouse } = ctx
  const sourceName = '目錄項-03'
  const targetRowId = 'row-18' // 最後一個列群組，scrollTop=0 時必在可視範圍外。

  await evaluate(`window.__resetProto()`)
  await evaluate(`document.getElementById('row-column').scrollTop = 0`)
  const metrics0 = await evaluate(ROW_COLUMN_METRICS_EXPR)
  const targetRectExpr = `(() => { const el = document.querySelector('[data-testid="row"][data-row-id="${targetRowId}"]'); const r = el.getBoundingClientRect(); const c = document.getElementById('row-column').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), withinContainer: r.top >= c.top && r.bottom <= c.bottom }; })()`
  const targetRectAtStart = await evaluate(targetRectExpr)

  /** 單一「全新拖曳 session」試驗：於指定 offset（距容器底緣 px）連續
   * dragover burstCount 次，讀 scrollTop 後 drop 收尾（結束本次 session，
   * 不影響下一試驗）。單指令逾時（見 makeClient.send 文件）以 try/catch
   * 接住，避免一次卡死拖垮整支腳本——標記 `ok:false` 並附原因，其餘試驗
   * 照常繼續。 */
  async function trialAtOffset(offset, { burstCount = 6, intervalMs = 130 } = {}) {
    try {
      await evaluate(`document.getElementById('row-column').scrollTop = 0`)
      await delay(30)
      const est = await establishDrag(catalogItemPointExpr(sourceName))
      if (!est.ok) return { offset, ok: false, reason: 'drag session not established' }
      const pt = await evaluate(rowColumnEdgePointExpr(offset))
      await dragEnterAt(pt.x, pt.y, est.data)
      await delay(60)
      for (let i = 0; i < burstCount; i++) {
        await dragOverAt(pt.x, pt.y, est.data)
        await delay(intervalMs)
      }
      const scrollTopAfter = await evaluate(ROW_SCROLLTOP_EXPR)
      await dropAt(pt.x, pt.y, est.data)
      await delay(100)
      await releaseMouse(pt.x, pt.y)
      await delay(250) // session 間留較長沉澱時間，避免上一輪自動捲動動畫收尾中干擾下一輪。
      return { offset, ok: true, scrollTopAfter }
    } catch (err) {
      return { offset, ok: false, reason: `exception: ${err && err.message ? err.message : String(err)}` }
    }
  }

  // C1：邊緣觸發距離掃描（60px→2px，每個 offset 皆全新 session）。
  const offsets = [60, 24, 16, 12, 10, 8, 6, 4, 2]
  const boundaryResults = []
  for (const offset of offsets) {
    boundaryResults.push(await trialAtOffset(offset))
  }

  // C1b：邊界附近三個關鍵 offset 各重跑兩次——確認觸發／不觸發是否可重現
  // （非單次雜訊；亦驗證「全新 session」修法後不再有 C1 原始異常）。
  const reproCheckOffsets = [6, 8, 12]
  const reproResults = []
  for (const offset of reproCheckOffsets) {
    const runs = []
    for (let r = 0; r < 2; r++) runs.push((await trialAtOffset(offset)).scrollTopAfter)
    reproResults.push({ offset, runs })
  }

  // C2：固定一個「明確可重現觸發」的 offset（10px，見 C1/C1b 結果落於穩定
  // 觸發區）、全新 session、長時間取樣——量捲速／window 是否連鎖／停止條件
  // （是否在抵達 maxScrollTop 時停）。
  await evaluate(`document.getElementById('row-column').scrollTop = 0`)
  await delay(30)
  const est2 = await establishDrag(catalogItemPointExpr(sourceName))
  let timeSeries = []
  let targetRectAtEnd = null
  if (est2.ok) {
    const edgePt = await evaluate(rowColumnEdgePointExpr(10))
    await dragEnterAt(edgePt.x, edgePt.y, est2.data)
    await delay(60)
    const t0 = Date.now()
    for (let i = 0; i < 24; i++) {
      await dragOverAt(edgePt.x, edgePt.y, est2.data)
      await delay(110)
      const sample = await evaluate(THREE_METRICS_EXPR)
      timeSeries.push({ tMs: Date.now() - t0, ...sample })
    }
    targetRectAtEnd = await evaluate(targetRectExpr)
    await dropAt(edgePt.x, edgePt.y, est2.data)
    await delay(150)
    await releaseMouse(edgePt.x, edgePt.y)
  }

  return {
    ok: true,
    targetRowId,
    metrics0,
    targetRectAtStart,
    targetRectAtEnd,
    boundaryResults,
    reproResults,
    timeSeries,
  }
}

// ── (d) 拖曳中來源欄（左欄）誤捲：建立拖曳階段 + 全程（含右欄邊緣觸發自動捲動時）取樣 ──

async function checkD(ctx) {
  const { evaluate, establishDrag, dragEnterAt, dragOverAt, dropAt, releaseMouse } = ctx
  const sourceName = '目錄項-10'
  const targetRowId = 'row-0'

  await evaluate(`window.__resetProto()`)
  const initialCatalogScrollTop = await evaluate(CATALOG_SCROLLTOP_EXPR)

  // (d)-i：建立拖曳階段（mousePressed + 十步 mouseMoved，指標全程仍在左欄
  // 範圍內）逐步取樣左欄 scrollTop。
  const est = await establishDrag(catalogItemPointExpr(sourceName), CATALOG_SCROLLTOP_EXPR)
  if (!est.ok) return { ok: false, reason: 'drag session not established (no Input.dragIntercepted)' }
  const postEstablishScrollTop = await evaluate(CATALOG_SCROLLTOP_EXPR)

  // (d)-額外（brief 兩子案之外、依 (c) 發現的邊緣自動捲動現象延伸驗證）：
  // 指標仍在左欄「內」，但刻意移到左欄自身底緣附近（(c) 已證實的觸發區帶
  // 距離）——來源欄本身是否也會被同一套原生 autoscroll 觸發？這比 brief
  // 原文的「小幅垂直位移」更貼近真實「誤捲」風險情境（使用者從目錄欄接近
  // 底部處的段落起手拖曳，游標在放開前於原欄底緣附近停留）。
  const catalogEdgeExpr = (offset) =>
    `(() => { const c = document.getElementById('catalog-column'); const r = c.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.bottom - ${offset}) }; })()`
  const catalogEdgePt = await evaluate(catalogEdgeExpr(10)) // 10px：(c) 已證實此距離對右欄穩定觸發。
  await dragEnterAt(catalogEdgePt.x, catalogEdgePt.y, est.data)
  await delay(60)
  const sourceEdgeSamples = []
  for (let i = 0; i < 8; i++) {
    await dragOverAt(catalogEdgePt.x, catalogEdgePt.y, est.data)
    await delay(130)
    sourceEdgeSamples.push(await evaluate(CATALOG_SCROLLTOP_EXPR))
  }

  // (d)-ii：指標移出左欄、進入右欄後，全程（含刻意重現 (c) 邊緣觸發場景，
  // 檢驗右欄原生自動捲動是否連鎖擾動左欄）取樣左欄 scrollTop。
  const enterPt = await evaluate(rowPointExpr(targetRowId, 0.5))
  await dragEnterAt(enterPt.x, enterPt.y, est.data)
  await delay(80)
  const afterEnterRightColumn = await evaluate(CATALOG_SCROLLTOP_EXPR)

  // offset=10px：checkC 已確認為穩定觸發右欄自動捲動的區帶（見
  // S-i-RESULT.md），才能讓本測「右欄確實正在自動捲動時，左欄是否被連鎖
  // 擾動」具有實證力（而非「右欄根本沒捲，左欄當然沒事」的弱結論）。
  await evaluate(`document.getElementById('row-column').scrollTop = 0`)
  const edgePt = await evaluate(rowColumnEdgePointExpr(10))
  const timeSeries = []
  for (let i = 0; i < 16; i++) {
    await dragOverAt(edgePt.x, edgePt.y, est.data)
    await delay(110)
    const [catalogScrollTop, rowScrollTop] = await Promise.all([
      evaluate(CATALOG_SCROLLTOP_EXPR),
      evaluate(ROW_SCROLLTOP_EXPR),
    ])
    timeSeries.push({ i, catalogScrollTop, rowScrollTop })
  }

  await dropAt(edgePt.x, edgePt.y, est.data)
  await delay(150)
  await releaseMouse(edgePt.x, edgePt.y)
  const finalCatalogScrollTop = await evaluate(CATALOG_SCROLLTOP_EXPR)

  const establishSamples = est.steps.map((s) => s.value)
  const allSamples = [
    initialCatalogScrollTop,
    ...establishSamples,
    ...sourceEdgeSamples,
    postEstablishScrollTop,
    afterEnterRightColumn,
    ...timeSeries.map((s) => s.catalogScrollTop),
    finalCatalogScrollTop,
  ]
  const disturbance = Math.max(...allSamples) - Math.min(...allSamples)
  const rowScrollTopSamples = timeSeries.map((s) => s.rowScrollTop)
  const rowColumnDidAutoscroll = Math.max(...rowScrollTopSamples, 0) > 0

  return {
    ok: true,
    initialCatalogScrollTop,
    establishSamples,
    establishStable: establishSamples.every((v) => v === initialCatalogScrollTop),
    // 來源欄（左欄）自身底緣附近是否也被同一套原生 autoscroll 觸發——見上方
    // 「(d)-額外」註解。
    sourceEdgeSamples,
    sourceEdgeTriggered: Math.max(...sourceEdgeSamples, 0) > initialCatalogScrollTop,
    postEstablishScrollTop,
    afterEnterRightColumn,
    timeSeries,
    finalCatalogScrollTop,
    disturbance,
    // 佐證用：本次測試期間右欄（列區）是否確實有被原生自動捲動觸發——若
    // false，則「左欄全程不變」的結論證據力較弱（可能只是根本沒觸發，不是
    // 「觸發了但沒連鎖」）。
    rowColumnDidAutoscroll,
    rowColumnMaxScrollTop: Math.max(...rowScrollTopSamples, 0),
  }
}

// ── 主流程 ─────────────────────────────────────────────────────────────

let detectedBrowserPath = null

async function main() {
  detectedBrowserPath = detectBrowser()
  if (detectedBrowserPath === null) {
    console.log('[s-i] SKIP: no local Edge/Chromium executable found in known install paths:')
    for (const p of EDGE_CANDIDATES) console.log(`  - ${p}`)
    console.log('[s-i] Nothing to verify — exiting 0 (browser-less environment, not a failure).')
    process.exit(0)
  }
  console.log(`[s-i] Browser found: ${detectedBrowserPath}`)
  console.log(`[s-i] Mode: ${HEADED ? 'headed (E2E_HEADED=1)' : 'headless(new) [default]'}`)
  console.log(`[s-i] Proto URL: ${PROTO_URL}`)
  console.log(`[s-i] Viewport: ${VIEWPORT.width}x${VIEWPORT.height}`)

  mkdirSync(SCRATCH_ROOT, { recursive: true })

  // 逐項獨立 try/catch：任一驗證內部拋錯（例如 CDP 指令逾時，見
  // makeClient.send 文件）僅使該項標記 ok:false 附錯誤原因，不拖垮其餘
  // 三項——spike 目的是儘量取得完整量測資料，非傳統「一項失敗全部中止」的
  // 測試網紀律。
  async function runCheckSafely(label, id, fn) {
    console.log(`\n[s-i] ${label} ...`)
    try {
      const result = await withPage(id, fn)
      console.log(JSON.stringify(result, null, 2))
      return result
    } catch (err) {
      const result = { ok: false, reason: `exception: ${err && err.message ? err.message : String(err)}` }
      console.log(JSON.stringify(result, null, 2))
      return result
    }
  }

  const results = {}
  try {
    results.a = await runCheckSafely('(a) 跨容器事件鏈 + drop 資料落地', 'check-a', checkA)
    results.b = await runCheckSafely('(b) 插入指示定位', 'check-b', checkB)
    results.c = await runCheckSafely('(c) 邊緣自動捲動', 'check-c', checkC)
    results.d = await runCheckSafely('(d) 來源欄誤捲', 'check-d', checkD)
  } finally {
    console.log('\n[s-i] sweeping any orphaned browser processes from this run ...')
    sweepOrphanBrowser()
    try {
      rmSync(SCRATCH_ROOT, { recursive: true, force: true })
    } catch {
      // best-effort
    }
  }

  console.log('\n=== SUMMARY ===')
  console.log(`(a) 跨容器事件鏈＋資料落地: ${results.a.ok ? 'PASS' : `FAIL (${results.a.reason ?? 'see JSON'})`}`)
  console.log(`(b) 插入指示定位: ${results.b.ok ? 'PASS' : `FAIL (${results.b.reason ?? 'see JSON'})`}`)
  console.log(`(c) 邊緣自動捲動: ${results.c.ok ? '量測完成（見上方 JSON，非通過/失敗二元判準）' : `FAIL (${results.c.reason ?? 'see JSON'})`}`)
  console.log(`(d) 來源欄誤捲: ${results.d.ok ? `量測完成（disturbance=${results.d.disturbance}px，見上方 JSON）` : `FAIL (${results.d.reason ?? 'see JSON'})`}`)

  console.log('\n[s-i] 完整結果 JSON（供回填 S-i-RESULT.md）：')
  console.log(JSON.stringify(results, null, 2))
}

main().catch((err) => {
  console.error('[s-i] FATAL:', err)
  sweepOrphanBrowser()
  process.exitCode = 1
})
