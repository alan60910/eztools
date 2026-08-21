#!/usr/bin/env node
/**
 * measure-width.mjs — S-j（T1.5，magi/15-statusline-editor-layout/）軌寬與
 * 截斷量測腳本。CDP 基礎設施逐段複製自同目錄 `measure.mjs`（T1.1 底座，
 * 該檔不 export，spike 為拋棄式碼，比照該檔檔頭「允許重複」慣例）；本檔
 * 新增「動態覆寫 `.builder-columns` grid-template-columns」與「逐目錄項
 * `scrollWidth` vs `clientWidth` 截斷判定」兩項本任務專屬邏輯，`measure.mjs`
 * 本身未變更（`git diff` 對 spikes/proto/measure.mjs 為零，本檔為 s-j/
 * 独立新檔）。
 *
 * 只測 m1a 臂（S-j brief 明定：「只用 m1a 臂」），故無 --arm 參數，固定
 * 開 `./m1a.html`（本目錄，即 spikes/s-j/m1a.html 副本，含真實樣例值）。
 *
 * 用法：
 *   node measure-width.mjs --viewport WxH --columns "<grid-template-columns 值>" [--label 任意字串]
 *   node measure-width.mjs --viewport WxH --natural   （max-content 模式，量三欄自然內容寬）
 *
 * 範例：
 *   node measure-width.mjs --viewport 1280x800 --natural
 *   node measure-width.mjs --viewport 1280x800 --columns "1fr 1.6fr 0.9fr" --label "1:1.6:0.9"
 *
 * 輸出：stdout 印一個 JSON 物件（見檔尾 `main()`）。
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
  const out = { viewport: null, columns: null, natural: false, label: null, locale: 'zh-Hant' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--viewport') out.viewport = argv[++i]
    else if (a === '--columns') out.columns = argv[++i]
    else if (a === '--natural') out.natural = true
    else if (a === '--label') out.label = argv[++i]
    else if (a === '--locale') out.locale = argv[++i]
  }
  return out
}

// en locale 段名（`segmentLabel(id, 'en')` 真實輸出，見 S-j-RESULT.md
// 「方法」節的一次性 dump 證據）——樣例值（hint）兩 locale 逐字相同
// （見同節），僅 label 隨 locale 改變；`--locale en` 時於量測前把
// `.catalog-item-mock__name` textContent 換成本表對應值，用以檢驗英文
// label 較寬是否使 hint 可用寬度更緊繃、加劇截斷（brief「取真實樣例值
// 字串（zh-Hant 與 en 兩 locale）」的補充查核，非主量測軸）。
const EN_LABELS = {
  model: 'Model', cwd: 'Current dir', 'project-dir': 'Project dir', 'output-style': 'Output style',
  version: 'Version', cost: 'Cost', duration: 'Duration', 'lines-changed': 'Lines changed',
  'context-size': 'Context size', thinking: 'Thinking mode', 'token-in': 'Tokens in', 'token-out': 'Tokens out',
  'context-used': 'Context used', 'context-remaining': 'Context remaining', 'rate-5h': '5-hour limit',
  'rate-7d': '7-day limit', 'cache-hit': 'Cache hit rate', 'session-name': 'Session name', effort: 'Reasoning effort',
  'vim-mode': 'Vim mode', 'agent-name': 'Agent name', pr: 'PR', repo: 'Repository', worktree: 'Git worktree',
  'worktree-branch': 'Git worktree branch', 'reset-5h': '5-hour limit reset countdown',
  'reset-7d': '7-day limit reset countdown', 'git-branch': 'Git branch', 'git-dirty': 'Git dirty flag', clock: 'Clock',
}

function fail(msg) {
  console.error(`[measure-width] ERROR: ${msg}`)
  console.error(
    '[measure-width] usage: node measure-width.mjs --viewport WxH (--columns "1fr 1.6fr 0.9fr" | --natural) [--label str] [--locale zh-Hant|en]',
  )
  process.exit(1)
}

const args = parseArgs(process.argv.slice(2))
if (!args.viewport) fail('--viewport 為必填，格式 WxH（如 1280x800）')
if (!args.natural && !args.columns) fail('須擇一提供 --columns 或 --natural')

const viewportMatch = /^(\d+)x(\d+)$/.exec(args.viewport)
if (!viewportMatch) fail(`--viewport 格式須為 WxH（如 1280x800），收到：${args.viewport}`)
const VIEWPORT = { width: Number(viewportMatch[1]), height: Number(viewportMatch[2]) }

const HTML_PATH = join(__dirname, 'm1a.html')
if (!existsSync(HTML_PATH)) fail(`找不到 m1a.html：${HTML_PATH}`)
const FILE_URL = pathToFileURL(HTML_PATH).href

// ── 瀏覽器探測（逐字複製自 measure.mjs EDGE_CANDIDATES） ────────────────

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

// ── CDP 基礎設施（逐字複製自 measure.mjs） ───────────────────────────────

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

// debug port：9985–9999 區段（S-j brief 明定，避免與其他並行 lane 撞
// port——其餘 spike 沿用 measure.mjs 的 9800 起隨機偏移，本任務 brief 另
// 指定較窄區段）。
const port = 9985 + Math.floor(Math.random() * 15)

// ── 量測邏輯 ───────────────────────────────────────────────────────────

// 覆寫 .builder-columns 的 grid-template-columns（`--natural` 模式覆寫為
// `max-content max-content max-content`，量三欄自然內容寬；候選比例模式
// 覆寫為 CLI 傳入字面值）。單一 Runtime.evaluate 完成覆寫＋雙 rAF 等版面
// 穩定，回傳量測結果，不寫回檔案（純 runtime style，重新整理即還原）。
const GRID_COLUMNS_VALUE = args.natural ? 'max-content max-content max-content' : args.columns

const EN_LABELS_JSON = JSON.stringify(EN_LABELS)

const SNAPSHOT_EXPR = `
  (async () => {
    const wrapper = document.querySelector('.builder-columns');
    wrapper.style.gridTemplateColumns = ${JSON.stringify(GRID_COLUMNS_VALUE)};
    if (${JSON.stringify(args.locale)} === 'en') {
      const enLabels = ${EN_LABELS_JSON};
      document.querySelectorAll('.catalog-item-mock').forEach((li) => {
        const id = li.getAttribute('data-segment-id');
        const nameEl = li.querySelector('.catalog-item-mock__name');
        if (id && enLabels[id] !== undefined) nameEl.textContent = enLabels[id];
      });
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    function rectOf(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    }

    const catalogItems = Array.from(document.querySelectorAll('.catalog-item-mock')).map((li) => {
      const id = li.getAttribute('data-segment-id');
      const nameEl = li.querySelector('.catalog-item-mock__name');
      const hintEl = li.querySelector('.catalog-item-mock__hint');
      const hintText = hintEl.textContent;
      const itemRect = li.getBoundingClientRect();
      // 逐項機械判定：scrollWidth > clientWidth（+0.5px 容許子像素捨入誤差）
      // 即該項樣例值 hint 觸發 ellipsis 截斷。
      const truncated = hintEl.scrollWidth > hintEl.clientWidth + 0.5;
      return {
        id,
        hintText,
        hintLen: hintText.length,
        itemWidth: itemRect.width,
        nameScrollWidth: nameEl.scrollWidth,
        hintScrollWidth: hintEl.scrollWidth,
        hintClientWidth: hintEl.clientWidth,
        truncated,
      };
    });

    const listNaturalWidths = Array.from(document.querySelectorAll('.segment-row-mock')).map(
      (li) => li.scrollWidth,
    );
    const settingsNaturalWidths = Array.from(
      document.querySelectorAll('.settings-group-mock'),
    ).map((el) => el.scrollWidth);

    return {
      catalogCol: rectOf('.col--catalog'),
      listCol: rectOf('.col--list'),
      settingsCol: rectOf('.col--settings'),
      catalogItems,
      listRowMaxScrollWidth: Math.max(...listNaturalWidths),
      settingsGroupMaxScrollWidth: Math.max(...settingsNaturalWidths),
      catalogTruncatedCount: catalogItems.filter((it) => it.truncated).length,
      catalogTotalCount: catalogItems.length,
    };
  })()
`

async function run() {
  const browserPath = detectBrowser()
  if (browserPath === null) {
    console.error('[measure-width] ERROR: no local Edge/Chromium executable found in known install paths:')
    for (const p of EDGE_CANDIDATES) console.error(`  - ${p}`)
    process.exit(1)
  }

  const userDataDir = join(tmpdir(), 'eztools-sprint15-sj-measure', `${port}-${Date.now()}`)
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

    async function evaluate(expression, awaitPromise = false) {
      const result = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
      if (result.exceptionDetails) {
        throw new Error(`evaluate failed: ${JSON.stringify(result.exceptionDetails)}`)
      }
      return result.result.value
    }

    const loaded = client.waitForEvent('Page.loadEventFired')
    await client.send('Page.navigate', { url: FILE_URL })
    await loaded
    await delay(150)

    const snapshot = await evaluate(SNAPSHOT_EXPR, true)

    return {
      viewport: VIEWPORT,
      mode: args.natural ? 'natural' : 'candidate',
      locale: args.locale,
      label: args.label ?? (args.natural ? 'natural' : args.columns),
      columns: GRID_COLUMNS_VALUE,
      ...snapshot,
    }
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
