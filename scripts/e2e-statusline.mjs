#!/usr/bin/env node
/**
 * CDP 整合案（statusline-builder 多列拖曳／位置制 slots 迴歸網）。
 *
 * 依據 `magi/08-statusline-catalog-expansion/PLAN.md` §D-b（CDP 腳本重建
 * 形態：獨立 node script＋`npm run test:e2e`、不進 vitest 預設 gate）與
 * `magi/08-statusline-catalog-expansion/sp8/REPORT.md`（T1.5 PoC 結論）
 * 定案：
 *   - **零新依賴**：Node ≥22 內建 global `fetch`／`WebSocket`／
 *     `node:child_process` 足以完成 CDP 全鏈，不需
 *     `chrome-remote-interface`／`puppeteer-core` 等套件。
 *   - **headless(new) 為預設執行形態**（`E2E_HEADED=1` 可切 headed 供
 *     人工除錯——PoC 實測 headed 耗時不可預期、曾見單輪暴增十餘倍，
 *     不建議常態使用）。
 *   - **逐案全新瀏覽器＋全新 `--user-data-dir`**（sprint 07「單 drag 單
 *     browser session」教訓：同 session 第二次拖曳的合成 drop 管線不
 *     穩，故每案皆重啟一個全新 `msedge.exe` 行程）。
 *   - 座標計算一律先 `element.scrollIntoView({behavior:'instant'})`
 *     再讀 `getBoundingClientRect()`（PoC 實測：≥3 列版面下段控件列
 *     加總高度遠超任何固定 viewport，不捲入視野會導致
 *     `Input.dragIntercepted` 永遠不發生——behavior 必須是 'instant'，
 *     smooth 捲動是非同步動畫，同一次 `Runtime.evaluate` 內緊接著讀到
 *     的 rect 仍是捲動前的舊值）。
 *   - `spawn`／`spawnSync` 呼叫 `npm`（Windows 上為 `npm.cmd`）一律帶
 *     `{ shell: true }`（純 spawn 直接丟 `EINVAL`）。
 *   - `vite preview` 自起自收：起時解析其自報的實際埠（vite 埠衝突時
 *     自動找下一個可用埠，本腳本不用自己防撞，只需正確剝除 ANSI
 *     escape 後解析輸出）；跑完 `taskkill /T /F` 整條行程樹。
 *
 * 涵蓋清單（使用者依 sp8/REPORT.md 核可的五案；底本＝
 * `magi/08-statusline-catalog-expansion/sp8/poc.mjs`（same-row-swap 原型）
 * ＋ sprint 07 scratchpad `cdp-slots.mjs`（S1–S9 位置制 slots 情境定義，
 * 本機若尚存可對照，未簽入 repo）：
 *   1. 同列交換拖曳（多列拖曳基本盤）。
 *   2. S1：跨列拖 drain——唯一段拖離、來源列原地保留為空占位列
 *      （`.segment-pending-row`，非消失）。
 *   3. S4：select 先排空一列（變 pending）、再把另一段用 select 指派
 *      進中間 pending（插入語意最刁鑽的一案：目標 pending 變真實列，
 *      被指派段的原列若因此排空亦轉為新 pending）。
 *   4. S9：drain 後刪除該 pending → 其後真實列編號緊縮重排。
 *   5. S7：drag drain 後 reload——pending 為純 UI 態，不入
 *      `localStorage` 存檔（SPEC：空列不入存檔），reload 後 pending
 *      消失、真實列緊湊重編（本腳本開發期以 CDP 對 dist 建置的真實頁面
 *      實測驗證此行為，與五案清單描述一致，非臆測）。
 *
 * 用法：
 *   node scripts/e2e-statusline.mjs      # 或 npm run test:e2e
 *   E2E_HEADED=1 node scripts/e2e-statusline.mjs   # 人工除錯用 headed
 *
 * 找不到本機 Edge/Chromium → 印明確 skip 訊息、exit 0（不算失敗）。
 * 任一案 FAIL → exit 1；全過 → exit 0。
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const SCRATCH_ROOT = join(tmpdir(), 'eztools-e2e-statusline-profiles')
const HEADED = process.env.E2E_HEADED === '1'

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe') : null,
  // 非 Windows／Chromium 後備路徑（本腳本以 Windows+Edge 為主要開發／
  // 驗證環境，其餘平台路徑列出以求探測完整，未逐一實跑驗證）。
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter((p) => p !== null)

const ALL_SEGMENT_IDS = [
  'model', 'cwd', 'project-dir', 'output-style', 'version', 'cost', 'duration',
  'lines-changed', 'context-size', 'thinking', 'context-used', 'context-remaining',
  'rate-5h', 'rate-7d', 'session-name', 'effort', 'vim-mode', 'agent-name', 'pr',
  'repo', 'worktree', 'worktree-branch', 'git-branch', 'git-dirty', 'clock',
]

// ── 瀏覽器探測 ─────────────────────────────────────────────────────────

function detectBrowser() {
  for (const p of EDGE_CANDIDATES) {
    if (existsSync(p)) return p
  }
  return null
}

// ── vite preview 生命週期 ──────────────────────────────────────────────

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

function ensureBuilt() {
  const marker = join(REPO_ROOT, 'dist', 'tools', 'statusline-builder', 'index.html')
  if (existsSync(marker)) {
    console.log('[e2e] dist/ already built (found tools/statusline-builder/index.html) — skipping build.')
    console.log('[e2e] Run `npm run build` manually first if you want to test a fresh change.')
    return
  }
  console.log('[e2e] dist/ missing — running `npm run build` once ...')
  const result = spawnSync('npm', ['run', 'build'], { cwd: REPO_ROOT, stdio: 'inherit', shell: true })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`npm run build failed (exit ${result.status})`)
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
 * 最終掃尾（sp8 PoC 實測發現：`taskkill /PID <pid> /T /F` 未必能清掉
 * Chromium 分離出的輔助行程，如 crashpad handler——這類行程刻意不在 OS
 * 記錄的親子關係樹內，`/T` 找不到）：以 command line 是否含本次
 * `SCRATCH_ROOT` 路徑片段為準，逐一強制關閉殘留的瀏覽器行程——只掃「本次
 * 腳本開出的」profile，不動使用者自己開著的瀏覽器視窗。僅 best-effort，
 * 靜默失敗（非 Windows 平台略過——`taskkill`／`Get-CimInstance` 皆
 * Windows 專屬，其餘平台的殘留行程清理留待後續需要時再補）。
 */
function sweepOrphanBrowser() {
  if (process.platform !== 'win32') return
  const marker = 'eztools-e2e-statusline-profiles'
  const script = `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${marker}') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
  spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'ignore' })
}

// ── CDP 基礎設施 ───────────────────────────────────────────────────────

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

function launchBrowser(browserPath, { headless, userDataDir, url, port }) {
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
    // 挪到主螢幕外側，減少對操作者前景視窗的干擾；不影響
    // getBoundingClientRect（皆為 viewport 相對座標，與視窗實際螢幕位置無關）。
    args.push('--window-position=2400,50', '--window-size=1400,1000')
  }
  args.push(url)
  return spawn(browserPath, args, { stdio: 'ignore' })
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

// ── 幾何輔助（多列版面下每段控件列很高，任何固定 viewport 都可能不夠；
// drop 前必須先把來源／目標元素捲入視野，且 scrollIntoView 須帶
// behavior:'instant'——見檔頭「零依賴 CDP 全鏈」段落文件）──

function gripPointExpr(segmentId) {
  return `(() => { const li = document.querySelector('li.segment-row[data-segment-id=${JSON.stringify(segmentId)}]'); const grip = li.querySelector('.segment-row__grip'); grip.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); const r = grip.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`
}

function liPointExpr(segmentId, verticalFrac) {
  return `(() => { const li = document.querySelector('li.segment-row[data-segment-id=${JSON.stringify(segmentId)}]'); li.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); const r = li.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height * ${verticalFrac}) }; })()`
}

// 全列群組快照（真實列＋pending 占位，DOM 序＝slot 序）；S1/S4/S9/S7 皆用
// 此比對，heading（顯示編號「第 N 列」）一併納入比對，因為「編號隨
// slots 變動重排」本身就是這幾案要守住的不變量之一。
const SNAPSHOT_EXPR = `
  [...document.querySelectorAll('#segment-row-groups > *')].map((el) => {
    const heading = el.querySelector('.segment-section__heading')?.textContent?.trim() ?? '?';
    if (el.classList.contains('segment-pending-row')) return { kind: 'pending', heading };
    return { kind: 'real', heading, segs: [...el.querySelectorAll('li.segment-row')].map((li) => li.dataset.segmentId) };
  })
`

// ── 五案定義 ───────────────────────────────────────────────────────────

// 1. 多列拖曳基本盤：同列相鄰兩段拖曳互換順序。
const caseSameRowSwap = {
  id: 'same-row-swap',
  label: '同列交換拖曳（基本盤）',
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

// 2. S1：跨列拖 drain——唯一段拖離、來源列原地保留為空占位列（非消失）。
const caseS1CrossRowDrain = {
  id: 's1-cross-row-drain',
  label: 'S1：跨列拖 drain（來源列保留為空占位列）',
  seed: { model: 0, cost: 1, duration: 2 },
  async run({ evaluate, dragBySelector }) {
    const dragResult = await dragBySelector(gripPointExpr('duration'), liPointExpr('cost', 0.75))
    if (!dragResult.ok) return dragResult
    const snapshot = await evaluate(SNAPSHOT_EXPR)
    const expected = [
      { kind: 'real', heading: '第 1 列', segs: ['model'] },
      { kind: 'real', heading: '第 2 列', segs: ['cost', 'duration'] },
      { kind: 'pending', heading: '第 3 列' },
    ]
    if (JSON.stringify(snapshot) === JSON.stringify(expected)) return { ok: true }
    return { ok: false, symptom: `snapshot after drop: ${JSON.stringify(snapshot)} (expected ${JSON.stringify(expected)})` }
  },
}

// 3. S4：select 先排空一列（變 pending）、再把另一段 select 指派進中間
//    pending（目標 pending 變真實列；被指派段的原列若因此排空亦轉為新
//    pending——見檔頭文件，本行為已用 CDP 對真實建置頁面實測確認）。
const caseS4SelectIntoMiddlePending = {
  id: 's4-select-into-middle-pending',
  label: 'S4：select 排空後再 select 指派進中間 pending',
  seed: { model: 0, cost: 1, duration: 2 },
  async run({ evaluate, selectMove }) {
    // step 1：model（slot0 唯一段）select 到 duration 的列（slot2）→ slot0 排空.
    await selectMove('model', 2)
    const mid = await evaluate(SNAPSHOT_EXPR)
    const expectedMid = [
      { kind: 'pending', heading: '第 1 列' },
      { kind: 'real', heading: '第 2 列', segs: ['cost'] },
      { kind: 'real', heading: '第 3 列', segs: ['duration', 'model'] },
    ]
    if (JSON.stringify(mid) !== JSON.stringify(expectedMid)) {
      return { ok: false, symptom: `snapshot after step1 (drain via select): ${JSON.stringify(mid)} (expected ${JSON.stringify(expectedMid)})` }
    }
    // step 2：cost（slot1 唯一段）select 指派進 slot0 的 pending。
    await selectMove('cost', 0)
    const after = await evaluate(SNAPSHOT_EXPR)
    const expected = [
      { kind: 'real', heading: '第 1 列', segs: ['cost'] },
      { kind: 'pending', heading: '第 2 列' },
      { kind: 'real', heading: '第 3 列', segs: ['duration', 'model'] },
    ]
    if (JSON.stringify(after) === JSON.stringify(expected)) return { ok: true }
    return { ok: false, symptom: `snapshot after step2 (assign into pending): ${JSON.stringify(after)} (expected ${JSON.stringify(expected)})` }
  },
}

// 4. S9：drain 後刪除該 pending → 其後真實列編號緊縮重排。
const caseS9DeletePendingRenumber = {
  id: 's9-delete-pending-renumber',
  label: 'S9：刪除 pending 後真實列編號重排',
  seed: { model: 0, cost: 1, duration: 2 },
  async run({ evaluate, selectMove, delayFn }) {
    // drain model（slot0 唯一段）到 duration 的列（slot2）→ slot0 變 pending.
    await selectMove('model', 2)
    const mid = await evaluate(SNAPSHOT_EXPR)
    if (mid[0]?.kind !== 'pending') {
      return { ok: false, symptom: `expected slot0 pending after drain, got: ${JSON.stringify(mid)}` }
    }
    // 點該 pending 的刪除鈕（免確認，見 main.ts wirePendingRowButton 文件）。
    await evaluate(`
      (() => {
        const p = document.querySelector('.segment-pending-row');
        p.querySelector('button').click();
        return 'clicked';
      })()
    `)
    await delayFn(300)
    const after = await evaluate(SNAPSHOT_EXPR)
    const expected = [
      { kind: 'real', heading: '第 1 列', segs: ['cost'] },
      { kind: 'real', heading: '第 2 列', segs: ['duration', 'model'] },
    ]
    if (JSON.stringify(after) === JSON.stringify(expected)) return { ok: true }
    return { ok: false, symptom: `snapshot after deleting pending: ${JSON.stringify(after)} (expected ${JSON.stringify(expected)})` }
  },
}

// 5. S7：drag drain 後 reload——pending 為純 UI 態，不入存檔；reload 後
//    pending 消失、真實列緊湊重編。
const caseS7DragDrainReload = {
  id: 's7-drag-drain-reload',
  label: 'S7：drag drain 後 reload（pending 不入存檔、真實列緊湊重編）',
  seed: { model: 0, cost: 1, duration: 2 },
  async run({ evaluate, dragBySelector, navigate }) {
    const dragResult = await dragBySelector(gripPointExpr('duration'), liPointExpr('cost', 0.75))
    if (!dragResult.ok) return dragResult
    const mid = await evaluate(SNAPSHOT_EXPR)
    if (mid.length !== 3 || mid[2]?.kind !== 'pending') {
      return { ok: false, symptom: `expected 3-slot snapshot with pending at slot2 before reload, got: ${JSON.stringify(mid)}` }
    }
    // SPEC：空列（pending）不入存檔——只有真實啟用段的 row 寫進
    // localStorage；驗證存檔本身也不記錄 pending（非只驗 DOM）。
    const stored = await evaluate(`JSON.parse(localStorage.getItem('eztools:statusline-builder:config')).segments.filter((s) => s.enabled).map((s) => ({ id: s.id, row: s.row }))`)
    const expectedStored = [
      { id: 'model', row: 0 },
      { id: 'cost', row: 1 },
      { id: 'duration', row: 1 },
    ]
    if (JSON.stringify(stored) !== JSON.stringify(expectedStored)) {
      return { ok: false, symptom: `localStorage segments before reload: ${JSON.stringify(stored)} (expected ${JSON.stringify(expectedStored)})` }
    }
    await navigate()
    const after = await evaluate(SNAPSHOT_EXPR)
    const expected = [
      { kind: 'real', heading: '第 1 列', segs: ['model'] },
      { kind: 'real', heading: '第 2 列', segs: ['cost', 'duration'] },
    ]
    if (JSON.stringify(after) === JSON.stringify(expected)) return { ok: true }
    return { ok: false, symptom: `snapshot after reload: ${JSON.stringify(after)} (expected ${JSON.stringify(expected)}, pending must NOT survive reload)` }
  },
}

const CASES = [
  caseSameRowSwap,
  caseS1CrossRowDrain,
  caseS4SelectIntoMiddlePending,
  caseS9DeletePendingRenumber,
  caseS7DragDrainReload,
]

// ── 單案執行器：全新瀏覽器＋全新 user-data-dir ─────────────────────────

let portCounter = 9700

async function runCase({ browserPath, baseUrl, headless, testCase }) {
  const port = portCounter++
  const userDataDir = join(SCRATCH_ROOT, testCase.id)
  const appUrl = `${baseUrl}/tools/statusline-builder/`
  const t0 = Date.now()
  const child = launchBrowser(browserPath, { headless, userDataDir, url: appUrl, port })
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
    await evaluate(seedExpr(testCase.seed))
    await navigate()

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
        return { ok: false, symptom: 'no Input.dragIntercepted (drag session never established)' }
      }
      const data = intercepted[0].params.data
      const pt = await evaluate(toPointExpr)
      await client.send('Input.dispatchDragEvent', { type: 'dragEnter', x: pt.x, y: pt.y, data })
      await delay(60)
      await client.send('Input.dispatchDragEvent', { type: 'dragOver', x: pt.x, y: pt.y, data })
      await delay(250)
      // 拖曳中插入點 gap 在指標下生長會改變命中目標：drop 前重查活座標、
      // 補發第二次 dragOver（sprint 07 教訓，sp8 PoC 沿用）。
      const pt2 = await evaluate(toPointExpr)
      await client.send('Input.dispatchDragEvent', { type: 'dragOver', x: pt2.x, y: pt2.y, data })
      await delay(60)
      await client.send('Input.dispatchDragEvent', { type: 'drop', x: pt2.x, y: pt2.y, data })
      await delay(200)
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt2.x, y: pt2.y, button: 'left', clickCount: 1 })
      await delay(300)
      return { ok: true }
    }

    async function selectMove(segmentId, slotValue) {
      await evaluate(`
        (() => {
          const li = document.querySelector('li.segment-row[data-segment-id=${JSON.stringify(segmentId)}]');
          const sel = li.querySelector('select.segment-row__row-select');
          sel.value = ${JSON.stringify(String(slotValue))};
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return sel.value;
        })()
      `)
      await delay(300)
    }

    const outcome = await testCase.run({ evaluate, dragBySelector, selectMove, navigate, delayFn: delay })
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

async function main() {
  const browserPath = detectBrowser()
  if (browserPath === null) {
    console.log('[e2e] SKIP: no local Edge/Chromium executable found in known install paths:')
    for (const p of EDGE_CANDIDATES) console.log(`  - ${p}`)
    console.log('[e2e] Install Microsoft Edge (or adjust EDGE_CANDIDATES) to run this suite locally.')
    console.log('[e2e] Nothing to test — exiting 0 (browser-less environment, not a failure).')
    process.exit(0)
  }
  console.log(`[e2e] Browser found: ${browserPath}`)
  console.log(`[e2e] Mode: ${HEADED ? 'headed (E2E_HEADED=1)' : 'headless(new) [default]'}`)

  mkdirSync(SCRATCH_ROOT, { recursive: true })

  ensureBuilt()

  console.log('[e2e] starting vite preview ...')
  const { proc: previewProc, baseUrl } = await startPreview()
  console.log(`[e2e] preview ready at ${baseUrl}`)

  const suiteStart = Date.now()
  const results = []
  try {
    for (const testCase of CASES) {
      process.stdout.write(`[e2e] ${testCase.id} — ${testCase.label} ... `)
      const result = await runCase({ browserPath, baseUrl, headless: !HEADED, testCase })
      results.push({ ...result, id: testCase.id, label: testCase.label })
      console.log(`${result.success ? 'PASS' : 'FAIL'} (${result.durationMs}ms)${result.symptom ? ` — ${result.symptom}` : ''}`)
    }
  } finally {
    console.log('\n[e2e] stopping vite preview ...')
    killProcessTree(previewProc.pid)
    console.log('[e2e] sweeping any orphaned browser processes from this run ...')
    sweepOrphanBrowser()
    try {
      rmSync(SCRATCH_ROOT, { recursive: true, force: true })
    } catch {
      // best-effort
    }
  }
  const totalMs = Date.now() - suiteStart

  console.log('\n=== SUMMARY ===')
  for (const r of results) {
    console.log(`  ${r.success ? 'PASS' : 'FAIL'}  ${r.id.padEnd(28)} ${String(r.durationMs).padStart(6)}ms  ${r.label}${r.symptom ? `\n        symptom: ${r.symptom}` : ''}`)
  }
  const passCount = results.filter((r) => r.success).length
  console.log(`\n${passCount}/${results.length} passed — total ${totalMs}ms`)

  process.exitCode = passCount === results.length ? 0 : 1
}

main().catch((err) => {
  console.error('[e2e] FATAL', err)
  process.exitCode = 1
})
