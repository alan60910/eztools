# S3 — 焦點模態矩陣實測（T1.4 / D1-B′ 驗證）

> Sprint: magi/14-statusline-ux-round2 • Milestone 1 Lane C • 2026-07-20
> 產物：`s3-focus-matrix.html`（仿真列自足單檔）＋`s3-run.mjs`（CDP 執行器）
> 原始輸出：`s3-run.mjs` stdout（本檔逐格結論皆抄自實測 JSON，非臆測）

## 方法與 caveat（逐格結論的解讀前提）

- **仿真列盤點**（依設計契約 D1-B′）：button×3（move-up／move-down／
  remove）＋select×2（row-select／variant）＋checkbox×2（icon／bar），
  **無文字輸入於矩陣內**。另掛一個**列外** `<input type=text>`（`.extra-text`）
  單獨探「文字輸入 mouse 即 focus-visible」caveat（見下）。
- **收納態**＝`opacity:0 + pointer-events:none`（**未**用 display/visibility
  ——留佈局佔位與 Tab 序）；浮現規則＝`.row:has(:focus-visible) .row__move
  { opacity:1; pointer-events:auto }`（純 CSS，即待驗證的 D1-B′ 主方案）。
- **輸入路徑 caveat（必讀）**：本矩陣以 CDP `Input.dispatchMouseEvent`／
  `dispatchKeyEvent` 注入。這是**合成 trusted 輸入**（`isTrusted=true`、走
  同一輸入管線，故 `:focus-visible` 模態啟發式**會作用**），**但非實體
  裝置手勢**——pointer 種類（滑鼠 vs 觸控）、實際硬體事件細節與真人操作
  不完全等同。以下「滑鼠」＝CDP 合成左鍵 press+release；「鍵盤」＝CDP 合成
  Tab。真機（尤其觸控）行為由第三輪真機驗收收尾。
- **headless 焦點**：`--headless=new` 下 `:focus`/`:focus-visible` 需頁面
  為聚焦態，故啟用 `Emulation.setFocusEmulationEnabled({enabled:true})`。
- **引擎重複揭露**：本機僅 Edge＋Chrome，**皆 Chromium 150**（Edge
  150.0.4078.83／Chrome 150.0.7871.127），兩者逐格結論**完全一致**——
  屬同引擎重複樣本，**非異質**。**Firefox＝真正異質樣本，本機未安裝**
  （`where firefox` 無、常見安裝路徑皆無）→ Firefox 全格標「待真機」，
  文末附人工重現配方。Node v24.10.0。

## 矩陣（Chromium 150：Edge＝Chrome，逐格同值；Firefox 待真機）

四斷言：(a) 滑鼠點該控件→收納維持？ (b) Tab 進列至該控件→浮現？
(c) 浮現前後 rect 零位移？ (d) 浮現態下 move 重渲染＋程式化還焦→浮現延續？

| 控件類別 | (a) 滑鼠點→維持收納 | (b) Tab→浮現 | (c) 零躍動 | (d) 還焦後延續 | Firefox |
|---|---|---|---|---|---|
| **button**（move-up/down、remove） | ✅ 維持收納（opacity=0、`activeFV=false`） | ✅ 浮現（opacity=1） | ✅ rect 逐格相同 | ✅ 延續（opacity=1、fv=true） | 待真機 |
| **checkbox**（icon、bar） | ✅ 維持收納（opacity=0、`activeFV=false`） | ✅ 浮現（opacity=1） | ✅ rect 相同 | ✅（同上路徑） | 待真機 |
| **select**（row-select、variant） | ❌ **浮現**（opacity=**1**、`activeFV=**true**`） | ✅ 浮現 | ✅ rect 相同 | ✅ 還焦後延續（keyboard 起手，opacity=1） | 待真機 |

**逐格實測數值（Chromium，Edge＝Chrome）**：

- (a) 滑鼠點擊 `moveOpacity` / `activeFocusVisible`：
  `remove`→`0`/`false`；`icon`→`0`/`false`；`bar`→`0`/`false`（button/checkbox
  **不浮現**）｜`row-select`→**`1`/`true`**；`variant`→**`1`/`true`**（select
  **浮現**）。
- (b) Tab 走查（sentinel 先滑鼠點＝mouse 模態、`revealed=false`；之後每 Tab
  一格）：`move-up`→`move-down`→`remove`→`row-select`→`variant`→`icon`→`bar`
  **每格 opacity=1**（全數浮現）；列外 `extra-text` opacity=0（在列外，不觸發
  `.row:has()`）。
- (c) 零躍動：`rowIdentical=true`、`allControlRectsIdentical=true`。收納
  `row rect {x24,y130,w1152,h58}` ＝浮現態逐 byte 相同；move-up/down 等所有
  控件 rect 亦逐格相同（opacity 不影響佈局，佔位保留）。
- (d) 還焦延續：Tab 到 move-up（浮現）後 `simulateMoveRefocus`（detach→
  re-append 整列→`.focus()`）→ 還焦 `move-down`：opacity=**1**、fv=true；
  還焦 `row-select`：opacity=**1**、fv=true。**keyboard 起手之程式化還焦，
  純 CSS focus-visible 延續**（比照 main.ts:2363 move 鈕還焦／main.ts:1497
  row-select 還焦兩條真實路徑）。

**外加：「點擊收納鈕原位置無效果」**（Chromium）：收納態下 move-up 中心點
`elementFromPoint` 命中 `<li>`（`hitTag="li"`、`hitIsMoveUp=false`），對該點
派 click 後 `moveUpClicked=0`——**收納鈕點擊為 no-op**（`pointer-events:none`
使點擊穿透至列本身、不觸發鈕 handler）。故 D1-B′「不議 `visibility:hidden`」
成立：`opacity:0 + pointer-events:none` 已同時給到零躍動＋no-op 命中＋留
Tab 序，無需 `visibility:hidden`。

**文字輸入 caveat（矩陣外、但攸關真實列）**：列外 `.extra-text` 滑鼠點擊
→ `activeFocusVisible=true`（文字輸入**任何** focus 皆 focus-visible）。真實
segment-row 的 **prefix `<input type=text>`（index.html:881）在列內**——推論：
使用者**滑鼠點 prefix 欄即會使 move 鈕浮現**（純 CSS 下的第二個模態破口，
與 select 同源）。此為真實列的既存事實，非本仿真造作。

## D1 選型結論

**純 CSS `:has(:focus-visible)` 無法守住「滑鼠點擊不浮現」保證——建議改採
D1-B′ 文載後備：JS keydown/mousedown 模態旗標＋class 切換。**

依據（全屬 S3 實測，非文件轉述）：

1. **select 是決定性破口**：`row-select`（`.segment-row__row-select`）**每個
   啟用列恆有**、`variant` 於 cwd/rate-5h/rate-7d 有——Chromium 對 select
   滑鼠點擊給 `:focus-visible=true`，move 鈕**隨滑鼠點浮現**（實測 opacity 0→1）。
   契約「select 滑鼠模態為已知變異點」**證實**，且方向對 D1 不利。
2. **prefix 文字輸入是第二破口**：列內文字輸入任何 focus 即 focus-visible
   （實測 `activeFV=true`），滑鼠點 prefix 亦會浮現。
3. **純 CSS 唯一守得住的是 button/checkbox**（(a) 全 `false`）——但真實列
   同時含 select×(1~2)＋text×1，故整列「滑鼠不浮現」**破**。
4. 純 CSS **並未**在 (d) 還焦格失手（Chromium keyboard 起手還焦延續正常）；
   破口**專在 select/text 的滑鼠浮現**，(d) 非本次否決理由——記明以免誤植。
5. **JS 旗標後備的正面依據**（S4 佐證）：模態由 JS `mousedown`/`keydown`
   顯式判定、對所有控件類別**均勻**（select/text 不再例外破口）；旗標跨
   程式化還焦**天然延續**（還焦時旗標仍在）；且 **dom 可斷言**（classList），
   使「常駐滑鼠不浮現」回歸案得落 dom 層——見 S4-RESULT 分層表。

**保留不變**：收納態 CSS 仍為 `opacity:0 + pointer-events:none`（S3 已證零
躍動＋no-op＋留 Tab 序）；JS 旗標僅把**浮現觸發**由 `:has(:focus-visible)`
換成 `.row--reveal` class（`.row.row--reveal .row__move{opacity:1;
pointer-events:auto}`）。實作細節（focusout 收 class、模態旗標掛 document
capture）留 M2/T2.5。

**Firefox 待真機影響**：Firefox 對 select 滑鼠 focus-visible 歷史上較保守
（可能不浮現），意即純 CSS 下 Chromium／Firefox 對 select 行為**不一致**
——無論 Firefox 實測結果為何，跨引擎不一致本身即再一條偏向 JS 旗標（行為
均勻）的理由。

## 重現配方

- **Chromium 自動矩陣**：`node magi/14-statusline-ux-round2/spikes/s3-run.mjs`
  （預設 edge＋chrome 各跑一輪；`node s3-run.mjs edge` 單跑；`S3_HEADED=1`
  切 headed 供人工目視）。輸出為 JSON。
- **Firefox 人工重現（待真機）**：以 Firefox 開
  `magi/14-statusline-ux-round2/spikes/s3-focus-matrix.html`；
  (a) 滑鼠點 row-select／variant／icon／remove，各看 move 鈕群是否浮現
  （DevTools 查 `.row__move` computed opacity，或 console
  `window.__spike.revealState()`）；
  (b) 從 sentinel 起連續 Tab，逐格 `window.__spike.revealState()`；
  (c) 比對 `window.__spike.rectSnapshot()` 收納 vs 浮現；
  (d) `window.__spike.simulateMoveRefocus('move-down')` 後看是否延續。
  頁內 `window.__spike.eventLog()` 記每次 focus 當下的 focus-visible 態。
