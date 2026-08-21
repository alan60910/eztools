# 🧠 MAGI Plan Review — Statusline Builder 編輯器版型重構

**Sprint:** `magi/15-statusline-editor-layout/` • **Document:** PLAN.md（303 行）• **Round:** 1 • **Generated:** 2026-07-22

## Dashboard

```
┌────────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES                                  │
├────────────────────────────────────────────────────────────┤
│  Mode: majority（角度制）   Threshold: vote_sum > 3.5      │
│  OK weight: 7 / 7           Degraded: no                   │
├────────────────────────────────────────────────────────────┤
│  規模判定：動 root SPEC.md 架構段 → 7 票（角度 1–7 全員）  │
│  ✅#1 設計(opus*) ✅#2 契約(opus)  ✅#3 驗證(sonnet)       │
│  ✅#4 回歸(haiku) ✅#5 安全(opus*) ✅#6 效能(opus)         │
│  ✅#7 架構(sonnet)         * 原派 fable，額度耗盡改派       │
├────────────────────────────────────────────────────────────┤
│  逐角 verdict：6× REQUEST-CHANGES ／ 1× APPROVE-WITH-NITS  │
├────────────────────────────────────────────────────────────┤
│  🔴 Critical: 3   🟡 Important: 18                         │
│  🟢 Minority: 10  🔬 Spikes: 8                             │
└────────────────────────────────────────────────────────────┘
```

**揭露**：無 gemini/codex 機器，名冊為 claude 模型輪替——**同 vendor 湊票、無跨 vendor 驗證**。執行中 Fable 5 額度耗盡導致角度 #1／#5 首次派工中斷，依政策 §6 單次重試，經使用者指示兩角改派 **opus** 重跑成功；ok_weight 維持 7，非降級。角度 #5 曾以 sonnet 完成一次（結論同向、Critical 相同），最終採 opus 版為該角正式票，sonnet 版獨有發現併入 🟢。

---

## Verdict
**REQUEST-CHANGES**

計畫的**問題診斷與方向**獲全體肯定：三條缺陷論證紮實（角度 #1 逐行覆核 `scripts/e2e-statusline.mjs` 的 `scrollIntoView` 主張屬實、無誇大），否決「預覽當最右欄」的歷史依據可追溯至 sprint 09 原話，D7 把上批 🔴-1 教訓規約化、G3 承接 S5 定案皆屬成熟處理；角度 #6 更受命認真評估「最小改動版」後確認其不足以承擔耐久契約，A 案方向正確。

但**落地設計含三條會讓整批白做的結構性缺陷**，且現有 spike 網無一能抓到其中任何一條——這正是本批宣稱要終止的 churn 模式再演一次。三條皆為計畫層可修（不需推翻四區主張）。

---

## 🔴 Critical (adopted)

### C1. 頂帶置於 `<main>` grid 的獨立列 → sticky 位移餘裕為 0，G2「預覽恆可見」在桌面靜默失效
- **票數：** 2/7（#1 設計健全性〔本職〕、#6 效能與資源）→ 未過門檻，依政策 §6 **專家單票條款**經協調者親自實證後採納
- **Where:** PLAN.md §D1（頂帶以 `grid-column: 1 / -1` 跨欄、「與 `#output-status`／`#error-message` 同一慣用法」）
- **機制：** sticky 盒的位移受**包含塊**圍堵，而 grid item 的包含塊是它的 **grid area**。頂帶跨 `1/-1` 獨佔一列後，該列為 auto 尺寸、列內僅頂帶自己 → grid area 高度＝頂帶高度 → 位移餘裕 0，`top:0` 寫了也不會黏。
- **協調者實證：** `style.css:1542` 確認 `#output-status`／`#error-message` 用 `grid-column: 1/-1` 但**從不 sticky**（全檔 sticky 僅 `:1126` `.preview-section` 與 `:1573` `.builder-columns__list` 兩處），計畫援引的「同一慣用法」不含黏著能力；`:1526` 註解確認三欄靠 auto-placement 落於**同一列**，sprint 14 的預覽能黏正是因為與高欄同列（S1-RESULT 檢核 1 的 previewTop 292→−24 餘裕由同列高欄提供），此前提被本批移除。
- **爆炸半徑：** 缺陷**桌面獨有**（<1100px 切 flex column 後包含塊回到 main content box，反而正常），而 G8 行動版硬驗收會照樣綠 → 全套測試綠、缺陷靜默上線，到第四次真機回饋才被抓到。
- **Fix（兩角一致）：** 增列 **M1′**——`<main>` 改回 block/flex，頂帶／skip-nav／status／error 為其直接子節點（包含塊＝main content box，餘裕充足），三欄收進一層 `.builder-columns` wrapper 做 grid。#6 進一步指出 M1′ 可寫成 `sticky` 編輯器外框＋`grid-template-rows: auto minmax(0,1fr)`，讓剩餘高由 `1fr` 自動吃掉，**連帶消除 D6 的 ResizeObserver、雙層 calc、欄 top 偏移三項複雜度**。代價僅一層 wrapper（須放棄「無需另立架構物件」的宣稱）。S2 必須先三臂並列判定 M1／M1′／M2。

### C2. 1280×800 下工作欄可用高度較 sprint 14 倒退約 200px，與「把工作區還給使用者」立論相反
- **票數：** 2/7（#6 效能與資源〔本職〕、#1 設計健全性）→ 專家單票條款＋協調者驗算採納
- **Where:** PLAN.md §D2／§D6（`calc(100dvh − 頁首 − 頂帶)`）、Verification G4（自訂 1280×800）
- **協調者驗算：** 頁首實測 **≈236px**（`S1-RESULT.md:27`，dist 產物 @1400×1000；1280 寬只會等高或更高）＋頂帶（A1 整包五件，桌面估 200–260px）。M1 雙層 calc 得 `800 − 236 − 200 ≈ 364px`（含 `main{padding-block:2rem}` 則約 332px），僅視窗高 41–45%；**sprint 14 同尺寸為 `800 − 236 = 564px`**。目錄欄一次只看得到 5–6 項。
- **穩態自我否定：** 捲過頁首後實際可用 600px，欄卻被 calc 永久封在 364px，底下常駐 236px 死白。
- **且威脅自己的關鍵驗收：** G4 硬驗收恰好指定 1280×800。
- **Fix：** (a) max-height 改單項「扣頂帶」並接受初載溢出（sticky 本即解法）；(b) 把「頁首高度」列為本批可裁決項（壓縮或令其可捲走即回收 236px）；(c) **S1 必須補通過門檻**（見 C3 下方 I11），例如「1280×800 工作欄可用高 < 480px 即判 M1 不可行、升 M2／頁首處置為使用者裁決」。

### C3. 全域設定退至 Tab 序最末且無對應 skip 落點——牴觸 SPEC 既有專案級不變量
- **票數：** 2/7（#5 安全與可及性〔本職〕、#7 架構）→ 專家單票條款＋協調者實證採納
- **Where:** PLAN.md §G3／§D1（DOM 序）／§D4（skip-nav 只補「跳至目錄」）
- **量化：** sprint 14 的 S5 真機 CDP Tab 走查實測，設定是停點 **10–16**（header 之後第一站，`S5-RESULT.md:86-93`）。本批 DOM 序改為預覽→目錄→列區→設定，G3 又保證「DOM 序＝Tab 序」，故設定必落在預覽（~7 停）＋目錄（30 個 checkbox）＋列區（每啟用段 ~7 控件）之後——以計畫自訂 seed（≥8 段）估 **~76 停點**，真實負載（20 段／5 列）估 **破 180**。
- **協調者實證（決定性）：** `SPEC.md:145` 既有專案級 a11y 不變量明文——「**大量項目須有 skip 機制與分頁（或等效導覽策略）**」。本批製造出「大量項目擋在前面」的新幾何後未履約，**這是牴觸既有 SPEC 契約，不只是體感退化**。
- **設計內部不一致：** 計畫用同一套理由（長 chokepoint 擋路）為較輕的「抵達列區」補了「跳至目錄」，卻放過更重的「抵達設定」；且此退化**兩斷點皆成立**（桌面滑鼠可直接點，鍵盤不行），不像 D4 那條只在行動版發生。
- **協調者實證（落點可用）：** `index.html:121` 已有 `id="global-section"`，補 skip 連結零結構成本；反觀 `.segment-lists`（`:534`）**無 id**，「跳至目錄」的落點計畫未指定（見 I17）。
- **Fix：** D4 skip 清單必增第四條「跳至設定」（落點 `#global-section`＋i18n 鍵）；Verification 把「skip 落點數＝4 且四條 id 皆存在」編碼為機械斷言；並比照 S5 增列 Tab 走查 spike（見 S-c）。

---

## 🟡 Important (adopted)

**過門檻（≥4 票）**

- **I1. [deltas] TECHSTACK `(none)` 與 D6 自相矛盾** — **6/7 票**（#2 #3 #4 #5 #6 #7，全票最高）。D6 以肯定句寫死「量測改由 ResizeObserver 維護」＝**預設路徑無條件引入**，只有 M2 分支才移除它；delta 卻宣告 `(none)`＋「屆時回填」。且多角指出條件句誤植（寫「若採 M2…需列入基線」，但 M2 根本不用 RO）。另 repo 全域 grep 確認 `ResizeObserver` 零使用、`<details>`／`<summary>` 亦為首次引入；TECHSTACK 現行基線句只有 **CSS 槽位**（`:has()`／`:focus-visible`／`dvh`／`overscroll-behavior`），JS 平台 API 無處可掛，等於還要動句構。**Fix：** 現在就改 modify，基線句拆「CSS 基線／JS 平台 API 基線」兩段。
- **I2. G4 硬驗收措辭過強且可被廉價滿足** — 4–5 票（#1 #3 #5 #6 ＋#7 spike）。三重問題：(a) 新版面下「第一個目錄項＋第一列」必然同屏，挑最省事的種子就會綠，而「在 sprint 14 必紅」的論證只對深處目錄項成立；(b) 目錄欄自身受 max-height 拘束，30 段中**多數項本來就需先捲目錄欄**，「初始同屏」對它們為偽——寫進 SPEC 會成為實作永遠達不到的契約（正是 G5 想終止的契約腐化）；(c) 斷言只查 drop 前 rect 與落列結果，Chromium 原生邊緣自動捲動（S1-RESULT T1.2 實測 1.6 秒可捲到底）可能中途悄悄救場，使命題無法被證偽。**Fix：** 語意改為「**拖曳過程中**不需捲動（來源與目標分屬獨立捲動容器，可各自先捲到位）」；允許拖曳前對兩欄各 `scrollTop` 設定一次，起手後至 drop 全程斷言 `window.scrollY`／兩欄 `scrollTop` 三者不變、`toPointExpr` 只求值一次；以 `elementFromPoint` 命中取代 rect 落界；種子釘死目錄尾段（如 shell-out 分區）→ 非首列。
- **I3. G5「耐久契約」措辭仍內嵌形態，churn 未終止** — 4 票（#2 #6 #7 ＋#1 Note）。擬入 SPEC 的四條中，「來源與目標同屏＋各自獨立捲動」「DOM 序＝視覺序＝Tab 序」是真不變量；「輸出**置頂全寬**」「設定為**右側** inspector」「**左右**並置」「1100px」是**形態**——而 06b→09→14→15 三次改版變動的正是這些形態，把它們寫進契約，第四次改版就得改契約本體，churn 只是換地方發生。#7 另指出更根本的缺失：契約寫的是**結論**而非**判準**，未來新增第五個區塊（如 BACKLOG 已列的匯入／匯出 UI）時無從推導。#2 補充落點問題：SPEC 的 Conventions 節才是跨工具不變量的耐久位置，塞進已 48 行、按 sprint 逐次疊寫的 Components bullet 正是 🟡-6 得以藏身一整輪的結構成因。**Fix：** 分兩層書寫並顯式標記「不變量（變更需重議）」vs「現行形態（可調整）」；原則句上移 Conventions；補一段可推導的**判準**（如「互動所需的共視元素不得以捲動換取共視」「低頻互動面板取視覺權重最低位」）。

**未過門檻但依專家單票條款／協調者實證採納**

- **I4. 欄的 sticky `top` 偏移未指定 → 頂帶會遮住欄頂（正是拖曳來源與落點）** — #1〔本職〕#6。計畫只給 `max-height` 未給 `top`；沿用 sprint 14 的 `top:0` 且頂帶不透明（`background-color: var(--bg)`）＋OQ-4 一旦補 z-index 就必然畫在欄之上 → 目錄前數項與列區首列群組被永久遮蔽。需要的是**兩個不同的量**：`top` ＝頂帶高、`max-height` ＝ 扣頂帶。**Fix：** 明訂 `top: var(--band-height)`；dom／e2e 補「欄 rect.top ≥ 頂帶 rect.bottom」斷言（採 M1′ 則此項自然消失）。
- **I5. [deltas] SPEC 整段改寫缺「行級汰除清單」與「保留清單」，方位詞將殘留為假契約** — #2〔本職〕#7 #5。協調者實證現行 SPEC 至少四處方位詞會變假：`:58-60`「頂帶降級入中欄」、`:63`「至**右欄**已選擇清單目標列」、`:69-71`「行動版摺疊序＝設定→預覽→清單…**右欄** sticky 解除」、`:72`「鈕隨預覽居**中欄**」。其中 `:63` **正是 sprint 14 code review 🟡-6 的同一句**（當時剛從「中欄」修成「右欄」），而 sprint 14 的 delta **有**寫汰除清單仍漏掉它——本批連清單都沒有。另一面：保留清單只點名四項，但區間內仍屬實的契約還有 role=region 隨遷、40dvh 落點、overscroll 不連鎖、`#output-status` 常駐 dialog 外、落列播報採視覺顯示編號、條件式捲動停點——整段改寫＋不完整保留清單＝靜默刪契約，是 🟡-6 的鏡像。**Fix：** delta 附「改寫前後契約條目對帳表」逐條標 keep／replace／drop；Verification 加近零成本機械檢查「SPEC statusline-builder 段落不得殘留方位詞」。
- **I6. [deltas] 收合 key 未落 SPEC 字面、且未定單一謂詞** — #2 #5〔本職〕#6。sprint 14 把 `eztools-statusline-builder-drag-tutorial` 與 sentinel `'1'` **逐字**寫進 SPEC（`:76-79`），且該落名本身是上一輪 MAGI 採納項；本批只寫「循命名體制」＝同一文件對同類事實兩種粒度。更關鍵：D8 只複製了 tutorial-band 的**出口形狀**，沒複製其**核心契約**——單一謂詞。方向尤其重要：本批 fail-open 必須倒向**展開**（與教學帶倒向「顯示」同精神），否則 storage 壞掉時會把 30 段目錄整區藏起來，直接牴觸 D8 自己「首訪不得把核心功能藏起來」。**Fix：** 明訂「**收合 ⟺ `getItem(KEY) === '1'`**；key 缺失／擲錯／怪值一律展開」，key/sentinel/謂詞三者一併入 SPEC delta，並比照 `tutorial-band.test.ts` 要求三情境各一斷言。
- **I7. D8 跨斷點 `toggle` 會污染持久化偏好** — #1 #5〔本職〕。若採 `matchMedia` 切 `open`，程式化設值**會派發 `toggle`**；若持久化掛在 toggle 上：行動版收合 → 轉桌面強制 `open=true` → 寫入「展開」→ 使用者偏好被靜默清除。反向亦成立。**Fix：** 明訂持久化**只由使用者意圖來源**觸發（summary 的 click／keydown，或 toggle handler 以斷點為守衛＋程式化期間抑制旗標）；Verification「收合四面」增第五面「跨斷點強制展開後持久化值不變」。
- **I8. 「桌面恆展開」未處置 `<summary>`，兩條候選機制各留 a11y 矛盾** — #1 #5〔本職〕。純 CSS 路：`open` 仍為 `false`，a11y tree 播報 collapsed 而畫面已展開＝**a11y tree 說謊**，summary 仍是 Tab 停點、按下去畫面無變化卻改變播報狀態。matchMedia 路：`open=true` 但 summary 仍可聚焦可點擊，使用者一點就收起 → 桌面恆展開當場失效，且該次收合還污染持久化（I7）。另 #5 指出純 CSS 可靠做法倚賴 `::details-content`（Chrome 131／Safari 18.4／Firefox 139），**晚於 TECHSTACK「evergreen 近兩年」下緣**。**Fix：** D8 補桌面態硬條件「≥1100px 時 `<summary>` 不得為 Tab 停點、不得可點擊、a11y 播報須與可見狀態一致」；S2(e) 驗收清單納入此三項。
- **I9. skip／錨點落點會被全寬 sticky 頂帶遮蔽，repo 零 `scroll-margin-top` 先例** — #1 #5〔本職〕。片段導覽原生把目標捲到 scrollport 頂端＝正好捲進頂帶底下。sprint 14 未踩到是因 sticky 對象是欄（不橫跨頂端）；協調者確認 `tools/`／`src/` 全域無 `scroll-margin`／`scroll-padding`，無既有慣例可沿用。D8 特意為 a11y 選的「落在 `<summary>`」也因此看不見＝原地重演它要避免的陷阱。**Fix：** 所有錨點落點加 `scroll-margin-top`（綁同一組高度變數）；驗收加「skip 後落點 rect 不與頂帶 rect 相交」。
- **I10. e2e harness 硬編 viewport，G4／G8 的多尺寸需求是未列工項** — #2 #3 #6 ＋協調者實證（`scripts/e2e-statusline.mjs:347` 啟動參數 `--window-size=1400,1000`、`:1049` `setDeviceMetricsOverride` 皆硬編，10 案共用）。G4 需 1400×1000＋1280×800、G8 需 390×844。**Fix：** 明列「harness 逐案 viewport 參數化」為 G4/G8 的**前置工項**（非附帶），且應在版面手術**之前**完成，否則無法區分紅燈來自版面還是 harness；既有 10 案維持 1400×1000 以隔離變更面。
- **I11. S1 五項全為量測動詞、無通過門檻，且漏掉兩個支配性預算項** — #1〔本職〕#6。(a)–(e) 沒有一條寫「若 X 超過／低於 N 則判否」→ spike **無法否決設計**。且漏了**桌面頂帶自然高度**與 **1280×800 頁首高度**（236px 只在 1400×1000 量過）。**Fix：** 補兩項量測＋訂明確 gate（見 C2）。
- **I12. 既有 e2e 兩案的遷移風險被低估** — #3〔本職〕。案 10 `caseModeSwitchScrollStable` 的後備分支硬編 `#list-column` 並在註解明載「唯一捲動容器，教學帶／目錄／已選擇同居於此」——新版面此語意消滅，需改寫程式碼而非「原地沿用」。案 9 `caseTutorialBandDoesNotBlockDrag` 測的拖曳發生在**列區內部**，教學帶移到目錄欄後兩者已是互不重疊子樹 → 案子仍綠但**退化為恆真**，與原命題脫鉤。**Fix：** 明列案 10 id 改指、案 9 改測「目錄欄內拖曳於教學帶在場時不受阻」或承認與 G4 新案重疊而退場。
- **I13. 兩欄 `overscroll-behavior: contain` 佔 74% 寬度，把「捲到頂帶黏住」的必要動作封死** — #1〔本職〕。M1 要求使用者先往下捲 ≈268px 才進入穩態，但 D3 比例下目錄＋列區佔 `(1+1.6)/3.5 ≈ 74%`，滑鼠停在其上滾輪時欄內到底即停、**不連鎖捲動頁面** → 可捲落點只剩設定欄與邊白。G2 的達成路徑被自家捲動所有權設計封住。**Fix：** S2 增列「頁面可捲命中面積佔比」量測（九宮格 wheel＋鍵盤 Space/PageDown）；或以 M1′／M2 直接消除「頁面與欄雙層捲動」。
- **I14. 頂帶自身 ≤40dvh 上限被悄悄解除，且以單一樣本點當上界** — #1〔本職〕。sprint 09 A-1 原文是「**頂帶** max-height ≤40dvh，內部終端框縱向捲動」；sprint 14 把預算移到 `.preview-terminal` 是因為頂帶已不再是全寬 sticky 帶（`style.css:1270` 註解明載沿革）。本批把它變回全寬 sticky 帶卻沒把上限移回，還拿 31.5dvh（390×844／3 列 powerline 單一組態）當「不會太高」的憑據——5 列輸出、powerline、或 1280 寬下 `.preview-controls` `flex-wrap` 換行都會推高，而 sticky 頂帶的高度是**直接從工作區扣的**。**Fix：** 恢復「頂帶整體 ≤40dvh」硬上限；S1 量最壞組態（5 列 powerline × 1280 寬控件換行）。
- **I15. 全計畫零工作量估算、零里程碑、零 spike 時箱** — #6〔本職〕#4。sprint 14 的 PLAN 有 7 步實作序列、spike 標「半天級」，落地 25 task／5 milestone。本批表面積：3 spike（S2 要出 M1／M1′／M2 三版原型、S3 另一版）、index.html 結構手術、style.css 兩斷點全改寫、main.ts 新增觀察器＋收合持久化＋新常數出口、messages.ts 新鍵、**17 個 boot 測試檔的 RO 連坐風險**、5+ 版面 dom 檔改寫、e2e 10 案校準＋新案＋harness 參數化、SPEC 整段改寫、BACKLOG 對帳——規模只多不少卻連一個里程碑都沒有。**沒有排程骨架的計畫最容易在中途被迫砍範圍，而砍掉的往往正是耐久契約與測試面**。**Fix：** 補 Milestones 節與 spike 時箱；並把 S2 與 S3 合併為單一原型（兩者都需同一具新版面骨架，分開做等於把最貴的資產做兩次）。
- **I16. D7 明知 `mediaBlockRange` 有同型「無聲失真」缺陷卻只「留意」不修補** — #3〔本職〕#7。🔴-1 的本質就是層疊斷言假綠；復核已記錄該工具括號計數不識別註解。本批新增多組斷點規則＝風險面擴大，卻繼續依賴已知有缺陷、且缺陷被記錄兩次的工具，違背 D7 自身存在理由。**Fix：** 最小強化（掃描前剝除註解）或明訂「本批新增 media 區塊註解禁止內嵌孤立 `{`/`}`」為可被 review 檢查的具體規則。
- **I17. 「跳至目錄」錨點 id 不存在，且落在 `<summary>` 與既有「skip 只捲動不奪焦」慣例衝突** — #5〔本職〕#6 ＋協調者實證（`.segment-lists` 於 `index.html:534` 無 id）。另 sprint 14 為 `#preview-section`／`#selected-section` 刻意不掛 `tabindex` 正是要「僅捲動、不奪焦」，而 `<summary>` 是原生可聚焦元素 → 四條連結中三條不奪焦、一條奪焦。且若桌面以 `display:none` 處置 summary，該落點在桌面不存在＝同一條 skip 兩斷點行為不同。**Fix：** 指名兩斷點恆存在的穩定落點 id（如 `#catalog-section` 掛在收合容器外層），明寫焦點語意與其餘三條齊一。
- **I18. D8 首繪閃動方向與教學帶先例相反** — #1 #6 ＋協調者實證（`index.html:510` 教學帶為 `hidden`，由 JS 顯示＝只做加法）。D8 若把 `open` 寫死 HTML 再由 JS 收合，回訪者首繪會看到 30 段目錄先撐開再塌陷（塌陷量達一到兩個視窗高），正好發生在最沒有垂直空間的裝置上、且在使用者準備往下捲的瞬間。**Fix：** HTML 不寫 `open`，由 JS 在 init 內展開，方向與教學帶一致。

---

## 🟢 Minority（未過門檻且非本職，保留備查）

- main.ts 續肥：D8 應抽共用「持久化旗標」小工廠（`src/theme.ts`／`main.ts persist()`／`tutorial-band.ts`／本批＝第四次同構複製），或至少獨立成 `catalog-collapse.ts`（#7）
- 行動版 DOM 序翻轉的首屏／工作流影響未評估（首屏由設定變預覽、設定需捲到底）（#4）
- ResizeObserver 回饋迴圈路徑：寫變數→改欄高→改頁面總高→捲軸出現/消失→寬度變→頁首/頂帶換行→再觸發；且 Chromium 會丟 `ResizeObserver loop completed…` window error，**現行 e2e harness 未監聽 `Runtime.exceptionThrown`，測不出來**（#6、#4）
- jsdom 無 `ResizeObserver`／`matchMedia`／`IntersectionObserver`，17 個 boot `main.ts` 的測試檔會整批 ReferenceError；repo 無 vitest `setupFiles` 掛點（#6）
- SPEC Conventions 的「statusline-builder e2e 全 **7** 案為現行活例」計數已過時（實為 10，本批再加）（#2）
- 預覽可見字元數估算偏樂觀約 13%：15px／0.6em 前進寬度下 1360px 約 145–150 字元、1800px 約 195，而非計畫寫的 170–225（結論方向不受影響）（#1）
- `<details>`／`<summary>` 在 repo 的 CSS 零先例：預設三角標記、`list-style`、focus 環、深淺主題對比、reduced-motion 全需從零建立，非「零 JS 即零成本」（#5）
- 教學帶留在收合區外，行動版收起後會形成「教一個來源已收起的互動」，且帶＋summary 兩層固定開銷削弱 A3 效果（#5）
- sprint 14 的「捲動停點總數＝1」機械契約（`preview-band.dom.test.ts` 斷言 `[role="region"][tabindex="0"]` 數為 0）在新版面需重定；另注意 Chromium 新版會為無可聚焦子節點的捲動容器自動加停點，現有斷言抓不到（#5）
- `.segment-lists__hint`（操作說明句）的收合歸屬未定：在收合區內則展開前看不到說明，在外則永久佔用 G8 想收回的空間（#5）
- D6／D8 標題未如 D2 標明「S2 定案」依賴，略讀者易誤判為已定案（#7）

---

## 🔬 Spike candidates（合併去重）

- **S-a 頂帶 sticky travel（最高優先，直接決定 C1）** — M1／M1′／M2 三版最小 PoC 並列，於 1400×1000／1280×800／390×844 三尺寸掃 scrollY 0/200/400/800，逐點斷言頂帶 `rect.top === 0`；同案順帶量兩欄 `rect.top ≥ 頂帶 rect.bottom`（I4）。成本極低（沿用 S1-RESULT 檢核 1 的既有量測腳本形式）。〔#1 #6〕
- **S-b 垂直預算 gate（決定 C2）** — 量 1280×800 頁首高度與**最壞組態**頂帶高度（5 列 powerline × 1280 寬控件換行），代入 `100dvh − 頁首 − 頂帶` 與 `100dvh − 頂帶` 兩式並列；**預先訂 gate**（如 <480px 即判 M1 不可行）。〔#1 #6〕
- **S-c Tab 走查（決定 C3）** — 比照 S5 以 CDP `Input.dispatchKeyEvent` 送真 Tab，於 1400×1000 與 390×844、載入 ≥8 段啟用 seed，記錄各區停點區間與**設定區起始停點序號**；再量補上「跳至設定」後降至多少（預期 2–3）。該序號寫入 Verification 作回歸基準。〔#5〕
- **S-d e2e harness 逐案 viewport** — 加 `testCase.viewport` 欄位，既有 10 案帶原值跑一輪確認全綠不變，再加 1280×800 空殼案驗證座標與 `elementFromPoint` 行為；**須在版面手術之前完成**。〔#2 #3 #6〕
- **S-e jsdom 承接 RO／matchMedia** — 10 分鐘級 PoC：在 `init()` 插一行 `new ResizeObserver(()=>{})` 跑 `npm test` 看紅燈檔數；比較「特徵偵測守衛」vs「新增 vitest setupFiles 共用 stub」兩修法，確認不影響 `layout-columns.dom.test.ts` 既有的 stub header 手法。〔#6〕
- **S-f D8 狀態機跨斷點 PoC（非只選機制）** — 斷點切換 ×〈使用者收合／展開〉× 重載的六種序列，斷言 localStorage 只在使用者於 <1100px 互動時改變；並測桌面 `<summary>` 的 Tab 停點、可點擊性、`aria-expanded` 播報與可見狀態是否一致（跨三引擎）。〔#5 #1〕
- **S-g 頁面可捲命中面積（決定 I13）** — 1280×800 下九宮格逐點 dispatch `mouseWheel` 記錄 `window.scrollY` 是否改變，算出可捲面積佔比；另測焦點分別落於頂帶／目錄欄／列區／設定欄時 Space／PageDown 的捲動標的。〔#1〕
- **S-h 規模探測（決定 I15 的里程碑切分）** — 30–60 分鐘：只改 index.html／style.css 成新版面（JS 完全不接），跑 `npm test` 與 `npm run test:e2e`，記錄紅燈檔數與案數＝測試網連動成本的下界。〔#6〕

---

## §7.5 嚴重度分流（決定下一步）

- **(a) 架構／結構級**（需修 PLAN 後**重審**）：C1 頂帶 sticky 機制（引入 M1′ 為第三臂，可能連帶簡化 D6）、C2 垂直預算與 S1 gate（可能推翻 M1）、C3 Tab 序與 skip 契約（牴觸既有 SPEC 不變量）。
- **(b) 實作細節級**（可記入 PLAN 後直接施工）：I4 I6 I7 I8 I9 I12 I16 I17 I18 與全部 🟢。
- **(c) 計畫工程級**（補文件即可）：I1 I5 I10 I11 I13 I14 I15、I2 I3 的措辭改寫。

三條 Critical 皆屬 (a)，故建議**修訂 PLAN 後再跑一輪聚焦重審**（僅審修訂面，非全文重審）。

---

# 🧠 Round 2 — 聚焦重審（2026-07-22）

**Scope:** PLAN.md Rev 2 的修訂面（非全文）　•　**核心三角 3 票**：#1 設計(opus)／#2 契約(opus)／#3 驗證(sonnet)　•　majority 門檻 >1.5

```
┌──────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES（3/3 一致）            │
├──────────────────────────────────────────────────┤
│  三 Critical 復核：C1 ⚠️ ／ C2 ⚠️ ／ C3 ⚠️（皆部分）│
│  🔴 new: 4   🟡 new: 9   🟢 new: 4               │
│  性質：全數 (c) 計畫工程級——不推翻四區主張       │
└──────────────────────────────────────────────────┘
```

## 為何三條 Critical 只是「部分解決」

**C1（頂帶 sticky）**：M1′ 方向正確且 #1 實算餘裕充足（1280×800 下 ≈550px vs
所需 268px），**但 Rev 2 把 M1′ 寫成單一選項，實為兩種互斥結構**——平鋪形
（頂帶為 `<main>` 直接子節點）與外框形（sticky 外框內含頂帶）。兩者的預算式、
欄是否需 `top` 偏移、`--band-h` 是否需要全都不同，而 D2／D6／TECHSTACK 的
條件句混用兩者結論 → S-a 無法產生可判定的輸出。**更關鍵：C1 的病灶（包含塊
給不出餘裕）在平鋪形下原封不動搬到了欄身上**（wrapper 高＝欄高 → 欄 travel
＝0），被遮的正是 G4 的拖曳來源與落點。

**C2（垂直預算）**：#1 逐式驗算後指出 **M1′ 只解決 sticky 位移、不解決預算**
——外框形的 `calc(100dvh − 頁首)` 與 M1 的雙層 calc 得數相同（1280×800 下
≈314px），**G9 的 ≥480px 對所有已列臂皆算術不可達**，而 S-b 的三階退路裡第一
階與第三階根本不改變扣除項。唯一有效槓桿是改用「**只扣頂帶**」式（≈550px ✅）。

**C3（Tab 序）**：補償方向正確、`#global-section` 實存，但「≤3 Tab」**未定義
起算點**且以自載入起算為字面不可達（header 3 停 → 三條 skip → 第 6 停 →
Enter → 再 1 Tab）。

## Round 2 的 4 條新 Critical（皆為 Rev 2 引入或沿襲的錯誤）

1. **#1-N1 M1′ 是兩個互斥形態的合稱**，全篇條件句混用。
2. **#1-N2 G9 門檻對所有臂不可達**，退路階梯為 non sequitur。
3. **#1-N3 S-a 兩條門檻互斥**：「頂帶 `rect.top` 恆為 0」在 scrollY=0 對任何臂
   皆為假；同一問題傳染到 Verification 的 G2 案（`scrollTo(400)` 在外框形下被
   clamp，斷言必紅）→「三門檻皆過」的里程碑出口不可達。
4. **#2-R2-1 SPEC keep 清單把「40dvh 落點」標錯方向**——`SPEC.md:59-60` 原句是
   「40dvh 掛終端框、非頂帶自身」，與 Rev 2 自己的 D1（上限移回頂帶）**反向**，
   應為 replace。#2 誠實揭露**成因在審議端**：round 1 的 I5（keep 清單）與 I14
   （40dvh 移回頂帶）未交叉核對，Rev 2 忠實採納了有瑕疵的清單。

## 其餘重要發現（節錄）

- **#2-N1 skip 落點應為 5 條而非 4**——協調者實證 `index.html:272-276` 現為
  **3 條**、`skip-nav.dom.test.ts:107-110` 有硬斷言 `toBe(3)`；Rev 2 寫「三條增為
  四條」卻新增兩條。錯數已流入 SPEC delta 與機械斷言。
- **#2-N3 汰除清單漏掉最承重的一句**：`SPEC.md:61-62`「右＝…**同一捲動容器**」
  落在所列 `:58-60` 與 `:63` 的縫隙——本批全部立論都是為了消滅它，漏列即 🟡-6
  鏡像復發。
- **#2-N2 另兩條 keep 亦錯分類**：「overscroll 不連鎖」範圍待 S-g 定案不得預先
  標 keep；「捲動停點判定」SPEC 全文從未有過（現存於 index.html 註解與 dom 斷言）
  ＝幻影條目，應為 add。
- **#3-N1 G2 硬驗收未言明測試層，且 MS2 出口把它與 `npm test` 並列**——
  `layout-columns.dom.test.ts:11-12` 自身文件載明 jsdom `getBoundingClientRect()`
  恆回全零；C1 是純 CSS 行為、無 JS 可 stub，落 dom 層必為恆真斷言。**本批要
  終止的失效模式，在補救措施裡又長出一次。**
- **#1-N7 D8 首繪反轉會使 JS 失效時桌面目錄永久不可達**：HTML 不寫 `open` ＋
  桌面 `summary{display:none}` 相乘 → 「details 未 open ＋ 無展開把手」。教學帶
  類比不成立（失敗態是「少一條提示」vs「核心功能消失」）。
- **#2-N6／#1-N8 spike 重編號未同步**：`S1`／`S2` 殘留 20+ 處且與 sprint 14 的
  S1／S2 撞名；兩項量測義務**孤兒化**（D3 軌寬與 P90 截斷率、D8 教學帶固定開銷
  皆無 spike 承接）；里程碑 M0–M4 與捲動模型 M1／M2 撞號。
- **#2-N4 G5 承諾的「可推導判準」在 delta 中不存在**（只有兩條不變量）。
- **#2-N5 Conventions 第二句是 diff 相對謂詞**（「被降位時」需知前一版狀態），
  無法對單一版本機械求值。
- **#2-N8 契約簿記全堆在最後里程碑**——正是 round 1 的 I15 警示的失效模式。

## Rev 3 處置（協調者，2026-07-23）

全部發現皆屬 **(c) 計畫工程級**（改文件即可，不推翻四區主張、不需重跑 spike），
已於 PLAN Rev 3 逐條落地，修訂處標〔R2:編號〕：

| 發現 | 處置 |
|---|---|
| #1-N1 | M1′ 拆為 **M1′-a（平鋪，首選）／M1′-b（外框）** 具名臂，各附結構、餘裕實算與否決理由 |
| #1-N2 | **預算式定案為「只扣頂帶」**`calc(100dvh − 頂帶)`，接受初載溢出（同 sprint14-S1 檢核 4 的既有取捨）；G9 改以**可見容量**為主判準（目錄 ≥8 項、列區 ≥2 個完整列群組）＋基準值改由 S-b 實測回填 |
| #1-N3 | S-a 門檻改**語意式、與模型無關**（每取樣點頂帶完整落在視窗內＋穩態時 top===0）；G2 案同步改寫 |
| #1-N4 | 欄遮蔽殘差明列三個候選消解手段（**wrapper 補償高**為傾向案），列為 S-a 回填項 |
| #1-N7 | **D8 首繪方向回正**：HTML 出貨態寫 `open`，JS 僅在「<1100px 且謂詞為收合」時收起；S-f 增「JS 失效態下目錄可達」斷言 |
| #1-N6 | S-c 門檻定義起算點（自載入起、鍵擊數 ≤ sprint14-S5 基線 2 倍）＋「跳至設定」排 skip 清單第一條 |
| #1-N11 | D2 明訂頂帶 z-index **< 10**（`.skip-link` 為 10，否則蓋掉聚焦中的 skip-link） |
| #1-N9/N10 | S-h 移至 MS1 之後（其骨架由 S-a 定案）；S-a 對外框臂加 `1fr` 解析行為斷言 |
| #2-R2-1/N2/N3 | 對帳表重寫：40dvh **keep→replace**、停點 **keep→add**、overscroll **keep→pending S-g**、補漏 `:61-62`「同一捲動容器」為 **drop（最承重）** |
| #2-N1 | 全篇「四條」→**五條**；D4 表拆五列；Verification 補 `skip-nav.dom.test.ts` 計數 3→5 |
| #2-N4/N5 | Conventions 補**第三句版位判準**；skip 落點句改**快照謂詞**並註明為 `SPEC.md:145` 的特化 |
| #2-N6/#1-N8 | spike 編號全篇歸一、跨 sprint 引用加 `sprint14-` 前綴；**新增 S-j**（軌寬與 P90 截斷）；D8 固定開銷掛回 S-b(5)；里程碑改 **MS0–MS4** |
| #2-N7 | S-g／S-i 補通過門檻與定案輸出 |
| #2-N8 | **Conventions delta 前移至 MS2**；TECHSTACK 回填改「S-a 定案後即回填」；D7 強化指派 MS2 |
| #2-N9 | 原生 HTML 元素**沿 `<dialog>` 先例定案為不入 TECHSTACK** |
| #2-N10 | G9 基準值改由 S-b 實測 sprint 14 @1280×800 取得，不沿用未實測外推 |
| #3-N1 | **Verification 新增「測試層歸屬」硬性條款**：G2 與 skip 落點可見性**須落 e2e、不得落 jsdom**；MS2 出口拆為兩個獨立 gate |
| #3-5 | 既有測試改寫清單獨立成節（skip-nav 計數／preview-band 停點／e2e 案 9／案 10） |
| #2-I6 nit | 收合 key 字面值釘死 `eztools-statusline-builder-catalog-collapsed` |
| #3-N3 | 收合情境計數用詞統一為「六項情境」 |

**Round 3 判定（skill §7.5）**：本輪 3/3 皆判定發現為「計畫層可修、不需重跑
spike」，#2 明言「建議由協調者就地核修後放行，**不需第三輪全審**」。Rev 3 已
逐條落地且多數為算術／清單／編號的機械修正，續審邊際效益遞減——**建議直接
進入 `/magi:tasks`**，殘留不確定性已由 MS1 的五個 spike 門檻承接。
