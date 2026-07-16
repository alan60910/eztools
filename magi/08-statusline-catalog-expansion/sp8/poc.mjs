#!/usr/bin/env node
// S8 PoC (T1.5) — 零新依賴 CDP 全鏈：Edge --remote-debugging-port →
// fetch /json/version → 內建 global WebSocket → Page.navigate →
// Input.setInterceptDrags → 合成拖曳 → headed vs headless flake 率量測。
// 純 Node ≥22 內建 API：node:child_process、node:fs、node:timers/promises、
// global fetch、global WebSocket。零 npm 依賴（詳見 REPORT.md「依賴宣告」）。
//
// 執行：node magi/08-statusline-catalog-expansion/sp8/poc.mjs
// 副作用：一次 `npm run build`、背景起停一個 `npm run preview`、Windows 下
// 反覆開關 msedge.exe headed 視窗（預設 10 輪）。找不到 Edge → 印明確 skip
// 訊息、exit 0（不算失敗）。已知限制：`taskkill /T /F` 無法保證清掉 Edge
// 分離出的輔助行程（如 crashpad handler）——main() 結尾另跑一次 PowerShell
// 掃尾（sweepOrphanEdge），見 REPORT.md「已知限制與風險」。
//
// 結果只印到 stdout（JSON 摘要見尾端 `=== SUMMARY ===`），REPORT.md 由本輪
// 實測輸出人工轉譯，不由本腳本自動產生。

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const SCRATCH_ROOT = 'C:\\Users\\alan6\\AppData\\Local\\Temp\\claude\\E--program-git-eztools\\8556bc45-c5a3-446d-82c4-2128f935a496\\scratchpad\\sp8-profiles'

const HEADED_ROUNDS = Number.parseInt(process.env.SP8_HEADED_ROUNDS ?? '10', 10)
const HEADLESS_ROUNDS = Number.parseInt(process.env.SP8_HEADLESS_ROUNDS ?? '10', 10)
const EXTRA_ROUNDS = Number.parseInt(process.env.SP8_EXTRA_ROUNDS ?? '3', 10)

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe') : null,
].filter((p) => p !== null)

const ALL_SEGMENT_IDS = [
  'model', 'cwd', 'project-dir', 'output-style', 'version', 'cost', 'duration',
  'lines-changed', 'context-size', 'thinking', 'context-used', 'context-remaining',
  'rate-5h', 'rate-7d', 'session-name', 'effort', 'vim-mode', 'agent-name', 'pr',
  'repo', 'worktree', 'worktree-branch', 'git-branch', 'git-dirty', 'clock',
]

// ── Edge 探測 ──────────────────────────────────────────────────────────

function detectEdge() {
  for (const p of EDGE_CANDIDATES) {
    if (existsSync(p)) return p
  }
  return null
}

// ── vite preview 生命週期 ──────────────────────────────────────────────

function buildOnce() {
  console.log('[poc] npm run build ...')
  // Windows: npm resolves to npm.cmd, a batch file — spawn(Sync) requires
  // shell:true to invoke .cmd directly (plain spawn throws EINVAL).
  const result = spawnSync('npm', ['run', 'build'], { cwd: REPO_ROOT, stdio: 'inherit', shell: true })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`npm run build failed (exit ${result.status})`)
  }
}

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

function startPreview() {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn('npm', ['run', 'preview'], { cwd: REPO_ROOT, shell: true })
    let resolved = false
    let buf = ''
    const onData = (chunk) => {
      buf += stripAnsi(chunk.toString())
      const m = buf.match(/Local:\s+(http:\/\/localhost:\d+)\//)
      if (m && !resolved) {
        resolved = true
        resolvePromise({ proc, baseUrl: m[1] })
      }
    }
    proc.stdout.on('data', onData)
    proc.stderr.on('data', onData)
    proc.on('exit', (code) => {
      if (!resolved) reject(new Error(`vite preview exited early (code ${code}); output so far: ${buf}`))
    })
    setTimeout(() => {
      if (!resolved) reject(new Error(`timed out waiting for vite preview URL; output so far: ${buf}`))
    }, 15000)
  })
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

/**
 * 最終掃尾（PoC 期間實測發現：`taskkill /PID <pid> /T /F` 未必能清掉
 * Chromium 分離出的輔助行程，如 crashpad handler——這類行程刻意不在 OS
 * 記錄的親子關係樹內，故 /T 找不到，會在多輪 headed 測試後累積、拖慢
 * 後續輪次，詳見 REPORT.md）：以 command line 是否含本次 SCRATCH_ROOT
 * 路徑為準，逐一強制關閉殘留的 msedge.exe——只掃「本次 PoC 開出的」
 * profile，不動使用者自己開著的 Edge 視窗。僅 best-effort，靜默失敗。
 */
function sweepOrphanEdge() {
  if (process.platform !== 'win32') return
  const marker = 'sp8-profiles'
  const script = `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${marker}') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
  spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'ignore' })
}

// ── CDP 基礎設施（沿用 sprint 07 scratchpad 底本手法） ────────────────

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

function launchEdge(edgePath, { headless, userDataDir, url, port }) {
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
  ]
  if (headless) {
    args.push('--headless=new')
  } else {
    // 挪到主螢幕右下角外側，減少對操作者前景視窗的干擾；不影響
    // getBoundingClientRect（皆為 viewport 相對座標，與視窗實際螢幕位置無關）。
    args.push('--window-position=2400,50', '--window-size=1400,1000')
  }
  args.push(url)
  return spawn(edgePath, args, { stdio: 'ignore' })
}

function seedExpr(enabledRows) {
  return `
    (() => {
      const enabled = ${JSON.stringify(enabledRows)};
      const ALL = ${JSON.stringify(ALL_SEGMENT_IDS)};
      const segments = ALL.map((id) => enabled[id] !== undefined
        ? { id, enabled: true, icon: true, color: { kind: 'default' }, row: enabled[id] }
        : { id, enabled: false, icon: true, color: { kind: 'default' } });
      const config = { version: 2, mode: 'plain', separator: { kind: 'preset', value: '|' }, lastArrowCap: true, powerlineArrow: false, segments };
      localStorage.setItem('eztools:statusline-builder:config', JSON.stringify(config));
      return 'seeded';
    })()
  `
}

// ── 幾何輔助（跨列情境教訓：每段的完整控件列很高，3 列即可超出任何合理
// 固定 viewport；drop 前必須先把來源／目標元素捲入視野，且 scrollIntoView
// 須帶 behavior:'instant'——否則預設/CSS smooth 捲動是非同步動畫，
// 緊接著同一 evaluate 內讀到的 getBoundingClientRect 會是捲動前的舊值）──

function gripPointExpr(segmentId) {
  return `(() => { const li = document.querySelector('li.segment-row[data-segment-id=${JSON.stringify(segmentId)}]'); const grip = li.querySelector('.segment-row__grip'); grip.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); const r = grip.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`
}

function liPointExpr(segmentId, verticalFrac) {
  return `(() => { const li = document.querySelector('li.segment-row[data-segment-id=${JSON.stringify(segmentId)}]'); li.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); const r = li.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height * ${verticalFrac}) }; })()`
}

// ── 情境定義 ───────────────────────────────────────────────────────────

// A. 多列拖曳基本盤之一：同列相鄰兩段交換（drag）。
const scenarioSameRowSwap = {
  name: 'same-row-swap',
  seed: { model: 0, cost: 0 },
  async run({ evaluate, dragBySelector }) {
    const before = await evaluate(
      `[...document.querySelectorAll('#segment-row-groups .segment-list')[0].querySelectorAll('li.segment-row')].map((li) => li.dataset.segmentId)`,
    )
    if (JSON.stringify(before) !== JSON.stringify(['model', 'cost'])) {
      return { ok: false, symptom: `unexpected seed order: ${JSON.stringify(before)}` }
    }
    const dragResult = await dragBySelector(gripPointExpr('cost'), liPointExpr('model', 0.25))
    if (!dragResult.ok) return dragResult
    const after = await evaluate(
      `[...document.querySelectorAll('#segment-row-groups .segment-list')[0].querySelectorAll('li.segment-row')].map((li) => li.dataset.segmentId)`,
    )
    if (JSON.stringify(after) === JSON.stringify(['cost', 'model'])) return { ok: true }
    return { ok: false, symptom: `order after drop: ${JSON.stringify(after)} (expected ["cost","model"])` }
  },
}

// B. 多列拖曳基本盤之二：跨列拖（末列單段拖到前一列，來源列應自動收攏）。
const scenarioCrossRowDrain = {
  name: 'cross-row-drain',
  seed: { model: 0, cost: 1, duration: 2 },
  async run({ evaluate, dragBySelector }) {
    const dragResult = await dragBySelector(gripPointExpr('duration'), liPointExpr('cost', 0.75))
    if (!dragResult.ok) return dragResult
    const snapshot = await evaluate(
      `[...document.querySelectorAll('#segment-row-groups .segment-row-group')].map((g) => [...g.querySelectorAll('li.segment-row')].map((li) => li.dataset.segmentId))`,
    )
    const expected = [['model'], ['cost', 'duration']]
    if (JSON.stringify(snapshot) === JSON.stringify(expected)) return { ok: true }
    return { ok: false, symptom: `rows after drop: ${JSON.stringify(snapshot)} (expected ${JSON.stringify(expected)})` }
  },
}

// C. slots 家族代表案：非拖曳的「顯示於第 N 列」select 指派（S3 型）。
const scenarioSelectMove = {
  name: 'select-move',
  seed: { model: 0, cost: 1 },
  async run({ evaluate, delayFn }) {
    await evaluate(
      `(() => { const li = document.querySelector('li.segment-row[data-segment-id="model"]'); const sel = li.querySelector('select.segment-row__row-select'); sel.value = '1'; sel.dispatchEvent(new Event('change', { bubbles: true })); return sel.value; })()`,
    )
    await delayFn(300)
    const snapshot = await evaluate(
      `[...document.querySelectorAll('#segment-row-groups .segment-row-group')].map((g) => [...g.querySelectorAll('li.segment-row')].map((li) => li.dataset.segmentId))`,
    )
    const expected = [['cost', 'model']]
    if (JSON.stringify(snapshot) === JSON.stringify(expected)) return { ok: true }
    return { ok: false, symptom: `rows after select-move: ${JSON.stringify(snapshot)} (expected ${JSON.stringify(expected)})` }
  },
}

// ── 單輪執行器：全新瀏覽器＋全新 user-data-dir（sprint 07 教訓：單 drag 單 session） ──

let portCounter = 9500

async function runRound({ edgePath, baseUrl, headless, scenario, roundId }) {
  const port = portCounter++
  const userDataDir = join(SCRATCH_ROOT, `edge-${roundId}`)
  const appUrl = `${baseUrl}/tools/statusline-builder/`
  const t0 = Date.now()
  const child = launchEdge(edgePath, { headless, userDataDir, url: appUrl, port })
  let ws
  try {
    await waitForEndpoint(port)
    const target = await waitForPageTarget(port, baseUrl)
    ws = await connectWs(target.webSocketDebuggerUrl)
    const client = makeClient(ws)
    await client.send('Page.enable')
    await client.send('Runtime.enable')
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false })
    await client.send('Input.setInterceptDrags', { enabled: true })

    async function evaluate(expression) {
      const result = await client.send('Runtime.evaluate', { expression, returnByValue: true })
      if (result.exceptionDetails) throw new Error(`evaluate failed: ${JSON.stringify(result.exceptionDetails)}`)
      return result.result.value
    }

    async function navigate() {
      const loaded = client.waitForEvent('Page.loadEventFired')
      await client.send('Page.navigate', { url: appUrl })
      await loaded
      await delay(700)
    }

    // 啟動參數已直接開到 appUrl，此處先等一次載入完成再重跑一次 navigate
    // （下方 seed 後還會再 reload 一次）以確保 headed／headless 起手式一致。
    await navigate()
    await evaluate(seedExpr(scenario.seed))
    await navigate()
    // 頁面側事件探針（失敗徵狀診斷用）：記錄 dragstart/dragend/drop 是否
    // 發生，供「事件流斷在哪」歸因（cdp-seam-drop.mjs 底本手法）。
    await evaluate(`
      (() => {
        window.__ev = [];
        for (const t of ['dragstart', 'dragend', 'drop']) {
          document.addEventListener(t, (e) => {
            const el = e.target instanceof Element ? (e.target.closest('li.segment-row')?.dataset.segmentId ?? (e.target.className || e.target.tagName)) : '?';
            window.__ev.push({ t, on: String(el) });
          }, true);
        }
        return 'instrumented';
      })()
    `)

    function takeIntercepted() {
      const hits = client.eventLog.filter((m) => m.method === 'Input.dragIntercepted')
      client.eventLog.length = 0
      return hits
    }

    async function dragBySelector(fromPointExpr, toPointExpr) {
      const from = await evaluate(fromPointExpr)
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x, y: from.y })
      await delay(50)
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 })
      await delay(60)
      for (let i = 1; i <= 10; i++) {
        await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x + i * 6, y: from.y + i * 3, button: 'left', buttons: 1 })
        await delay(40)
      }
      await delay(300)
      const intercepted = takeIntercepted()
      if (intercepted.length === 0) {
        // 沒建立拖曳 session，仍需釋放滑鼠鍵避免殘留按壓狀態。
        await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: from.x, y: from.y, button: 'left', clickCount: 1 })
        const pageEvents = await evaluate('window.__ev').catch(() => 'n/a')
        return {
          ok: false,
          symptom: `no Input.dragIntercepted (drag session never established); page events: ${JSON.stringify(pageEvents)}`,
        }
      }
      const data = intercepted[0].params.data
      const pt = await evaluate(toPointExpr)
      await client.send('Input.dispatchDragEvent', { type: 'dragEnter', x: pt.x, y: pt.y, data })
      await delay(60)
      await client.send('Input.dispatchDragEvent', { type: 'dragOver', x: pt.x, y: pt.y, data })
      await delay(250)
      // 拖曳中插入點 gap 在指標下生長會改變命中目標：drop 前重查活座標、
      // 補發第二次 dragOver（sprint 07 教訓）。
      const pt2 = await evaluate(toPointExpr)
      await client.send('Input.dispatchDragEvent', { type: 'dragOver', x: pt2.x, y: pt2.y, data })
      await delay(60)
      await client.send('Input.dispatchDragEvent', { type: 'drop', x: pt2.x, y: pt2.y, data })
      await delay(200)
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt2.x, y: pt2.y, button: 'left', clickCount: 1 })
      await delay(300)
      return { ok: true }
    }

    const outcome = await scenario.run({ evaluate, dragBySelector, client, delayFn: delay })
    const durationMs = Date.now() - t0
    return { success: outcome.ok, symptom: outcome.symptom ?? null, durationMs }
  } catch (err) {
    const durationMs = Date.now() - t0
    return { success: false, symptom: String(err && err.message ? err.message : err), durationMs }
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

// ── 主流程 ─────────────────────────────────────────────────────────────

async function runBatch(label, { edgePath, baseUrl, headless, scenario, rounds }) {
  const results = []
  for (let i = 0; i < rounds; i++) {
    const roundId = `${label}-${i}`
    process.stdout.write(`[poc] round ${roundId} ... `)
    const result = await runRound({ edgePath, baseUrl, headless, scenario, roundId })
    results.push(result)
    console.log(`${result.success ? 'PASS' : 'FAIL'} (${result.durationMs}ms)${result.symptom ? ` — ${result.symptom}` : ''}`)
  }
  return results
}

function summarize(label, results) {
  const passCount = results.filter((r) => r.success).length
  const avgMs = Math.round(results.reduce((sum, r) => sum + r.durationMs, 0) / results.length)
  const symptoms = results.filter((r) => !r.success).map((r) => r.symptom)
  return { label, total: results.length, pass: passCount, avgMs, symptoms }
}

async function main() {
  const edgePath = detectEdge()
  if (edgePath === null) {
    console.log('[poc] SKIP: Microsoft Edge executable not found in known install paths:')
    for (const p of EDGE_CANDIDATES) console.log(`  - ${p}`)
    console.log('[poc] Nothing to test — exiting 0 (spike inconclusive, not a failure).')
    process.exit(0)
  }
  console.log(`[poc] Edge found: ${edgePath}`)

  mkdirSync(SCRATCH_ROOT, { recursive: true })

  buildOnce()

  console.log('[poc] starting vite preview ...')
  const { proc: previewProc, baseUrl } = await startPreview()
  console.log(`[poc] preview ready at ${baseUrl}`)

  const summaries = []
  try {
    console.log(`\n=== Flake measurement: ${scenarioSameRowSwap.name} × headed × ${HEADED_ROUNDS} ===`)
    const headedResults = await runBatch('headed', {
      edgePath,
      baseUrl,
      headless: false,
      scenario: scenarioSameRowSwap,
      rounds: HEADED_ROUNDS,
    })
    summaries.push(summarize('headed/same-row-swap', headedResults))

    console.log(`\n=== Flake measurement: ${scenarioSameRowSwap.name} × headless(new) × ${HEADLESS_ROUNDS} ===`)
    const headlessResults = await runBatch('headless', {
      edgePath,
      baseUrl,
      headless: true,
      scenario: scenarioSameRowSwap,
      rounds: HEADLESS_ROUNDS,
    })
    summaries.push(summarize('headless/same-row-swap', headlessResults))

    console.log(`\n=== Coverage cost sample: ${scenarioCrossRowDrain.name} × headless(new) × ${EXTRA_ROUNDS} ===`)
    const crossRowResults = await runBatch('crossrow', {
      edgePath,
      baseUrl,
      headless: true,
      scenario: scenarioCrossRowDrain,
      rounds: EXTRA_ROUNDS,
    })
    summaries.push(summarize('headless/cross-row-drain', crossRowResults))

    console.log(`\n=== Coverage cost sample: ${scenarioSelectMove.name} × headless(new) × ${EXTRA_ROUNDS} ===`)
    const selectMoveResults = await runBatch('selectmove', {
      edgePath,
      baseUrl,
      headless: true,
      scenario: scenarioSelectMove,
      rounds: EXTRA_ROUNDS,
    })
    summaries.push(summarize('headless/select-move', selectMoveResults))
  } finally {
    console.log('\n[poc] stopping vite preview ...')
    killProcessTree(previewProc.pid)
    console.log('[poc] sweeping any orphaned msedge.exe from this run ...')
    sweepOrphanEdge()
    try {
      rmSync(SCRATCH_ROOT, { recursive: true, force: true })
    } catch {
      // best-effort
    }
  }

  console.log('\n=== SUMMARY ===')
  console.log(JSON.stringify(summaries, null, 2))
}

main().catch((err) => {
  console.error('[poc] FATAL', err)
  process.exitCode = 1
})
