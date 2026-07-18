#!/usr/bin/env node
/**
 * micro-fix-2 復測腳本（spike 工件，非生產碼、非測試碼）——沿用
 * t44-measure.mjs 的 CDP 基建（見該檔頭註解），驗證 style.css 兩項
 * micro-fix 落地後，PLAN 已修訂的驗收措辭：「頂帶正下方立即可見已選擇
 * 欄起始（列群組標題＋首段控件起始）」——不再要求整個列群組完整可見
 * （見 T4.4-report.md 建議 1 已被採納修訂）。
 *
 * 量測對象：對本次 micro-fix 後重新 `npm run build` 的 dist/ 快照跑
 * `npm run preview`。
 *
 * 用法：node magi/09-statusline-ux-refactor/sp1/t44b-retest.mjs
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..', '..')
const OUT_DIR = __dirname
const SCRATCH_ROOT = join(tmpdir(), 'eztools-t44b-retest-profiles')

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

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

function ensureBuilt() {
  const marker = join(REPO_ROOT, 'dist', 'tools', 'statusline-builder', 'index.html')
  if (!existsSync(marker)) {
    throw new Error(`dist/ missing marker ${marker} — 請先手動 npm run build（micro-fix-2 後的 style.css 需先進 dist）。`)
  }
  console.log('[t44b] dist/ marker found — measuring against existing dist snapshot (not rebuilding).')
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

function sweepOrphanBrowser() {
  if (process.platform !== 'win32') return
  const marker = 'eztools-t44b-retest-profiles'
  const script = `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${marker}') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
  spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'ignore' })
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

function launchBrowser(browserPath, { userDataDir, url, port }) {
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--headless=new',
    url,
  ]
  return spawn(browserPath, args, { stdio: 'ignore' })
}

// 沿用 t44-measure.mjs 的 3 列 powerline seed（同一情境，橫向可比）。
function seedExpr() {
  const config = {
    version: 2,
    mode: 'powerline',
    separator: { kind: 'preset', value: '|' },
    lastArrowCap: true,
    powerlineArrow: true,
    segments: [
      { id: 'model', enabled: true, icon: true, color: { kind: 'default' }, row: 0 },
      { id: 'cwd', enabled: true, icon: true, color: { kind: 'default' }, row: 0 },
      { id: 'cost', enabled: true, icon: true, color: { kind: 'default' }, row: 1 },
      { id: 'duration', enabled: true, icon: true, color: { kind: 'default' }, row: 1 },
      { id: 'context-used', enabled: true, icon: true, color: { kind: 'default' }, row: 2 },
      { id: 'rate-5h', enabled: true, icon: true, color: { kind: 'default' }, row: 2 },
    ],
  }
  return `(() => { localStorage.setItem('eztools:statusline-builder:config', ${JSON.stringify(JSON.stringify(config))}); return 'seeded'; })()`
}

// 修訂驗收措辭：「頂帶正下方立即可見已選擇欄起始（列群組標題＋首段控件
// 起始）」——量測 selected 欄本身 top、第一個列群組 heading-row 的 top/
// bottom、第一個 segment-row 的 top（非要求整段 bottom 可見，呼應
// T4.4-report.md 建議 1 修訂後的驗收句）。同時保留 catalogHeight／
// mainIsGrid／order 生效與否的診斷欄位，供對照 T4.4 原始數據。
const SNAPSHOT_EXPR = `
  (() => {
    const band = document.querySelector('#preview-section');
    const bandRect = band.getBoundingClientRect();
    const selected = document.querySelector('.builder-columns__selected');
    const selectedRect = selected ? selected.getBoundingClientRect() : null;
    const catalog = document.querySelector('.builder-columns__catalog');
    const catalogRect = catalog ? catalog.getBoundingClientRect() : null;
    const rowGroups = [...document.querySelectorAll('[data-testid="row-group"]')];
    const firstRowGroup = rowGroups[0];
    const firstRowGroupRect = firstRowGroup ? firstRowGroup.getBoundingClientRect() : null;
    const headingRow = firstRowGroup ? firstRowGroup.querySelector('.segment-row-group__heading-row') : null;
    const headingRowRect = headingRow ? headingRow.getBoundingClientRect() : null;
    const firstSegmentRow = firstRowGroup ? firstRowGroup.querySelector('[data-testid="segment-row"]') : null;
    const firstSegmentRowRect = firstSegmentRow ? firstSegmentRow.getBoundingClientRect() : null;
    const mainEl = document.querySelector('main');
    const mainIsFlex = mainEl ? getComputedStyle(mainEl).display === 'flex' : null;
    const catalogOrder = catalog ? getComputedStyle(catalog).order : null;
    const selectedOrder = selected ? getComputedStyle(selected).order : null;
    return {
      viewportInnerHeight: window.innerHeight,
      viewportInnerWidth: window.innerWidth,
      bandRect: { top: bandRect.top, bottom: bandRect.bottom, height: bandRect.height },
      selectedRect: selectedRect ? { top: selectedRect.top, bottom: selectedRect.bottom } : null,
      catalogRect: catalogRect ? { top: catalogRect.top, bottom: catalogRect.bottom } : null,
      firstRowGroupRect: firstRowGroupRect
        ? { top: firstRowGroupRect.top, bottom: firstRowGroupRect.bottom, height: firstRowGroupRect.height }
        : null,
      headingRowRect: headingRowRect
        ? { top: headingRowRect.top, bottom: headingRowRect.bottom }
        : null,
      firstSegmentRowRect: firstSegmentRowRect
        ? { top: firstSegmentRowRect.top, bottom: firstSegmentRowRect.bottom }
        : null,
      mainIsFlex,
      catalogOrder,
      selectedOrder,
    };
  })()
`

async function withPage({ browserPath, appUrl, width, height, mobile, profileId }, fn) {
  const port = 9900 + Math.floor(Math.random() * 500)
  const userDataDir = join(SCRATCH_ROOT, profileId)
  const child = launchBrowser(browserPath, { userDataDir, url: appUrl, port })
  let ws
  try {
    await waitForEndpoint(port)
    const target = await waitForPageTarget(port, appUrl.split('/tools')[0])
    ws = await connectWs(target.webSocketDebuggerUrl)
    const client = makeClient(ws)
    await client.send('Page.enable')
    await client.send('Runtime.enable')
    await client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })

    async function evaluate(expression) {
      const result = await client.send('Runtime.evaluate', { expression, returnByValue: true })
      if (result.exceptionDetails) throw new Error(`evaluate failed: ${JSON.stringify(result.exceptionDetails)}`)
      return result.result.value
    }

    async function navigate() {
      await client.send('Page.navigate', { url: appUrl })
      await delay(900)
    }

    async function screenshot(filePath) {
      const { data } = await client.send('Page.captureScreenshot', { format: 'png' })
      writeFileSync(filePath, Buffer.from(data, 'base64'))
    }

    await navigate()
    await evaluate(seedExpr())
    await navigate()
    await delay(300)

    return await fn({ evaluate, screenshot })
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
      // best-effort
    }
  }
}

async function measureViewport({ browserPath, appUrl, width, height, mobile, label, screenshotPath }) {
  return withPage({ browserPath, appUrl, width, height, mobile, profileId: `viewport-${width}x${height}` }, async ({ evaluate, screenshot }) => {
    const snapshot = await evaluate(SNAPSHOT_EXPR)
    if (screenshotPath) await screenshot(screenshotPath)
    const bandOk = snapshot.bandRect.height <= 0.4 * snapshot.viewportInnerHeight
    // 修訂驗收：已選擇欄起始（top）、列群組標題列、首段控件起始（top）
    // 皆在頂帶正下方立即可見（不要求整段 bottom 可見）。
    const selectedStartVisible = snapshot.selectedRect !== null && snapshot.selectedRect.top <= snapshot.viewportInnerHeight
    const headingVisible = snapshot.headingRowRect !== null && snapshot.headingRowRect.top <= snapshot.viewportInnerHeight
    const firstSegmentStartVisible = snapshot.firstSegmentRowRect !== null && snapshot.firstSegmentRowRect.top <= snapshot.viewportInnerHeight
    return { label, width, height, snapshot, bandOk, selectedStartVisible, headingVisible, firstSegmentStartVisible }
  })
}

async function checkDialogDefensiveCss({ browserPath, appUrl }) {
  return withPage({ browserPath, appUrl, width: 1280, height: 800, mobile: false, profileId: 'dialog-css-check' }, async ({ evaluate }) => {
    const beforeOpen = await evaluate(`getComputedStyle(document.querySelector('#output-dialog')).display`)
    await evaluate(`document.querySelector('#output-dialog-open').click()`)
    await delay(200)
    const afterOpen = await evaluate(`getComputedStyle(document.querySelector('#output-dialog')).display`)
    await evaluate(`document.querySelector('#output-dialog-close').click()`)
    await delay(200)
    const afterClose = await evaluate(`getComputedStyle(document.querySelector('#output-dialog')).display`)
    return { beforeOpen, afterOpen, afterClose }
  })
}

async function main() {
  const browserPath = detectBrowser()
  if (browserPath === null) {
    console.log('[t44b] SKIP: no local Edge/Chromium executable found.')
    process.exit(0)
  }
  console.log(`[t44b] Browser found: ${browserPath}`)

  mkdirSync(SCRATCH_ROOT, { recursive: true })
  ensureBuilt()

  console.log('[t44b] starting vite preview ...')
  const { proc: previewProc, baseUrl } = await startPreview()
  console.log(`[t44b] preview ready at ${baseUrl}`)
  const appUrl = `${baseUrl}/tools/statusline-builder/`

  const report = { viewports: [], dialogCss: null }

  try {
    const viewports = [
      { label: 'mobile-375x667', width: 375, height: 667, mobile: true, screenshotPath: join(OUT_DIR, 't44b-mobile-375x667.png') },
      { label: 'mobile-390x844', width: 390, height: 844, mobile: true, screenshotPath: join(OUT_DIR, 't44b-mobile-390x844.png') },
    ]

    for (const vp of viewports) {
      process.stdout.write(`[t44b] measuring ${vp.label} ... `)
      const result = await measureViewport({ browserPath, appUrl, ...vp })
      report.viewports.push(result)
      console.log(
        `bandOk=${result.bandOk} selectedStartVisible=${result.selectedStartVisible} headingVisible=${result.headingVisible} firstSegmentStartVisible=${result.firstSegmentStartVisible}`,
      )
    }

    console.log('[t44b] checking dialog:not([open]) defensive CSS rule (real Chromium computed style) ...')
    report.dialogCss = await checkDialogDefensiveCss({ browserPath, appUrl })
    console.log(`[t44b] dialog CSS check: ${JSON.stringify(report.dialogCss)}`)
  } finally {
    console.log('[t44b] stopping vite preview ...')
    killProcessTree(previewProc.pid)
    sweepOrphanBrowser()
    try {
      rmSync(SCRATCH_ROOT, { recursive: true, force: true })
    } catch {
      // best-effort
    }
  }

  writeFileSync(join(OUT_DIR, 't44b-retest-raw.json'), JSON.stringify(report, null, 2))
  console.log('\n=== RAW RESULT WRITTEN to t44b-retest-raw.json ===')
  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error('[t44b] FATAL', err)
  process.exitCode = 1
})
