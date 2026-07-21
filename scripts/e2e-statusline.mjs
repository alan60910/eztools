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
 * T6.1（magi/09-statusline-ux-refactor/PLAN.md，2026-07-17 使用者核可）
 * 追加兩案，五案→七案：
 *   6. 目錄拖入指定列——真拖曳（`Input.dispatchDragEvent`）觸發
 *      enable-into-target seam（main.ts `commitEnableIntoTarget`）。
 *      `catalog-drag.dom.test.ts` 僅以 jsdom 手工 `MouseEvent` dispatch
 *      驗證邏輯層（無原生 DnD／dataTransfer），本案補上真實瀏覽器拖放
 *      管線的一致性驗證。
 *   7. 產出 dialog 開→複製→Esc 關→焦點還原產出鈕——`Input.dispatchKeyEvent`
 *      注入真實 Esc 按鍵，觸發原生 `<dialog>` 的 cancel→close 鏈路（非
 *      `output-dialog.dom.test.ts` 該檔手工 `dispatchEvent(new
 *      Event('close'))` 模擬的邏輯層驗證），確認 `wireOutputDialog` 的
 *      `close` 監聽器在真實瀏覽器下確實把焦點還原至開鈕。
 *
 * T3.1（magi/13-test-hardening/TASKS.md M3，09 review 缺口——jsdom 層
 * `catalog-drag.dom.test.ts` 僅模擬 DnD、無真機覆蓋「非 inherit 覆寫值 ×
 * 真拖曳」組合）追加一案，七案→八案：
 *   8. 非 inherit 覆寫（色＋variant）× 真 DnD 跨列拖曳存活：`cwd` 段（唯一
 *      三段可設 variant 之一，見 segments.ts CWD_VARIANTS）主色設為
 *      ansi256 索引 3（非 `{kind:'default'}`）＋ variant 設為 `basename`
 *      （非預設 `full`），皆透過真實 DOM 事件（radio/checkbox `.checked`
 *      ＋`change` 事件，比照既有 `selectMove` 手法，非 jsdom 模擬——本腳本
 *      全案皆走真 Chromium）。真拖曳（`dragBySelector`，同案 2/5/6 手法）
 *      把 `cwd` 握把跨列拖至另一列列尾，斷言：(a) UI 控件（色選 mode
 *      radio／ANSI 索引 spinbutton／variant `<select>`）與 localStorage
 *      config 中的覆寫值拖後不變、僅 `row` 變；(b) 產出 bash 腳本（`
 *      #output-bash code`，main.ts `refreshOutputs` 隨每次 `commitConfig`
 *      即時更新，不需開 dialog）內 `cwd` 專屬區塊（`emit-bash.ts`
 *      `emitSegment` 恆以 `# <id>` 起頭、區塊內部行皆不以 `#` 開頭，見
 *      `extractSegmentBlock` 文件）含覆寫指紋（ansi256 fg SGR 字面
 *      `'38;5;3'`＋`basename` variant 專屬 jq `split("[/…` 片段）；拖前拖後
 *      兩份區塊逐字比較——去除多列陣列變數列位尾碼（`texts_N`／`fgs_N`／
 *      `segstart_N`，見 `emit-bash.ts` `pushLine`／`rowSuffix`）後必須逐字
 *      相同（`normalizeRowSuffix`），去除前必須不同（證明列位確實有變、
 *      非恆真空比對）。
 *
 * T4.1／T4.2（magi/14-statusline-ux-round2/TASKS.md；PLAN §D5「拖曳教學」
 * round-2）：三欄版面重排（左＝設定／中＝預覽 sticky／右＝`#list-column`
 * 單一捲動容器，內容序＝教學帶→目錄→已選擇清單，見 index.html T2.1／
 * T2.2 節點註解）後的選擇器／座標校準＋新增兩案，八案→十案：
 *   - **全案明文前置步驟**：`seedExpr` 預設一併 seed 教學帶 dismiss
 *     sentinel（`TUTORIAL_DISMISS_KEY`／`TUTORIAL_DISMISS_SENTINEL`，
 *     從 `tools/statusline-builder/tutorial-band.ts` import，見檔頭
 *     import 處與 `seedExpr` 文件——本腳本零字面重複一份 key/sentinel）
 *     ——每案皆全新 profile，`shouldShowTutorialBand()` fail-open（無
 *     key 即顯示），不 seed 教學帶即擋在段列／目錄之前搶座標。逐案可用
 *     `testCase.seedTutorial: false` 關閉此預設步驟（案 9 用）。既有
 *     案 1–8 選擇器／`data-testid` 錨點與 `scrollIntoView`＋
 *     `getBoundingClientRect` 活座標紀律經實跑校準後**零需求變更**（右欄
 *     單一捲動容器重排未破壞任何錨點）。
 *   9. 「教學帶不擋拖曳」無條件回歸案：`seedTutorial:false` 保留教學帶
 *      可見，驗證同容器內真拖曳（同案 1 same-row-swap 手法）不受阻、
 *      且拖曳手勢本身不誤觸 dismiss（band 拖後仍在場）。
 *   10. mode 切換（plain→powerline）前後 `window.scrollY` 不變：鎖 T3.1
 *      （09-PLAN §D4 回饋 #4）刪除 `segmentListsEl.focus()` 的焦點竊取
 *      回歸——真實滑鼠點擊 powerline radio（CDP `Input.dispatchMouseEvent`
 *      mousePressed→mouseReleased，非 JS `.click()` 方法——校準實跑發現
 *      `.click()` 方法不觸發瀏覽器原生 focus 行為，見 `clickBySelector`
 *      文件；原生 mousedown 才會給 radio 焦點，正是舊 bug 觸發形）。主
 *      判準 `window.scrollY`；若三欄版面下整頁本身因各欄自身
 *      `overflow-y:auto` 而不可捲（`scrollY` 恆 0），後備改捲
 *      `#list-column` 自身 `scrollTop` 為斷言標的（兩判準皆先斷言「捲動
 *      後 >0」防空泛恆真，見案文件）。`document.activeElement` 為選配
 *      斷言。
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

// MAGI review 🟡-2（4 票採納：Node 22.0–22.17 跑本腳本會以隱晦 loader
// 錯誤炸裂——`import '...tutorial-band.ts'` 這種 static import 語句在
// ESM 規範下一律 hoist 到模組頂端求值，早於模組主體內任何一行程式碼，
// 故無法靠「import 之後再檢查版本」防禦；改為 import 前先手動解析
// `process.versions.node`，未達門檻即印友善訊息＋`exit(1)`，通過後才
// 以 top-level await 動態 import 同一份常數出口）。
const [nodeMajorStr, nodeMinorStr] = process.versions.node.split('.')
const nodeMajor = Number(nodeMajorStr)
const nodeMinor = Number(nodeMinorStr)
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 18)) {
  console.error(
    `[e2e] 本腳本需 Node ≥22.18（.ts type stripping 預設啟用）；偵測到 v${process.versions.node}`,
  )
  process.exit(1)
}

// T4.1（magi/14-statusline-ux-round2/TASKS.md；PLAN §D5「e2e seed 步驟應
// import 同一常數，不得字面重複」）：教學帶 dismiss key／sentinel 單一
// 出口——直接 import tools/statusline-builder/tutorial-band.ts（純可抹除
// 語法，無 enum/namespace，可安全 strip）而非在本腳本另行字面複製一份。
// **本依賴需 Node ≥22.18**（type stripping 預設啟用版本；本腳本本機
// 限定、`package.json` engines `>=22`，屬可接受的 dev-only 前提，實測
// 本機 Node v24.10.0 可直接 `import` .ts 檔）——上方版本門檻檢查已通過
// 才會執行到此行，故改為 top-level await 動態 import（而非 static
// import，見上方 MAGI review 🟡-2 註解，static import 的 hoisting 特性
// 使其無法被任何執行期檢查攔在前面）。
const { TUTORIAL_DISMISS_KEY, TUTORIAL_DISMISS_SENTINEL } = await import(
  '../tools/statusline-builder/tutorial-band.ts'
)

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

// T4.1（TASKS.md；14-PLAN §D5）：全案明文前置步驟——除既有 config seed
// 外，預設一併 seed 教學帶 dismiss sentinel（每案皆全新 profile，
// `shouldShowTutorialBand()` fail-open：無 key 即顯示，見
// tutorial-band.ts 檔頭），使既有拖曳/座標案不被教學帶（現與段列同居
// 右欄同一捲動容器）搶走座標或攔截拖曳事件。`dismissTutorial` 預設
// true（= harness 級預設前置步驟）；T4.2 新案「教學帶不擋拖曳」需保留
// 教學帶可見時傳 `false` 關閉本步驟（見 runCase 呼叫處 `testCase.
// seedTutorial`）。key/sentinel 皆從 tutorial-band.ts import（見檔頭），
// 不在此字面重複一份。
function seedExpr(enabledRows, { dismissTutorial = true } = {}) {
  return `
    (() => {
      const enabled = ${JSON.stringify(enabledRows)};
      const ALL = ${JSON.stringify(ALL_SEGMENT_IDS)};
      const segments = ALL.map((id) => enabled[id] !== undefined
        ? { id, enabled: true, icon: true, color: { kind: 'default' }, row: enabled[id] }
        : { id, enabled: false, icon: true, color: { kind: 'default' } });
      const config = { version: 2, mode: 'plain', separator: { kind: 'preset', value: '|' }, lastArrowCap: true, powerlineArrow: false, segments };
      localStorage.setItem('eztools:statusline-builder:config', JSON.stringify(config));
      ${dismissTutorial ? `localStorage.setItem(${JSON.stringify(TUTORIAL_DISMISS_KEY)}, ${JSON.stringify(TUTORIAL_DISMISS_SENTINEL)});` : ''}
      return 'seeded';
    })()
  `
}

// ── 幾何輔助（多列版面下每段控件列很高，任何固定 viewport 都可能不夠；
// drop 前必須先把來源／目標元素捲入視野，且 scrollIntoView 須帶
// behavior:'instant'——見檔頭「零依賴 CDP 全鏈」段落文件）──
//
// T3.5（09-PLAN §D3 e2e 穩定錨點慣例，2026-07-17 拍板）：selector 全數
// 改走 `data-testid`（見 tools/statusline-builder/index.html 模板契約
// 「T3.5」條目與 main.ts 對應寫入點），不再依賴 `li.segment-row`／
// `.segment-row__grip` 等 class 名稱結構路徑——M4 版面重構／M5 i18n 皆
// 不會動搖這些錨點。

function gripPointExpr(segmentId) {
  return `(() => { const li = document.querySelector('[data-testid="segment-row"][data-segment-id=${JSON.stringify(segmentId)}]'); const grip = li.querySelector('[data-testid="segment-grip"]'); grip.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); const r = grip.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`
}

function liPointExpr(segmentId, verticalFrac) {
  return `(() => { const li = document.querySelector('[data-testid="segment-row"][data-segment-id=${JSON.stringify(segmentId)}]'); li.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); const r = li.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height * ${verticalFrac}) }; })()`
}

// T6.1：左欄目錄項（停用段）拖曳起點——落在 `.catalog-item__name`（段名
// 文字）而非 checkbox 本身。main.ts wireCatalogDragAndDrop 的 checkbox
// 命中區豁免僅檢查 `event.target.closest('input, select, button,
// textarea, [role="spinbutton"]')`，`<label>`／文字 span 皆不在排除清單
// 內，故名稱文字節點本就是合法拖曳起點——style.css `.catalog-item`
// `user-select: none` 正是為此互動預先鋪的防選字（見其文件 T3.3 段），
// 非本腳本繞路取巧。
function catalogPointExpr(segmentId) {
  return `(() => { const li = document.querySelector('[data-testid="catalog-item"][data-segment-id=${JSON.stringify(segmentId)}]'); li.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); const name = li.querySelector('.catalog-item__name'); const r = name.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`
}

// T4.2：mode radio 點擊座標——**刻意不**呼叫 `scrollIntoView`（同檔案其餘
// 座標函式「先 scrollIntoView 再讀 rect」活座標紀律的唯一例外，T4.1 校準
// 實跑發現）：案 10 的斷言標的正是「點擊後捲動位置不變」，若座標計算本身
// 先呼叫 `el.scrollIntoView({block:'center'})`，該呼叫依規範對
// `block:'center'` 為**無條件**置中（即使元素已在可視範圍內也會捲動，
// 不像 `block:'nearest'` 僅在需要時才動）——會在測「不變」之前就先動了
// 捲動位置，汙染訊號。改為直接讀當前 `getBoundingClientRect()`：本案種子
// 資料（見案文件）之下，實測全域設定欄的 mode radio 於任一合法捲動位置
// （0–166px，本案版面之全頁最大可捲範圍）皆恆落在 1000px 高 viewport
// 內，故省略 scrollIntoView 不影響座標可點擊性。
function modeRadioClickPointExpr(selector) {
  return `(() => { const el = document.querySelector(${JSON.stringify(selector)}); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`
}

// 全列群組快照（真實列＋pending 占位，DOM 序＝slot 序）；S1/S4/S9/S7 皆用
// 此比對。T3.5：改讀 `data-row-index`（序數屬性，main.ts refreshRowNumbering／
// renderPendingRowContainers 同步維護，語意＝顯示編號）取代原本比對
// heading textContent「第 N 列」——去除 i18n 可見文字依賴（M5 heading
// 文案將可切換語言，屆時文字比對必崩，序數屬性不受影響）。一併納入
// **每列 separator 覆寫狀態**（T1.7 新增控件）：真實列讀
// `.segment-row-group__separator-preset`（data-testid="row-separator-preset"）
// 的 `value`——'inherit'/'preset:X'/'custom' 為程式碼態值、非可見文字，
// 直接讀 DOM 控件值（而非重新推導 localStorage config 的 rowSeparators
// 正規化邏輯）更貼近「使用者實際看到的控件狀態」，且不需複刻
// main.ts refreshRowSeparatorControls 的映射規則於本腳本。pending 列無
// separator 控件，快照物件不含該欄位。
const SNAPSHOT_EXPR = `
  [...document.querySelectorAll('#segment-row-groups [data-testid="row-group"], #segment-row-groups [data-testid="pending-row-group"]')].map((el) => {
    const rowIndex = Number(el.dataset.rowIndex);
    if (el.dataset.testid === 'pending-row-group') return { kind: 'pending', rowIndex };
    const segs = [...el.querySelectorAll('[data-testid="segment-row"]')].map((li) => li.dataset.segmentId);
    const separatorOverride = el.querySelector('[data-testid="row-separator-preset"]')?.value ?? null;
    return { kind: 'real', rowIndex, segs, separatorOverride };
  })
`

// ── 段落區塊擷取（T3.1 新案專用；純字串處理，跑在 Node 端而非瀏覽器內，
// 不需另外進 evaluate） ──
//
// emit-bash.ts `emitSegment` 恆以 `# <id>`（單行，無前後綴）起頭；區塊
// 內部各行（jq 賦值／if-fi／push 陳述式）皆不以 `# ` 起首——僅下一個段的
// `# <nextId>` 或該列收尾的 `# -- row N join --` 會再次以 `# ` 起首（見
// emit-bash.ts emitSegment／groupByRow 檔頭文件），故「找下一個 `# `
// 開頭行」對任一段皆為安全邊界，不需複刻 emit-bash.ts 的分組演算法。

/** 從完整 bash 產出腳本擷取 `segmentId` 專屬區塊；找不到回 null。 */
function extractSegmentBlock(script, segmentId) {
  const lines = script.split('\n')
  const startIdx = lines.findIndex((line) => line === `# ${segmentId}`)
  if (startIdx === -1) return null
  let endIdx = lines.length
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('# ')) {
      endIdx = i
      break
    }
  }
  // 多列展開時，若該段恰為所屬列群組最後一個段，`emitBash` 會在其後補一個
  // 空行（列緩衝迴圈收尾）才輪到下一個 `# ` 開頭行——與該段是否列首/列尾
  // 無關的純結構性尾巴，比較「僅列位差異」前先修剪掉，否則會被誤判為內容
  // 差異（見本案 run() 內註解）。
  const slice = lines.slice(startIdx, endIdx)
  while (slice.length > 0 && slice[slice.length - 1] === '') slice.pop()
  return slice.join('\n')
}

/**
 * 多列展開時，段自身 push 陳述式的陣列變數帶列位尾碼（`texts_0`／`fgs_1`／
 * `segstart_2` 等，見 emit-bash.ts `pushLine`／`rowSuffix`）——這是「同一
 * 段搬到另一列」時腳本區塊唯一應該改變之處。比對「除列位外覆寫值／格式
 * 是否存活」前，先把尾碼正規化掉（統一換成 `_R`），使兩份區塊只在與列位
 * 無關的內容上比較。
 */
function normalizeRowSuffix(block) {
  return block.replace(/(texts|fgs|bgs|segstart)_\d+/g, '$1_R')
}

// ── 五案定義 ───────────────────────────────────────────────────────────

// 1. 多列拖曳基本盤：同列相鄰兩段拖曳互換順序。
const caseSameRowSwap = {
  id: 'same-row-swap',
  label: '同列交換拖曳（基本盤）',
  seed: { model: 0, cost: 0 },
  async run({ evaluate, dragBySelector }) {
    const before = await evaluate(
      `[...document.querySelectorAll('[data-testid="row-group"]')[0].querySelectorAll('[data-testid="segment-row"]')].map((li) => li.dataset.segmentId)`,
    )
    if (JSON.stringify(before) !== JSON.stringify(['model', 'cost'])) {
      return { ok: false, symptom: `unexpected seed order: ${JSON.stringify(before)}` }
    }
    const dragResult = await dragBySelector(gripPointExpr('cost'), liPointExpr('model', 0.25))
    if (!dragResult.ok) return dragResult
    const after = await evaluate(
      `[...document.querySelectorAll('[data-testid="row-group"]')[0].querySelectorAll('[data-testid="segment-row"]')].map((li) => li.dataset.segmentId)`,
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
      { kind: 'real', rowIndex: 1, segs: ['model'], separatorOverride: 'inherit' },
      { kind: 'real', rowIndex: 2, segs: ['cost', 'duration'], separatorOverride: 'inherit' },
      { kind: 'pending', rowIndex: 3 },
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
      { kind: 'pending', rowIndex: 1 },
      { kind: 'real', rowIndex: 2, segs: ['cost'], separatorOverride: 'inherit' },
      { kind: 'real', rowIndex: 3, segs: ['duration', 'model'], separatorOverride: 'inherit' },
    ]
    if (JSON.stringify(mid) !== JSON.stringify(expectedMid)) {
      return { ok: false, symptom: `snapshot after step1 (drain via select): ${JSON.stringify(mid)} (expected ${JSON.stringify(expectedMid)})` }
    }
    // step 2：cost（slot1 唯一段）select 指派進 slot0 的 pending。
    await selectMove('cost', 0)
    const after = await evaluate(SNAPSHOT_EXPR)
    const expected = [
      { kind: 'real', rowIndex: 1, segs: ['cost'], separatorOverride: 'inherit' },
      { kind: 'pending', rowIndex: 2 },
      { kind: 'real', rowIndex: 3, segs: ['duration', 'model'], separatorOverride: 'inherit' },
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
        const p = document.querySelector('[data-testid="pending-row-group"]');
        p.querySelector('[data-testid="pending-row-delete"]').click();
        return 'clicked';
      })()
    `)
    await delayFn(300)
    const after = await evaluate(SNAPSHOT_EXPR)
    const expected = [
      { kind: 'real', rowIndex: 1, segs: ['cost'], separatorOverride: 'inherit' },
      { kind: 'real', rowIndex: 2, segs: ['duration', 'model'], separatorOverride: 'inherit' },
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
      { kind: 'real', rowIndex: 1, segs: ['model'], separatorOverride: 'inherit' },
      { kind: 'real', rowIndex: 2, segs: ['cost', 'duration'], separatorOverride: 'inherit' },
    ]
    if (JSON.stringify(after) === JSON.stringify(expected)) return { ok: true }
    return { ok: false, symptom: `snapshot after reload: ${JSON.stringify(after)} (expected ${JSON.stringify(expected)}, pending must NOT survive reload)` }
  },
}

// 6. T6.1：目錄拖入指定列——真拖曳把一個停用中的目錄段（duration，seed
//    刻意排除於 enabled 之外）拖進既有列（cost 所在列），觸發
//    enable-into-target seam（commitEnableIntoTarget）。斷言分兩層：
//    (a) 結構性（SNAPSHOT_EXPR 落列位置＋catalog-item 灰化 class／badge
//        hidden／checkbox.checked，皆非 i18n 可見文字，本 sprint 慣例）；
//    (b) 例外：播報 live region 含「已加入」（zh 預設語系字面比對——見
//        下方 run() 內註解，非唯一斷言依據，僅作額外訊號驗證）。
const caseCatalogDragIntoRow = {
  id: 'catalog-drag-into-row',
  label: 'T6.1：目錄拖入指定列（真拖曳觸發 enable-into-target）',
  seed: { model: 0, cost: 1 },
  async run({ evaluate, dragBySelector }) {
    const dragResult = await dragBySelector(catalogPointExpr('duration'), liPointExpr('cost', 0.75))
    if (!dragResult.ok) return dragResult
    const snapshot = await evaluate(SNAPSHOT_EXPR)
    const expectedSnapshot = [
      { kind: 'real', rowIndex: 1, segs: ['model'], separatorOverride: 'inherit' },
      { kind: 'real', rowIndex: 2, segs: ['cost', 'duration'], separatorOverride: 'inherit' },
    ]
    if (JSON.stringify(snapshot) !== JSON.stringify(expectedSnapshot)) {
      return { ok: false, symptom: `snapshot after catalog drag-in: ${JSON.stringify(snapshot)} (expected ${JSON.stringify(expectedSnapshot)})` }
    }
    const catalogState = await evaluate(`
      (() => {
        const li = document.querySelector('[data-testid="catalog-item"][data-segment-id="duration"]');
        const badge = li.querySelector('.catalog-item__badge');
        const checkbox = li.querySelector('.catalog-item__checkbox');
        return { enabledClass: li.classList.contains('catalog-item--enabled'), badgeHidden: badge.hidden, checked: checkbox.checked };
      })()
    `)
    const expectedCatalogState = { enabledClass: true, badgeHidden: false, checked: true }
    if (JSON.stringify(catalogState) !== JSON.stringify(expectedCatalogState)) {
      return { ok: false, symptom: `catalog item state after drag-in: ${JSON.stringify(catalogState)} (expected ${JSON.stringify(expectedCatalogState)})` }
    }
    // 例外斷言（本 sprint「e2e 避免比對 i18n 可見文字」慣例的例外一案，
    // 比照 T3.5-report.md 決策記錄精神）：落列播報句本身是使用者可感知
    // 的功能訊號（非純裝飾文案），目前僅 zh 為預設可測語系，故此處斷言
    // zh 播報含「已加入」；上方結構性斷言已足以判定成敗，本行僅為額外
    // 訊號驗證，非唯一依據。
    const liveText = await evaluate(`document.getElementById('segment-move-status').textContent`)
    if (typeof liveText !== 'string' || !liveText.includes('已加入')) {
      return { ok: false, symptom: `live region after catalog drag-in missing "已加入": ${JSON.stringify(liveText)}` }
    }
    return { ok: true }
  },
}

// 7. T6.1：產出 dialog 開→複製→Esc 關→焦點還原產出鈕。複製鈕不斷言
//    剪貼簿「成功」與否（headless 環境 navigator.clipboard.writeText 的
//    權限行為不定，見 copyOutput：成功／失敗兩分支皆呼叫
//    announceOutput，皆會移除 #output-status 的 is-empty class）——只驗
//    按鈕確實可點、確實觸發某個結果播報，取捨見 T6.1-report.md。Esc 以
//    CDP `Input.dispatchKeyEvent` 注入真實按鍵（非 JS dispatchEvent 模擬），
//    驗證原生 <dialog> 的 cancel→close 鏈路。
const caseOutputDialogEscFocusReturn = {
  id: 'output-dialog-esc-focus-return',
  label: 'T6.1：產出 dialog 開→複製→Esc 關→焦點還原產出鈕',
  seed: { model: 0, cost: 1 },
  async run({ evaluate, delayFn, pressEscape }) {
    await evaluate(`document.querySelector('[data-testid="output-dialog-open"]').click()`)
    await delayFn(250)
    const afterOpen = await evaluate(`
      (() => {
        const dialog = document.querySelector('[data-testid="output-dialog"]');
        return { open: dialog.open, focusInside: dialog.contains(document.activeElement) };
      })()
    `)
    if (!afterOpen.open || !afterOpen.focusInside) {
      return { ok: false, symptom: `dialog state after open click: ${JSON.stringify(afterOpen)} (expected open+focus inside)` }
    }

    await evaluate(`document.getElementById('copy-bash').click()`)
    await delayFn(300)
    const statusIsEmpty = await evaluate(`document.getElementById('output-status').classList.contains('is-empty')`)
    if (statusIsEmpty !== false) {
      return { ok: false, symptom: `#output-status still is-empty after clicking copy-bash (button seems unresponsive): is-empty=${statusIsEmpty}` }
    }

    await pressEscape()
    await delayFn(300)
    const afterEsc = await evaluate(`
      (() => {
        const dialog = document.querySelector('[data-testid="output-dialog"]');
        const openBtn = document.querySelector('[data-testid="output-dialog-open"]');
        return { open: dialog.open, activeIsOpenButton: document.activeElement === openBtn };
      })()
    `)
    if (afterEsc.open || !afterEsc.activeIsOpenButton) {
      return { ok: false, symptom: `dialog/focus state after Esc: ${JSON.stringify(afterEsc)} (expected closed + focus restored to open button)` }
    }
    return { ok: true }
  },
}

// 8. T3.1（magi/13-test-hardening/TASKS.md M3）：非 inherit 覆寫（色＋
//    variant）× 真 DnD 跨列拖曳存活——見檔頭文件「T3.1」節。段選擇＝
//    `cwd`（segments.ts 三個可設 variant 的段之一，且不在 barEligibleIds／
//    autoEligibleIds，主色 picker 為既有三態封閉版 createColorPicker，無
//    auto/bar 正交干擾）。seed 刻意讓 cwd 原列（row 0）尚有另一段
//    （duration）同列——跨列拖出 cwd 後來源列仍是真實列（非 pending 占位
//    列），聚焦本案主旨（覆寫存活），不與已由案 2/5 覆蓋的 drain/pending
//    語意重複。
const caseColorVariantOverrideSurvivesDrag = {
  id: 'color-variant-override-survives-drag',
  label: 'T3.1：非 inherit 覆寫（色＋variant）× 真 DnD 跨列拖曳存活',
  seed: { cwd: 0, duration: 0, cost: 1 },
  async run({ evaluate, dragBySelector, delayFn }) {
    // 設非 inherit 覆寫：真實 DOM 事件（比照既有 selectMove 手法：直接改
    // 控件狀態＋dispatch 'change'，非 CDP 座標點擊——picker 面板以
    // `hidden` 屬性隱藏未選中模式，座標點擊需先切模式才能命中，徒增
    // flake 面而不增測試價值，本案價值在「覆寫存活於真 DnD」而非「picker
    // 本身可點擊」，後者已有 default-hint/auto-color-duplicate-hint 等
    // dom.test.ts 覆蓋）。
    await evaluate(`
      (() => {
        const li = document.querySelector('[data-testid="segment-row"][data-segment-id="cwd"]');
        const picker = li.querySelector('.segment-row__color-mount .color-picker');
        const modeRadio = picker.querySelector('.color-picker__mode[value="ansi256"]');
        modeRadio.checked = true;
        modeRadio.dispatchEvent(new Event('change', { bubbles: true }));
        const swatchInput = picker.querySelectorAll('[data-swatch-container] input')[3];
        swatchInput.checked = true;
        swatchInput.dispatchEvent(new Event('change', { bubbles: true }));
        return 'color-set';
      })()
    `)
    await evaluate(`
      (() => {
        const sel = document.getElementById('cwd-variant');
        sel.value = 'basename';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        return sel.value;
      })()
    `)
    await delayFn(300)

    const overrideExpr = `
      (() => {
        const li = document.querySelector('[data-testid="segment-row"][data-segment-id="cwd"]');
        const picker = li.querySelector('.segment-row__color-mount .color-picker');
        const modeRadio = picker.querySelector('.color-picker__mode:checked');
        const spinValue = picker.querySelector('.color-spinbutton__value');
        const variantSelect = document.getElementById('cwd-variant');
        return {
          colorMode: modeRadio ? modeRadio.value : null,
          ansiIndex: spinValue ? Number(spinValue.textContent) : null,
          variant: variantSelect ? variantSelect.value : null,
        };
      })()
    `
    const storedExpr = `
      (() => {
        const cfg = JSON.parse(localStorage.getItem('eztools:statusline-builder:config'));
        const seg = cfg.segments.find((s) => s.id === 'cwd');
        return { color: seg.color, variant: seg.variant, row: seg.row };
      })()
    `
    const expectedOverride = { colorMode: 'ansi256', ansiIndex: 3, variant: 'basename' }

    const beforeUi = await evaluate(overrideExpr)
    if (JSON.stringify(beforeUi) !== JSON.stringify(expectedOverride)) {
      return { ok: false, symptom: `UI override state before drag not applied: ${JSON.stringify(beforeUi)} (expected ${JSON.stringify(expectedOverride)})` }
    }
    const beforeStored = await evaluate(storedExpr)
    if (beforeStored.color?.kind !== 'ansi256' || beforeStored.color.index !== 3 || beforeStored.variant !== 'basename' || beforeStored.row !== 0) {
      return { ok: false, symptom: `stored config before drag not applied: ${JSON.stringify(beforeStored)}` }
    }

    const beforeSnapshot = await evaluate(SNAPSHOT_EXPR)
    const expectedBeforeSnapshot = [
      { kind: 'real', rowIndex: 1, segs: ['cwd', 'duration'], separatorOverride: 'inherit' },
      { kind: 'real', rowIndex: 2, segs: ['cost'], separatorOverride: 'inherit' },
    ]
    if (JSON.stringify(beforeSnapshot) !== JSON.stringify(expectedBeforeSnapshot)) {
      return { ok: false, symptom: `unexpected row snapshot before drag: ${JSON.stringify(beforeSnapshot)} (expected ${JSON.stringify(expectedBeforeSnapshot)})` }
    }

    const beforeScript = await evaluate(`document.querySelector('#output-bash code').textContent`)
    const beforeBlock = extractSegmentBlock(beforeScript, 'cwd')
    if (beforeBlock === null) {
      return { ok: false, symptom: `cwd block not found in bash output before drag; full script: ${beforeScript}` }
    }
    // 指紋字面說明＋耦合意圖：`'38;5;3'` 為 ANSI 256 色前景 SGR 組碼字面
    // （`38;5;<idx>`，對應上方 seed 指定的 ansi256 index=3）；`split("[/`
    // 為 `basename` variant 專屬的 jq 片段開頭（cwd 段取路徑 basename 用，
    // 見 emit-bash.ts 對應 emitSegment 分支）。兩者皆是對 emit-bash 具體
    // 輸出格式的字面 snapshot——emit-bash 輸出格式（SGR 組碼寫法／jq 片段
    // 寫法）未來若改動，本案（案 #8）此處與下方拖曳後同款檢查應同步更新，
    // 否則會產生假陰性（指紋永遠找不到、誤判為「覆寫遺失」而非「格式已變」）。
    if (!beforeBlock.includes("'38;5;3'") || !beforeBlock.includes('split("[/')) {
      return { ok: false, symptom: `cwd block before drag missing override fingerprints (fg SGR '38;5;3' / basename split jq): ${beforeBlock}` }
    }

    // 真 DnD：cwd 握把拖至 cost 所在列列尾（同案 2/5/6 手法：dragBySelector
    // + gripPointExpr/liPointExpr(0.75)＝插入目標列尾）。
    const dragResult = await dragBySelector(gripPointExpr('cwd'), liPointExpr('cost', 0.75))
    if (!dragResult.ok) return dragResult

    const afterUi = await evaluate(overrideExpr)
    if (JSON.stringify(afterUi) !== JSON.stringify(expectedOverride)) {
      return { ok: false, symptom: `UI override state changed after drag: ${JSON.stringify(afterUi)} (expected unchanged ${JSON.stringify(expectedOverride)})` }
    }
    const afterStored = await evaluate(storedExpr)
    if (afterStored.color?.kind !== 'ansi256' || afterStored.color.index !== 3 || afterStored.variant !== 'basename') {
      return { ok: false, symptom: `stored color/variant changed after drag (expected unchanged): ${JSON.stringify(afterStored)}` }
    }
    if (afterStored.row !== 1) {
      return { ok: false, symptom: `expected cwd row to change 0→1 after cross-row drag, got row=${afterStored.row}` }
    }

    const afterSnapshot = await evaluate(SNAPSHOT_EXPR)
    const expectedAfterSnapshot = [
      { kind: 'real', rowIndex: 1, segs: ['duration'], separatorOverride: 'inherit' },
      { kind: 'real', rowIndex: 2, segs: ['cost', 'cwd'], separatorOverride: 'inherit' },
    ]
    if (JSON.stringify(afterSnapshot) !== JSON.stringify(expectedAfterSnapshot)) {
      return { ok: false, symptom: `unexpected row snapshot after drag: ${JSON.stringify(afterSnapshot)} (expected ${JSON.stringify(expectedAfterSnapshot)})` }
    }

    const afterScript = await evaluate(`document.querySelector('#output-bash code').textContent`)
    const afterBlock = extractSegmentBlock(afterScript, 'cwd')
    if (afterBlock === null) {
      return { ok: false, symptom: `cwd block not found in bash output after drag; full script: ${afterScript}` }
    }
    // 指紋字面同上（拖曳前 beforeBlock 檢查處）之說明，此處為拖曳後複驗、
    // 同一組耦合意圖（emit-bash 輸出格式改動時本檢查亦須同步更新）。
    if (!afterBlock.includes("'38;5;3'") || !afterBlock.includes('split("[/')) {
      return { ok: false, symptom: `cwd block after drag missing override fingerprints (fg SGR '38;5;3' / basename split jq): ${afterBlock}` }
    }

    // 後綴身分一致性（🟢-8 補強，封「混寫迴歸雙過兩道檢查」縫隙）：下方
    // normalizeRowSuffix 把 texts_N/fgs_N/bgs_N/segstart_N 全部收斂成 _R
    // 才比對「除列位外是否相同」——若把 beforeBlock／afterBlock 兩側誤混寫
    // （例如兩側其實代入了同一份 block），收斂後仍可能逐字相同，「正規化後
    // 相同」這道檢查本身測不出這種誤植。故先各自驗證 raw 列位尾碼的身分：
    // beforeBlock 應恆為 `_0`（cwd 種子在 row 0，見上方 seed／beforeStored.row
    // 斷言）；afterBlock 應恆為 `_1`（cwd 真拖曳落點在 cost 所在 row 1，見
    // 上方 afterStored.row 斷言）——先證兩側確實取自不同列位，下方正規化
    // 比對才有意義。
    const beforeSuffixes = beforeBlock.match(/(?:texts|fgs|bgs|segstart)_\d+/g) ?? []
    const afterSuffixes = afterBlock.match(/(?:texts|fgs|bgs|segstart)_\d+/g) ?? []
    if (beforeSuffixes.length === 0 || !beforeSuffixes.every((s) => s.endsWith('_0'))) {
      return { ok: false, symptom: `beforeBlock row-suffixes should all be _0 (cwd seeded at row0): ${JSON.stringify(beforeSuffixes)}` }
    }
    if (afterSuffixes.length === 0 || !afterSuffixes.every((s) => s.endsWith('_1'))) {
      return { ok: false, symptom: `afterBlock row-suffixes should all be _1 (cwd dragged to row1): ${JSON.stringify(afterSuffixes)}` }
    }

    // (b) 產出腳本含該覆寫＋拖前拖後僅列位差異：先證兩份區塊確實不同
    // （排除「腳本壓根沒變、比較恆真」的假陽性），再證去除列位尾碼
    // （texts_N/fgs_N/segstart_N）後逐字相同。
    if (beforeBlock === afterBlock) {
      return { ok: false, symptom: 'cwd block byte-identical before/after drag — expected row-suffix (texts_N/fgs_N/segstart_N) to differ since row grouping changed' }
    }
    const normalizedBefore = normalizeRowSuffix(beforeBlock)
    const normalizedAfter = normalizeRowSuffix(afterBlock)
    if (normalizedBefore !== normalizedAfter) {
      return {
        ok: false,
        symptom: `cwd block differs beyond row position after normalizing row suffix:\nbefore: ${normalizedBefore}\nafter: ${normalizedAfter}`,
      }
    }

    return { ok: true }
  },
}

// 9. T4.2（TASKS.md；14-PLAN §D5）：「教學帶不擋拖曳」無條件回歸案——
//    `seedTutorial: false` 關閉 T4.1 的預設 dismiss 前置步驟，教學帶
//    （`#tutorial-band-slot`，現與段列同居右欄同一捲動容器，見 index.html
//    T2.2 節點註解）全程保持可見，驗證其存在**不擋**同容器內的真拖曳
//    （同案 1 same-row-swap 手法：同列相鄰兩段互換）。斷言序：(a) 拖曳前
//    band 確實在場（`hidden` 屬性為 false，防呆前提——若 seedTutorial
//    關閉沒生效，後面的斷言就毫無意義）；(b) 執行真拖曳；(c) 拖後順序
//    正確（沿用案 1 的座標/斷言手法，不因教學帶佔用同容器頂部空間而
//    失準——scrollIntoView 活座標紀律已吸收版面偏移）；(d) 拖後 band
//    仍在場（未被拖曳手勢誤觸 dismiss——dismiss 唯一入口是
//    `#tutorial-dismiss` 鈕點擊，見 tutorial-band.ts／main.ts
//    wireTutorialBand，拖曳握把／段列本身皆非該鈕）。
const caseTutorialBandDoesNotBlockDrag = {
  id: 'tutorial-band-does-not-block-drag',
  label: 'T4.2：教學帶不擋拖曳（無條件回歸，教學帶保持可見）',
  seed: { model: 0, cost: 0 },
  seedTutorial: false,
  async run({ evaluate, dragBySelector }) {
    const bandHiddenBefore = await evaluate(`document.getElementById('tutorial-band-slot').hidden`)
    if (bandHiddenBefore !== false) {
      return { ok: false, symptom: `tutorial band unexpectedly hidden before drag (seedTutorial:false should keep it visible — dismiss precondition step must be skipped): hidden=${bandHiddenBefore}` }
    }
    const before = await evaluate(
      `[...document.querySelectorAll('[data-testid="row-group"]')[0].querySelectorAll('[data-testid="segment-row"]')].map((li) => li.dataset.segmentId)`,
    )
    if (JSON.stringify(before) !== JSON.stringify(['model', 'cost'])) {
      return { ok: false, symptom: `unexpected seed order: ${JSON.stringify(before)}` }
    }
    const dragResult = await dragBySelector(gripPointExpr('cost'), liPointExpr('model', 0.25))
    if (!dragResult.ok) return dragResult
    const after = await evaluate(
      `[...document.querySelectorAll('[data-testid="row-group"]')[0].querySelectorAll('[data-testid="segment-row"]')].map((li) => li.dataset.segmentId)`,
    )
    if (JSON.stringify(after) !== JSON.stringify(['cost', 'model'])) {
      return { ok: false, symptom: `order after drop: ${JSON.stringify(after)} (expected ["cost","model"])` }
    }
    const bandHiddenAfter = await evaluate(`document.getElementById('tutorial-band-slot').hidden`)
    if (bandHiddenAfter !== false) {
      return { ok: false, symptom: `tutorial band became hidden after drag (a drag gesture must not mis-trigger dismiss — only #tutorial-dismiss click should): hidden=${bandHiddenAfter}` }
    }
    return { ok: true }
  },
}

// 10. T4.2（TASKS.md；14-PLAN §D5）：mode 切換（plain→powerline）前後
//     `window.scrollY` 不變——鎖 T3.1（09-PLAN §D4 回饋 #4）的焦點竊取
//     回歸：main.ts handleModeChange 已刪除 `segmentListsEl.focus()`
//     （見該函式文件），改由 radio 保持瀏覽器原生點擊焦點，不再有程式化
//     `.focus()` 呼叫把視窗捲動到目錄／清單所在區塊。
//
//     真實點擊實作（T4.1 校準發現）：改走真滑鼠事件序
//     `clickBySelector`（CDP `Input.dispatchMouseEvent`
//     mousePressed→mouseReleased）而非 JS `element.click()` 方法——實跑
//     證實 `.click()` 方法本身不觸發瀏覽器對表單控件的原生 focus 行為
//     （headless Chromium 下 `.click()` 後 `document.activeElement`
//     仍是 `<body>`），無法忠實重現舊 bug 觸發前提（見 clickBySelector
//     文件）。
//
//     主/後備判準（brief 明文要求先證非空泛恆真）：先 `window.scrollTo`
//     再讀 `window.scrollY`；三欄版面下各欄（`.builder-columns__list` 等）
//     自身即為 `overflow-y:auto` 捲動容器（style.css `max-height:
//     calc(100dvh - var(--column-top))`），若整頁本身因此被裁在 viewport
//     內而不可捲（`scrollY` 恆 0），改捲右欄 `#list-column`（唯一捲動
//     容器，教學帶／目錄／已選擇清單同居於此，見 index.html T2.2 節點
//     註解）自身 `scrollTop`，並以其作為斷言標的——兩種判準皆先斷言
//     「捲動後位置 > 0」防呆，確保後續「不變」斷言非恆真空比對。
const caseModeSwitchScrollStable = {
  id: 'mode-switch-scroll-position-stable',
  label: 'T4.2：mode 切換前後捲動位置不變（回歸 T3.1 焦點竊取）',
  seed: { model: 0, cost: 1, duration: 1, 'context-size': 2, thinking: 2, 'agent-name': 3, 'git-branch': 3, clock: 4 },
  async run({ evaluate, delayFn, clickBySelector }) {
    await evaluate(`window.scrollTo({ top: 300, left: 0, behavior: 'instant' })`)
    await delayFn(100)
    const pageScrollY = await evaluate(`window.scrollY`)

    const usePageScroll = pageScrollY > 0
    let before
    let metricExpr
    if (usePageScroll) {
      before = pageScrollY
      metricExpr = `window.scrollY`
    } else {
      // 後備判準：整頁不可捲，改捲右欄清單容器本身（見上方案文件）。
      await evaluate(`document.getElementById('list-column').scrollTo({ top: 300, left: 0, behavior: 'instant' })`)
      await delayFn(100)
      before = await evaluate(`document.getElementById('list-column').scrollTop`)
      metricExpr = `document.getElementById('list-column').scrollTop`
      if (!(before > 0)) {
        return {
          ok: false,
          symptom: `neither window.scrollY nor #list-column.scrollTop became >0 after scrollTo(300) (page/container not scrollable at seeded content size — cannot construct a non-vacuous "unchanged" assertion): window.scrollY=${pageScrollY}, list-column.scrollTop=${before}`,
        }
      }
    }

    // 真實滑鼠點擊（CDP Input.dispatchMouseEvent，非 JS `.click()` 方法——
    // 見 clickBySelector 文件：`.click()` 不觸發瀏覽器原生 focus 行為，
    // 無法忠實重現舊 bug 觸發前提）：原生 mousedown 會賦予 radio 焦點，
    // 正是舊 bug（`segmentListsEl.focus()`）的觸發形。
    await clickBySelector(modeRadioClickPointExpr('#mode-powerline'))
    await delayFn(300)

    const after = await evaluate(metricExpr)
    if (after !== before) {
      return {
        ok: false,
        symptom: `scroll position changed after mode switch click (${usePageScroll ? 'window.scrollY' : '#list-column.scrollTop'}): before=${before}, after=${after}`,
      }
    }

    // 選配斷言（MAGI review 🟡-7：對齊 PLAN §D4「activeElement 同斷言
    // 選配」字面——選配＝記錄不阻斷，非阻斷式失敗；核心捲動位置斷言已在
    // 上方把關本案主判準）：mode radio 本身應保有焦點（T3.1 修復後的
    // 預期落點——不再被程式化奪走；真滑鼠點擊的 mousedown 原生行為賦予
    // 的焦點）。失敗僅印警告，不影響本案 ok 結果。
    const activeIsModeRadio = await evaluate(`document.activeElement === document.getElementById('mode-powerline')`)
    if (activeIsModeRadio !== true) {
      console.log(
        `[e2e] warn: document.activeElement is not #mode-powerline after real mouse click (optional assertion, not blocking): activeIsModeRadio=${activeIsModeRadio}`,
      )
    }

    return { ok: true }
  },
}

const CASES = [
  caseSameRowSwap,
  caseS1CrossRowDrain,
  caseS4SelectIntoMiddlePending,
  caseS9DeletePendingRenumber,
  caseS7DragDrainReload,
  caseCatalogDragIntoRow,
  caseOutputDialogEscFocusReturn,
  caseColorVariantOverrideSurvivesDrag,
  caseTutorialBandDoesNotBlockDrag,
  caseModeSwitchScrollStable,
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
    // T4.1：逐案可關閉 dismiss 前置步驟（預設 true，見 seedExpr 文件）——
    // `testCase.seedTutorial === false` 時保留教學帶可見（T4.2 案 9 用）。
    await evaluate(seedExpr(testCase.seed, { dismissTutorial: testCase.seedTutorial !== false }))
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

    // T6.1：CDP 注入真實 Esc 按鍵（rawKeyDown→keyUp）——與 JS
    // `dispatchEvent(new KeyboardEvent(...))` 不同，真實鍵盤事件才會被
    // Chromium 原生 `<dialog>` 的 cancel（Esc）處理管線接住並觸發
    // cancel→close；純 DOM 派發的 KeyboardEvent 不具備這條原生行為。
    async function pressEscape() {
      const base = { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 }
      await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base })
      await delay(30)
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
    }

    async function selectMove(segmentId, slotValue) {
      await evaluate(`
        (() => {
          const li = document.querySelector('[data-testid="segment-row"][data-segment-id=${JSON.stringify(segmentId)}]');
          const sel = li.querySelector('[data-testid="row-select"]');
          sel.value = ${JSON.stringify(String(slotValue))};
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return sel.value;
        })()
      `)
      await delay(300)
    }

    // T4.2：真實 CDP 滑鼠點擊（mousePressed→mouseReleased 序，非 JS
    // `element.click()` 方法）——實跑校準發現：僅呼叫 `.click()` 方法
    // 不會觸發瀏覽器對表單控件的原生 focus 行為（Chromium 的「點擊聚焦」
    // 是 mousedown 事件的預設動作，`HTMLElement.click()` 方法本身不模擬
    // mousedown/mouseup 序列——實測 `.click()` 後 `document.activeElement`
    // 仍是 `<body>`）。案 10（mode 切換 scrollY 回歸）需要「使用者真點擊
    // →原生取得焦點」這個前提，才能忠實重現舊 bug 場景（change handler
    // 內 `segmentListsEl.focus()` 奪走剛由使用者點擊取得的焦點），故改走
    // 真滑鼠事件序（同 dragBySelector 的 Input.dispatchMouseEvent 手法，
    // 僅無拖曳/drop 階段）。
    async function clickBySelector(pointExpr) {
      const pt = await evaluate(pointExpr)
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y })
      await delay(30)
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', buttons: 1, clickCount: 1 })
      await delay(40)
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 })
      await delay(60)
    }

    const outcome = await testCase.run({ evaluate, dragBySelector, selectMove, navigate, delayFn: delay, pressEscape, clickBySelector })
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
