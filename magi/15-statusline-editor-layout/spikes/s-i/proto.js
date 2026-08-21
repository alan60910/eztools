// S-i spike 原型：HTML5 DnD 自目錄欄（左，獨立捲動容器）拖至列區（右，
// 獨立捲動容器）。目的僅是驗證「跨兩個獨立捲動容器」這個 sprint 15 新引入
// 的幾何在 Chromium 下的行為（見 magi/15-statusline-editor-layout/spikes/
// s-i/verify.mjs），非正式產品程式碼——不套用 main.ts 既有的段落資料模型，
// 亦刻意不實作任何自訂邊緣自動捲動邏輯（本 spike 要驗證的正是「Chromium
// 是否已原生做這件事」，若原型自己動手捲，量到的就是我們自己的邏輯而非
// 平台行為）。
//
// 曝光給 verify.mjs（CDP `Runtime.evaluate`）讀取的全域狀態：
//   window.__dndLog          — 事件序列（dragenter/dragover/drop，含目標
//                               row id 與座標），驗證 (a) 跨容器事件鏈用。
//   window.__indicatorState  — 目前插入指示線位置 { rowId, position }，
//                               驗證 (b) 插入指示定位用。
//   window.__resetProto()    — 清空上述狀態＋列內容，供 verify.mjs 同一頁面
//                               內跑多輪驗證前重置（減少逐輪重啟瀏覽器的
//                               開銷；spike 腳本，非常駐測試網，不追求逐案
//                               全新 profile 的隔離規格）。

const catalogColumn = document.getElementById('catalog-column')
const rowColumn = document.getElementById('row-column')

window.__dndLog = []
window.__indicatorState = null

function logEvent(type, extra = {}) {
  window.__dndLog.push({ type, ts: Date.now(), ...extra })
}

// ── 左欄：30 個 draggable 目錄項 ──────────────────────────────────────
const CATALOG_COUNT = 30
for (let i = 1; i <= CATALOG_COUNT; i++) {
  const name = `目錄項-${String(i).padStart(2, '0')}`
  const item = document.createElement('div')
  item.className = 'catalog-item'
  item.draggable = true
  item.dataset.testid = 'catalog-item'
  item.dataset.name = name
  item.textContent = name
  item.addEventListener('dragstart', (ev) => {
    ev.dataTransfer.setData('text/plain', name)
    ev.dataTransfer.effectAllowed = 'copy'
    item.classList.add('dragging')
    logEvent('dragstart', { name })
  })
  item.addEventListener('dragend', () => {
    item.classList.remove('dragging')
    logEvent('dragend', { name })
  })
  catalogColumn.appendChild(item)
}

// ── 右欄：5 個列群組 × 若干列（列數不等，模擬真實版面高度不均） ────────
const ROW_COUNTS = [4, 5, 3, 6, 4]
let rowSeq = 0
for (let g = 0; g < ROW_COUNTS.length; g++) {
  const group = document.createElement('div')
  group.className = 'row-group'
  group.dataset.testid = 'row-group'
  group.dataset.groupIndex = String(g)

  const title = document.createElement('h2')
  title.className = 'row-group__title'
  title.textContent = `列群組 ${g + 1}`
  group.appendChild(title)

  for (let r = 0; r < ROW_COUNTS[g]; r++) {
    const rowId = `row-${rowSeq++}`
    const row = document.createElement('div')
    row.className = 'row'
    row.dataset.testid = 'row'
    row.dataset.rowId = rowId

    const indicator = document.createElement('div')
    indicator.className = 'insert-indicator'
    indicator.dataset.testid = 'insert-indicator'
    row.appendChild(indicator)

    const label = document.createElement('span')
    label.className = 'row-label'
    label.textContent = `${rowId}：`
    row.appendChild(label)

    const content = document.createElement('span')
    content.className = 'row-content'
    content.dataset.testid = 'row-content'
    row.appendChild(content)

    group.appendChild(row)
  }
  rowColumn.appendChild(group)
}

// ── DnD 接線（事件委派在 #row-column 上，非逐列綁定） ───────────────────

function clearIndicators() {
  for (const el of rowColumn.querySelectorAll('.insert-indicator.top, .insert-indicator.bottom')) {
    el.classList.remove('top', 'bottom')
  }
}

function updateIndicator(rowEl, position) {
  clearIndicators()
  rowEl.querySelector('.insert-indicator').classList.add(position)
  window.__indicatorState = { rowId: rowEl.dataset.rowId, position }
}

rowColumn.addEventListener('dragenter', (ev) => {
  const row = ev.target.closest('.row')
  logEvent('dragenter', { rowId: row ? row.dataset.rowId : null, x: ev.clientX, y: ev.clientY })
})

rowColumn.addEventListener('dragover', (ev) => {
  // 必要：不 preventDefault 瀏覽器不允許此處成為合法 drop 目標。
  ev.preventDefault()
  ev.dataTransfer.dropEffect = 'copy'
  const row = ev.target.closest('.row')
  if (row) {
    const rect = row.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = ev.clientY < midY ? 'top' : 'bottom'
    updateIndicator(row, position)
  }
  logEvent('dragover', { rowId: row ? row.dataset.rowId : null, x: ev.clientX, y: ev.clientY })
})

rowColumn.addEventListener('drop', (ev) => {
  ev.preventDefault()
  const row = ev.target.closest('.row')
  const name = ev.dataTransfer.getData('text/plain')
  if (row) {
    const content = row.querySelector('.row-content')
    content.textContent = content.textContent ? `${content.textContent}, ${name}` : name
  }
  logEvent('drop', { rowId: row ? row.dataset.rowId : null, name, x: ev.clientX, y: ev.clientY })
  clearIndicators()
  window.__indicatorState = null
})

window.__resetProto = () => {
  window.__dndLog.length = 0
  window.__indicatorState = null
  clearIndicators()
  for (const c of rowColumn.querySelectorAll('[data-testid="row-content"]')) c.textContent = ''
}
