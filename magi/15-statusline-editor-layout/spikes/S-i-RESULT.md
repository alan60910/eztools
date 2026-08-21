# S-i-RESULT — 跨欄拖曳（獨立原型，MS1 spike，T1.8）

> Source: `magi/15-statusline-editor-layout/spikes/s-i/`（`proto.html`／
> `proto.js`／`verify.mjs`，全新獨立原型，非既有 `scripts/
> e2e-statusline.mjs` 的一部分）。
> Sprint: `magi/15-statusline-editor-layout/`　對照設計契約：`PLAN.md` §S-i
> （L355-363）、`TASKS.md` T1.8、G4 硬驗收（`PLAN.md` §Verification
> L477-482）。
> 環境：Windows 11；Microsoft Edge（`C:\Program Files (x86)\Microsoft\Edge\
> Application\msedge.exe`）；CDP headless=new；viewport 1280×800（sprint 15
> 預算基準）。
> 驗證跑批：3 輪獨立全量執行（`node verify.mjs`），下稱 run4／run5／run6
> （run1-3 為方法論校準過程，見下方「方法論校準」節，數據不採用）。

## 原型設計摘要

`proto.html`／`proto.js` 建了一個與 sprint 15 目標版面同構的最小骨架：

- 固定高度頂帶（`--band-h: 56px`，`position: sticky; top: 0`）。
- 左欄 `#catalog-column`（30 個 `draggable="true"` 目錄項）／右欄
  `#row-column`（5 個列群組、共 22 列，列數不均 4/5/3/6/4 模擬真實版面高度
  不均），兩者皆 `overflow-y: auto; max-height: calc(100dvh - var(--band-h)
  - 32px)`——**各自獨立捲動容器**，這正是 sprint 15 新引入、待驗證的幾何。
- `proto.js` 僅接 DnD 事件（`dragstart`／委派在 `#row-column` 的
  `dragenter`／`dragover`／`drop`），**刻意不實作任何自訂邊緣自動捲動邏輯**
  ——本 spike 要驗證的正是「Chromium 是否已原生做這件事」，原型自己動手捲
  的話量到的就是我們自己的邏輯而非平台行為。
- 曝光 `window.__dndLog`（事件序列）／`window.__indicatorState`（插入指示
  位置）／`window.__resetProto()` 供 CDP `Runtime.evaluate` 讀取／重置。

`verify.mjs` 的 CDP 全鏈手法（`Input.setInterceptDrags`／
`Input.dispatchDragEvent`／bootstrap）**複製自** `scripts/e2e-statusline.mjs`
`dragBySelector` 與檔頭 CDP 基礎設施段落——僅 `Read` 未改動該檔（本任務
唯一被要求「只讀不改」的既有檔案；本次工作期間該檔在工作目錄內另有
未提交的修改，見下方「範圍外觀察」，與本任務無關、非本 agent 所為）。

## 方法論校準（值得記錄，影響資料可信度判讀）

驗證腳本迭代過程中發現兩個非顯而易見的方法論陷阱，修正後才拿到可信資料：

1. **`type="module"` 在 `file://` 下被 CORS 政策擋下**：`proto.html`
   最初以 `<script type="module" src="./proto.js">` 載入，headless
   Chromium 直接以 `file://` 開啟時整份 module script 靜默載入失敗
   （`window.__resetProto` 等全域皆 `undefined`，`evaluate` 拋
   `TypeError`）。`proto.js` 本身無 `import`/`export`，改為 classic
   script（拿掉 `type="module"`）後解決——**若 MS2/MS4 之後任何 spike／
   本機工具需要以 `file://` 直開頁面驗證，需留意此限制**（module script
   才有此限制，classic script 沒有）。
2. **checkC 原型「同一拖曳 session 內連續掃過多個 offset」量到不可解讀
   資料**：第一輪（run1-3，數據不採用）在單一 `Input.setInterceptDrags`
   session 內，讓指標依序移到不同 offset 點取樣，結果非單調且不可重現
   （例如 offset=8px 六次 dragover 內即衝頂到 `maxScrollTop`，但同一
   session 內緊接著的 offset=4px 卻回落到 0、offset=6px 連續取樣近 3 秒
   仍全程 0）。改為**每個 offset 試驗皆用全新拖曳 session**（全新
   `mousePressed`…`mouseMoved` 建立、試驗結束 `drop` 收尾）後，資料轉為
   單調、可重現（見下方 (c) 完整數據）——研判是 Chromium
   `AutoscrollController` 內部狀態（是否已判定「這個 scrollable 已捲到底
   ／本次拖曳已消費過的捲動意圖」）跨座標點殘留，而非單純的「距邊緣多少
   px」純函式。**MS2/MS4 若要撰寫任何涉及邊緣自動捲動的量測／回歸案，
   同一拖曳 session 內不要指望「换個座標就能重新觸發一次乾淨的量測」。**
3. **CDP 指令原本無逾時**：`makeClient.send()` 原始版本（複製自
   `e2e-statusline.mjs`）沒有逾時保護，checkC 改「每 offset 全新 session」
   後高頻率 `mousePressed`/`dispatchDragEvent`/`drop` 快速輪替，實跑一輪
   卡死逾 3 分鐘（Bash 逾時強殺，無法確認卡在哪個指令）。加上單指令
   10 秒逾時＋每項驗證獨立 `try/catch`（一項卡死只標記該項失敗，其餘
   照常執行）後可穩定跑完。

## (a) 跨容器事件鏈＋drop 資料落地——**PASS（3/3 輪一致）**

拖曳左欄「目錄項-05」至右欄 `row-1`（列群組 1 第 2 列，無需捲動即可見），
斷言 `dragenter`／`dragover`／`drop` 三事件皆記錄 `rowId === "row-1"`，
且 `drop` 落地資料正確（`row-content` 文字變為「目錄項-05」）：

| 斷言 | 結果 |
|---|---|
| `dragenter` 命中目標列 | 通過 |
| `dragover` 命中目標列 | 通過 |
| `drop` 命中目標列且 `dataTransfer` 資料正確 | 通過（`row-content` = `目錄項-05`） |
| 正常拖曳（無邊緣觸發幾何）全程 `window.scrollY`／目錄欄 `scrollTop`／
  列區 `scrollTop` | 三者皆 `0 → 0`，`scrollDelta` 全 0 |

三輪（run4/run5/run6）結果逐字相同。**這是 G4「三者不變」的正面基線**：
只要拖曳全程座標不落入 (c) 揭露的邊緣觸發帶，三個指標嚴格不變、無需任何
容許量。

## (b) 插入指示定位——**PASS（3/3 輪一致）**

同一列（`row-2`）先在「上半」（`rect.top + height*0.2`）dragover，再在
「下半」（`rect.top + height*0.8`）dragover，讀 `window.__indicatorState`：

| dragover 位置 | 斷言 | 結果 |
|---|---|---|
| 列上半（20%） | `indicatorState = { rowId: "row-2", position: "top" }` | 通過 |
| 列下半（80%） | `indicatorState = { rowId: "row-2", position: "bottom" }` | 通過 |

插入指示隨指標 y 座標即時更新（單次 `dragover` 即反映，不需額外延遲），
三輪結果逐字相同。

## (c) 邊緣自動捲動——**確認觸發，量化如下**

### 觸發距離掃描（C1，每 offset 皆全新拖曳 session，6 次 dragover @130ms
間隔＝~780ms burst）

| offset（距 `#row-column` 底緣 px） | run4 | run5（異常，見下）| run6 |
|---:|---:|---:|---:|
| 60 | 0 | 0 | 0 |
| 24 | 0 | 0 | 0 |
| 16 | 348 | 258 | 252 |
| 12 | 470 | 60 | 430 |
| 10 | 540 | 0 | 516 |
| 8 | 602 | 0 | 602 |
| 6 | 618（=max）| 0 | 618（=max）|
| 4 | 618 | 0 | 618 |
| 2 | 618 | 0 | 618 |

`maxScrollTop`（`scrollHeight − clientHeight`）三輪皆為 `618`
（`scrollHeight=1328`／`clientHeight=710`，容器 rect `top=72`／
`bottom=784`，1280×800 viewport 下）。

**run4／run6 高度一致**（trend 與量級幾乎重合），**run5 在 offset≤16px
帶內大幅失效**（僅 offset=16 有微弱反應，offset≤12 全部掛零，含長時間
C2 取樣：offset=10 連續 dragover 近 3 秒仍全程 0，直接牴觸 run4/run6 同
offset 在 ~1 秒內衝頂的結果）。三輪唯一**完全一致、零例外**的區帶是
**offset ≥ 24px：三輪、所有樣本皆為 0**。

### 觸發可重現性（C1b，邊界附近三個 offset 各兩次全新 session 重跑）

| offset | run4 兩次 | run5 兩次 | run6 兩次 |
|---:|---|---|---|
| 12 | 430, 430 | 0, 0 | 430, 430 |
| 8 | 602, 616 | 0, 0 | 602, 602 |
| 6 | 618, 618 | 0, 0 | 618, 618 |

同一輪之內（run4 或 run6）觸發結果高度可重現；**跨輪（run5 vs run4/6）
在此邊界帶內出現「完全不觸發」與「快速衝頂」的兩極落差**——判讀為執行
環境時序敏感度（详见下方「G4 定案」的實務含義），而非距離的單純函式。

### 固定邊緣點長時間取樣（C2，offset=10px、全新 session、24 次取樣、
~110ms 間隔、~3 秒）

run4／run6（一致）：

| tMs | rowScrollTop | windowScrollY | catalogScrollTop |
|---:|---:|---:|---:|
| ~125 | 0 | 0 | 0 |
| ~250 | 96 | 0 | 0 |
| ~375 | 180 | 0 | 0 |
| ~500 | ~270-276 | 0 | 0 |
| ~625 | 360 | 0 | 0 |
| ~750 | 444 | 0 | 0 |
| ~875 | 540 | 0 | 0 |
| ~1000 | **618（= maxScrollTop，抵頂）** | 0 | 0 |
| 1121–2990（其餘 16 個樣本）| 618（恆定，**無溢出、無回彈**）| 0 | 0 |

- **捲速**：以相鄻樣本差分估算約 **620–780 px/s**（run6 六段差分：774,
  677, 762, 677, 683, 768 px/s；平均約 **724 px/s**），區間內無明顯加速
  或減速趨勢——近似等速。
- **停止條件**：精準卡在 `maxScrollTop`（618px，等於
  `scrollHeight − clientHeight`），抵達後穩定持平，**無 overshoot、無
  bounce、無回彈動畫**。
- **`window.scrollY` 全程 0**（見下方「結構性保證」）。
- **`catalogScrollTop`（左欄）全程 0**——見 (d) 完整分析。
- run5 同一 offset=10 的 C2 取樣**連續 24 個樣本、近 3 秒全為 0**（完全
  未觸發），是本輪最大的異常單點。

### `targetRectAtStart`／`targetRectAtEnd`（row-18，最後一列群組）

scrollTop=0 時 `row-18` 必在容器外（`top=1207 > containerBottom=784`，
`withinContainer:false`）。run4／run6 的 C2 跑完後：`top=589, bottom=631`
——**落回容器可視範圍內**（`withinContainer:true`），確認自動捲動方向
正確地朝「使目標列可見」前進；run5（C2 未觸發）跑完後目標依舊在容器外
（`top=1227`，`withinContainer:false`）。

## (d) 拖曳中來源欄（左欄）誤捲

### (d)-i：建立拖曳階段（`mousePressed` + 十步 `mouseMoved`，指標全程仍
在左欄範圍內、未靠近任一邊緣）

三輪 `establishSamples`（10 個取樣點的 `catalogScrollTop`）**皆為全 0**
（`establishStable: true`）——小幅垂直位移（本測十步共 +30px）建立拖曳
session 不會擾動左欄捲動位置。

### (d)-額外：來源欄自身底緣附近是否也會被同一套原生 autoscroll 觸發

`brief` 原文兩個子案之外、依 (c) 發現延伸驗證的第三個情境：指標仍在左欄
「內」，但刻意移到 `#catalog-column` 自身底緣 10px 處（(c) 已證實此距離
對右欄穩定觸發）連續 dragover 8 次：

| 樣本序 | run5 `catalogScrollTop` | run6 `catalogScrollTop` |
|---:|---:|---:|
| 1 | 12 | 12 |
| 2 | 108 | 108 |
| 3 | 216 | 204 |
| 4 | 504 | 312 |
| 5 | 624 | 408 |
| 6 | 720 | 516 |
| 7 | 746 | 612 |
| 8 | 746（持平，疑已抵頂）| 708（仍在爬升，未抵頂）|

**`sourceEdgeTriggered: true`（兩輪皆是）**——來源欄（左欄）本身同樣會被
同一套原生邊緣自動捲動觸發，速度量級與右欄相近（~700-900 px/s）。**這是
真實的「誤捲」風險**：若拖曳過程中指標座標（不論是否已離開來源列本身）
靠近左欄容器自身邊緣，左欄會被原生捲動——與 brief 假設「來源欄可能被
拖曳擾動」的關切一致，且比 brief 原文「小幅垂直位移」子案更貼近真實
使用情境（使用者從目錄欄接近底部的段落起手拖曳，游標放開前於原欄底緣
附近停留）。

### (d)-ii：指標離開左欄、進入右欄後（含右欄邊緣觸發自動捲動進行中）

延續上一段（左欄已被推到 ~720-746px），指標移入右欄並持續 dragover 於
右欄邊緣觸發點（offset=10px，(c) 已證實穩定觸發），16 次取樣、~110ms
間隔：

- **`rowScrollTop`**：0 → 618（抵頂），與 (c) C2 曲線一致，確認本測期間
  右欄**確實正在主動自動捲動**（`rowColumnDidAutoscroll: true`，佐證
  「連鎖」測試的證據力——不是「右欄根本沒捲，左欄當然沒事」的弱結論）。
- **`catalogScrollTop`（左欄）**：**16 個樣本恆定不變**（run5 恆
  `746`；run6 恆 `720`），**與指標已進入左欄之前的最後數值分毫不差**。

**結論：右欄的原生自動捲動不會「外溢」擾動左欄**——即使右欄正劇烈自動
捲動中，只要指標座標本身已不在左欄容器邊界內，左欄 `scrollTop`
分毫不動。誤捲風險**完全是座標局部性質**：只有當前實際承載指標座標的
那個捲動容器會被觸發，不存在跨容器連鎖。

`disturbance`（全程 `catalogScrollTop` 最大值 − 最小值）在含 (d)-額外
子測試的完整跑批中為 `720`／`746`——**這個數字是刻意探測「來源欄自身
邊緣」子測試造成的，不代表『正常拖曳流程』的擾動**；(d)-i／(d)-ii 兩個
brief 原文子案本身各自的擾動皆為 `0`。

## G4 定案

### 三個指標的個別結論

1. **`window.scrollY`**：**三輪、所有樣本、所有情境皆為 0，零例外**。
   這不只是經驗結果，而是**結構性保證**——本原型頁面高度恆等於 viewport
   高度（兩欄各自 `max-height: calc(100dvh − 頂帶高 − padding)`，頁面
   本身無其他造成 `body` 高度超出 viewport 的內容），文件層級**沒有可
   捲動的溢出**，故 `window.scrollY` 無論拖曳如何進行都物理上不可能
   變動。**前提**：sprint 15 實際版面（MS2）必須延續「兩欄各自獨立
   `max-height` 上限、頁面本身無外層捲動」這個結構紀律；若破壞此紀律
   （例如版面手術後 `#layout` 外層又多出可捲動的內容），`window.scrollY`
   的嚴格不變保證就會失效，須重新驗證。
2. **目錄欄（左欄）`scrollTop`**：**只要拖曳全程座標（含中繼 `dragover`
   點）不落入任一容器自身的邊緣觸發帶，嚴格 0**。落入來源欄自身邊緣帶時
   （(d)-額外驗證）則會被觸發、速度與右欄同量級（~700-900px/s）。
3. **列區（右欄）`scrollTop`**：**同上邏輯**——安全帶內（offset ≥
   24px，見下方精確邊界）嚴格 0；一旦落入邊緣觸發帶，位移量**不是可用
   小容許量吸收的雜訊**，而是「數百 px、~700px/s、可在 <1 秒內衝頂」的
   量級，且（run5 vs run4/run6）**觸發本身在邊界帶內存在執行環境敏感的
   不可預期性**（同一段程式碼、同一組座標，跨輪出現「完全不觸發」到
   「快速衝頂」的兩極結果）。

### 觸發邊界（精確度受限，已知安全帶）

- **offset ≥ 24px（距容器上／下緣）：三輪、所有樣本皆為 0——目前資料
  範圍內唯一「零例外」的安全帶。**
- offset = 16px：三輪皆有反應（252–348px），但強度不一。
- offset ≤ 12px：run4/run6 一致強烈觸發（可在 <1 秒內衝頂
  `maxScrollTop`）；run5 完全不觸發（連 3 秒長時間取樣也是）。
- 本輪僅在 16px／24px 兩點取樣，**精確交界值落在 (16, 24) 開區間內，
  未進一步二分**（時間盒內的取捨；若 MS4 需要更精確的邊界，可用本腳本
  `trialAtOffset` 對此區間加密取樣）。
- 僅測試了「容器底緣、向下捲動」方向；**頂緣（向上捲動）方向未實測**，
  依 Chromium `AutoscrollController` 慣例應對稱，但這是**假設、非本
  spike 的實測結論**，留給 MS4 若有涉及向上拖曳的 G4 情境時補驗。
- 僅測試垂直捲動（兩欄皆只有 `overflow-y: auto`，無水平溢出情境，
  與 sprint 15 實際版面一致，不構成缺口）。

### 建議容許量

**不建議走「放寬為固定 ±N px」這條路**，理由：安全帶內（offset≥24px）
三輪實測**恆為 0px、無任何雜訊需要吸收**；一旦落入邊緣帶，位移量體從
「0」到「maxScrollTop（本例 618px）」之間**不連續、不可預期**（見 run5
異常），**任何實務上可接受的小容許量（±20px、±50px 甚至 ±100px）都無法
安全涵蓋一旦真正觸發時的位移量級**，硬把容許量調大到能涵蓋最壞情況
（接近 `maxScrollTop`，量級隨版面內容量而定、無上界）等同讓斷言形同虛設。

**改為「座標選取紀律」而非「數值容許量」**：

- **G4 e2e 案的容許量定案為 `±2px`**（涵蓋潛在的子像素／版面捨入雜訊；
  本 spike 三輪安全帶內樣本實測皆恰為 0，`±2px` 屬保守但實質等同嚴格
  0——之所以不直接寫「嚴格 0」，是保留給正式產品版面可能存在的次像素
  誤差空間，而非因為量到任何非零雜訊）。
- **前提**（缺一即無效）：G4 測試案挑選的 `toPointExpr`（以及任何中繼
  `dragover` 落點座標）在拖曳全程中，其 y 座標與**目錄欄、列區欄兩個
  容器各自的** `getBoundingClientRect().top`／`.bottom` 皆須保持
  **≥ 40px 安全帶**（24px 為本輪實測的「已知安全」下界，40px 為在交界
  精度未知＋run5 異常的雙重不確定性下留的保守緩衝）。
- 若某 G4 情境的敘事本身就需要測「目標列貼近容器邊緣」（例如「捲出視野
  的列」邊緣案），**不要**把它納入「三者全程不變」這條斷言——改用不同
  判準（例如「拖曳結束後最終捲動位置落在合理範圍」或「目標列最終可
  見」），或在計算座標前先用 `scrollTop` 直接把目標帶到容器**中央**
  （而非用 `scrollIntoView` 貼邊）。

## 對 MS2／MS4 施工的具體建議

1. **e2e 座標選取規則（G4 案，MS4）**：`toPointExpr`／任何中繼
   `dragover` 點計算後，建議在 harness 層加一個共用斷言 helper（例如
   `assertAwayFromScrollEdge(point, containerRect, margin=40)`），對每個
   拖曳落點跑一次，防止未來新增案不慎選到邊緣觸發帶座標而產生間歇性
   flaky（尤其考慮到 run5 顯示的環境敏感度，這類 flaky 很可能是「有時
   過、有時因為捲動了 600px 而斷言失敗」的典型間歇性失敗模式）。
2. **插入指示（insertion indicator）dragover throttle 提醒**（brief 明確
   關切點）：(b) 驗證顯示原生 `dragover` 事件單次即可正確反映插入位置，
   不需要額外延遲。MS2/MS4 實作插入指示邏輯時，若為了節流重繪加上
   throttle／debounce，**務必只節流「DOM 寫入」（例如以 `requestAnimation
   Frame` 節流渲染），不要節流「位置計算」本身**——一旦所在容器正在被
   自動捲動（(c) 已證實這是真實會發生的情況），列的螢幕座標會以
   ~700px/s 的速度快速位移，若插入指示的重算基準是被 debounce 過的舊
   `dragover` 座標，會與捲動中畫面的實際位置脫節，使用者會看到插入線
   「追不上」捲動。
3. **保留「頁面本身無外層捲動」的版面紀律**（MS2 版面手術）：`window.
   scrollY` 之所以能嚴格保證不變，前提是兩欄各自 `max-height` 上限、
   頁面整體高度恆等於 viewport 高度。MS2 施工時若 `#layout` 外層意外
   多出使 `body` 高度超出 viewport 的內容（例如新增的教學帶／頁尾不慎
   撐高整頁），這個「結構性保證」會失效，需要重新對 `window.scrollY`
   做實測（而非繼續假設它嚴格不變）。
4. **G9／S-b 垂直預算量測納入頂帶高度**：本 spike 用 `56px` 頂帶＋
   `32px` padding（純為原型示意，非 sprint 15 定案值）；`maxScrollTop`
   與「抵達上限所需時間」皆隨容器實際可視高度變化（觸發距離的「px 數」
   门檻預期不受影響，因為是距**容器**邊緣而非距**視窗**邊緣的函式），
   但 S-b 定案實際頂帶高度後，MS4 校準 G4/G8 案的逾時值時，可用本 spike
   的「~700px/s、maxScrollTop 內 <1 秒衝頂」量級估算「若不慎落入危險帶，
   最壞情況多快能跑完整個自動捲動動畫」。
5. **同一拖曳 session 內不要指望「換座標即可重新觸發一次乾淨量測」**
   （見「方法論校準」第 2 點）——若 MS4 未來要寫任何涉及邊緣自動捲動的
   額外回歸案，每個獨立情境都該用全新的拖曳 session，不要在單一 session
   內連續變換座標比較多個情境。

## 結論

**Chromium 對 sprint 15 新引入的「跨兩個獨立捲動容器」幾何，(a)(b) 兩項
基本 DnD 語意（跨容器事件鏈、插入指示定位）皆正常運作，無需任何特殊
處理。(c) 證實 Chromium 會對正在被 `dragover` 覆蓋的可捲動容器做原生
邊緣自動捲動（觸發邊界約在容器邊緣 16–24px 內側、~700px/s、乾淨卡在
`maxScrollTop`，但邊界帶內的實際觸發與否存在環境敏感的不可預期性）；
(d) 證實此行為對「當前指標所在的那個容器」一視同仁（來源欄／目標欄皆
會被觸發），但**不會跨容器外溢**——不在指標下的容器分毫不動。**G4「三者
全程不變」定案為 `±2px`（實質等同嚴格 0）＋強制「座標全程與兩欄容器
邊緣保持 ≥40px 安全帶」的前提**；不採用「放寬容許量」這條路，因為一旦
真正觸發，位移量級與容許量不成比例、無法用任何合理數字吸收。**MS2/
MS4 落地時只要遵守「座標選取遠離容器邊緣」與「頁面本身無外層捲動」這兩
條紀律，G4 可以維持近乎嚴格 0 的高信心斷言。**

## 附錄：驗證產物

- `magi/15-statusline-editor-layout/spikes/s-i/proto.html` — 獨立原型
  頁面（左右並置兩個獨立捲動容器；`file://` 直開，無 localStorage 需求）。
- `magi/15-statusline-editor-layout/spikes/s-i/proto.js` — DnD 接線（純
  事件委派＋插入指示計算，不含任何自訂自動捲動邏輯）。
- `magi/15-statusline-editor-layout/spikes/s-i/verify.mjs` — CDP 驗證
  腳本（`node magi/15-statusline-editor-layout/spikes/s-i/verify.mjs`；
  `E2E_HEADED=1` 可切 headed 除錯；找不到本機 Edge/Chromium 則印訊息
  exit 0）。四驗（a)(b)(c)(d) 皆有機械化斷言與完整 JSON 輸出，本檔數據
  取自 3 輪獨立全量執行（run4/run5/run6）。
