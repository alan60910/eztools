#!/usr/bin/env node
/**
 * wheel-grid.mjs — S-g（T1.4）可捲命中面積量測腳本。
 *
 * 對 `spikes/s-g/m1a.html`（`spikes/proto/` 的獨立副本，僅本 lane 可寫）在
 * 1280×800 viewport 下，三種 overscroll-behavior 組態（O1 兩欄皆
 * contain／O2 皆不掛／O3 僅列區掛 contain，見 `proto.css` `body.ovsc-o1`／
 * `body.ovsc-o3` hook）× 兩種頁面狀態（P1 初載態／P2 欄耗盡態）各跑 3×3
 * 九宮格，於每點 dispatch 3 次真實 `mouseWheel`（deltaY:120，間隔
 * 100ms），記錄 `window.scrollY`／`.col--catalog`／`.col--list` 的
 * `scrollTop` 變化，判定該點「捲到誰」（page／catalog／list／none）。另對
 * 三組態各跑鍵盤側（5 個焦點落點 × Space／PageDown），純記錄捲動標的、無
 * 門檻。
 *
 * CDP bootstrap（detectBrowser／launchBrowser／waitForEndpoint／
 * waitForPageTarget／connectWs／makeClient／killProcessTree）複製自同目錄
 * `measure.mjs`（T1.1 產出，本任務只 Read 未改動該檔），依本 spike 需求
 * （逐 session 可切換 overscroll 組態、加 Input.dispatchMouseEvent／
 * dispatchKeyEvent 輔助）擴充。
 *
 * debug port：9970–9984 區段（brief 明定，m1a 臂 lane 專用區段，避免與其他
 * 並行 spike 撞埠）。
 *
 * 用法：
 *   node wheel-grid.mjs
 *   WHEELGRID_HEADED=1 node wheel-grid.mjs   # 人工除錯用 headed
 *
 * 找不到本機 Edge/Chromium → 印錯誤訊息＋exit 1（比照 measure.mjs：量測
 * 底座找不到瀏覽器不是「這次沒東西要測」，不同於 e2e 的略過語意）。
 * 輸出：stdout 印人類可讀摘要表 ＋ 檔尾一段完整 JSON（供 S-g-RESULT.md
 * 撰寫時逐位元核對）。
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HEADED = process.env.WHEELGRID_HEADED === '1'
const HTML_PATH = join(__dirname, 'm1a.html')
const FILE_URL = `file:///${HTML_PATH.replace(/\\/g, '/')}`
const SCRATCH_ROOT = join(
  'C:\\Users\\alan6\\AppData\\Local\\Temp\\claude\\E--program-git-eztools\\73b9e6ba-c0fd-4910-b635-e512f01f0fde\\scratchpad',
  'sg-profiles',
)
const VIEWPORT = { width: 1280, height: 800 }

// ── CDP bootstrap（複製自 measure.mjs，僅依本腳本需求精簡命名） ─────────

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
    // 每個 CDP 呼叫皆帶預設 8s timeout（本腳本首輪實測曾在無 timeout 下卡死
    // 整個 session、無法定位卡點，見 S-g-RESULT.md「腳本除錯」節）——逾時
    // 明確擲錯而非無限等待，讓單點失敗可被上層 try/catch 接住、不拖垮整個
    // config。
    send(method, params = {}, timeoutMs = 8000) {
      const thisId = ++id
      const call = new Promise((resolve, reject) => {
        pending.set(thisId, { resolve, reject })
        ws.send(JSON.stringify({ id: thisId, method, params }))
      })
      return Promise.race([
        call,
        delay(timeoutMs).then(() => {
          pending.delete(thisId)
          throw new Error(`[wheel-grid] CDP TIMEOUT：${method}（id=${thisId}，${timeoutMs}ms 無回應）`)
        }),
      ])
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
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--allow-file-access-from-files',
  ]
  if (HEADED) {
    args.push('--window-position=2400,50', `--window-size=${VIEWPORT.width},${VIEWPORT.height}`)
  } else {
    args.push('--headless=new')
  }
  args.push('about:blank')
  return spawn(browserPath, args, { stdio: 'ignore' })
}

// 9970–9984 區段（brief 明定），有序遞增、超界即丟錯（本腳本案數已知固定
// 為 3 個 session，遠低於 15 埠上限，超界代表程式邏輯有誤，非預期執行路徑）。
let portCounter = 9970
function nextPort() {
  const p = portCounter++
  if (p > 9984) throw new Error('S-g 埠段 9970–9984 已用盡（session 數超出預期，需重新規劃）')
  return p
}

// ── session 骨架（本 spike 專用） ────────────────────────────────────────

/**
 * 開一個全新瀏覽器 session，導向 m1a.html，並依 `overscrollConfig` 於
 * navigate 完成後立即掛對應 body class（O2 不掛任何 class，維持 CSS 預設
 * auto；見 proto.css `body.ovsc-o1`／`body.ovsc-o3` 規則）。
 */
async function openSession({ id, browserPath, overscrollConfig }) {
  const port = nextPort()
  const userDataDir = join(SCRATCH_ROOT, id)
  rmSync(userDataDir, { recursive: true, force: true })
  mkdirSync(userDataDir, { recursive: true })

  const child = launchBrowser(browserPath, { userDataDir, port })
  await waitForEndpoint(port)
  const target = await waitForPageTarget(port)
  const ws = await connectWs(target.webSocketDebuggerUrl)
  const client = makeClient(ws)

  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    deviceScaleFactor: 1,
    mobile: false,
  })

  async function evaluate(expression) {
    const result = await client.send('Runtime.evaluate', { expression, returnByValue: true })
    if (result.exceptionDetails) throw new Error(`evaluate failed: ${JSON.stringify(result.exceptionDetails)}`)
    return result.result.value
  }

  const loaded = client.waitForEvent('Page.loadEventFired')
  await client.send('Page.navigate', { url: FILE_URL })
  await loaded
  await evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`)

  // O2（auto，預設）不掛任何 class；O1／O3 掛對應 body class（見 proto.css）。
  if (overscrollConfig === 'O1') await evaluate(`document.body.classList.add('ovsc-o1')`)
  if (overscrollConfig === 'O3') await evaluate(`document.body.classList.add('ovsc-o3')`)

  async function close() {
    try {
      ws.close()
    } catch {
      // ignore
    }
    killProcessTree(child.pid)
    await delay(200)
    try {
      rmSync(userDataDir, { recursive: true, force: true })
    } catch {
      // best-effort cleanup only
    }
  }

  return { client, evaluate, close }
}

// ── 量測輔助 ─────────────────────────────────────────────────────────────

async function resetPageState(evaluate, state) {
  // state: 'P1' → 兩欄 scrollTop=0；'P2' → 兩欄 scrollTop=max（先各自捲到
  // 底）。scrollY 兩態皆重置為 0（brief 定義：P2 亦是 scrollY=0，只是欄內
  // 已耗盡）。
  await evaluate(`
    (() => {
      window.scrollTo(0, 0);
      const cat = document.querySelector('.col--catalog');
      const list = document.querySelector('.col--list');
      const target = (el) => ${JSON.stringify(state)} === 'P2' ? (el.scrollHeight - el.clientHeight) : 0;
      if (cat) cat.scrollTop = target(cat);
      if (list) list.scrollTop = target(list);
    })()
  `)
  await evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`)
}

async function snapshotScroll(evaluate) {
  return evaluate(`
    (() => {
      const cat = document.querySelector('.col--catalog');
      const list = document.querySelector('.col--list');
      return {
        scrollY: window.scrollY,
        catalogScrollTop: cat ? cat.scrollTop : null,
        listScrollTop: list ? list.scrollTop : null,
      };
    })()
  `)
}

async function dispatchWheelBurst(client, x, y, { times = 3, deltaY = 120, intervalMs = 100 } = {}) {
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  for (let i = 0; i < times; i++) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x,
      y,
      deltaX: 0,
      deltaY,
      pointerType: 'mouse',
    })
    await delay(intervalMs)
  }
}

const EPS = 0.5 // px 容許誤差（sub-pixel 捨入雜訊）

function determineAttribution(before, after) {
  const dPage = after.scrollY - before.scrollY
  const dCat = (after.catalogScrollTop ?? 0) - (before.catalogScrollTop ?? 0)
  const dList = (after.listScrollTop ?? 0) - (before.listScrollTop ?? 0)
  const movedPage = Math.abs(dPage) > EPS
  const movedCat = Math.abs(dCat) > EPS
  const movedList = Math.abs(dList) > EPS
  if (!movedPage && !movedCat && !movedList) return { label: 'none', dPage, dCat, dList }
  if (movedPage && !movedCat && !movedList) return { label: 'page', dPage, dCat, dList }
  if (movedCat && !movedPage && !movedList) return { label: 'catalog', dPage, dCat, dList }
  if (movedList && !movedPage && !movedCat) return { label: 'list', dPage, dCat, dList }
  return { label: 'mixed', dPage, dCat, dList }
}

// 九宮格：viewport 均分 3×3 的九個中心點（brief 口徑，非依元素邊界取點）。
function gridPoints() {
  const xs = [
    { key: 'left', v: Math.round(VIEWPORT.width * (1 / 6)) },
    { key: 'center', v: Math.round(VIEWPORT.width * (3 / 6)) },
    { key: 'right', v: Math.round(VIEWPORT.width * (5 / 6)) },
  ]
  const ys = [
    { key: 'top', v: Math.round(VIEWPORT.height * (1 / 6)) },
    { key: 'mid', v: Math.round(VIEWPORT.height * (3 / 6)) },
    { key: 'bottom', v: Math.round(VIEWPORT.height * (5 / 6)) },
  ]
  const points = []
  for (const y of ys) {
    for (const x of xs) {
      points.push({ label: `${y.key}-${x.key}`, x: x.v, y: y.v })
    }
  }
  return points
}

async function measureWheelPoint({ evaluate, client }, state, point) {
  await resetPageState(evaluate, state)
  await delay(80)
  const before = await snapshotScroll(evaluate)
  const hitElement = await evaluate(`
    (() => {
      const el = document.elementFromPoint(${point.x}, ${point.y});
      if (!el) return null;
      return el.closest('.col--catalog') ? 'in:.col--catalog'
        : el.closest('.col--settings') ? 'in:.col--settings'
        : el.closest('.col--list') ? 'in:.col--list'
        : el.closest('.preview-band') ? 'in:.preview-band'
        : el.closest('header') ? 'in:header'
        : el.tagName;
    })()
  `)
  await dispatchWheelBurst(client, point.x, point.y)
  await delay(120)
  const after = await snapshotScroll(evaluate)
  const attribution = determineAttribution(before, after)
  return { point: point.label, x: point.x, y: point.y, hitElement, before, after, attribution }
}

// ── 鍵盤側 ───────────────────────────────────────────────────────────────

const FOCUS_TARGETS = [
  { label: '頂帶內按鈕', selector: '.output-open-mock' },
  { label: '目錄欄內項目（教學帶關閉鈕，唯一可聚焦控件）', selector: '.tutorial-band-mock__dismiss' },
  { label: '列區內控件（第 1 列首個 select）', selector: '.segment-row-mock__select', isSelect: true },
  { label: '設定欄內控件（Powerline 箭頭勾選框）', selector: '#settings-col input[type="checkbox"]' },
  { label: 'body', selector: null },
]

// 診斷腳本（scratchpad/diag-key.mjs，一次性、未留存於 repo）實測發現：Space
// 會產生字元（' '），CDP 對「會產生字元的鍵」須用 `type:'keyDown'`（含
// text／unmodifiedText）＋後續 `char` 事件，才會被 Chromium 判定為完整鍵盤
// 動作並觸發原生預設行為（含捲動）；用 `rawKeyDown`（不帶 text）測得
// `scrollY` 恆為 0（未觸發任何行為，事件疑似被視為不完整而略過預設動作）。
// PageDown 不產生字元，`rawKeyDown`＋`keyUp`（無 char 事件）即可正確觸發，
// 與 `scripts/e2e-statusline.mjs`／`spikes/s-f/verify.mjs` 對 Escape／Enter
// 等非列印鍵的既有寫法一致。兩鍵診斷實測（見 S-g-RESULT.md「鍵盤 dispatch
// 診斷」節）：body 對焦、maxScroll=422 時，正確寫法下 Space／PageDown 皆使
// `scrollY` 從 0 變為 422（clamp 到底，此原型 maxScroll 本身很小）。
const KEY_DEFS = {
  Space: { keyCode: 32, code: 'Space', key: ' ', text: ' ' },
  PageDown: { keyCode: 34, code: 'PageDown', key: 'PageDown', text: undefined },
}

async function pressKey(client, name) {
  const k = KEY_DEFS[name]
  await client.send('Input.dispatchKeyEvent', {
    type: k.text ? 'keyDown' : 'rawKeyDown',
    windowsVirtualKeyCode: k.keyCode,
    nativeVirtualKeyCode: k.keyCode,
    code: k.code,
    key: k.key,
    text: k.text,
    unmodifiedText: k.text,
  })
  if (k.text) {
    await client.send('Input.dispatchKeyEvent', { type: 'char', text: k.text, unmodifiedText: k.text })
  }
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    windowsVirtualKeyCode: k.keyCode,
    nativeVirtualKeyCode: k.keyCode,
    code: k.code,
    key: k.key,
  })
}

async function pressEscapeDefensive(client) {
  try {
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 })
  } catch {
    // best-effort only
  }
}

async function measureKeyboardCase({ evaluate, client }, focusTarget, keyName) {
  await resetPageState(evaluate, 'P1')
  await delay(80)
  if (focusTarget.selector) {
    await evaluate(`document.querySelector(${JSON.stringify(focusTarget.selector)})?.focus()`)
  } else {
    await evaluate(`if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur()`)
  }
  await delay(60)
  const activeElement = await evaluate(`
    (() => { const el = document.activeElement; return el ? (el.id || el.className || el.tagName) : null; })()
  `)
  const before = await snapshotScroll(evaluate)
  await pressKey(client, keyName)
  await delay(220)
  if (focusTarget.isSelect) await pressEscapeDefensive(client)
  await delay(80)
  const after = await snapshotScroll(evaluate)
  const attribution = determineAttribution(before, after)
  return { focus: focusTarget.label, selector: focusTarget.selector, key: keyName, activeElement, before, after, attribution }
}

// ── 單一組態的完整量測（wheel 9x2 + keyboard 5x2） ──────────────────────

// 平台坑（腳本除錯過程實測，見 S-g-RESULT.md「腳本除錯」節）：單一
// session（單一分頁）內連續送出的 CDP 指令量（含 Runtime.evaluate／
// Input.dispatchMouseEvent 等所有種類）累積超過約 120–150 次後，
// `Input.dispatchMouseEvent` 開始不再收到 ACK（8s timeout 全數命中，且
// 一旦發生會連鎖影響同 session 內所有後續滑鼠事件，但同 session 的
// `Input.dispatchKeyEvent` 不受影響、仍正常運作）——與 overscroll-behavior
// 組態（O1/O2/O3 三者皆重現）或量測狀態（P1 從未重現、P2 才會踩到）本身
// 無關，是 headless=new 在本機環境下的累積性資源限制，非本 spike 的量測
// 標的。九點×3=27 次 `Input.dispatchMouseEvent`（P1 單一狀態的量）在三組態
// 全數 100% 可靠，故**每個 (組態, 狀態) 各開一個全新 session**、鍵盤側再
// 另開一個 session，把每個 session 的指令量壓在安全範圍內。
async function runWheelState(browserPath, overscrollConfig, state) {
  const session = await openSession({ id: `sg-${overscrollConfig}-${state}`, browserPath, overscrollConfig })
  try {
    const points = []
    for (const point of gridPoints()) {
      const t0 = Date.now()
      try {
        const r = await measureWheelPoint(session, state, point)
        points.push(r)
        console.log(`  [${overscrollConfig}/${state}] ${point.label.padEnd(11)} done in ${Date.now() - t0}ms → ${r.attribution.label}`)
      } catch (err) {
        console.log(`  [${overscrollConfig}/${state}] ${point.label.padEnd(11)} ERROR after ${Date.now() - t0}ms: ${String(err)}`)
        points.push({ point: point.label, x: point.x, y: point.y, error: String(err) })
      }
    }
    return points
  } finally {
    await session.close()
  }
}

async function runKeyboard(browserPath, overscrollConfig) {
  const session = await openSession({ id: `sg-${overscrollConfig}-kbd`, browserPath, overscrollConfig })
  try {
    const keyboardResults = []
    for (const target of FOCUS_TARGETS) {
      for (const keyName of ['Space', 'PageDown']) {
        const t0 = Date.now()
        try {
          const r = await measureKeyboardCase(session, target, keyName)
          keyboardResults.push(r)
          console.log(`  [${overscrollConfig}/kbd] ${target.label} / ${keyName} done in ${Date.now() - t0}ms → ${r.attribution.label}`)
        } catch (err) {
          console.log(`  [${overscrollConfig}/kbd] ${target.label} / ${keyName} ERROR after ${Date.now() - t0}ms: ${String(err)}`)
          keyboardResults.push({ focus: target.label, selector: target.selector, key: keyName, error: String(err) })
        }
      }
    }
    return keyboardResults
  } finally {
    await session.close()
  }
}

async function runConfig(browserPath, overscrollConfig) {
  const wheelResults = {}
  wheelResults.P1 = await runWheelState(browserPath, overscrollConfig, 'P1')
  wheelResults.P2 = await runWheelState(browserPath, overscrollConfig, 'P2')
  const keyboardResults = await runKeyboard(browserPath, overscrollConfig)
  return { overscrollConfig, wheelResults, keyboardResults }
}

function hitAreaRatio(points) {
  const hit = points.filter((p) => p.after && p.after.scrollY > EPS).length
  return { hit, total: points.length, ratio: hit / points.length }
}

// ── main ──────────────────────────────────────────────────────────────

async function main() {
  const browserPath = detectBrowser()
  if (browserPath === null) {
    console.error('[wheel-grid] ERROR: no local Edge/Chromium executable found in known install paths:')
    for (const p of EDGE_CANDIDATES) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log(`[wheel-grid] 使用瀏覽器：${browserPath}`)
  console.log(`[wheel-grid] proto URL：${FILE_URL}`)
  console.log(`[wheel-grid] headless=${!HEADED}`)

  rmSync(SCRATCH_ROOT, { recursive: true, force: true })
  mkdirSync(SCRATCH_ROOT, { recursive: true })

  const results = []
  for (const overscrollConfig of ['O1', 'O2', 'O3']) {
    console.log(`\n[wheel-grid] === 組態 ${overscrollConfig} ===`)
    const r = await runConfig(browserPath, overscrollConfig)
    results.push(r)

    for (const state of ['P1', 'P2']) {
      const { hit, total, ratio } = hitAreaRatio(r.wheelResults[state])
      console.log(`  ${state}：可捲命中 ${hit}/${total}（${(ratio * 100).toFixed(1)}%）`)
      for (const p of r.wheelResults[state]) {
        if (p.error) {
          console.log(`    [${p.point.padEnd(11)}] ERROR: ${p.error}`)
          continue
        }
        console.log(
          `    [${p.point.padEnd(11)}] hit=${String(p.hitElement).padEnd(20)} attribution=${p.attribution.label.padEnd(6)} dPage=${p.attribution.dPage.toFixed(1)} dCat=${p.attribution.dCat.toFixed(1)} dList=${p.attribution.dList.toFixed(1)}`,
        )
      }
    }

    console.log('  鍵盤側：')
    for (const k of r.keyboardResults) {
      if (k.error) {
        console.log(`    [${k.focus}] key=${k.key} ERROR: ${k.error}`)
        continue
      }
      console.log(
        `    [${k.focus}] key=${k.key.padEnd(9)} active=${String(k.activeElement).padEnd(20)} attribution=${k.attribution.label.padEnd(6)} dPage=${k.attribution.dPage.toFixed(1)} dCat=${k.attribution.dCat.toFixed(1)} dList=${k.attribution.dList.toFixed(1)}`,
      )
    }
  }

  console.log('\n=== SUMMARY（可捲命中面積） ===')
  for (const r of results) {
    for (const state of ['P1', 'P2']) {
      const { hit, total, ratio } = hitAreaRatio(r.wheelResults[state])
      console.log(`  ${r.overscrollConfig} / ${state}：${hit}/${total}（${(ratio * 100).toFixed(1)}%）${ratio >= 0.3 ? 'PASS(>=30%)' : 'FAIL(<30%)'}`)
    }
  }

  console.log('\n=== FULL EVIDENCE (JSON) ===')
  console.log(JSON.stringify(results, null, 2))
}

await main()
