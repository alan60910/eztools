#!/usr/bin/env node
/**
 * T4.4 spike 量測腳本（非生產碼、非測試碼——spike 工件，供
 * `magi/09-statusline-ux-refactor/sp1/T4.4-report.md` 佐證用，簽入 sp1/
 * 依團隊調度指示註明「spike 工件」，不受 SPEC 測試慣例約束）。
 *
 * 沿用 scripts/e2e-statusline.mjs 的 CDP 基建慣例（零依賴、headless
 * Edge、node 內建 fetch/WebSocket、逐 viewport 全新瀏覽器＋
 * user-data-dir）。本腳本只做唯讀量測（getBoundingClientRect／
 * getComputedStyle／screenshot／dialog 開關），不改動任何生產碼路徑。
 *
 * 量測對象：對 `npm run build` 產出的 dist/ 執行 `npm run preview`，
 * 與並行中的 main.ts/index.html（T5.4）原始碼編輯完全隔離。
 *
 * 用法：node magi/09-statusline-ux-refactor/sp1/t44-measure.mjs
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
const SCRATCH_ROOT = join(tmpdir(), 'eztools-t44-spike-profiles')

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
    throw new Error(
      `dist/ missing marker ${marker} — 本 spike 依調度指示須對既有 dist 快照量測，不自行觸發 build（避免踩到並行 T5.4 編輯中間態）。請先手動 npm run build。`,
    )
  }
  console.log('[t44] dist/ marker found — measuring against existing dist snapshot (not rebuilding).')
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
  const marker = 'eztools-t44-spike-profiles'
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

// 3 列 powerline seed（沿用 e2e-statusline.mjs 的 localStorage key 慣例＋
// multirow-golden-configs.ts 的列型態：每列兩段，驗跨列高度堆疊情境）。
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

const SNAPSHOT_EXPR = `
  (() => {
    const band = document.querySelector('#preview-section');
    const bandRect = band.getBoundingClientRect();
    const bandComputed = getComputedStyle(band);
    const rowGroups = [...document.querySelectorAll('[data-testid="row-group"]')];
    const firstRowGroup = rowGroups[0];
    const firstRowGroupRect = firstRowGroup ? firstRowGroup.getBoundingClientRect() : null;
    const catalog = document.querySelector('.builder-columns__catalog');
    const catalogRect = catalog ? catalog.getBoundingClientRect() : null;
    const selected = document.querySelector('.builder-columns__selected');
    const selectedRect = selected ? selected.getBoundingClientRect() : null;
    const globalSection = document.querySelector('#global-section');
    const globalSectionRect = globalSection ? globalSection.getBoundingClientRect() : null;
    const firstSegmentRow = firstRowGroup ? firstRowGroup.querySelector('[data-testid="segment-row"]') : null;
    const firstSegmentRowRect = firstSegmentRow ? firstSegmentRow.getBoundingClientRect() : null;
    const segmentRowsInFirstGroup = firstRowGroup ? firstRowGroup.querySelectorAll('[data-testid="segment-row"]').length : 0;
    const mainEl = document.querySelector('main');
    const mainIsGrid = mainEl ? getComputedStyle(mainEl).display === 'grid' : null;
    return {
      viewportInnerHeight: window.innerHeight,
      viewportInnerWidth: window.innerWidth,
      bandRect: { top: bandRect.top, bottom: bandRect.bottom, height: bandRect.height },
      bandComputedMaxHeightPx: parseFloat(bandComputed.maxHeight),
      rowGroupCount: rowGroups.length,
      firstRowGroupRect: firstRowGroupRect
        ? { top: firstRowGroupRect.top, bottom: firstRowGroupRect.bottom, height: firstRowGroupRect.height }
        : null,
      catalogHeight: catalogRect ? catalogRect.height : null,
      selectedTop: selectedRect ? selectedRect.top : null,
      globalSectionRect: globalSectionRect
        ? { top: globalSectionRect.top, bottom: globalSectionRect.bottom, height: globalSectionRect.height }
        : null,
      firstSegmentRowHeight: firstSegmentRowRect ? firstSegmentRowRect.height : null,
      segmentRowsInFirstGroup,
      mainIsGrid,
    };
  })()
`

async function withPage({ browserPath, appUrl, width, height, mobile, profileId }, fn) {
  const port = 9800 + Math.floor(Math.random() * 500)
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
    await client.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile,
    })

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

    return await fn({ client, evaluate, navigate, screenshot })
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
  return withPage(
    { browserPath, appUrl, width, height, mobile, profileId: `viewport-${width}x${height}` },
    async ({ evaluate, screenshot }) => {
      const snapshot = await evaluate(SNAPSHOT_EXPR)
      if (screenshotPath) await screenshot(screenshotPath)
      const pct = (snapshot.bandRect.height / snapshot.viewportInnerHeight) * 100
      const bandOk = snapshot.bandRect.height <= 0.4 * snapshot.viewportInnerHeight
      const rowVisible = snapshot.firstRowGroupRect !== null && snapshot.firstRowGroupRect.bottom <= snapshot.viewportInnerHeight
      return { label, width, height, snapshot, pct, bandOk, rowVisible }
    },
  )
}

async function measureDialog({ browserPath, appUrl }) {
  return withPage(
    { browserPath, appUrl, width: 1280, height: 800, mobile: false, profileId: 'dialog-test' },
    async ({ client, evaluate }) => {
      const results = {}

      // 1) 開啟：click 開鈕 → dialog open 屬性、焦點落於 #copy-bash。
      await evaluate(`document.querySelector('#output-dialog-open').click()`)
      await delay(200)
      const afterOpen = await evaluate(`
        (() => {
          const d = document.querySelector('#output-dialog');
          return {
            hasOpenAttr: d.hasAttribute('open'),
            usedShowModal: typeof d.showModal === 'function',
            matchesModal: (() => { try { return d.matches(':modal') } catch { return null } })(),
            activeIsCopyBash: document.activeElement === document.querySelector('#copy-bash'),
            activeElementId: document.activeElement ? document.activeElement.id : null,
          };
        })()
      `)
      results.open = afterOpen

      // 2) Esc：dispatch 真實鍵盤事件（非 JS 合成 close()），驗證原生
      //    modal dialog 的 cancel→close 語意是否觸發＋焦點還原。
      await client.send('Input.dispatchKeyEvent', {
        type: 'keyDown',
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27,
        nativeVirtualKeyCode: 27,
      })
      await client.send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: 'Escape',
        code: 'Escape',
        windowsVirtualKeyCode: 27,
        nativeVirtualKeyCode: 27,
      })
      await delay(200)
      const afterEsc = await evaluate(`
        (() => {
          const d = document.querySelector('#output-dialog');
          return {
            hasOpenAttr: d.hasAttribute('open'),
            activeElementId: document.activeElement ? document.activeElement.id : null,
          };
        })()
      `)
      results.afterEsc = afterEsc

      // 3) 重開，測 backdrop click（點擊視窗角落，落在 dialog 元素本身
      //    ::backdrop 範圍、非任何子元素）。
      await evaluate(`document.querySelector('#output-dialog-open').click()`)
      await delay(200)
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 })
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 5, y: 5, button: 'left', buttons: 1, clickCount: 1 })
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 5, y: 5, button: 'left', clickCount: 1 })
      await delay(200)
      const afterBackdrop = await evaluate(`
        (() => {
          const d = document.querySelector('#output-dialog');
          return {
            hasOpenAttr: d.hasAttribute('open'),
            activeElementId: document.activeElement ? document.activeElement.id : null,
          };
        })()
      `)
      results.afterBackdropClick = afterBackdrop

      // 4) 重開，測顯式「關閉」鈕。
      await evaluate(`document.querySelector('#output-dialog-open').click()`)
      await delay(200)
      await evaluate(`document.querySelector('#output-dialog-close').click()`)
      await delay(200)
      const afterCloseBtn = await evaluate(`
        (() => {
          const d = document.querySelector('#output-dialog');
          return {
            hasOpenAttr: d.hasAttribute('open'),
            activeElementId: document.activeElement ? document.activeElement.id : null,
          };
        })()
      `)
      results.afterCloseButton = afterCloseBtn

      return results
    },
  )
}

async function main() {
  const browserPath = detectBrowser()
  if (browserPath === null) {
    console.log('[t44] SKIP: no local Edge/Chromium executable found.')
    process.exit(0)
  }
  console.log(`[t44] Browser found: ${browserPath}`)

  mkdirSync(SCRATCH_ROOT, { recursive: true })
  ensureBuilt()

  console.log('[t44] starting vite preview ...')
  const { proc: previewProc, baseUrl } = await startPreview()
  console.log(`[t44] preview ready at ${baseUrl}`)
  const appUrl = `${baseUrl}/tools/statusline-builder/`

  const report = { viewports: [], dialog: null }

  try {
    const viewports = [
      { label: 'mobile-375x667', width: 375, height: 667, mobile: true, screenshotPath: join(OUT_DIR, 't44-mobile-375x667.png') },
      { label: 'mobile-390x844', width: 390, height: 844, mobile: true, screenshotPath: join(OUT_DIR, 't44-mobile-390x844.png') },
      { label: 'desktop-1280x800', width: 1280, height: 800, mobile: false, screenshotPath: join(OUT_DIR, 't44-desktop-1280x800.png') },
    ]

    for (const vp of viewports) {
      process.stdout.write(`[t44] measuring ${vp.label} ... `)
      const result = await measureViewport({ browserPath, appUrl, ...vp })
      report.viewports.push(result)
      console.log(`band=${result.snapshot.bandRect.height.toFixed(1)}px (${result.pct.toFixed(1)}%) bandOk=${result.bandOk} rowVisible=${result.rowVisible}`)
    }

    console.log('[t44] running dialog compat test (Edge/Chromium) ...')
    report.dialog = await measureDialog({ browserPath, appUrl })
    console.log('[t44] dialog test done:', JSON.stringify(report.dialog, null, 2))
  } finally {
    console.log('[t44] stopping vite preview ...')
    killProcessTree(previewProc.pid)
    sweepOrphanBrowser()
    try {
      rmSync(SCRATCH_ROOT, { recursive: true, force: true })
    } catch {
      // best-effort
    }
  }

  writeFileSync(join(OUT_DIR, 't44-measure-raw.json'), JSON.stringify(report, null, 2))
  console.log('\n=== RAW RESULT WRITTEN to t44-measure-raw.json ===')
  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error('[t44] FATAL', err)
  process.exitCode = 1
})
