'use strict'
/**
 * S-f spike（magi/15-statusline-editor-layout/PLAN.md §D8）：行動版目錄
 * 收合狀態機的獨立原型實作。逐字對照 PLAN §D8 契約：
 *
 *   - 生效範圍：僅 <1100px；≥1100px 恆展開。
 *   - 單一謂詞（硬性）：收合 ⟺ localStorage.getItem(KEY)==='1' 且視窗
 *     <1100px；key 缺失／getItem 擲錯／任意怪值一律展開（fail-open）。
 *   - 首繪方向：HTML 出貨態帶 open，JS 僅在「<1100px 且謂詞為收合」時收起。
 *   - 持久化觸發來源（硬性）：程式化 details.open=true 的設值同樣派發
 *     toggle，故持久化只能由使用者意圖來源觸發。本檔實作兩個候選機制，供
 *     verify.mjs 以 `?mechanism=a`／`?mechanism=b` query string 切換比較：
 *       (a) summary-only：只掛 <summary> click／keydown 監聽，完全不接
 *           toggle 事件。
 *       (b) toggle handler ＋ matchMedia 守衛 ＋ 程式化寫入期間的抑制旗標。
 *   - 桌面態硬條件：≥1100px 時 summary 不得為 Tab 停點、不得可點擊、a11y
 *     播報與可見狀態一致——本檔以 `matchMedia` 切 `open`
 *     ＋（CSS）`@media(min-width:1100px){summary{display:none}}` 達成
 *     （CSS 部分見 proto.html）。
 *   - 跨斷點強制展開不得清除使用者的行動版偏好。
 */

// ── 單一常數出口（PLAN §D8：與 tutorial-band.ts 同precedent 的單一出口慣例）──
const STORAGE_KEY = 'eztools-statusline-builder-catalog-collapsed'
const COLLAPSED_SENTINEL = '1'
const MOBILE_MEDIA_QUERY = '(max-width: 1099.98px)'

/**
 * 單一謂詞（硬性契約）：收合 ⟺ getItem(KEY)==='1' 且 <1100px。
 * key 缺失／getItem 擲錯／任意怪值 → 一律展開（fail-open）。
 * `isMobile` 由呼叫端傳入（由 matchMedia 判定），本函式不重複查詢。
 */
function shouldCollapse(isMobile) {
  if (!isMobile) return false
  let raw
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return false // getItem 擲錯 → fail-open
  }
  return raw === COLLAPSED_SENTINEL
}

/** 持久化寫入：collapsed=true 寫入 sentinel；false 則移除 key（非「怪值」）。 */
function persistCollapsed(collapsed) {
  try {
    if (collapsed) window.localStorage.setItem(STORAGE_KEY, COLLAPSED_SENTINEL)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 寫入失敗（例如 quota / 被覆寫為擲錯版）：僅偏好不持久化，不影響當前
    // UI 顯示狀態，靜默忽略。
  }
}

function isMobileNow() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches
}

// mechanism 選擇：query string `?mechanism=a`（預設）或 `?mechanism=b`，供
// verify.mjs 於同一份原型上切換比較兩候選機制。
const params = new URLSearchParams(location.search)
const MECHANISM = params.get('mechanism') === 'b' ? 'b' : 'a'

// 程式化寫入抑制旗標——init() 的初始收合、跨斷點強制展開/恢復皆會設值，
// 期間內派發的 toggle 事件（機制 (b) 用）不應觸發持久化。機制 (a) 完全不
// 監聽 toggle，理論上不需要此旗標即天然免疫；旗標仍統一維護供診斷輸出用。
let suppressing = false

function withSuppression(fn) {
  suppressing = true
  try {
    fn()
  } finally {
    suppressing = false
  }
}

// ── 機制 (a)：summary-only（只掛 click／keydown，不接 toggle）──
//
// 原生 <summary> 點擊的預設動作（翻轉 details.open、派發 toggle）依 HTML
// 規範是透過「queue an element task」非同步排入。**實測時序證據**（Chromium
// headless=new，CDP 真滑鼠點擊，見 S-f-RESULT.md「機制比較」節）：click
// handler 同步執行當下 `details.open` 尚未翻轉；`queueMicrotask` 讀到的值
// **仍是翻轉前**（microtask 早於該 element task）；`setTimeout(0)`／單一
// `requestAnimationFrame` 起才讀得到翻轉後的值。故本檔選用雙
// `requestAnimationFrame`（比單一 rAF 多一層保險餘裕，成本可忽略）而非
// `queueMicrotask`（已證實過早、會讀到舊值）或 `setTimeout(0)`（實測雖已
// 夠用，但 rAF 額外對齊繪製時機，語意上更貼合「等這一輪畫面穩定後再讀」）。
function scheduleMechanismARead(details) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!isMobileNow()) return // 防禦：桌面態 summary 應不可點擊，理論上不會觸發
      persistCollapsed(!details.open)
    })
  })
}

function wireMechanismA(details, summary) {
  summary.addEventListener('click', () => scheduleMechanismARead(details))
  summary.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
      scheduleMechanismARead(details)
    }
  })
}

// ── 機制 (b)：toggle handler ＋ matchMedia 守衛 ＋ 抑制旗標 ──
function wireMechanismB(details) {
  details.addEventListener('toggle', () => {
    if (suppressing) return // 程式化寫入（init 初始收合／跨斷點強制展開或恢復）不持久化
    if (!isMobileNow()) return // matchMedia 守衛：桌面態的 toggle（理論上不會由使用者觸發）不持久化
    persistCollapsed(!details.open)
  })
}

// ── 跨斷點強制展開／恢復（不得清除使用者的行動版偏好）──
function wireBreakpointForcing(details) {
  const mq = window.matchMedia(MOBILE_MEDIA_QUERY)
  const apply = () => {
    const mobile = mq.matches
    // 桌面態：恆展開（不管 localStorage 為何值都不清除它）。
    // 行動版：依目前持久化的偏好恢復——若使用者先前在行動版收合過且該
    // 偏好在桌面態強制展開期間未被清除，回到行動版即照樣收合回去。
    const desiredOpen = mobile ? !shouldCollapse(true) : true
    if (details.open !== desiredOpen) {
      withSuppression(() => {
        details.open = desiredOpen
      })
    }
  }
  // matchMedia change 事件在斷點跨越當下觸發；亦於 init 完成後立即跑一次
  // apply() 以涵蓋「頁面載入時就已經是某個斷點」的初始態（該首次呼叫见
  // init()，此處只掛未來變化的監聽）。
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', apply)
  } else {
    // 舊版 API 後備（Chromium 現行版本皆支援 addEventListener，此分支僅防禦）。
    mq.addListener(apply)
  }
}

// ── init 流程 ──
//
// 30 項目錄內容為**靜態 HTML**（見 proto.html 該處註解），JS 僅負責狀態機
// （收合/持久化/跨斷點），不建置清單內容——JS 失效態下清單仍完整存在。
function init() {
  const details = document.getElementById('catalog-details')
  const summary = document.getElementById('catalog-summary')

  // 決定初始 open 態：僅在「<1100px 且謂詞為收合」時才收起；其餘一律維持
  // HTML 出貨態的 open（fail-open 方向，PLAN §D8「首繪方向」）。
  const mobile = isMobileNow()
  const collapsed = shouldCollapse(mobile)
  if (collapsed) {
    withSuppression(() => {
      details.open = false
    })
  }

  // 移除防閃動暫抑標記——本行是全檔唯一移除點，且必須晚於上方「決定是否
  // 收合」完成之後才執行（順序不可顛倒，否則會有一格已展開的畫面）。
  document.documentElement.classList.remove('js-init-pending')

  if (MECHANISM === 'b') {
    wireMechanismB(details)
  } else {
    wireMechanismA(details, summary)
  }
  wireBreakpointForcing(details)

  // 供 verify.mjs 診斷用（非正式產品程式碼慣例，spike 專用）：暴露內部狀態
  // 供 CDP evaluate 讀取，避免 verify.mjs 需要重新實作一份謂詞邏輯。
  window.__sf__ = {
    mechanism: MECHANISM,
    STORAGE_KEY,
    COLLAPSED_SENTINEL,
    shouldCollapse,
    isMobileNow,
    get suppressing() {
      return suppressing
    },
  }
}

// proto.html 的 <script> 標籤置於 body 尾端，載入時 DOM 已可用，不需等待
// DOMContentLoaded；仍保留防禦性檢查以求穩健。
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
