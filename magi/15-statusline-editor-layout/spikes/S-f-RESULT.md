# S-f-RESULT — D8 行動版目錄收合狀態機跨斷點（MS1 前置 spike，T1.7）

> Source: `magi/15-statusline-editor-layout/spikes/s-f/`（`proto.html`／
> `proto.js`／`verify.mjs`，全新獨立原型，未動 statusline-builder 正式頁面）
> Sprint: `magi/15-statusline-editor-layout/`　對照設計契約：`PLAN.md` §D8
> 環境：Windows 11；Microsoft Edge
> （`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`）；CDP
> headless=new（`node verify.mjs` 預設，`E2E_HEADED=1` 可切 headed）；
> debug port 9860–9899 區段（sprint 15 多 lane 並行約定）。

## 結論先講

**D8 狀態機設計成立**——PLAN §D8 逐字契約（單一謂詞、首繪方向、持久化觸發
來源、桌面態硬條件、跨斷點不清偏好）在獨立原型上六序列＋機制比較＋a11y＋
JS 失效態＋防閃動全數 **11/11 PASS**（`node verify.mjs` 完整輸出見下）。
**推薦機制 (a)（summary-only：只掛 `<summary>` click／keydown，不接
`toggle`）**——理由見「機制比較」節。過程中發現兩個必須回填 MS3 施工的平台坑
（`<noscript>` 逃生門、rAF 讀值時機），詳見「對 MS3 施工的具體建議」。

## 原型與驗證腳本

- `spikes/s-f/proto.html`：模擬目錄欄——`<details open>` 包 30 項**靜態**
  `<li>`（刻意不用 JS 動態建置，見下方「JS 失效態」節的設計理由）＋
  `<summary>`；頂帶／列區／設定欄為簡單佔位 `<div>`（列區與設定欄各加一顆
  `<button>` 供 Tab 走查用，見「桌面態硬條件」節）。
- `spikes/s-f/proto.js`：D8 狀態機實作——單一常數出口（`STORAGE_KEY`／
  `COLLAPSED_SENTINEL`／`MOBILE_MEDIA_QUERY`）、單一謂詞
  `shouldCollapse(isMobile)`、`persistCollapsed(collapsed)`、機制 (a)／(b)
  可由 `?mechanism=a|b` query string 切換、`wireBreakpointForcing` 處理跨
  斷點強制展開/恢復。
- `spikes/s-f/verify.mjs`：CDP 驗證腳本。bootstrap（`detectBrowser`／
  `launchBrowser`骨架／`waitForEndpoint`／`waitForPageTarget`／`connectWs`／
  `makeClient`／`killProcessTree`）**複製自** `scripts/e2e-statusline.mjs`
  （只 Read 未改動該檔），依本 spike 需求精簡＋加上逐 session 可切換
  viewport／mechanism／`scriptExecutionDisabled`／`throwOnGetItem` 的
  `openSession()`。

**環境前置決定**：先以獨立診斷腳本確認 `file://` scheme 下 headless
Chromium 的 `localStorage.setItem`/`getItem` 可正常運作（`origin:
"file://"`，`setItem`/`getItem` 往返一致，無擲錯），故**全程採 `file://`
直開 `proto.html`**，未使用 brief 建議的 `http.createServer` 後備方案
（後備方案未觸發，備查用診斷腳本未留存於 repo，僅執行一次性驗證後即棄）。

## `node verify.mjs` 完整輸出（11/11，未截斷）

```
[S-f verify] 使用瀏覽器：C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
[S-f verify] proto URL：file:///E:/program/git/eztools/magi/15-statusline-editor-layout/spikes/s-f/proto.html
[S-f verify] headless=true

=== SUMMARY ===
  PASS  seq1-a                  2297ms  序列1（a）：<1100px 使用者收合→重載→仍收合
  PASS  seq1-b                  2189ms  序列1（b）：<1100px 使用者收合→重載→仍收合
  PASS  seq23-a                 2836ms  序列2+3（a）：收合→切桌面（強制展開＋偏好未清）→切回行動版（恢復收合）
  PASS  seq23-b                 2809ms  序列2+3（b）：收合→切桌面（強制展開＋偏好未清）→切回行動版（恢復收合）
  PASS  seq4-a                  2807ms  序列4（a）：行動版展開（自收合態）→重載→仍展開且 key 已清
  PASS  seq4-b                  2654ms  序列4（b）：行動版展開（自收合態）→重載→仍展開且 key 已清
  PASS  seq5-a11y               2874ms  序列5＋a11y：桌面載入展開、summary 非 Tab 停點／不可點擊／a11y tree 一致
  PASS  seq6                    1311ms  序列6：localStorage.getItem 擲錯→展開（fail-open）且無未捕捉例外
  PASS  js-disabled-1400x1000   1342ms  JS 失效態（1400x1000）：30 項目錄可見
  PASS  js-disabled-390x844     1412ms  JS 失效態（390x844）：30 項目錄可見
  PASS  anti-flash              2246ms  加驗：防閃動——暫抑樣式解除時 details.open 已是最終值（收合）

11/11 passed
```

（本檔以下各節逐案列出實測證據值，即完整結構化輸出中的 `evidence` 欄位，
供獨立覆核，非僅摘要重述上表 PASS。）

## 六序列逐條結果

### 序列 1：<1100px 使用者收合 → 重載 → 斷言仍收合

機制 (a)／(b) 各跑一輪，證據值完全一致：

| 時間點 | `details.open` | `localStorage` |
|---|---|---|
| 載入（無 key） | `true` | `null` |
| 真滑鼠點擊 summary 後 | `false` | `'1'` |
| `Page.navigate` 重載後 | `false` | `'1'` |

**PASS**（`seq1-a` 2297ms、`seq1-b` 2189ms）——持久化生效，且兩機制結果
一致。

### 序列 2：<1100px 使用者收合 → 切 ≥1100px → 斷言強制展開且 localStorage 仍為 `'1'`

（與序列 3 同一 session 連續操作，`seq23-a`／`seq23-b`。）

| 時間點 | `details.open` | `localStorage` |
|---|---|---|
| 收合於行動版 | `false` | `'1'` |
| `Emulation.setDeviceMetricsOverride` 切至 1400×1000 | `true` | `'1'`（**未被清除**） |

**PASS**——`localStorage` 在跨斷點強制展開期間完全未變動（無論哪個機制，
因為強制展開走 `wireBreakpointForcing` 的程式化 `details.open = true`，機制
(a) 天生不聽 `toggle`、機制 (b) 靠抑制旗標擋下）。

### 序列 3：續 2 → 切回 <1100px → 斷言恢復收合

（同一 session，緊接序列 2 之後。）

| 時間點 | `details.open` | `localStorage` |
|---|---|---|
| 切回 390×844 | `false` | `'1'` |

**PASS**——`wireBreakpointForcing` 依當前 `localStorage` 值重新求值謂詞，
正確恢復收合，且過程未動 `localStorage`。

### 序列 4：<1100px 使用者展開（自收合態）→ 重載 → 斷言仍展開且 key 已清除或非 `'1'`

（`seq4-a`／`seq4-b`，各以「先種 `key='1'` → reload 進入真收合態」開場，
比照「已收合的回訪者」情境。）

| 時間點 | `details.open` | `localStorage` |
|---|---|---|
| 種 key 後 reload（回訪者收合態） | `false` | `'1'` |
| 真滑鼠點擊 summary（使用者展開） | `true` | `null`（已清除） |
| 再次 `Page.navigate` 重載 | `true` | `null` |

**PASS**（`seq4-a` 2807ms、`seq4-b` 2654ms）。

### 序列 5：≥1100px 載入（無 key）→ 展開、summary 非 Tab 停點、不可點擊

`seq5-a11y`，2874ms，**PASS**。細節：

- 載入態 `details.open === true`；`getComputedStyle(summary).display ===
  'none'`；`summary.getBoundingClientRect()` 全零（`width:0, height:0`）。
- **Tab 走查（非恆真空比對）**：proto.html 刻意在 summary 前後各加一顆真實
  可 Tab 的 `<button>`（`#topband-btn`／`#rows-btn`／`#settings-btn`），從
  `#topband-btn` 出發按 4 次真 Tab（`Input.dispatchKeyEvent`），桌面態序列
  為：
  ```
  topband-btn → [Tab] rows-btn → [Tab] settings-btn → [Tab] BODY → [Tab] topband-btn
  ```
  `catalog-summary` **從未出現**、且確實走到了 summary 後面的
  `#rows-btn`／`#settings-btn`（證明 Tab 走查真的有在前進，不是「反正沒有
  其他東西可以停」的空比對）。
- **對照組（同 session，切到 390×844 後重跑同一走查）**：
  ```
  topband-btn → [Tab] catalog-summary → [Tab] rows-btn → [Tab] settings-btn → [Tab] BODY
  ```
  `catalog-summary` **確實出現**——證明桌面態「從未出現」不是走查方法本身
  失靈，而是 `display:none` 真的把它從 Tab 序列移除。
- **不可點擊**：在 `#catalog-details` 容器左上角（summary 原本會在的位置）
  做真實座標命中測試，`document.elementFromPoint` 命中 `<li>`（目錄第一項，
  因為 details 展開、內容往上頂到容器頂端），**不是** summary。

### 序列 6：`localStorage.getItem` 擲錯 → 斷言展開（fail-open）且無未捕捉例外

`seq6`，1311ms，**PASS**。以 `Page.addScriptToEvaluateOnNewDocument`
覆寫 `Storage.prototype.getItem`，對本 spike 的 `STORAGE_KEY` 恆擲錯：

- `document.getElementById('catalog-details').open === true`（fail-open，
  `shouldCollapse` 的 `try/catch` 接住了擲出的例外）。
- `Runtime.exceptionThrown` CDP 事件數 `=== 0`（`client.eventLog` 過濾
  結果為空陣列）——無未捕捉例外洩漏到頁面層級。

**測試碼教訓（記入本檔，非 proto.js 問題）**：本案第一版驗證碼曾誤用通用
`readState()` 輔助函式（該函式會另外直接呼叫一次
`localStorage.getItem(KEY)` 供診斷讀值）——但這次直接呼叫**本身**也會在
verify.mjs 端的 `Runtime.evaluate` 呼叫中擲錯（因為注入的覆寫對**任何**
呼叫者都擲錯，不分頁面內部或外部診斷探針），導致該次 `evaluate()` promise
reject、誤判為「FAIL」。修正後 `runSeq6` 只讀 `details.open`（走頁面內部
`shouldCollapse` 的 fail-open 路徑），不再額外呼叫
`localStorage.getItem(KEY)` 做診斷讀值。

## 機制比較：(a) summary-only vs (b) toggle+守衛+旗標

兩機制對序列 1–4 逐一實測（見上方各序列表格，`-a`／`-b` 成對呈現），**結果
完全一致——皆守住「localStorage 只在 <1100px 使用者互動時改變」**：

| 情境 | 機制 (a) | 機制 (b) |
|---|---|---|
| 序列 1（收合→重載仍收合） | PASS | PASS |
| 序列 2+3（跨斷點強制展開不清偏好、返回恢復） | PASS | PASS |
| 序列 4（展開自收合態→重載仍展開、key 已清） | PASS | PASS |

**推薦機制 (a)（summary-only）**，理由：

1. **天生免疫「程式化 toggle 也會被誤判」的問題**——機制 (a) 完全不掛
   `toggle` 監聽器，`wireBreakpointForcing` 的程式化 `details.open = ...`
   賦值無論如何都不會被誤判為使用者互動，**不需要**抑制旗標
   （`suppressing`）這層額外狀態；機制 (b) 則必須靠
   `matchMedia(...).matches` 守衛＋抑制旗標**兩層防線同時正確**才能達到
   相同效果，任一層漏接（例如忘記在某個程式化寫入路徑前後包
   `withSuppression`）就會靜默清除使用者偏好——這正是 PLAN §D8「持久化的
   觸發來源（硬性）」條目要提防的風險，機制 (a) 從設計上直接消解它，機制
   (b) 只是「正確實作了就不會」。
2. **程式碼更簡單**：機制 (a) 不需要維護 `suppressing` 旗標（本 spike 中
   `suppressing` 只被機制 (b) 讀取，機制 (a) 完全用不到，見 `proto.js`）。
3. 唯一代價：機制 (a) 依賴「原生點擊翻轉的時序」這個較不直覺的實作細節
   （見下方「平台坑」），需要用雙 `requestAnimationFrame` 才能讀到翻轉後的
   值；機制 (b) 靠監聽 `toggle` 事件本身即保證讀到翻轉後的值，時序上更
   直覺。**但這個代價是一次性、已在本 spike 解決並驗證的實作細節**，不是
   跨情境反覆要處理的心智負擔，故仍推薦 (a)。

## 平台坑：`<summary>` 點擊→`open`翻轉的實測時序證據

**這是本 spike 最重要的平台坑發現**，直接影響機制 (a) 的正確實作方式。以
獨立診斷腳本（真滑鼠點擊 summary，在同一個 click handler 內同時掛
`queueMicrotask`／`setTimeout(0)`／單一 `requestAnimationFrame`／雙
`requestAnimationFrame` 五種讀值時機）於 Chromium headless=new 實測：

| 讀值時機 | `details.open`（點擊前為 `true`） |
|---|---|
| click handler 同步執行當下 | `true`（**尚未翻轉**） |
| `queueMicrotask` | `true`（**仍未翻轉**——早於原生翻轉的 element task） |
| `setTimeout(0)` | `false`（已翻轉） |
| 第一次 `requestAnimationFrame` | `false`（已翻轉） |
| 第二次 `requestAnimationFrame` | `false`（已翻轉） |

**結論**：Chromium 對 `<summary>` 點擊的預設動作（翻轉 `open`＋派發
`toggle`）是透過「queue an element task」非同步排入，**排在同一輪
microtask 之後**——用 `queueMicrotask` 讀「翻轉後的值」**會讀到舊值**，
這是一個容易踩的坑（直覺上會覺得「點擊處理完了微任務應該夠用」，但原生
行為不是微任務排程）。`proto.js` 機制 (a) 因此選用**雙**
`requestAnimationFrame`（單一 rAF 實測已足夠，多一層是保險餘裕、成本可
忽略，且語意上更貼合「等這一輪畫面穩定後再讀」）。

## a11y tree 證據（`Accessibility.getFullAXTree`）

於 `seq5-a11y` 同一 session 內取得兩份 AX tree 快照（桌面 1400×1000／
行動版 390×844 對照組），以 `role.value === 'DisclosureTriangle'` 或
`name.value` 含「段落目錄」為篩選條件：

- 桌面（`display:none` 生效中）：**找不到**符合節點
  （`axNodeDesktopFound: false`）。
- 行動版（`display` 恢復正常）：**找得到**符合節點
  （`axNodeMobileFound: true`）。

兩者對照，證明桌面態「找不到」不是查詢條件寫錯，而是 `display:none` 確實
把該節點連同其 disclosure-triangle 角色一併移出 a11y tree（而非留著但標
`ignored`／`hidden` 屬性）——即「a11y 播報與可見狀態一致」的機械證據：
**不可見時，播報也完全不存在該節點**，不會有「螢幕報讀器讀出一個看不見
的收合把手」這種不一致。

## JS 失效態證據（`Emulation.setScriptExecutionDisabled(true)`）

兩個 viewport 各一（`js-disabled-1400x1000`／`js-disabled-390x844`），
皆 **PASS**：

- `document.querySelectorAll('[data-testid="catalog-item"]').length ===
  30`（30 項為靜態 HTML，非 JS `appendChild` 建置——proto.js 未執行也在，
  見下方「設計調整」）。
- 任一目錄項（`data-index="0"`）`getBoundingClientRect().height > 0`
  （1400×1000 下 `height: 29`；390×844 下 `height: 29`，寬度因欄寬不同分別
  為 `432.66`／`91`）。
- `document.elementFromPoint` 於該項中心點確實命中該項（或其後代）。
- `typeof window.__sf__ === 'undefined'`——佐證 proto.js **真的**沒有執行
  （非本項驗證本身失效導致誤判為「JS 有跑但剛好也通過」）。
- `document.documentElement.className === 'js-init-pending'`——出貨態的
  防閃動標記因為 JS 沒跑而**永遠沒被移除**（見下一節「平台坑」，這正是
  觸發需要 `<noscript>` 逃生門的原因）。

### 設計調整（spike 期間發現並修正，非事後補丁）：30 項目錄改為靜態 HTML

最初設計 30 項目錄由 `proto.js` 的 `buildCatalogItems()` 動態
`appendChild` 建置。**在寫 JS 失效態測試前** 就發現這與 D8 的 fail-open
要求直接衝突：JS 完全不執行時，清單會是**空的**，不滿足「JS 失效態下目錄
仍可達」。修正為 30 項一律**靜態 HTML**（出貨態即含全部項目），`proto.js`
只負責狀態機（收合／持久化／跨斷點），不建置清單內容。**此為本 spike 對
MS3 施工最直接的一條建議**（見下節）。

### 平台坑：防閃動 CSS 與 JS 失效態 fail-open 的衝突，及 `<noscript>` 逃生門

設計防閃動機制（`html.js-init-pending #catalog-list { max-height: 0;
overflow: hidden; }`，僅 `@media (max-width: 1099.98px)` 生效）時發現：
**這條規則的解除完全依賴 JS 執行**（`proto.js` 的 `init()` 移除
`js-init-pending` class）。若 JS 完全失效，`js-init-pending` **永遠不會被
移除**，於 <1100px 下目錄會被這條防閃動樣式**永久**壓成 0 高度——即使
`<details open>` 本身仍是展開的，使用者依然看不到任何目錄項，**直接牴觸
D8「JS 失效態下目錄仍可達」的驗收要求**。

**修法（已於 `proto.html` 實作並實測驗證）**：加一段 `<noscript><style>`，
在同一中斷點內用**相同選擇器、後於原規則**覆寫暫抑樣式
（`max-height: none; overflow: visible;`）。`<noscript>` 內容只有在瀏覽器
**scripting 旗標為停用**時才會被解析為真正的標記（與「JS 尚未執行完
init()」的暫態完全不同——後者瀏覽器仍會解析執行 `<script>`，`<noscript>`
內容不生效，不會誤蓋防閃動樣式）。

**額外實測確認的平台細節**：`Emulation.setScriptExecutionDisabled(true)`
不只是單純擋掉 `<script>` 標籤執行，也確實讓 HTML parser 把 `<noscript>`
內容當成真標記解析（本 spike 診斷腳本實測：`listRectHeight: 870`，非 0；
`js-disabled-390x844` 案的 `firstItemRect.height: 29 > 0` 也是同一條證據
鏈）；同時 CDP `Runtime.evaluate` **不受此旗標影響**，仍可正常讀取頁面
狀態做斷言（`js-disabled-*` 兩案能拿到任何讀值本身就是這條的證明）。

## 防閃動（PLAN 首繪方向機制）證據

`anti-flash` 案，2201ms，**PASS**。流程：於行動版建立收合偏好（真點擊
summary，確認 `localStorage` 為 `'1'`）→ 掛時序探針（`Page.
addScriptToEvaluateOnNewDocument` patch `DOMTokenList.prototype.remove`，
在 `js-init-pending` 被移除的那一刻記錄 `performance.now()` 與當下
`details.open` 的值）→ 重載。

**證據**：`js-init-pending` 被移除的那一刻，`window.__sf_antiflash__`
記錄為 `{ t: 25.8, openAtRemoval: false }`——即**暫抑樣式解除的瞬間，
`details.open` 已經是最終值（收合）**，不是「先展開、稍後才收起」再解除
暫抑。

**方法限制（誠實聲明）**：本證據是**因果順序**的機械證明（`init()` 內
「決定並設定 `open`」與「移除暫抑 class」在同一個同步函式呼叫、無任何
`await`／排程夾在中間，`proto.js` 原始碼可逐行核對），佐以
`DOMTokenList.prototype.remove` 覆寫捕捉「移除發生時 `open` 已是什麼值」
的執行期證據——**不是**逐畫格擷取螢幕像素、機械證明瀏覽器從未在中間繪製
出一格「展開態」的畫面。後者需要 `Page.startScreencast` 或
`captureScreenshot` 搭配掉幀分析，超出本 spike 的時間與價值評估（因果順序
證明＋源碼可核對，已足以支撐「設計上不會閃」的結論；真正的視覺迴歸應留給
未來若有 flake 回報時再補逐格擷取）。

## 對 MS3 施工的具體建議

1. **30 項目錄／未來實際段落清單必須是靜態 HTML**（出貨態直接內嵌全部
   `<li>`／段落列），不可由 JS 動態建置清單內容本身——否則 JS 失效態下
   fail-open 承諾（PLAN §D8「S-f 須斷言『JS 失效態下目錄可達』」）不成立。
   狀態機 JS（收合／持久化／跨斷點）與清單內容建置**必須解耦**。
2. **防閃動 CSS 必須搭配 `<noscript>` 逃生門**，選擇器與媒體查詢範圍需與
   原暫抑規則**完全對稱**（同一 `@media` 範圍、同一選擇器），只是效果
   相反（解除暫抑）且置於**後於**原規則的位置（利用來源序後者覆寫，不需
   `!important`，較不易與未來其他樣式規則的優先權衝突）。這條在 PLAN
   §D8「首繪方向」原文字面中**沒有**明寫，是本 spike 施工過程中才發現的
   缺口，**MS3 實作前務必回填 PLAN 該節**。
3. **持久化機制選用 (a)（summary-only）**：只在 `<summary>` 掛
   `click`／`keydown`（`Enter`／`Space`）監聽，完全不接 `toggle`。讀取
   「翻轉後的 `details.open`」**務必**用 `requestAnimationFrame`（建議雙
   rAF 留餘裕）而非 `queueMicrotask`——後者實測會讀到翻轉前的舊值（見
   「平台坑」節時序表）。`keydown` 監聽器需比照 `proto.js` 判斷
   `ev.key === 'Enter' || ev.key === ' '`（Chromium 對 focus 中的
   `<summary>` 按 Enter/Space 亦會觸發原生 `click` 事件，故理論上單掛
   `click` 已可涵蓋鍵盤活化，`keydown` 監聽屬防禦性重複—MS3 實作時可視
   實測結果決定是否精簡掉，非強制兩者都要）。
4. **跨斷點強制展開／恢復用單一 `matchMedia('(max-width: 1099.98px)')`
   change 監聽 + 單一 `apply()` 函式**（見 `proto.js`
   `wireBreakpointForcing`），桌面態恆展開（不清 `localStorage`）、行動版
   態依當前謂詞值恢復——不需要為「強制展開」與「恢復收合」寫兩套邏輯。
5. **CDP `Emulation.setDeviceMetricsOverride` 於同一 session 內動態切換
   寬高，會正確觸發既有 `matchMedia` 物件的 `change` 事件**（本 spike
   序列 2/3 兩機制皆 PASS 即為證據）——MS3 的 e2e 案（`scripts/
   e2e-statusline.mjs` 既有慣例）可放心用同一手法測跨斷點行為，不需要
   `Page.navigate` 重新整頁才能觸發斷點重估。
6. **`Emulation.setScriptExecutionDisabled(true)` 是 MS3／MS4 e2e 驗
   「JS 失效態」的正確工具**：它同時關閉頁面 `<script>` 執行與觸發
   `<noscript>` 標記解析，但**不**影響 CDP `Runtime.evaluate` 本身可用性
   ——可放心用它驗證 fail-open 承諾，不需要另外想辦法「假裝」JS 失效。
7. **桌面態硬條件維持 PLAN 既定的 `matchMedia` 切 `open` ＋
   `@media(min-width:1100px){summary{display:none}}`** 組合——本 spike
   證實它同時滿足「非 Tab 停點」「不可點擊」「a11y 播報與可見狀態一致」
   三項硬條件，且用真實 Tab 走查（非恆真空比對）與真實座標命中測試機械
   驗證過，MS3 可直接照抄此 CSS 策略，不需要另尋替代方案（PLAN 已明確
   排除 `::details-content` 純 CSS 路徑，本 spike 未重新測試該路徑，
   遵照 PLAN 既定裁決）。

## 單元測試零影響確認

`npm test`（vitest run）：本任務僅新增
`magi/15-statusline-editor-layout/spikes/s-f/` 與本結果檔，皆在 vitest
掃描範圍外（新檔非 `*.test.*`／`*.spec.*`，且路徑不在 `tools/`／`src/`／
`scripts/`）。跑一輪確認零影響——1934 passed / 1 pre-existing flake
（`catalog-sample-values.dom.test.ts` 全跑批下 5000ms timeout，與本任務
改動的檔案無關；該檔獨立重跑 `npx vitest run tools/statusline-builder/
catalog-sample-values.dom.test.ts` 9/9 全過，確認為既有環境負載型 flake，
與 `S-d-RESULT.md` 記錄的同一既知 flake，非本次改動引入）。
