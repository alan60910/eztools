# Statusline Builder 多列輸出＋雙欄版面＋排序語意（06b）

> Type: feat • Scale: major • Sprint: magi/07-statusline-multirow-layout/
> 契約來源：`magi/06-statusline-ui-refresh/PLAN.md`（Rev 3，傘狀契約）之
> 06b 對應章節（交付拆分表／D2／D3／多列輸出的引擎契約／排序與列指派 UX／
> Spikes S3／Verification 06b）。該文件經兩輪 MAGI plan review 全數裁決，
> 本 PLAN 為其 06b 摘錄＋落地細化，**不重啟已裁決事項**；兩者若有出入，
> 以傘狀 Rev 3 為準並回報修正本文件。
> **Rev 2（2026-07-11）**：回應本 sprint plan review Round 1（面向分區
> ×5，0 Critical／13 Important 全數回填、Notes 擇要、spike 裁決）；
> Open Q1 經使用者裁決：兩項 06a DRIFT C 類收進本 sprint。
> 對照表見文末「Review Round 1 回應對照表」。
> **Rev 3（2026-07-11）**：S3 spike（真機多列渲染矩陣，證據存
> `sp3/`）完成，四項裁決記回本文件：(1) 行尾契約維持「無尾隨換行」，
> Open Q1 備援分支（三處同步加單一 LF）不啟用；(2) 新增列首 padding
> 禁止事項護欄註記（引擎不得依賴列首空白）；(3) 新增 **Milestone
> 1.5**（M2 前置）——25 段圖示 emoji 全數改英文短 token＋冒號前綴，
> 推翻 06a「emoji 對照表 25 段全覆蓋」定案（使用者 2026-07-11 裁決）；
> (4) 新增 **Open Q3**——Claude Code 僅支援基本 16 色 SGR 之風險，
> 待真機 case6 確證後另裁，本次不變更色彩契約。細節見
> `sp3/REPORT.md`。
> **Rev 4（2026-07-11）**：T5.6 驗收回饋改版（使用者三項裁決）——
> (1) 版面由雙欄改**三欄滿版**（左目錄／中已選擇／右預覽產出，
> 斷點 3→2→1 欄）；(2) 選取互動改 transfer-list 模式：左欄目錄
> **灰化留位**（勾選零跳動），啟用段完整控件列改住中欄；
> (3) 「新增一列」由每段按鈕（S7 修訂案）再改為**中欄頂部單一按鈕
> ＋UI 暫存空列**（config 空列壓縮契約不動）。新增 **Milestone 5.5**
> 承載，T5.6／T5.7 驗收順延至 M5.5 完成後執行。詳見 D3-R4 節。
> **Rev 5（2026-07-11）**：T5.6 驗收回饋——**解禁跨列拖曳**（推翻
> Non-Goals「不做拖曳跨列」與 Rev 2 的 accept-then-revert-and-announce
> 案，使用者裁決）：跨列 drop＝實際移動（拖至他列段上＝插入其前並改
> 列；拖至列容器空白處含暫存空列＝落列尾），播報沿用「移至第 N 列第
> M 位（共 K）」；同列拖放維持交換語意；鍵盤路徑仍為 select。M5.5
> 增補 T5.10 承載。
> **Rev 6（2026-07-11）**：T5.6 驗收回饋第三波（使用者裁決）——
> (1) 中欄每段控件列加**「移除」鈕**（與左欄取消同路徑、雙入口，
> 推翻 T5.9 的「左欄單一入口」判斷）；(2) **拖曳語意統一為插入制**
> （同列拖放由「交換」改「插入」——與跨列一致；上/下移**按鈕**維持
> 相鄰交換不變）＋拖曳過程插入點**挪出空間視覺**（placeholder gap
> ＋過渡動畫）；(3) **整列刪除**——每列群組標題旁「刪除此列」鈕
> （刪除＝該列全段停用回目錄；**僅剩最後一個真實列時鈕 disabled
> 維持可見**；按下須確認才執行；UI 暫存空列亦給刪除鈕、免確認）。
> M5.5 增補 T5.11 承載。
> **Rev 7（2026-07-11）**：M1.5 前綴化收尾（使用者裁決）——段控件
> 「顯示圖示」措辭改**「顯示文字」**（圖示已全數為文字前綴），且
> **預設改為開啟**（defaultSegmentConfig 翻轉；既有存檔帶明確值不受
> 影響；golden configs 均顯式設定、bytes 預期不變並以 hash 驗證）。
> T5.12 承載。
> **Rev 8（2026-07-11）**：T5.6 驗收回饋——頂部條起拖不穩（段名為
> 可選取文字、按住易變選字；右半為按鈕群被 guard 正確阻擋）。裁決：
> 段列加**明確拖曳把手**（⠿ grip，enable-field 首位）＋頂部條
> `user-select: none`，除按鈕外整條可穩定起拖；控件阻擋 guard 不變。
> T5.13 承載。
> **Rev 9（2026-07-11，MAGI code review 修訂）**：Important #1 焦點 bug
> 修復——上／下移至列邊界時 re-focus 改指向反方向移位鈕（§排序與列指派
> UX 節補記），確保焦點不落 body；§Spec deltas 承諾之 root `SPEC.md`／
> `magi/PRD.md` 三處更新已套用（見 §Spec deltas 節標註）。
> **Rev 10（2026-07-12）**：T5.6 驗收回饋（使用者裁決）——「拖至列容器
> 空白處＝落列尾」**細化**：段與段之間的縫隙（flex gap 條帶，事件目標
> 為容器本身）依指標 Y 幾何解析插入點（與段上半/下半同一中線語意，
> 純函式 `resolveBlankAreaInsertIndex`）；僅最末段中線以下的尾端空白
> （含拖曳中放寬的命中區）與暫存空列維持落列尾。另修最後列拖曳被
> Chromium 即時中止 bug（`is-segment-dragging` 改 dragstart 後下一幀
> 才加——dragstart 同幀來源 li 版面位移會令拖曳 session 被中止）。
> **Rev 11（2026-07-12）**：T5.6 驗收回饋（使用者裁決）——**列耗盡
> 保留**：跨列移動（拖曳＋「顯示於第 N 列」select 同語意）把來源列
> 搬空時，該列**原地保留為空列**（暫存列樣式、其餘列編號不變）——
> 原「空列壓縮立即吃掉」行為造成「第3列消失」「拖到第3列卻顯示在
> 第2列」。空列為純 UI 態（不進 config／存檔，重整消失），存續至被
> 指派段（於該位置成真，其下真實列 row +1）或按免確認刪除鈕；
> ✕移除／取消勾選／整列刪除維持現行壓縮／刪除語意。實作：暫存列由
> 計數制升級**位置制 slots**（空列可在中間；純函式模組 row-slots.ts），
> 「第 N 列」一律以顯示位置編號（列標題／刪除鈕／select 枚舉／播報
> 同步）；引擎 normalizeRows／resolve 空列壓縮契約**不動**（config
> 恆無空列）。連帶修正暫存列刪除鈕計數制怪癖（改刪所點的那列）。
> T5.14 承載。
> **Rev 12（2026-07-12，MAGI 增量 review 修訂）**：Important ×3 修復——
> (1) select 跨列指派後**顯式回焦該 select**（li 重定位致 blur 落 body，
> 違反焦點契約；鍵盤跨列路徑復航）；(2) 整列刪除 inline 確認態
> **不跨 relayout 存活**（layoutSegmentContainers 對全部倖存容器復位
> ＋焦點保全，消除容器錯位復用留下指向別列的活體確認鈕）；
> (3) commitSegmentMove 決策層抽純函式 `planSegmentMove`（row-slots.ts）
> ＋組合矩陣單元測試（補回 nextPendingRowCount 刪除後的語意覆蓋）。
> **Rev 13（2026-07-12）**：使用者明示豁免 T5.7 SR 抽測（「朗讀跳過
> 不需要該功能」）——06b 驗收閘門縮減為 T5.6 手動驗證單關；a11y 結構
> （地標／標題／live region／焦點契約）維持已實作現狀，不再以 SR
> 實測驗收。

## Context

Sprint 06 傘狀契約將 statusline-builder UI refresh 拆為三段獨立交付。
06a（去 Nerd Font 依賴＋`powerlineArrow` gating＋CONFIG_VERSION 2＋全站
主題＋footer）已於 2026-07-11 交付（commit `f95f27d`，MAGI review
APPROVE）。本 sprint 為 **06b**，對應使用者回饋原文編號 2／3／4：

- **只能單列**（回饋 3）：實際需求是把 segment 分配到不同列。多行可行性
  已由使用者現役 7 列 PowerShell statusline 實證（LF join 後單次
  `Write`，Claude Code 逐列渲染）——列數不設產品上限。
- **版面動線**（回饋 2）：設定區很長、與預覽／產出垂直排列，調整時看不到
  預覽。改左右分欄：左＝設定，右＝預覽＋產出（sticky）。
- **排序鈕位置**（回饋 4）：上／下移鈕藏在展開後控件區第一欄，移至
  enable row 尾端；並釘死多列下的排序語意。

依賴：06a 的 emoji glyph 定案與 `powerlineArrow` gating 已出貨（本 sprint
的 `lastArrowCap` 逐列語意直接建立在該 gating 之上）。06c（目錄擴充）依賴
本 sprint 的多列引擎，屆時另開 `magi/08-*`。

## Goals & Non-Goals

### Goals
1. **多列輸出**：`SegmentConfig.row?: number`（CONFIG_VERSION 維持 2 之
   選填欄，**不 bump**）；`resolve()` 回傳 `rows: StyledRun[][]`；三後端
   （bash／ps1／emit-ansi oracle）與預覽全面多列；行尾契約＝列間單一 LF
   join、無尾隨換行。
2. **雙欄版面**：CSS Grid 左設定右預覽＋產出（sticky），約 `1100px` 以下
   退單欄；本頁 `main` 於雙欄斷點以上**放寬 max-width**（見 D3）；
   tab 序新增兩個鍵盤捲動停點（右欄容器＋預覽終端框）。
3. **排序與列指派 UX**：啟用段改「依渲染列分組」呈現（未啟用段維持四類
   分組——雙區清單；每個列群組維持與現行四類等價的地標／標題結構）；
   上／下移＝同列內交換、鈕移至 `.segment-row__enable-field` 尾端；
   跨列移動走「顯示於第 N 列」select。
4. **golden 重生**：僅「多列 join」一種變因，diff 逐行可審（既有單列
   case bytes 不變——此不變量由 code review 逐檔 diff 審查把關，非
   `npm test` 自動化驗收項）。
5. **順帶收整兩項 06a DRIFT C 類**（使用者核可 2026-07-11；皆落在本
   sprint 必改檔，BACKLOG 對應兩行於交付時劃銷）：
   (a) 預覽 powerline 箭頭 default 色渲染為透明三角——
   `tools/statusline-builder/style.css:784` 的
   `var(--arrow-fg, transparent)` 改 `var(--arrow-fg, currentColor)`，
   對齊真終端以預設前景繪出的行為；
   (b) `applyPreviewFontFamily` 死重清理（inline style 蓋掉
   style.css:736 較豐富字族棧）＋ `index.html:224` 既存「24 段」註解
   修正為 25。

**Milestone 1.5 插入（Rev 3 補記，2026-07-11）**：S3 spike 期間使用者
真機實測回報 statusline 完全不接受 emoji，裁決本 sprint 於 M2 前新增
**Milestone 1.5**：25 段 `icon.glyph` 全數改為英文短 token＋冒號前綴
（如 `cwd:`、`git:`，樣式同 spike case1 使用者實測過的呈現），三後端
與預覽同步、golden 全量重生——**此裁決推翻 06a「emoji 對照表 25 段
全覆蓋」定案**。對照表先由 developer 擬定（`prefix-table.md`）、使用者
核可後才動工（比照 06a 對照表流程）。里程碑已插入 `TASKS.md`
Milestone 1.5（T1.5.1／T1.5.2），本節僅記錄裁決緣由。詳見
`sp3/REPORT.md` §4-B。

### Non-Goals
- 06c 全部範圍：目錄擴充（25→30 段）、bar 正交欄、重置倒數、tokens 三段、
  auto 配色、`ResolveInput.now` 注入與 `STATUSLINE_NOW_EPOCH` 環境變數、
  時區策略（S2／S4／S5／S6 spike 皆屬 06c 前置）。
- ~~不做拖曳跨列（下拉選列；拖曳維持列內語意）。~~（**Rev 5 推翻**：
  T5.6 驗收回饋，使用者裁決解禁跨列拖曳——見 Rev 5 註與排序 UX 節。）
- 不做「每列獨立 mode／separator」——mode 與分隔符全域共用。
- 不動 CONFIG_VERSION（`row` 為 v2 內選填欄；v2→v3 遷移階梯屬 backlog）。
- 不動其他三個工具頁與入口頁。

## Design options considered

設計選項與取捨已於傘狀 PLAN Rev 3 經兩輪 MAGI review 裁決完畢（Round 1
I1／I2 全票、Round 2 R2-3 渲染列序收口、「排序 vs 4-`<ol>`」重構等），
本節僅摘錄**採納案**與其操作性細節，不再列落選選項。Rev 2 補釘各處以
【R#】標記出處票。

### D2（06b 部分）— 多列資料形狀：`SegmentConfig.row`

- `row?: number`：**缺欄→0**；清洗＝非整數／負值／缺→0，**clamp 至
  catalog 段數 − 1**（現行 25 段 → 24；06c 擴目錄後自然放寬。傘狀
  「上限 29」係 06c 後 30 段之數值，clamp 一律以現役目錄段數計）——
  防手改存檔 `row:999999999` 讓列選單枚舉凍死頁面；產品敘事仍是
  「無上限」。
- 列內順序＝`config.segments` 陣列順序；resolve 期按 `row` 分組、空列
  壓縮剔除。**分組鍵明訂為 `seg.row ?? 0`**（`defaultSegmentConfig`
  產生的段不帶 `row`，undefined 一律併 0，確保「無存檔預設 config」與
  「清洗後 config」列分佈一致；落一條單元測試）【R1】。
- **渲染列序語意（傘狀 Round 2 收口）**：分組依 `row` 值**升冪**排序後
  壓縮＝渲染列序（邏輯列 1..N）；UI 播報、列號 badge、`<select>` 選項
  文字、預覽 aria、產出腳本行序**全面採渲染列序**；且**每次 config
  寫回時將 `row` 正規化為 0..N−1**——存檔口徑與顯示口徑永久合一，
  「保存後列分佈不變」可保證。**亂序輸入（如 row 值 5,2,9）單元測試
  必備。**
- **正規化涵蓋範圍（Rev 2 釘死）**【R3】：正規化**僅及啟用段＝
  `resolve()` 分組所用的同一組存活段**；停用段 `row` 凍結不動。
  現行架構「清洗只在 deserialize、`serializeConfig` 為裸
  JSON.stringify」（config.ts:93-95），故正規化落在 `commitConfig()`
  寫回點直接改寫記憶體 `config.segments[i].row`；**row 相關 UI 同步
  （select 選項刷新、列群組重編號）僅於偵測到分組實際變動時重跑**，
  與 row 無關的 commit（如改顏色）不得觸發全體 select 刷新。
- **重新啟用帶舊 row 值的段（Rev 2 釘死）**【R3】：保留其凍結的
  `row` 值——若該值 ≤ 現行最大渲染列則落對應列（停用→重啟用的
  round-trip 保留列分佈），**超出範圍則 clamp 至最後一列**；重啟用
  **不自動新增列**。列入驗收案例。
- **列選擇 UI**：每段「顯示於第 N 列」`<select>`（N＝渲染列序）**僅枚舉
  實際使用中的列**；選項刷新以**更新既有 `<option>`** 實作，不重建
  `<select>` 節點（防鍵盤焦點跳失）。跨瀏覽器行為由 **S7 spike** 先驗
  （見 §Spikes）【R5】。
  **S7 實測修訂（2026-07-11 使用者裁決）**：「新增一列」**移出 select、
  改為每段 select 旁的獨立按鈕**（語意＝把本段移至新的一列）。原因：
  Windows 閉合狀態 select 的方向鍵導航**逐按即提交**（每按發 `change`），
  「新增一列」作為 option 時鍵盤使用者按住 ↓ 會無限誤觸建列（實測
  rowCount 7→10 連鎖，證據 sp7/RESULTS.md）；原地更新本身經實測安全
  （不搬焦點／不跳捲動／選取不漂移），維持採用。

### D3 — 雙欄版面

- CSS Grid 兩欄，斷點約 `1100px` 以下退單欄；**DOM 順序不動**，只加兩個
  wrapper 調整視覺配置。
- **與全站 `max-width:960px` 的交互（Rev 2 釘死）**【R4】：
  `src/style.css:203-210` 鎖 `header, main, footer{max-width:960px}`，
  若不放寬，雙欄每欄僅 ≈430px——`.threshold__buckets`
  （tools/statusline-builder/style.css:704-708）每行剩 1 桶、10 桶
  閾值編輯器高度暴增，抵銷「同時看到設定與預覽」訴求。裁決：本頁
  local override 於雙欄斷點（≥1100px）**放寬 `main` max-width 至
  約 1360px**（header／footer 同步放寬以維持對齊），每欄 ≈640px、
  buckets 可回 2 桶/行；斷點以下回落全站 960px 基線。此為
  statusline-builder 頁 local 樣式，不動 `src/style.css`。
- **grid 內既有節點歸屬（Rev 2 釘死）**【R4】：`<main>` 首子節點
  `#error-message`（`role="alert"`，index.html:72）**顯式
  `grid-column: 1 / -1`** 跨欄，防 auto-placement 錯位；skip-nav 併入
  **左欄 wrapper**（維持在 global-section 與 segment-lists 之間，
  既有 tab 序功能不變）。header／theme-toggle／footer 在 `<main>` 外，
  不受影響。
- 右欄 `position: sticky; top: 0; align-self: start`（grid 子項預設
  stretch 會使 sticky 失效——必須 start）；`max-height: 100dvh`（非
  `100vh`，行動端工具列遮擋）；`overflow-y: auto`。
- **右欄捲動容器**：`role="region"`＋`tabindex="0"`＋
  `aria-label="預覽與產出"`（generic `<div>` 的 aria-label 多數 AT 不
  朗讀，必須有 role；WCAG 2.1.1 鍵盤可捲）。
- **預覽終端框** `overflow-x: auto`（多列＋窄視口的橫向溢位）——第二個
  鍵盤捲動區，同樣 `tabindex="0"`（其容器名稱見「多列預覽 a11y」）。
  a11y 契約表述＝「tab 序新增**兩個**捲動停點，其餘不變」。
- **巢狀捲動已知風險（Rev 2 補記）**【R4】：右欄 wrapper（縱捲＋可聚焦）
  會包住既有三個 `output-block__code`（本身已 `tabindex="0"`＋縱橫雙捲，
  style.css:824-836），形成巢狀捲動。無鍵盤陷阱（Tab 可移出），但
  方向鍵落點瀏覽器行為不一——SR 抽測補專項（見 Verification §4）；
  若實測行為混亂，再議跳過巢狀層機制（本契約不預先鎖定解法）。
- skip-link 保留。

### D3-R4 — 三欄滿版改版（Rev 4，2026-07-11 T5.6 驗收回饋裁決）

> 本節**取代** D3 的雙欄版面與 T5.3 雙區清單的「同一 `<li>` 跨容器搬移」
> 互動；D3 的 sticky／捲動停點／a11y 契約**沿用**（落點移至右欄）。
> 觸發原因（使用者驗收原話）：勾選／取消段時項目「亂跳」——勾選的
> `<li>` 連著 checkbox 被搬走，一路往下勾的自然流程每勾一次清單就
> 重排一次，迷航式互動；且「新增一列」每段一顆 + 很怪；頁面資訊量
> 大，雙欄仍需頻繁捲動。

- **三欄**：左＝**segment 目錄**（25 段、維持四類分組、**常駐不重排**）；
  中＝**已選擇**（列群組容器＋排序＋列指派＋各段完整控件列）；右＝
  **即時預覽＋產出腳本**（沿用 D3 的 `role="region"`＋`tabindex="0"`＋
  `aria-label="預覽與產出"`＋sticky＋預覽框橫向捲動停點——「兩個捲動
  停點」a11y 契約不變）。
- **滿版**：本頁 local override 於三欄斷點放寬 `main`（header／footer
  同步）至滿版（可設 ~1800px 上限防超寬螢幕過度拉伸）；斷點退化
  **3→2→1**：≥~1400px 三欄；~1100–1400px 兩欄（左＝目錄＋已選擇堆疊、
  右＝預覽產出，回落 06b 雙欄精神）；<~1100px 單欄（回全站 960px 基線）。
- **transfer-list 互動（灰化留位）**：左欄目錄項為**輕量常駐項**（段名
  ＋說明；勾選控件），勾選＝啟用：左欄項**原位灰化**標記「已加入」
  （可再點取消），中欄對應列群組出現該段的**完整控件列** `<li>`。
  取消＝停用：左欄恢復、中欄該 `<li>` 收入**隱藏池容器**（display:none
  ——**不銷毀**，保住 T5.3 節點重用鐵律：監聽器不重綁、閾值展開態
  不重置），重啟用再從池中搬回列群組（重啟用落點 clamp 語意不變）。
  驗收：一路連續勾選 N 段，**左欄視覺零重排**、焦點不跳失。
- **「新增一列」（第三修）**：中欄頂部**單一按鈕**；按下→中欄出現一個
  **UI 暫存空列**容器（純 DOM 態、不進 config），可用各段「顯示於第 N
  列」select 或同列拖曳把段放入；暫存空列在重整（分組變動 relayout）時
  若仍無段則自然移除。**config 的空列壓縮／正規化契約完全不動**；
  select 枚舉需含暫存空列（枚舉來源＝渲染列 ∪ 暫存列）。T5.4 的每段
  「新增一列」按鈕**移除**；S7 的鍵盤誤觸裁決（不放 select option）
  **維持有效**。
- 排序（T5.5）／列指派（T5.4）機制不變，容器歸屬改中欄。
- 既有 `#error-message` 跨欄（`grid-column: 1 / -1`）與 skip-nav 歸屬
  左欄原則沿用。

### 多列輸出的引擎契約

- `resolve()` 回傳 `rows: StyledRun[][]`（按 row 分組、空列壓縮）。
  **受影響面完整清單（Rev 2 補齊）**【R1】：
  - 簽章／實作：`emit-ansi.toAnsi(rows: StyledRun[][])`、
    `emit-bash.ts`／`emit-ps1.ts`（執行期展開，見下）、
    `render-preview.ts`（逐列容器）；
  - 呼叫端改逐列：`resolve.toAriaLabel` **簽章不變**（見下）；
  - harness：`scripts/golden-statusline*.mjs` 兩個；
  - 測試（形狀機械改寫，**非 golden 重生可涵蓋**）：
    `resolve.test.ts`（數十處 `resolve(...).map(r=>r.text)` 式扁平
    斷言）、`emit-ansi.test.ts`（`toAnsi([{…}])` 扁平字面全數改
    `toAnsi([[…]])`）、`pipeline.integration.test.ts`、
    `render-preview.test.ts`（若 renderRuns 簽章變）。
- **`toAriaLabel` 維持 `StyledRun[]→string`（Rev 2 釘死）**【R1】：
  逐列 aria 模型需要對單列求 label——由 `render-preview.ts` 迭代
  rows、逐列呼叫並**自行**加「第 N 列：」前綴（N＝渲染列序）；
  toAriaLabel 本身不進「簽章同步」桶、不吃巢狀陣列。
- **行尾契約**：列間以單一 **LF** join、**無尾隨換行**——bash 維持
  `printf '%s' "$out"`、ps1 維持 `[Console]::Out.Write($out)`（`$out`
  內含 `` `n ``），**不用** `printf '%s\n'` 也**不用** `WriteLine`
  （Windows 附 CRLF，byte-exact 必炸）。oracle＝
  `rows.map(joinRow).join('\n')`。每列行尾 SGR reset 在 LF **之前**。
  Claude Code 對無尾隨換行的渲染等價性由 **S3 spike** 驗證；若需尾隨
  換行則三處同步加單一 LF（傘狀已預留此分支）。**S3 裁決（2026-07-11
  已完成）**：真機 case1（無尾隨換行）與 case5（有尾隨換行）渲染
  等價、無任何可見差異，**維持現行「無尾隨換行」契約**，上述備援
  分支（三處同步加單一 LF）**不啟用**。證據：`sp3/REPORT.md` §3.2。
- **列首 padding 禁止事項（S3 裁決，2026-07-11）**：真機實測 Claude
  Code 會 trim 每列列首空白（空格與 tab 一律剝除，`sp3/REPORT.md`
  §3.1），故多列引擎**永不得依賴列首空白**做縮排或對齊；若未來需要
  列首縮排，須改用非空白字元。現行契約（padding 為段間／段尾語意，
  各列首段前本就無空白）**不受此發現影響**，此處僅補一道禁止事項
  護欄註記防未來設計誤踩。
- **列數上限與超寬列（S3 實測備註，2026-07-11）**：12 列全數渲染
  未觸頂（上限若存在也 ≥12），足以支撐「列數無上限」產品敘事；超寬
  列於終端右緣截斷（以 `…` 收尾）、不自動換行、不影響其他列渲染。
  兩項皆為觀察記錄，**不構成契約變更**。證據：`sp3/REPORT.md` §3.3。
- **emit-ps1 純 ASCII 不變量（S3 根因教訓，2026-07-11）**：S3 診斷
  出 spike `.ps1`（UTF-8 無 BOM＋中文註解）在 Windows PowerShell 5.1
  下被系統 CP950 誤解析、吞掉下一行程式碼，導致 ANSI 轉義字元缺失
  （`sp3/REPORT.md` §4-A）。產品 `emit-ps1.ts` 因既有設計「非 ASCII
  一律以 `[char]` 跳脫、產出檔案純 ASCII」對此問題**免疫**（無 BOM
  依存、無 CP950 誤判風險）。**護欄註記**：`emit-ps1.ts` 產出的
  `.ps1` 內容必須維持純 ASCII（`[char]` 跳脫）不變量，理由＝規避
  非 UTF-8-aware shell（如 Windows PowerShell 5.1 預設無 BOM 讀檔）
  的編碼誤判風險；此不變量本次未變更、僅補記存在理由。
- **shell 端執行期展開語意（Rev 2 釘死——byte-exact 樞紐）**【R1】：
  現行 emitter 第二趟 join 為單一扁平累加器（emit-bash.ts:323-371 的
  `texts/fgs/bgs`、emit-ps1.ts:514-582 的 `$Segs`），多列後改為四步：
  1. **逐列緩衝**——依 emit 期寫死的 row 分組，各列獨立累加（列內
     箭頭／分隔符與逐列 cap 只作用於該列緩衝）；
  2. **執行期空列過濾**——某列的段在 runtime 全部死亡（null hide）時
     該列整條剔除，**不得吐空行**；
  3. **存活列以 LF 串接**——LF 只夾在存活列之間（LF 數＝存活列數−1）；
  4. **零存活列退化**——輸出單一 SGR reset（與 oracle 的 `[[]]` 對齊）。
  三後端同構展開；此路徑之 byte-exact 驗證見 Verification §1
  「多列真執行場景」。
- **全段隱藏退化**：`resolve()` 於零存活列時回傳 **`[[]]`**（一列空列）
  ——保住 `toAnsi`「全隱藏輸出恆為單一 reset、非空字串」的既有鎖死
  不變量與 golden。**新失效邊界（Rev 2 補）**【R1】：改制後
  `toAnsi([])`（零列）＝空字串，非空不變量僅靠 resolve 恆回 `[[]]`
  維繫——補「`resolve()` 回傳長度恆 ≥1（`[[]]`，永不 `[]`）」斷言，
  並同步改寫 `emit-ansi.ts` 檔頭不變量註解（line 17-18）與
  `emit-ansi.test.ts:22` 字面為 `[[]]`。預覽於零存活列時仍渲染一個
  具名容器（沿用 `EMPTY_PREVIEW_LABEL` 兜底；掛載層級見「多列預覽
  a11y」）。
- **`lastArrowCap` 逐列套用**（每列各自收尾箭頭）；**僅於
  `powerlineArrow === true` 時生效**（gating 條件表見 06a 契約，已出貨）。
  `powerlineArrow === false` 時每段右 padding 語意不變——多列下即
  「每列末段亦帶尾隨空格」（三後端一致；使用者文件一句話註記屬 backlog
  既有項，不在本 sprint 擴大）。
- **多列預覽 a11y（Rev 2 修正誤述）**【R2+R4】：預覽框由 06a 現況
  **`role="img"`**（index.html:322 靜態＋render-preview.ts:159 每次
  render 無條件覆寫）**改為 `role="group"`**＋固定
  `aria-label="狀態列預覽"`；內部**每列一個 `role="img"` 子容器**、
  `aria-label="第 N 列：〈該列 toAriaLabel 結果〉"`（N＝渲染列序）——
  AT 使用者可逐列導覽，不再是單一長句。（img 為葉節點角色、子代被
  多數 AT 忽略，故外層 role 轉換為**必要**改動，不是「維持」。）
  全隱藏 `[[]]` 時：外層 group 保留、內部渲染**單一**子容器承載
  `EMPTY_PREVIEW_LABEL`（比照逐列容器結構），補單元測試。

### 排序與列指派 UX

- **清單結構重構**（同列交換在現行 4 個類別 `<ol>` 上做不到——「列」與
  「類別」正交）：**啟用段改「依渲染列分組」呈現**（每列一組、列內順序＝
  視覺順序＝陣列序），**未啟用段維持既有四類分組區**（雙區清單）；
  `moveSegment` 改以 `config.segments` 陣列中「同 row 子序列」的索引運算
  ＋重渲染實作，不再依賴 DOM 相鄰節點交換。列號 badge 降為輔助。
- **「重渲染」＝節點重用，絕不銷毀重建（Rev 2 釘死）**【R3】：
  比照現行 moveSegment 慣例（main.ts:639-660 以 `insertBefore` 搬移
  既有節點＋顯式 `focus()` 保焦點），一切列內移動／跨列指派／啟停
  切換皆以**既有 `<li>` 節點重新定位**（`insertBefore`／`appendChild`
  至目的容器）實作——不得銷毀重建 template 實例（否則焦點掉失、
  閾值編輯器展開態〔純 DOM 態，不在 config〕重置、6+ 組監聽器重綁）。
  移動後顯式 re-focus 觸發鈕。
- **啟停切換＝跨容器搬移（Rev 2 補記）**【R3】：現行 enable 只切
  class（main.ts:496-504）；雙區清單下 checkbox 切換改為把該段
  `<li>` 於「四類分組區 ↔ 渲染列群組」間搬移（同上節點重用原則）。
  此為最高頻互動，驗收補「連續切換 N 次，checkbox 焦點／checked
  不受影響」。
- **列群容器生命週期（Rev 2 補工作項）**【R3】【R5】：列群組容器
  數量＝N、隨列增刪／空列壓縮動態變化——需明確子項涵蓋：列群組
  template（或建構函式）、容器建立／銷毀／重編號流程、容器移除前
  既有 `<li>` 的安全轉移（先搬離再移除）；**每個列群組維持與現行
  四類區等價的地標／標題結構**（`<section aria-labelledby>`＋標題
  「第 N 列」），保住 SPEC Conventions「大量項目 skip 機制」不變量
  ——SR 可逐列跳轉，列入驗收。
- **上／下移＝同列內與前／後一個同列段交換**；跨列移動一律走「顯示於
  第 N 列」select。段已是該列首／末時對應鈕停用（`disabled`＋維持可見）。
- **Rev 9（2026-07-11 review 修訂）**：若移動使觸發方向鈕停用（段落列首／
  末），re-focus 改指向反方向移位鈕，確保焦點不落 body。
- 播報文案：「〈段名〉移至第 N 列第 M 位（共 K）」（N＝渲染列序）。
- 拖曳維持既有機制但語意同上下移（**限同列**）；**跨列拖放改
  accept-then-revert-and-announce（Rev 2 補記）**【R3】：現行 dragover
  guard 是跨容器不 `preventDefault()`（無 drop 事件、無播報，
  main.ts:612-618），新規則需「接受 drop → 程式化吸附回原列 → 播報」，
  屬新增邏輯非沿用。
  **Rev 5 再修（2026-07-11 使用者裁決，取代上述跨列語意）**：跨列
  drop＝**實際移動**——拖至他列某段上＝插入該段之前並改 `row`；拖至
  列容器空白處（含 UI 暫存空列）＝落該列尾端；陣列運算＝自原位移除
  ＋插入目標位置（列內順序＝陣列序契約維持）；播報同鈕移動文案
  「〈段名〉移至第 N 列第 M 位（共 K）」；同列拖放維持交換語意不變；
  鍵盤跨列路徑仍＝「顯示於第 N 列」select（拖曳為滑鼠增強）。
  **Rev 6 再修（2026-07-11 使用者裁決）**：(1) **中欄每段「移除」鈕**
  ——與左欄目錄取消走同一停用路徑（li 收隱藏池、左欄項恢復），焦點
  策略需明確（不得落 body）＋播報；(2) **拖曳統一插入制**：同列拖放
  由「交換」改「插入目標段之前／列尾」（與跨列一致；同一 compute
  純函式涵蓋 targetRow＝原列情形），上/下移**按鈕**維持相鄰交換；
  (3) **插入點挪空間視覺**：dragover 期間於預定插入位置放 placeholder
  gap（既有項目位移讓位、過渡動畫），drop／dragend 移除——純 UI 態，
  不違節點重用鐵律；
  (4) **整列刪除（Rev 6 追加）**：每列群組標題列一顆「刪除此列」鈕
  ——語意＝該列全部段**停用**（li 收隱藏池、左欄目錄項恢復可勾；
  row 值凍結語意沿用）；**僅剩最後一個真實列時該鈕 disabled**（維持
  可見，防清空）；按下→**確認步驟**（確認才執行；實作型式 developer
  擇定並回報）＋執行後播報；**UI 暫存空列**亦給刪除鈕（純 placeholder
  移除、免確認）——同時解決「未使用暫存列無撤銷」缺口。焦點策略
  明確（刪除後不得落 body）。
  **Rev 10 再修（2026-07-12 使用者裁決）**：「拖至列容器空白處＝落列
  尾」細化——段間縫隙（flex gap 條帶，事件目標為容器本身）依指標 Y
  幾何解析插入點（與段上半/下半同一中線語意，`resolveBlankAreaInsertIndex`
  純函式＋單元測試）；僅最末段中線以下的尾端空白（含拖曳中放寬命中區）
  與暫存空列維持落列尾。另：`is-segment-dragging` 命中區放寬 class 改
  dragstart 後**下一幀**（rAF）才加——Chromium 於 dragstart 派發同幀偵測
  到來源 li 版面位移會立即中止原生拖曳（此前最後列一定拖不動的根因）。
- 上／下移鈕位置：`.segment-row__enable-field` 尾端（`margin-left:auto`），
  僅啟用列顯示。
- **「從空白建多列」流程**（S7 修訂版，2026-07-11）：勾選段（預設列 1）
  → 按該段旁的**「新增一列」按鈕** → 段移至列 2 且全段 select 選項出現
  列 2……重複即得 N 列。此流程列入驗收。（原案「該段 select 選『新增
  一列』」因 S7 實測鍵盤誤觸風險改為獨立按鈕，見 D2 列選擇 UI。重新
  啟用**曾啟用過**的段之落點見 D2「重新啟用帶舊 row 值的段」。）

## Recommended approach（檔案面工作分解）

1. **S3 spike 先行**（gate，見 §Spikes）——結論寫回本 PLAN 引擎契約節。
   **S7 spike**（`<option>` 原地更新跨瀏覽器）於 UI 面（步驟 5）動工前
   完成即可。
2. `tools/statusline-builder/config.ts`：`row` 選填欄＋清洗（非整數／負值
   ／缺→0、clamp ≤ 段數−1）＋`commitConfig` 寫回正規化（僅啟用段，
   0..N−1）（version 維持 2）。
3. 引擎面：`resolve.ts`（`seg.row ?? 0` 分組、空列壓縮、`[[]]` 退化＋
   「回傳長度恆 ≥1」斷言；`toAriaLabel` 簽章不變）、`emit-ansi.ts`
   （`toAnsi(rows)`＋檔頭不變量註解改 `[[]]`）、`emit-bash.ts`／
   `emit-ps1.ts`（四步執行期展開：逐列緩衝→空列過濾→LF 串接→零存活
   退單 reset；`lastArrowCap` 逐列）。
4. 測試面（形狀機械改寫）：`resolve.test.ts`、`emit-ansi.test.ts`、
   `pipeline.integration.test.ts`（新增多列 combo 與「非末列 runtime
   全滅」真執行 case）、兩個 golden harness。
5. UI 面：`index.html`＋`style.css`＋`main.ts`——雙欄（D3：兩個 wrapper
   ＋`#error-message` 跨欄＋skip-nav 併左欄＋本頁 max-width 放寬）、
   雙區清單（列群組容器生命週期＋地標／標題；節點重用原則）、排序鈕
   移位與同列交換、「顯示於第 N 列」select（option 原地更新）、跨列
   拖放 accept-then-revert。
6. `render-preview.ts`：外層 role `img→group` 轉換（index.html 靜態
   role＋固定 aria-label 同步）、逐列 `role="img"` 子容器（逐列呼叫
   `toAriaLabel`＋「第 N 列：」前綴）、`[[]]` 時 EMPTY_PREVIEW_LABEL
   單一子容器＋單元測試；**順帶收整**：style.css:784 箭頭 fallback
   `transparent→currentColor`、`applyPreviewFontFamily` 死重移除、
   index.html:224「24 段」註解改 25（Goals #5）。
7. golden 全量重生（僅多列 join 一種變因，逐行審 diff；既有單列 case
   bytes 不變由 code review 逐檔把關）。

新依賴：無。

## Spikes

- **S3. Claude Code 多列渲染細節**（06b 前置 gate；傘狀原文）✅
  **完成（2026-07-11）**：12 列＋列首空白＋超寬列真機一輪——驗列首
  trim（約束 padding 契約）、無尾隨換行渲染等價性（約束行尾契約）、
  列數上限與截斷行為；結論已寫回本 PLAN 引擎契約節（見上）。證據存
  `magi/07-statusline-multirow-layout/sp3/`（`REPORT.md`＋
  case1–case5 腳本）。
- **S7. `<option>` 原地更新的焦點／選取保存（Rev 2 新增）**【R5】✅
  **完成（2026-07-11，證據 sp7/）**：
  「從空白建 7 列」流程每加一列＝全體啟用段 select 刷新一次，為本
  sprint 最頻繁的即時 DOM 更新路徑。最小 repro（多個 `<select>`，一個
  持續增改 `<option>`、另一個聚焦操作方向鍵/Enter）實測結論：
  (1) **原地更新安全**——非目標 select 更新不搬焦點／不跳捲動、目標
  select 更新後顯示值仍對應原選取（value 錨定），採用；
  (2) **重大發現**：閉合 select 方向鍵逐按即提交 → 「新增一列」作為
  option 會被鍵盤無限誤觸——裁決移出 select 改獨立按鈕（記回 D2）；
  (3) 瀏覽器覆蓋：Chromium 系（Windows）實測；**Firefox 未測**（使用者
  環境無 Firefox，裁決註記後收案——若日後 Firefox 回報下拉異常再補）。
- （裁決記錄）R1 所提「shell 多列 join byte-exact」風險**不另開真機
  spike**——落為 CI 面測試任務（Verification §1 多列真執行場景，沿用
  emit-bash.test.ts:432-439 既有 runner）。R3 所提「重渲染焦點原型」
  已由契約釘死「節點重用＋insertBefore」原則取代，降級為驗收項。
  R5 所提「sticky＋100dvh 跨瀏覽器」併入 Verification §2 瀏覽器矩陣
  註記，不另開 spike。

## Open questions

1. **S3 結論分支** — ✅ **已裁決（2026-07-11）**：S3 真機矩陣顯示無尾隨
   換行與有尾隨換行渲染等價（case1 vs case5 無任何可見差異），**維持
   現行「無尾隨換行」契約**，本分支（三處同步加單一 LF）**不啟用**。
   證據：`sp3/REPORT.md` §3.2。
2. **巢狀捲動落點**（D3 已知風險）：SR 抽測若發現方向鍵落點混亂，
   解法（Home/End 導向或跳過機制）屆時再議，不預先鎖定。
3. **16 色 SGR 限制風險（Rev 3 新增，2026-07-11）** — ✅ **已解除
   （2026-07-11 同日 case6 真機確證）**：官方文件與 GitHub issues
   （#16790、#6466、#42382）指出 Claude Code statusline 僅支援基本
   16 色 SGR、256 色／truecolor 會字面滲出、分開碼鏈可能失效——但
   使用者真機（`sp3/case6-sgr-forms.ps1`，7 列逐形式矩陣）實測
   **全部形式正常渲染**：基本 16 色、亮色（90–97）、合併碼鏈
   （`[42;30m`）、分開碼鏈（`[42m`+`[30m`）、粗體、256 色 fg/bg
   （`38;5;196`／`48;5;24`）、truecolor（`38;2;…`）皆正確上色，
   無任何滲碼。**裁決：色彩契約維持現狀（ansi256／truecolor 雙軌），
   不新增 ansi16 軌、不做 emit 期量化**；文件／issues 情報對使用者
   現行版本已過時，證據以真機為準（版本相依性風險記 backlog 級註記
   即可）。另 case6 以 7 列無尾隨換行帶色渲染成功，同步加固行尾契約
   與多列結論。證據：`sp3/REPORT.md` §4-C、
   `sp3/截圖結果/case6-sgr-forms.ps1.png`。

## Spec deltas

> ✅ **已套用（2026-07-11，MAGI code review Important #3／#4 修復）**：
> 下列三處（root `SPEC.md` Components／Status、`magi/PRD.md` Goals）已
> 落地；本節條目下方「雙欄版面」為撰寫本節當下（06b 動工前）措辭，
> **終態依 Rev 4–8 裁決已改為三欄滿版 transfer-list**（見 D3-R4 節），
> SPEC.md 實際落地內容已依三欄終態撰寫，此處條目維持原文存證、不回頭
> 改寫。

### root `SPEC.md`
- **Section: Components（statusline-builder 條目）** — modify
  Why: 單列假設改變——新增多列輸出與雙欄版面能力。
  New content: 補「多列輸出（`row` 選填欄、渲染列序語意、`resolve()` 回傳
  `StyledRun[][]`、全隱藏 `[[]]` 退化、列間 LF join 無尾隨換行）、雙欄
  版面（左設定右預覽 sticky）、啟用段依渲染列分組清單（列群組維持
  地標／標題結構）」；CONFIG_VERSION 維持 2 不變。
- **Section: Status** — modify
  Why: 傘狀 Status 段已預告「多列輸出、雙欄版面…留待 06b／06c 各自交付
  時再更新本段」。
  New content: 06b 交付敘述（多列＋雙欄＋排序語意），並保留 06c 待交付
  註記。

### root `CLAUDE.md`
(none)

### magi/`PRD.md`
- **Section: Goals** — modify
  Why: statusline 產生器目標需補多列能力（傘狀 PRD delta 的 06b 份額；
  進度條／倒數／tokens／自動配色屬 06c，屆時另補）。
  New content: statusline 條目敘述補「多列無上限」。

### magi/`TECHSTACK.md`
(none)

## Verification（傘狀 Verification 06b 承接＋Rev 2 補項）

1. `npm test` 全綠：
   - row 清洗（非整數／負值／缺→0、clamp）＋寫回正規化（**僅啟用段**；
     亂序輸入→渲染列序）＋分組鍵 `seg.row ?? 0`（default config 與
     清洗後 config 列分佈一致）；
   - resolve 分列＋空列壓縮＋全隱藏 `[[]]`＋**回傳長度恆 ≥1 斷言**
     （`toAnsi` 單一 reset 不變量保留、emit-ansi 測試字面同步 `[[]]`）；
   - 行尾契約（LF join 無尾隨換行、reset 在 LF 前）byte-exact；
   - **多列真執行場景（Rev 2 新增）**：三列 config 其中一條**非末列**
     的段在情境中 runtime 全滅——emitBash／emitPs1 真跑 stdout 對
     `toAnsi(resolve(...))` hex 比對（無空行、LF 數＝存活列−1），
     含全列全滅退單一 reset 一案；
   - `lastArrowCap` 逐列（gating 依 06a 條件表）golden；
   - 預覽 `[[]]`→EMPTY_PREVIEW_LABEL 單一子容器單元測試。
   - **註**：`resolve.test.ts`／`emit-ansi.test.ts` 的扁平形狀斷言屬
     機械改寫工作量，非 golden 重生可涵蓋（受影響面清單）。
2. 手動：雙欄與 <1100px 退化、本頁 max-width 放寬後每欄寬度合理、
   **雙欄下展開一個百分比段閾值編輯器確認 `.threshold__buckets`
   可用性**、sticky（`align-self:start` 生效）、右欄與預覽框兩個鍵盤
   捲動停點（`role="region"` 名稱朗讀）、**抽驗既有數個控件 tab 相對
   順序未因雙欄改變**、啟用段依列分組清單（含**逐列標題／群組
   可跳達**）、排序語意（同列交換／列首尾停用／播報含列位）、
   **連續啟停切換某段 N 次焦點與 checked 不受影響**、列指派流程
   （從空白建 7 列）、**重新啟用帶舊 row 值段之落點（含 row 超出
   現行列數 clamp 至末列）**、預覽逐列 aria、預覽箭頭 default 色
   以 currentColor 繪出（Goals #5a）。瀏覽器矩陣：Chrome／Edge／
   Firefox（sticky＋`100dvh` 各驗一次；Safari best-effort，不支援
   降級可接受並註記）。
3. 真機 smoke：**直接重用 S3 spike 的設定與腳本（`sp3/`）**換真
   Claude Code 環境重跑（Windows Terminal＋VS Code 終端），逐列渲染、
   無多餘空列、列首無被 trim 的 padding。
4. SR 抽測（**06b 驗收 blocker**，約 0.5–1h）：NVDA 或 VoiceOver——
   兩個捲動停點名稱、逐列預覽、逐列群組標題跳轉、排序播報、
   **聚焦任一 `output-block__code` 驗證方向鍵捲動落點（巢狀捲動）**。
5. `npm run typecheck`、`npm run build && npm run verify:dist` 綠
   （既有 gate，無新斷言需求）。

## Review Round 1 回應對照表（Rev 2）

| # | Issue（票） | 處置 | 落點 |
|---|---|---|---|
| 1 | 受影響面漏 resolve.test/emit-ansi.test（R1） | 清單補齊＋改寫量註記 | 引擎契約／Verification §1 註 |
| 2 | shell 端多列展開語意未釘（R1） | 四步展開語意＋真執行場景 | 引擎契約／Verification §1 |
| 3 | toAriaLabel 簽章矛盾（R1） | 簽章不變、逐列呼叫＋前綴歸屬 | 引擎契約 |
| 4 | 預覽 role「維持」誤述（R2+R4） | 回改「img→group 轉換」＋雙層重構工作項 | 引擎契約／approach 6 |
| 5 | #error-message／skip-nav 歸屬（R4） | 跨欄＋併左欄釘死 | D3 |
| 6 | 1100px vs 960px 交互（R4） | 本頁 max-width 放寬 ~1360px＋驗收補項 | D3／Verification §2 |
| 7 | 巢狀捲動（R4） | 已知風險記錄＋SR 專項 | D3／Verification §4／Open Q2 |
| 8 | 重渲染節點身份（R3） | 釘死節點重用＋re-focus | 排序 UX 節 |
| 9 | 啟停跨容器搬移（R3） | 同原則＋驗收補項 | 排序 UX 節／Verification §2 |
| 10 | 列群容器生命週期（R3） | 補明確工作項 | 排序 UX 節／approach 5 |
| 11 | 正規化範圍＋select 空轉（R3） | 僅啟用段＋分組變動才刷新 | D2 |
| 12 | 重啟用舊 row 落點（R3） | 保留值＋clamp 末列＋驗收 | D2／Verification §2 |
| 13 | [deltas] 列群組地標缺席（R5） | 等價地標／標題結構＋驗收 | 排序 UX 節／deltas SPEC 條目 |
| N | toAnsi([]) 翻轉（R1 Note） | ≥1 斷言＋註解/測試字面 | 引擎契約／Verification §1 |
| N | default row undefined（R1 Note） | `seg.row ?? 0` 釘死 | D2 |
| N | clamp 交叉誤讀（R2 Note） | 補「以現役段數計」半句 | D2 |
| N | 拖放 accept-then-revert（R3 Note） | 補記為新增邏輯 | 排序 UX 節 |
| N | smoke 沿用 sp3（R5 Note） | 明訂重用 | Verification §3 |
| N | tab 序迴歸（R5 Note） | 驗收補項 | Verification §2 |
| N | Goal 4 無驗收（R5 Note） | 顯式註明 code review 把關 | Goals #4 |
| S | option 原地更新（R5 spike） | 新增 S7 | Spikes |
| S | sticky/dvh 跨瀏覽器（R5 spike） | 併入驗收瀏覽器矩陣 | Verification §2 |
| S | shell byte-exact（R1 spike） | 落為 CI 測試任務 | Verification §1 |
| S | 重渲染焦點原型（R3 spike） | 契約釘死後降級驗收 | 排序 UX 節 |
| Q | Open Q1 C 項收整 | 使用者核可全收 | Goals #5／approach 6 |
