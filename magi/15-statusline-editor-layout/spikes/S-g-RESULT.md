# S-g-RESULT — 可捲命中面積（T1.4）

> Sprint: `magi/15-statusline-editor-layout/`　Task: T1.4（spike S-g，🔀 [A]
> lane，與 S-a／S-b／S-j／S-c 並行、僅動 `spikes/s-g/`）
> 對照：`PLAN.md` §二「捲動與黏著模型」D2／`PLAN.md` MS1 spike 清單「S-g
> 頁面可捲命中面積」節；`TASKS.md` T1.4。
> 量測底座：`spikes/proto/measure.mjs`（T1.1 產出）的 CDP bootstrap，於
> `spikes/s-g/wheel-grid.mjs` 依本任務需求改寫（新檔，非直接複用
> `measure.mjs` 本體）。
> 原型：`spikes/s-g/{m1a,m1b,m2}.html` ＋ `spikes/s-g/proto.css`——
> `spikes/proto/` 整份複製而來（見「檔案邊界」節），僅用 **m1a 臂**。
> viewport：**1280×800**（brief 唯一指定值，未量其他 viewport）。
> CDP debug port：**9970–9984** 區段（brief 明定，m1a lane 專用）。

## 結論先講

**D2 定案：兩欄皆掛 `overscroll-behavior: contain`（沿用 PLAN 原構想，即
「組態 O1」）——門檻＝可捲命中面積 ≥30%，三組態 × 兩狀態全數 **6/6 通過**
（最低 77.8%，遠高於 30%），PLAN 原文「未達 30% → 不得同時對兩欄掛
`contain`」的禁止條件**從未觸發**，故沒有程序性理由排除 O1。**

九宮格逐點量測顯示：`contain` 造成的「死區」**精確侷限於**兩欄各自本身
的螢幕座標、且**僅在該欄已捲到底（P2 欄耗盡態）才會出現**——9 點中恰好
2 點（目錄欄、列區各一）；其餘 7 點（含頂帶、設定欄、頁首）在任何組態下
皆能正常帶動 `window.scrollY`。PLAN 原文擔憂的「封死捲過頁首的必要動作」
在數據上是**局部**（22.2% 螢幕面積、且僅限使用者游標剛好停在已捲到底的
欄上方那個當下）而非**全域**封死——其餘 77.8% 面積、以及鍵盤側（`body`
對焦按 Space／PageDown 三組態皆穩定捲到 max-scroll）都提供無阻礙的替代
路徑。相對地，不掛 `contain`（O2）在欄捲到底後任何游標位置都會 100% 連鎖
捲動頁面，代價是喪失「獨立捲動容器捲到底不應誤帶動整頁跳動」這個業界常見
（Gmail／Slack 側欄等）的 UX 保護。權衡後採 O1。

**MS2 CSS 指令**：`tools/statusline-builder/style.css`（T2.2 施工範圍，
本任務未觸碰該檔）於 `.col--catalog, .col--list` 選擇器**直接掛**
`overscroll-behavior: contain;`（即 `spikes/proto/proto.css` 現有留白
hook「`/* overscroll-behavior: contain; ← S-g 定案後掛此處 */`」原地填入
此值，無需拆成兩條規則）。

---

## 一、檔案邊界

依 brief 指示，**把 `spikes/proto/` 整份複製到 `spikes/s-g/`**（`cp -r`，
6 個檔案：`m1a.html`／`m1b.html`／`m2.html`／`measure.mjs`／`proto.css`／
`README.md`），本任務僅編輯 `spikes/s-g/` 內的副本：

- `spikes/s-g/proto.css`：新增 3 組態量測 hook（`body.ovsc-o1`／
  `body.ovsc-o3`，見下方「量測組態」節），**未變更**任何原有生效規則
  （`git diff` 對 `spikes/proto/proto.css` 為零，因為改動只落在
  `spikes/s-g/` 副本）。
- 新增 `spikes/s-g/wheel-grid.mjs`（本任務核心量測腳本，基於
  `measure.mjs` 的 CDP bootstrap 改寫：`detectBrowser`／`launchBrowser`／
  `waitForEndpoint`／`waitForPageTarget`／`connectWs`／`makeClient`／
  `killProcessTree` 皆複製自 `measure.mjs`，僅 Read 該檔未改動其本體）。
- `spikes/proto/`、`spikes/s-b/`、`spikes/s-c/`、`spikes/s-j/` 等其他 lane
  目錄本任務**完全未觸碰**（見下方「證據」節 `git status --short`）。

`m1a.html` 只用其 **m1a 臂**（brief 指定），`m1b.html`／`m2.html` 隨整份
複製留在 `spikes/s-g/` 但本任務未使用、未修改。

## 二、量測組態（O1／O2／O3）與 wheel-grid.mjs 設計

`spikes/s-g/proto.css` 新增（`.col--catalog,.col--list` 既有留白 hook
之後）：

```css
body.ovsc-o1 .col--catalog,
body.ovsc-o1 .col--list {
  overscroll-behavior: contain;
}

body.ovsc-o3 .col--list {
  overscroll-behavior: contain;
}
```

三組態由 `wheel-grid.mjs` 於 `Page.loadEventFired` 之後、正式量測之前以
`Runtime.evaluate` 對 `document.body.classList.add(...)` 注入對應
class（O2＝不注入任何 class，維持 CSS 預設 `auto`）：

| 組態 | 目錄欄 `overscroll-behavior` | 列區 `overscroll-behavior` |
|---|---|---|
| **O1** | `contain` | `contain` |
| **O2** | `auto`（預設） | `auto`（預設） |
| **O3** | `auto`（預設） | `contain` |

兩種頁面狀態（brief 定義，`wheel-grid.mjs` `resetPageState(state)`）：

- **P1 初載態**：`window.scrollTo(0,0)`＋`.col--catalog`/`.col--list`
  `scrollTop=0`。
- **P2 欄耗盡態**：`window.scrollTo(0,0)`＋兩欄 `scrollTop = scrollHeight −
  clientHeight`（各自捲到底）。實測兩欄最大值＝`catalog: 845px`／
  `list: 810px`（1280×800、m1a 臂）。

九宮格＝viewport 1280×800 均分 3×3 的九個中心點（`gridPoints()`，viewport
口徑非元素邊界口徑）：

| | x=213（left） | x=640（center） | x=1067（right） |
|---|---|---|---|
| y=133（top） | top-left | top-center | top-right |
| y=400（mid） | mid-left | mid-center | mid-right |
| y=667（bottom） | bottom-left | bottom-center | bottom-right |

每點程序（`measureWheelPoint`）：重置狀態 → 等 80ms 穩定 → 記錄
`document.elementFromPoint` 命中歸屬（供對照）與 before 快照
（`window.scrollY`／兩欄 `scrollTop`）→ `Input.dispatchMouseEvent
{type:'mouseMoved'}` 一次定位游標 → 3 次 `{type:'mouseWheel', deltaY:120}`
（間隔 100ms，brief 指定手法）→ 等 120ms → 記錄 after 快照 → 依三值差量
判定歸屬（`page`／`catalog`/`list`／`none`／`mixed`，見下方「歸屬判定
規則」）。

**歸屬判定規則**（`determineAttribution`，容許誤差 0.5px）：僅
`window.scrollY` 變動 → `page`；僅 `.col--catalog` `scrollTop` 變動 →
`catalog`；僅 `.col--list` `scrollTop` 變動 → `list`；三者皆未變動 →
`none`；一次 3-notch burst 期間**同時**出現頁面與某欄變動 → `mixed`（見
下方「`mixed` 現象說明」，這不是誤判，是真實的「捲動穿越」）。

## 三、量測結果（3 組態 × 2 狀態 × 9 點 歸屬矩陣）

三組態的九點格位→元素對照**完全相同**（`overscroll-behavior` 不影響版面
幾何，命中元素只由座標與版面決定）：`top-*` 落在 `<header>`；`mid-*`
落在 `.preview-band`；`bottom-left` 落在 `.col--catalog`；`bottom-center`
落在 `.col--list`；`bottom-right` 落在 `.col--settings`（設定欄，D2 定案
「預設不設捲動容器」，本原型未掛任何 overflow，故不論組態恆為 `page`）。

### O1（兩欄皆 `contain`）

| 點 | P1 歸屬 | P1 dPage/dCat/dList | P2 歸屬 | P2 dPage/dCat/dList |
|---|---|---|---|---|
| top-left | page | 360/0/0 | page | 360/0/0 |
| top-center | page | 360/0/0 | page | 360/0/0 |
| top-right | page | 360/0/0 | page | 360/0/0 |
| mid-left | **mixed** | 120/240/0 | page | 120/0/0 |
| mid-center | **mixed** | 120/0/240 | page | 120/0/0 |
| mid-right | page | 360/0/0 | page | 360/0/0 |
| bottom-left（catalog） | catalog | 0/360/0 | **none** | 0/0/0 |
| bottom-center（list） | list | 0/0/360 | **none** | 0/0/0 |
| bottom-right（settings） | page | 360/0/0 | page | 360/0/0 |
| **可捲命中面積** | **7/9＝77.8%** | | **7/9＝77.8%** | |

### O2（皆 `auto`，預設）

| 點 | P1 歸屬 | P1 dPage/dCat/dList | P2 歸屬 | P2 dPage/dCat/dList |
|---|---|---|---|---|
| top-left | page | 360/0/0 | page | 360/0/0 |
| top-center | page | 360/0/0 | page | 360/0/0 |
| top-right | page | 360/0/0 | page | 360/0/0 |
| mid-left | **mixed** | 120/240/0 | page | 360/0/0 |
| mid-center | **mixed** | 120/0/240 | page | 360/0/0 |
| mid-right | page | 360/0/0 | page | 360/0/0 |
| bottom-left（catalog） | catalog | 0/360/0 | page | 360/0/0 |
| bottom-center（list） | list | 0/0/360 | page | 360/0/0 |
| bottom-right（settings） | page | 360/0/0 | page | 360/0/0 |
| **可捲命中面積** | **7/9＝77.8%** | | **9/9＝100.0%** | |

### O3（僅列區 `contain`，目錄欄 `auto`）

| 點 | P1 歸屬 | P1 dPage/dCat/dList | P2 歸屬 | P2 dPage/dCat/dList |
|---|---|---|---|---|
| top-left | page | 360/0/0 | page | 360/0/0 |
| top-center | page | 360/0/0 | page | 360/0/0 |
| top-right | page | 360/0/0 | page | 360/0/0 |
| mid-left | **mixed** | 120/240/0 | page | 360/0/0 |
| mid-center | **mixed** | 120/0/240 | page | 120/0/0 |
| mid-right | page | 360/0/0 | page | 360/0/0 |
| bottom-left（catalog，auto） | catalog | 0/360/0 | page | 360/0/0 |
| bottom-center（list，contain） | list | 0/0/360 | **none** | 0/0/0 |
| bottom-right（settings） | page | 360/0/0 | page | 360/0/0 |
| **可捲命中面積** | **7/9＝77.8%** | | **8/9＝88.9%** | |

### `mixed` 現象說明（並非誤判，是真實的「捲動穿越」）

`mid-left`／`mid-center` 於 **P1** 狀態下三組態皆判為 `mixed`：3 次
wheel notch 之間各間隔 100ms，第 1 次 notch 命中時該座標仍落在
`.preview-band`（非捲動容器）→ 推動 `window.scrollY`（`dPage=120`，1
notch）；頁面因此位移，`.preview-band` 為 `position:sticky` 但兩欄不是
（尚未進入 sticky 卡住狀態），**同一螢幕座標**在頁面位移後改為落在對應欄
上方，第 2、3 次 notch 因此改由該欄吸收（`mid-left`→catalog
`dCat=240`＝2 notch；`mid-center`→list `dList=240`＝2 notch）。此現象與
`S-a-RESULT.md`「390×844 T3 判讀」記錄的「捲動穿越」同性質——同一浮動
游標座標，隨頁面捲動使底下元素改變，非缺陷。

**P2 狀態下同一組座標的行為隨組態分歧、且直接驗證 `contain` 是否生效**：
`mid-left`（穿越後落在 catalog）在 O1／O2 皆變 `page`（因 catalog 在
O1／O2 皆非唯一被 contain 的欄，或本身在 O3 為 auto）而非再吸收——因為
P2 下兩欄 `scrollTop` 已在極限，欄自身**不能再變動**，殘餘 notch 能否
「溢出」到頁面完全取決於該欄的 `overscroll-behavior`：O1 該欄
`contain` → 溢出的 1 notch 之後（穿越前已算入 page 的 1 notch）**不再**
繼續溢出（`dPage` 停在 120，未到 360）；O2／O3（該欄 `auto`）→ 全部
溢出（`dPage=360`）。`mid-center`（穿越後落在 list）同理：O1／O3 該欄
`contain` → `dPage` 停在 120；O2 該欄 `auto` → `dPage=360`。**這組數據
本身就是「`contain` 阻擋捲動鏈」的直接、獨立於 bottom-row 的第二重驗證**
（bottom-row 是「純欄」的驗證，mid-row P2 是「頁面→欄」混合路徑的驗證，
兩者結論一致）。

### 面積計算彙總

| 組態 | P1 可捲命中 | P2 可捲命中 | 兩態皆 ≥30%？ |
|---|---|---|---|
| O1（兩欄 contain） | 7/9＝77.8% | 7/9＝77.8% | ✅✅ |
| O2（皆 auto） | 7/9＝77.8% | 9/9＝100.0% | ✅✅ |
| O3（僅列區 contain） | 7/9＝77.8% | 8/9＝88.9% | ✅✅ |

## 四、Gate 情境選擇（P1 為主情境，P2 為最壞情境，兩者皆呈現）

- **P1（初載態）為門檻判定的主情境**：使用者載入頁面後的第一個捲動動作
  就發生在 P1（兩欄尚未被捲過，「捲過頁首使頂帶黏住」這個必要動作最先
  在此情境被觸發）。P1 的可捲命中面積在**三組態下數值相同**（皆
  77.8%）——這正是 brief 預告的「P1 可能量不出差異」：因為 P1 狀態下兩欄
  都還有捲動空間可以吸收 wheel notch，尚未進入需要「鏈到頁面」的邊界，
  `overscroll-behavior` 的 `contain`／`auto` 差異在此狀態下**完全不生效**
  （兩者對「未耗盡」的捲動容器行為逐位元相同）。
- **P2（欄耗盡態）為最壞情境，一併呈現**：S-a 已定案候選 2（接受
  max-scroll 遮蔽，`spikes/S-a-RESULT.md`「二、候選 2」），代表兩欄捲到
  底**不是罕見邊緣狀況、而是可預期的穩態終點**（使用者瀏覽完 30 項目錄
  或列區後自然到達）。P2 才是 `contain`／`auto` 差異真正顯現之處，也是
  PLAN 原文擔憂「封死必要動作」的具體情境——三組態在 P2 的差異
  （77.8%／100.0%／88.9%）直接對應各自 `contain` 覆蓋的欄數（2／0／1）。
- **兩情境皆 ≥30%**：無論以哪個情境作為唯一 gate（brief 要求兩者都呈現，
  未強制二選一），三組態全數通過，門檻判定結果一致：**未觸發「不得同時對
  兩欄掛 contain」的禁止條件**。

## 五、鍵盤側（純記錄，無門檻）

五個焦點落點 × Space／PageDown，重置至 P1 基準態（`window.scrollTo(0,0)`
＋兩欄 `scrollTop=0`）後對焦、送真實鍵盤事件。**三組態（O1/O2/O3）的
鍵盤側結果逐位元相同**（見下表；`overscroll-behavior` 只影響「捲動容器
已耗盡後鏈到誰」，本測項起手皆為未耗盡的 P1 基準態，鍵盤情境未觸發任何
組態差異——見「範圍侷限」節的誠實聲明）：

| 焦點落點 | 對焦元素 | Space 捲動標的 | PageDown 捲動標的 |
|---|---|---|---|
| 頂帶內按鈕（`.output-open-mock`） | `output-open-mock` | **none**（Space 觸發按鈕原生 click，未捲動） | **page**（`dPage=422`，捲到 max-scroll） |
| 目錄欄內項目（`.tutorial-band-mock__dismiss`，欄內唯一可聚焦控件，見「焦點落點選取理由」） | `tutorial-band-mock__dismiss` | **none**（按鈕原生 click） | **catalog**（`dCat=532`，捲動目錄欄自身，未鏈到頁面——焦點元素本身在目錄欄內，PageDown 預設捲動「離焦點最近的可捲祖先」） |
| 列區內控件（`.segment-row-mock__select`，第 1 列首個下拉選單） | `segment-row-mock__select` | **none**（開啟原生下拉選單，未捲動；已用 Escape 防禦性收起，見下方腳本除錯節） | **none**（`<select>` 關閉狀態下 PageDown 由瀏覽器原生處理為選項間跳頁，未捲動任何容器） |
| 設定欄內控件（`#settings-col input[type="checkbox"]`，Powerline 箭頭勾選框） | `INPUT`（checkbox） | **none**（切換勾選狀態，未捲動） | **page**（`dPage=422`，設定欄本身非捲動容器，鏈到頁面） |
| `body`（無焦點元素，`document.activeElement.blur()` 後的預設值） | `arm-m1a`（body className，供辨識） | **page**（`dPage=422`） | **page**（`dPage=422`） |

**焦點落點選取理由**：目錄欄內 30 個目錄項（`.catalog-item-mock`）本身
無 `tabindex`／互動元素，非原生可聚焦——本原型（比照 `spikes/proto/`
校準，忠實反映 `tools/statusline-builder/` 真實目錄項現況）欄內唯一天生
可聚焦的控件是教學帶的「知道了」關閉鈕，故以此代表「焦點落目錄欄」情境。

**範圍侷限（誠實聲明）**：本節鍵盤測試起手態統一為 P1（兩欄未耗盡），
**未**另測「焦點落已耗盡的欄內控件時 Space／PageDown 是否也被
`contain` 擋下鏈到頁面」——brief 對鍵盤側僅要求「焦點落各區時的捲動
標的」記錄、未要求比照 wheel 側做 P1/P2 雙態，故本任務未擴大此測項。
依 CSS 規格，`overscroll-behavior` 的鏈定行為理論上不分輸入法（wheel／
觸控／鍵盤／捲軸拖曳皆一體適用），故合理預期鍵盤在 P2 耗盡態會與 wheel
側呈現相同的 `contain` 阻擋效果，但本任務**未直接量測驗證這個推論**，
留供 MS2/MS4 e2e 撰寫時視需要補測。

## 六、D2 定案與 MS2 施工指令

**定案：組態 O1（兩欄皆 `overscroll-behavior: contain`）。**

理由：

1. **門檻本身無鑑別力，但決定性地不構成禁止**：`≥30%` 門檻在三組態、
   兩狀態全數通過（見「面積計算彙總」），PLAN 原文「未達 30% → 不得同時
   掛 contain」的禁止條件從未觸發——沒有程序性理由排除 O1。
2. **O1 的代價侷限且侷限的方式可預期**：`contain` 造成的死區精確等於
   「該欄已捲到底＋游標剛好停在該欄螢幕座標」這個交集，範圍固定為 9 點
   中的 2 點（22.2% 面積），且不擴散到頁首／頂帶／設定欄／其餘欄。
3. **O1 的效益是解決真實、常見的 UX 問題**：獨立捲動容器（目錄欄／列區）
   捲到底後，若無 `contain`（即 O2），使用者游標留在該欄上方繼續轉動
   滾輪會讓**整頁**跟著跳動（scroll chaining）——這正是業界慣用
   `overscroll-behavior: contain` 保護側欄/列表類 UI 的標準場景（如
   Gmail 郵件列表、Slack 頻道清單捲到底不誤觸主畫面捲動）。本專案的目錄
   欄／列區在語意上就是這種「側欄」角色，套用同一慣例合理。
4. **代價有替代路徑、非真正封死**：(a) 77.8% 螢幕面積在 P2 仍可正常
   捲頁；(b) 鍵盤側 `body` 對焦 Space／PageDown 三組態皆穩定捲到
   max-scroll（`dPage=422`），提供完全不受 `contain` 影響的替代操作
   路徑；(c) 使用者只需將游標移出該欄範圍（無論移到頁首、頂帶、設定欄或
   另一個未耗盡的欄）即可恢復整頁捲動。

**MS2 CSS 指令**（`tools/statusline-builder/style.css`，T2.2 施工範圍，
非本任務改動）：於現行 `.col--catalog, .col--list` 選擇器區塊
（對應 `spikes/proto/proto.css` 的既有留白 hook）填入：

```css
.col--catalog,
.col--list {
  overscroll-behavior: contain;
}
```

兩欄同一數值，**不需要**依 O3 拆成兩條不同規則的選擇器。

## 七、與 S-a 候選 2 的交互作用（max-scroll 可達性未受影響）

S-a 已定案候選 2（接受並量化桌面 max-scroll 處欄頭遮蔽 ~134.156px，
`spikes/S-a-RESULT.md`「二、候選 2」）——這代表兩欄捲到底在正式版是**
可預期、會被使用者常態觸發**的穩態終點（而非罕見邊緣狀況），這正是本
任務把 P2 列為「最壞情境」的依據（見「四、Gate 情境選擇」節）。

**`contain`（本任務定案的 O1）是否影響「捲到 max-scroll」的可達性？**
**不影響整體可達性，只限縮達成它的游標路徑數量**：

- 頁面本身的 `document.documentElement.scrollHeight − innerHeight`
  （max-scroll＝422px，本原型 1280×800 實測值）**不因 `overscroll-
  behavior` 改變**——這是純幾何量，與捲動輸入行為無關。
- 9 個游標位置中，7 個（77.8%）在 O1／P2 下仍可直接把 `window.scrollY`
  推到目標值；僅剩下「游標剛好停在已耗盡的目錄欄或列區上方」這個交集
  情境會讓**該座標**的 wheel 事件失效——使用者只需移動游標（或改用鍵盤
  `body`／非欄內控件對焦後 PageDown，見「五、鍵盤側」節，三組態皆穩定
  達到 `dPage=422`）即可繼續捲動，max-scroll 本身在任何組態下皆**確定
  可達**，不存在「捲不到底」的情況。
- 換言之，`contain` 改變的是「特定游標位置下單次 wheel 手勢是否會鏈到
  頁面」，**不是**「頁面是否存在可達的捲動路徑」——兩者是不同層次的
  問題，本任務結論僅涉及前者。

## 八、腳本除錯與平台坑（過程記錄，供覆核與後續 e2e 撰寫參考）

### 坑 1：鍵盤 Space 需要 `type:'keyDown'`（含 `text`）＋`char`，`rawKeyDown`（無 text）完全不觸發任何行為

初版 `pressKey()` 對所有鍵一律送 `type:'rawKeyDown'`（比照
`scripts/e2e-statusline.mjs`／`spikes/s-f/verify.mjs` 對 Escape／Enter
等非列印鍵的既有寫法）。以一次性診斷腳本（`scratchpad/diag-key.mjs`，
未留存於 repo）逐一比對後發現：**PageDown（不產生字元）`rawKeyDown`＋
`keyUp` 正確觸發原生捲動；Space（會產生字元 `' '`）用同一手法完全無
反應**（`scrollY` 恆為 0），改用 `type:'keyDown'`（含
`text:' ', unmodifiedText:' '`）＋後續 `type:'char'` 事件＋`keyUp`
才正確觸發（`scrollY` 從 0 變為 422）。已將此發現寫入
`wheel-grid.mjs` `pressKey()` 函式旁註解，供未來任何需要合成 Space
鍵盤事件的腳本（含 MS2/MS4 e2e）參考——**這是本 sprint 首次需要合成
Space 鍵**，`scripts/e2e-statusline.mjs`／`spikes/s-f` 先前只用過
Tab／Enter／Escape，未踩過這個坑。

### 坑 2：單一 CDP session 內指令量累積過多（約 120–150 次）後，`Input.dispatchMouseEvent` 開始不再收到 ACK

初版 `runConfig()` 讓每個組態的 18 個 wheel 點（P1+P2）與 10 個鍵盤案共用
同一個瀏覽器 session。首次全量重跑時，三組態**皆**在 P2 狀態量測到
一半左右開始對 `Input.dispatchMouseEvent` timeout（8s 無回應，經加上
逾時保護後才能觀察到明確錯誤而非無限卡死）——**與 `overscroll-behavior`
組態或量測狀態本身無關**（O1／O2／O3 三者皆重現，且 O2 完全不掛
`contain`）；同一 session 內的 `Input.dispatchKeyEvent`（鍵盤）在滑鼠
逾時後**仍正常運作**。獨立診斷（`scratchpad/diag-contain.mjs`／
`diag-contain2.mjs`，未留存於 repo）確認：全新、指令量少的 session
（僅 9 點×3 wheel 事件的單一狀態）**100% 可靠、無逾時**，且能正確重現
`contain` 阻擋捲動鏈的預期行為（`scrollY` 維持 0、無需等待）。據此改為
**每個 (組態, 狀態) 各開一個全新 session、鍵盤側再另開一個 session**
（`runWheelState`／`runKeyboard`，見 `wheel-grid.mjs`），總計 9 個
session（3 組態 × 3），全數落在 9970–9984 埠段內，重跑後三組態六個
狀態全數零逾時、零錯誤（見「證據」節完整輸出）。**此為 headless=new
在本機環境下的累積性資源限制，非本 spike 的量測標的**，若 MS2/MS4
e2e harness 未來需要在單一 session 內密集 dispatch 大量合成滑鼠事件
（例如 G4 拖曳案的多點連續拖曳），建議留意此上限並比照本任務作法拆分
session。

### 坑 3（防禦性，未觀察到問題）：`<select>` 對焦後按 Space 開啟原生下拉

擔心 headless Chromium 對已聚焦 `<select>` 按 Space 開啟原生下拉選單後
卡住後續 CDP 呼叫，獨立診斷（`scratchpad/diag-select.mjs`，未留存於
repo）證實**完全不卡**（keyDown/char/keyUp/後續 evaluate 皆於 <50ms
內正常回應）。`wheel-grid.mjs` 仍保留對 `isSelect` 焦點落點的防禦性
`Escape` 按鍵（`pressEscapeDefensive`，見 `measureKeyboardCase`），
純屬保險，非必要修復。

## 九、單元測試零影響確認

`npm test`（vitest run）：本任務僅新增 `magi/15-statusline-editor-layout/
spikes/s-g/`（`spikes/proto/` 的獨立副本 + 新腳本）與本結果檔，路徑不在
`tools/`／`src/`／`scripts/` 掃描範圍，非 `*.test.*`/`*.spec.*`。重跑
確認：**1935/1935 passed（64 test files），零 flake、零迴歸**。

## 十、證據

```bash
$ git status --short
 M scripts/e2e-statusline.mjs   # 既有未提交改動，非本任務改動，本任務未觸碰此檔
?? magi/15-statusline-editor-layout/   # 整個 sprint 目錄未追蹤（T1.1 起新增，本任務新增 spikes/s-g/ 與本結果檔）
```

本任務實際改動範圍：

- 新增 `spikes/s-g/`（整份 `cp -r` 自 `spikes/proto/`）：
  - `m1a.html`／`m1b.html`／`m2.html`／`measure.mjs`／`README.md`：
    **逐位元複製、未修改**（`diff spikes/proto/m1a.html
    spikes/s-g/m1a.html` 等五檔皆零差異）。
  - `proto.css`：新增 O1／O3 兩個 body class hook（見「二、量測組態」
    節），未變更任何原有生效規則。
  - 新增 `wheel-grid.mjs`（本任務核心量測腳本）。
- 新增 `spikes/S-g-RESULT.md`（本檔）。
- **未觸碰**：`spikes/proto/`（本體）、`spikes/s-b/`、`spikes/s-c/`、
  `spikes/s-j/`、`spikes/s-f/`、`spikes/s-i/`、`tools/statusline-builder/
  style.css`（MS2 施工範圍，本任務僅在本檔文件化指令、未動該檔）。

重跑本任務核心量測（headless，1280×800，三組態各 3 個 session）：

```bash
node magi/15-statusline-editor-layout/spikes/s-g/wheel-grid.mjs
```

三組態、六個狀態（O1/O2/O3 × P1/P2）逐點輸出範例（完整輸出含 54 個
wheel 點 + 30 個鍵盤案的結構化 JSON，見腳本 stdout `=== FULL EVIDENCE
(JSON) ===` 段）：

```
[wheel-grid] === 組態 O1 ===
  [O1/P1] bottom-left done in 563ms → catalog
  [O1/P1] bottom-center done in 561ms → list
  [O1/P2] bottom-left done in 719ms → none
  [O1/P2] bottom-center done in 675ms → none
  ...
=== SUMMARY（可捲命中面積） ===
  O1 / P1：7/9（77.8%）PASS(>=30%)
  O1 / P2：7/9（77.8%）PASS(>=30%)
  O2 / P1：7/9（77.8%）PASS(>=30%)
  O2 / P2：9/9（100.0%）PASS(>=30%)
  O3 / P1：7/9（77.8%）PASS(>=30%)
  O3 / P2：8/9（88.9%）PASS(>=30%)
```

`npm test`：`1935 passed (1935)`，`64 test files passed`，exit 0。
