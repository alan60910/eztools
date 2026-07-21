# S1-RESULT — 三欄複合版面 PoC 結論（T1.1 + T1.2）

> Source: `magi/14-statusline-ux-round2/spikes/s1-layout-poc.html`
> Sprint: `magi/14-statusline-ux-round2/`　Lane: A（T1.1／T1.2／T1.6）
> 對照設計契約：`PLAN.md` Rev 4 §D2（三欄終形）／Spikes 節 S1
> 環境：Windows 11；Microsoft Edge 150.0.4078.83（`C:\Program Files
> (x86)\Microsoft\Edge\Application\msedge.exe`）；CDP headless=new，
> viewport 1400×1000（桌面）／480×900（行動，T1.6 用）。

## 方法說明

PoC 為零外部資源的自足 HTML（inline CSS/JS），以 `file://` URL 直接餵給
Edge（`--allow-file-access-from-files --headless=new`），透過 CDP
（`Runtime.evaluate`／`Input.dispatchMouseEvent`／`Input.dispatchKeyEvent`／
`Input.dispatchDragEvent`／`Emulation.setEmulatedMedia`）量測。所有量測
腳本為本次任務的暫存工具（未簽入 repo，位於 scratchpad），本檔逐項附上
量測手法（CDP 呼叫／JS 運算式）與關鍵輸出數字，供獨立覆核。

依專案既有慣例（`scripts/e2e-statusline.mjs` 檔頭文件：「逐案全新瀏覽器＋
全新 user-data-dir——同 session 第二次拖曳的合成 drop 管線不穩」）：本次
量測起初以單一長 session 跑完全部檢核，**實測驗證此慣例成立**——長
session 下 rAF 驅動的 JS 計時退化（見「T1.2 JS 捲動補償」節），改為逐組
全新瀏覽器行程後數字乾淨一致；後續檢核改採全新瀏覽器逐組執行。

假頁首高度以 CDP 對 `npm run build` 產物（`dist/`，gitignored、非出貨
原始碼）實測 `tools/statusline-builder/index.html` 之 `header` 元素於
1400×1000 viewport 得 ≈236px（含 header padding-block 2rem 1.25rem＋
h1/p/兩按鈕），PoC 假頁首以同款內容排版，實際渲染測得 268px（因假頁首
說明文字較長換行更多——非出貨文案，數字差異不影響幾何驗證結論）。
`--column-top` 由 PoC 自身 JS 於 load 後依假頁首 `getBoundingClientRect().
height` 動態寫入（非寫死常數），與 PLAN 破口後備「頁首高度靜態、變數
可行」的設計一致。

---

## 檢核逐項結論

### 1. 中欄 sticky×右欄 sticky 複合行為 —— **通過**

量測：對 `#preview-sticky`／`#col-list` 兩節點在 scrollY ∈
{0,100,200,268,300,316,500,2000} 逐點量測 `getBoundingClientRect().top`。

| scrollY（請求） | 實際 scrollY | previewTop | listTop |
|---:|---:|---:|---:|
| 0 | 0 | 292 | 292 |
| 100 | 100 | 192 | 192 |
| 200 | 200 | 92 | 92 |
| 268（＝頁首高度） | 268 | 24 | 24 |
| 300 | 300 | -8 | -8 |
| 316 | 316（頁面可捲最大值，逾此即被瀏覽器 clamp） | -24 | -24 |
| 500／2000（超出可捲範圍） | 316（同上，clamp） | -24 | -24 |

兩節點在**每一個取樣點皆完全同值**，代表兩個獨立 `position:sticky;
top:0` 元素之間互不干擾、同步卡住／同步隨頁面捲動——複合行為成立，無
交互破口。

補充幾何說明（非破口，供實作參考）：`-24` 為本 PoC 頁面本身可捲動範圍
（316px，因 PoC 無 `<main>` 之後的額外內容如頁尾撐開頁面）在其上限時的
自然殘值，非「卡住失效後又被推走」——兩欄仍完全同步（-24 對 -24）。
右欄（`.col--list`）因 `max-height:100dvh` 且通常是三欄中最高（30 段
目錄＋已選擇清單），其自身框高度往往等於／接近 grid 該列高度，故其
sticky 的「卡住可再往下捲的餘裕」天生很小——但這不構成問題：一旦使用者
捲過該餘裕，代表已捲到頁面本身的底（此 PoC 無頁尾內容），繼續往下捲
沒有語意；正式頁面若 `<main>` 後有頁尾等內容，行為會是「捲過此列後
繼續捲出頁尾」，符合預期，非本檢核關注的複合 sticky 互相干擾範疇。

### 2. 內捲不連鎖（overscroll-behavior） —— **通過**

量測：`getComputedStyle(colList).overscrollBehaviorY` 確認為 `"contain"`；
將 `#col-list.scrollTop` 設為其 `scrollHeight`（593，已達上限）、
`window.scrollY` 重置為 0，於 `#col-list` 範圍內（以 `elementFromPoint`
驗證命中點確實落在 `#col-list` 內部，見下方「方法論筆記」）連續 dispatch
8 次 `Input.dispatchMouseEvent(type:'mouseWheel', deltaY:120)`：

```
overscroll-behavior-y computed: contain
col scrollTop 設為上限: 593
window.scrollY (wheel 前): 0
elementFromPoint 命中點確認在 #col-list 內: true
wheel 後 → window.scrollY: 0（不變）；col.scrollTop: 593（維持 clamp，未反彈）
```

`window.scrollY` 全程維持 0，`#col-list.scrollTop` 全程維持上限
593——內捲到底後**未**連鎖捲動外層頁面，`overscroll-behavior:contain`
生效。

**方法論筆記（非產品破口，記錄供覆核）**：首輪量測誤用畫面正中央座標
作為 wheel dispatch 點，該座標恰與 PoC 專用測試面板（`.poc-panel`，
`position:fixed` 置於右下角、非出貨 UI 的一部分）重疊，滾輪事件命中的
其實是面板按鈕而非 `#col-list`——因面板為 `position:fixed`（不在
`#col-list` 的捲動子樹內），其預設滾輪行為直接捲動整個頁面，造成
`window.scrollY` 從 0 變為 316 的假陽性（誤以為連鎖捲動）。改用
`elementFromPoint` 驗證命中點確實在 `#col-list` 內部後，複測結果如上
（不連鎖）。生產版面不會有此測試面板，此筆記僅供理解本 PoC 量測過程。

### 3. dismiss 後高度自然回收 —— **通過（需搭配一條既有防禦規則）**

量測：`#col-list.scrollHeight` 於教學帶 dismiss 前後：

```
beforeHeight: 1593
afterHeight: 1536
教學帶量測高度（含 margin-bottom）: 53.09375px
delta: 57（收合後淨減少的捲動高度，涵蓋教學帶自身高度＋其 margin-bottom）
```

高度自然回收，無需任何「calc 預算」式的手動高度管理，符合 round-1
「calc 預算過期」問題已由「單一捲動容器＋純文件流」解法消解的設計
判斷。

**實作提醒（M2 必須沿用既有規則，非新發現的破口）**：dismiss 用
`hidden` 屬性隱藏教學帶，但作者層 `.tutorial-band { display:flex }`
與 UA 內建 `[hidden]{display:none}` 兩者 **specificity 相同**
（皆 0,1,0）——若不補一條 `[hidden]{display:none!important}`，
cascade 順序會讓作者規則勝出，`hidden` 屬性形同虛設（本 PoC 開發期間
CDP 實測踩到，加入該規則後才通過）。`src/style.css` **已有**這條
規則（見該檔案 `[hidden]{display:none!important}` 附近註解，說明
與此完全一致），M2 的 `.tutorial-band` 屬既有 `tools/statusline-builder/
style.css`／`src/style.css` 疊加範圍內，理論上已受該既有全站規則保護
——僅提醒 M2 實作者確認教學帶樣式不要用比 `[hidden]` 更高 specificity
的選擇器（如 id 選擇器）覆寫 display，否則會重踏本 PoC 踩過的坑。

### 4. 初載（scrollY=0）欄底可達性 —— **確認為真實破口，後備顯著改善**

量測：頁面剛載入（未捲動）時 `#col-list.getBoundingClientRect().bottom`
與 `window.innerHeight` 的差值：

| 模式 | `rect.bottom` | `innerHeight` | 超出量 |
|---|---:|---:|---:|
| 正常（`max-height:100dvh`） | 1292 | 1000 | **292px** |
| 破口後備（`max-height:calc(100dvh - var(--column-top))`） | 1024 | 1000 | **24px** |

正常模式下超出量 292px，與 PLAN 預判「欄底超出視窗恰為頁首高度」
（本 PoC 假頁首實測 268px）數量級相符（292 略高於 268，差額來自
`.col--list` 自身 `padding-bottom:1rem` 等版面細節，非量測誤差）。
啟用 `calc(100dvh - var(--column-top))` 後備後，超出量降至 24px
（改善 **92%**），已接近可忽略程度（略高於 0 的殘值同樣來自
`padding-bottom` 等版面細節，非 calc 公式本身失準）。

**判定：破口成立，啟用 PLAN 既定後備（`calc(100dvh - var(--column-top))`，
`--column-top` 為頁首高度、JS 於 load 後一次性寫入）**——不新增架構，
依 PLAN 既有裁決执行；M2 落地時建議連同 `.col--list` 的
`padding-bottom` 一併計入預算，或接受 24px 殘值（約 1–2 行目錄項的
高度，使用者只需再捲動極小距離即可，非阻斷性破口）。

### 5. move 鈕浮現態在捲動容器內不被裁切 —— **通過**

量測（手動 `.row--reveal-sim` 切態＋真 Tab 鍵兩種觸發路徑皆測）：

- 手動切態（等待 CSS `transition:opacity .12s` 過渡完成後量測，見下方
  方法論筆記）：`groupOpacity:"1"`、`pointerEvents:"auto"`、
  `withinCol:true`（`.selected-row__move` 內鈕的 rect 完全落在
  `#col-list` 自身 rect 之內，`scrollIntoView` 後不被裁切）。
- 真實鍵盤 Tab（`Input.dispatchKeyEvent` 連續送 Tab，非模擬
  `.focus()`）：Tab 走到第一顆 `.move-up` 鈕時，`.selected-row__move`
  computed opacity 為 `"0.469531"`（transition 進行中的取樣值，非 0，
  證實 `.selected-row:has(:focus-visible)` 確實被真實鍵盤焦點觸發）、
  `pointerEvents:"auto"`（pointer-events 非 transition 屬性，已即時
  切換）。

**方法論筆記**：`.selected-row__move` 帶 `transition:opacity .12s`
（對應 D1-B′ 設計意圖：平滑浮現而非瞬間切態）。若在切換 class 後**同一
JS tick 內同步**讀 `getComputedStyle().opacity`，讀到的是 transition
起點值（0），非目標值——首輪量測誤踩此坑，加入等待（250ms，或如
Tab 走查案例直接記錄 transition 進行中的中繼值以證明路徑確實觸發）後
確認浮現正確生效。M2/M3 若寫 dom 測試斷言 revealed opacity，需注意
jsdom 通常不跑真 transition（`getComputedStyle` 會直接讀到目標值），
但 e2e 若走真瀏覽器斷言則需比照本筆記等待或改斷言 `pointerEvents`
（非 transition 屬性、即時生效，較穩定的斷言點）。

### 6. 點擊收納鈕原位置無效果 —— **通過**

量測：收納態下 `.selected-row__move` computed `opacity:"0"`、
`pointerEvents:"none"`；於該鈕自身中心座標呼叫
`document.elementFromPoint(cx,cy)`，命中元素為 `LI.selected-row`
（父層列，非按鈕本身）——確認 `pointer-events:none` 使收納態按鈕
不可命中。以 CDP `Input.dispatchMouseEvent`（真實合成滑鼠事件，非
JS `.click()`）在同一座標 `mousePressed`→`mouseReleased`：

```
clickCountBefore: "0"
clickCountAfterDispatch: "0"
```

按鈕自身的 click 計數器（每次真正被點擊即遞增）維持 0——收納態下
「點擊原位置」確實對按鈕本身零效果，符合 round-2 裁定
（`opacity:0 + pointer-events:none`，非僅視覺隱藏）。

### 7. SVG 教學動畫 currentColor 深淺主題跟隨 —— **通過**

量測：`.tutorial-svg` computed `color`：

```
淺色主題: rgb(75, 85, 99)   ← var(--fg-muted) 淺色值 #4b5563
深色主題: rgb(155, 163, 175) ← var(--dark-fg-muted) 深色值 #9ba3af
differs: true
```

SVG 使用 `stroke="currentColor"`／`fill="currentColor"`，主題切換
（`data-theme` 屬性）後顏色隨 `--fg-muted` token 連動，無需另外對 SVG
本身寫色。

**附帶檢核（reduced-motion，非 S1 七項之一但同批驗證）**：以 CDP
`Emulation.setEmulatedMedia({features:[{name:'prefers-reduced-motion',
value:'reduce'}]})`（非本 PoC 自製的模擬開關，而是**真實**媒體查詢
模擬）量測 `.tutorial-svg__box` computed `animationName`：

```
reduce 前: "tutorial-drift"
reduce 後: "none"
```

`@media (prefers-reduced-motion: reduce)` 規則正確停格動畫。

---

## T1.2 — 拖曳邊緣自動捲動（Chromium/Edge 與 Firefox 兩腿）

### Chromium/Edge 腿 —— **通過（原生行為即滿足，免 JS 後備）**

環境：Microsoft Edge 150.0.4078.83（Chromium 基底）。量測：以 CDP
`Input.setInterceptDrags` + `dispatchMouseEvent`（建立拖曳 session）+
`Input.dispatchDragEvent`（`dragEnter`→連續 `dragOver`）把目錄第一項
（`model`）拖到 `#col-list` 底緣（`rect.bottom - 6`）並持續停留
（20 次 `dragOver`、間隔 80ms、共 1.6s）：

```
scrollTopBefore: 0
scrollTopDuring（停留中量測）: 593
scrollTopAfter（drop 後）: 593
moved: true
```

原生瀏覽器邊緣自動捲動**確實觸發**，且在 1.6 秒內就把巢狀
`overflow-y:auto` 容器捲到底（593＝上限）。**Chromium/Edge 腿不需要
JS 捲動補償**，PLAN 提及的「Firefox 歷史上不觸發內層容器」風險在
Chromium 系不成立。

### Firefox 腿 —— **待真機手測（本機無 Firefox，依規範明記，非省略）**

本機 Firefox 安裝探測（`Get-Command firefox`／三個常見安裝路徑
`Test-Path`）結果：

```
Get-Command firefox -ErrorAction SilentlyContinue → (無輸出，未找到)
Test-Path 'C:\Program Files\Mozilla Firefox\firefox.exe'          → False
Test-Path 'C:\Program Files (x86)\Mozilla Firefox\firefox.exe'    → False
Test-Path '<LOCALAPPDATA>\Mozilla Firefox\firefox.exe'            → False
```

本機未安裝 Firefox，**Firefox 腿無法在本次任務內實測，明記為「待真機
手測」**，不得以 Chromium 結果代替下結論。

### JS 捲動補償方案（Firefox 破口預案）—— **演算法已實作並獨立驗證正確**

依 PLAN 既定備援要點（拖曳中偵測 pointer 近容器邊緣 → rAF 連續
scrollTop 補償 → dragend/drop 停止、冪等清理）於 PoC 中完整實作
（`s1-layout-poc.html` 內 `compensationTick`／`dragover`／`drop`／
`dragleave`／`dragend` 監聽器），並額外暴露一個唯讀測試 hook
（`window.__poc.simulateCompensationAtBottomEdge(durationMs)`）
**獨立於真實拖曳事件**直接驅動同一段 rAF 迴圈本體，量測其自身正確性
（因 Chromium 原生自動捲動已確認生效，若仍走真拖曳測 JS 補償，兩者
效果會混在一起、無法歸因）：

```
rAF 節流探測（同一頁面連續 1000ms 內 rAF 觸發次數）: 61 次（≈60fps，無節流）
補償迴圈啟動前 col.scrollTop: 0
以 simulateCompensationAtBottomEdge(1000) 執行 1000ms 後: 593（＝上限，滿量）
moved: true
```

演算法本身（pointer 距邊緣 <40px 判定帶 → 每 rAF 遞增 12px →
1000ms 內可達上限）邏輯正確、非節流環境下能在 1 秒內把容器捲到底，
足以作為 Firefox 若經真機驗證仍不觸發原生邊緣捲動時的可信後備方案；
方案要點（供 M2 直接落地）：

1. 監聽 `.col--list` 的 `dragover`：`preventDefault()`（允許 drop 的
   前提之一，非額外行為）＋記錄 `event.clientY`。
2. 若指標 y 距容器頂／底緣 <40px（可調），以 `requestAnimationFrame`
   連續遞增／遞減 `scrollTop`（每 tick 12px，可調）。
3. `drop`／`dragend`／`dragleave` 任一觸發即呼叫同一個
   `stopCompensation()`（清空記錄的指標位置＋`cancelAnimationFrame`），
   冪等（重複呼叫安全）。
4. 建議僅在偵測到 Firefox 且巢狀容器原生自動捲動確認不觸發時才啟用
   （避免與可能存在的原生行為重複疊加捲動速度）——本 PoC 用手動開關
   демонstrate 兩態，M2 正式接線時的啟用時機判斷（UA 偵測 vs 特徵偵測）
   留待 M2 依真機 Firefox 驗證結果決定。

**方法論筆記**：JS 補償演算法的量測**必須用獨立 fresh 瀏覽器 session**
（見檔頭「方法說明」）——同一長 session 內連續跑完本檔全部檢核後再測
此項，曾量到僅 12px（rAF 明顯被節流／延遲，非演算法錯誤），與獨立
session 下乾淨的 593px 結果矛盾；改為逐組全新瀏覽器行程後數字穩定
重現。此現象與專案既有 `scripts/e2e-statusline.mjs` 檔頭文件所述
「同 session 第二次拖曳的合成 drop 管線不穩」屬同一類問題的另一種
表現形式（rAF 計時而非 drop 管線），佐證該慣例的必要性不限於 drag
drop 本身。

---

## 總結

| 檢核項 | 判定 |
|---|---|
| 中欄×右欄複合 sticky | 通過 |
| 內捲不連鎖（overscroll-behavior） | 通過 |
| dismiss 後高度自然回收 | 通過（需 `[hidden]!important`，src/style.css 已有） |
| 初載欄底可達性 | 破口成立 → 啟用 `calc()` 後備（292px→24px，改善 92%） |
| move 鈕浮現不被裁切 | 通過 |
| 點擊收納鈕原位置無效果 | 通過 |
| SVG currentColor 主題跟隨 | 通過 |
| 拖曳邊緣自動捲動：Chromium/Edge | 通過（原生已足，免 JS 後備） |
| 拖曳邊緣自動捲動：Firefox | 待真機手測（本機無 Firefox） |
| JS 捲動補償方案（Firefox 預案） | 已實作＋獨立驗證演算法正確，備援方案要點已產出 |

M2 落地建議：三欄終形幾何契約（D2）可直接照 PLAN 既定設計實作，唯一
需要落地的後備是「初載欄底可達性」的 `calc(100dvh - var(--column-top))`
（`--column-top` 建議比照本 PoC 做法、由 JS 於 load 後依實際頁首高度
一次性寫入 CSS 變數，而非寫死常數）；Firefox 拖曳自動捲動須留待真機
驗收批次補測，若證實破口則直接套用本檔已驗證的 JS 補償演算法。
