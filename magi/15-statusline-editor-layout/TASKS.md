# Tasks — Statusline Builder 編輯器版型重構（預覽頂帶＋目錄／列區／設定四區）

> Source: PLAN.md（Rev 3）　•　Sprint: `magi/15-statusline-editor-layout/`
> 里程碑沿用 PLAN 的 **MS** 前綴（避開捲動模型 M1／M2 命名）。
> 🔀 lane 規則：同字母 lane 內循序、異字母 lane 檔案不相交可平行。
> 順序約束（PLAN Milestones 節）：**MS0 未過不得進 MS1，MS1 未過不得進 MS2**。

## MS0: e2e harness 逐案 viewport（前置）
**Goal:** `scripts/e2e-statusline.mjs` 支援逐案 viewport，解除 1400×1000 雙處硬編（`:347` `--window-size`／`:1049` `setDeviceMetricsOverride`）。
**Acceptance:** 既有 10 案帶原值全綠零迴歸；harness 可逐案設定 viewport 且座標系正確。

- [x] T0.1 — S-d 前半：harness 加 `testCase.viewport` 欄位（預設 1400×1000），改寫兩處硬編為逐案取值；既有 10 案帶原值跑一輪確認全綠不變。`# E2E: npm run test:e2e`（本機限定，不進 CI）
- [x] T0.2 — S-d 後半：加 1280×800 空殼案驗證座標與 `elementFromPoint` 行為正確；結論寫 `spikes/S-d-RESULT.md`（產出＝harness 可逐案 viewport 且既有案零迴歸）。

## MS1: Spike 批（五門檻）
**Goal:** 捲動模型（M1′-a／M1′-b／M2 三臂）、垂直預算、可捲面積、軌寬、Tab 走查、收合狀態機、跨欄拖曳全部以實測定案，結論回填 PLAN.md。
**Acceptance:** S-a／S-b／S-c／S-g／S-j 五個通過門檻皆過；`--band-h` 維護方式定案（CSS 原生 vs ResizeObserver）；OQ-1／OQ-2 消解；若 M2 勝出或 S-b 需壓縮頁首 → **停下升使用者裁決**。

- [x] T1.1 — 共用原型骨架：靜態 HTML/CSS 原型（頂帶＋三欄、真實內容量級 mock、M1′-a／M1′-b／M2 三臂可切換）＋獨立 CDP 量測腳本底座（比照 sprint14 spike 手法）。置於本 sprint `spikes/` 下，**不得落入 `tools/*/index.html` 的 vite 掃描範圍、不得進 dist**。
- [x] 🔀 [A] T1.2 — S-a 黏著幾何（最高優先）：三臂 × {1400×1000, 1280×800, 390×844} × scrollY∈{0,200,400,max} 取樣；**語意門檻**＝(1) 頂帶每點完整在視窗內且 height>0；(2) 穩態 `rect.top===0`；(3) 兩欄 `rect.top ≥ 頂帶 rect.bottom`（max-scroll 不成立則回填遮蔽量並依 D2 三候選擇一）；M1′-b 另斷言欄 `scrollHeight>clientHeight` 且外框高 ≤ 上限+1px。**產出**＝捲動模型定案＋`--band-h` 維護方式定案＋欄遮蔽殘差消解手段 → `spikes/S-a-RESULT.md`。
- [x] 🔀 [A] T1.3 — S-b 垂直預算：六項量測（1280×800 頁首高／最壞組態頂帶高（5 列 powerline×1280 寬換行）／**以現行 dist 量 sprint14@1280×800 工作欄可用高（G9 基準）**／設定欄自然高（定 OQ-2）／390×844「頂帶＋教學帶＋summary」固定開銷（服務 G8）／頂帶封頂後終端框實得高 ≥3 列）；**門檻＝G9 可見容量**（目錄 ≥8 項、列區 ≥2 完整列群組）；未達依序退：wrapper 補償高 → 壓縮頁首（**升使用者裁決**）→ M2 → `spikes/S-b-RESULT.md`。
- [x] 🔀 [A] T1.4 — S-g 可捲命中面積：1280×800 九宮格逐點 dispatch `mouseWheel` 記錄 `window.scrollY` 變化＋焦點落各區時 Space／PageDown 捲動標的；**門檻＝可捲面積 ≥30%**，未達判「不得同時對兩欄掛 `overscroll-behavior:contain`」（定 D2 範圍）→ `spikes/S-g-RESULT.md`。
- [x] 🔀 [A] T1.5 — S-j 軌寬與截斷：三欄自然內容寬＋P90 樣例值（sprint14-S2 量得 7–33 字元）於候選比例（`1 : 1.6 : 0.9` 起）截斷率；**門檻＝目錄欄容納 P90 不截斷**；未達調比例（列區最寬為不可讓步上位約束）（定 D3）→ `spikes/S-j-RESULT.md`。
- [x] 🔀 [A] T1.6 — S-c Tab 走查：CDP `Input.dispatchKeyEvent` 真 Tab，1400×1000 與 390×844、載入 ≥8 段啟用 seed；**門檻＝自頁面載入起抵設定首控件鍵擊數（含 Enter）≤ sprint14-S5 基線（設定＝第 10 停點）× 2**；並斷言 Enter 後下一次 Tab 的 `activeElement` 落 `#global-section` 內；WebKit focus starting point 不穩列誠實聲明 → `spikes/S-c-RESULT.md`。
- [x] 🔀 [B] T1.7 — S-f D8 狀態機跨斷點（獨立原型）：斷點切換 ×〈使用者收合／展開〉× 重載六種序列，斷言 **localStorage 只在 <1100px 使用者互動時改變**；桌面 `<summary>` 非 Tab 停點／不可點擊／a11y 播報與可見狀態一致；**JS 失效態（停用 script）下桌面目錄仍可達** → `spikes/S-f-RESULT.md`。
- [x] 🔀 [C] T1.8 — S-i 跨欄拖曳（獨立原型）：HTML5 DnD 自目錄欄拖至列區（各自獨立捲動容器，新引入幾何）四驗：(a) 跨容器 dragenter/dragover/drop；(b) 插入指示定位；(c) 目標列捲出視野時邊緣自動捲動；(d) 拖曳中來源欄誤捲。**定案輸出**＝若 (c) 顯示 Chromium 自動捲動會在拖曳中觸發，G4「三者 scrollTop 不變」放寬為 ±N px 並回填 → `spikes/S-i-RESULT.md`。
- [x] T1.9 —（**條件任務**：僅 S-a 定案採 ResizeObserver 路徑時執行）S-e jsdom 承接：於 `init()` 插一行 `new ResizeObserver(()=>{})` 跑 `npm test` 記錄紅燈檔數；比較「特徵偵測守衛（比照 `src/theme.ts`）」vs「vitest `setupFiles` 共用 stub」；**產出＝定案修法** → `spikes/S-e-RESULT.md`。
- [x] T1.10 — S-h 規模探測（**S-a 定案後**）：以勝出臂骨架只改 index.html／style.css（JS 完全不接），跑 `npm test` 與 `npm run test:e2e`，記錄紅燈檔數與案數＝測試網連動成本下界（校準 MS2–MS4 工作量）→ `spikes/S-h-RESULT.md`。
- [x] T1.11 — MS1 收尾簿記：全部 spike 結論回填 PLAN.md；**TECHSTACK delta 依 S-a 定案即回填（不等 MS4）**——基線句拆「CSS 基線」＋「JS 平台 API 基線」兩段、RO 僅 JS 量測路徑補入、原生元素不入 TECHSTACK（`<dialog>` 先例）；若 OQ-1 判 M2 或 S-b 觸壓縮頁首 → 彙整升使用者裁決。

## MS2: 版面手術
**Goal:** index.html 四區結構＋style.css 兩斷點改寫落地（S-a 勝出臂），版面 dom 測試同步，層疊紀律規約化。
**Acceptance:** `npm test` 綠（版面 dom 案）；**G2 桌面案於 e2e 到位（獨立 gate，非 `npm test` 範疇）**；層疊歸屬斷言到位；SPEC Conventions delta 已寫入。

- [x] T2.1 — index.html 結構手術（D1／D5）：`<main>` 直接子節點序＝**skip-nav → `#output-status`/`#error-message` → 預覽頂帶 → `.builder-columns` wrapper（目錄｜列區｜設定）**；頂帶整包（標題／底色×2／情境×4／產出腳本鈕移頂帶右端／固定示範時鐘句／終端框）；教學帶遷目錄欄頂（dismiss 狀態機不動）；新增 `#catalog-section` id（掛目錄區外層容器，非 summary）；DOM 序＝視覺序＝Tab 序、零 JS 搬移零 CSS `order`（G3）。
- [x] T2.2 — style.css 兩斷點改寫（D1／D2／D3）：頂帶全斷點 sticky＋**整體 `max-height ≤ 40dvh` 掛頂帶自身**（撤 `.preview-terminal{max-height:40dvh}` `:1270` → `flex:1 1 auto; min-height:0`）；兩欄獨立捲動 `max-height: calc(100dvh − var(--band-h))`（**單項扣除，不扣頁首**）＋`top: var(--band-h)`；頂帶 z-index **<10**（skip-link 為 10）；軌寬依 S-j 定案；欄遮蔽殘差／wrapper 補償依 S-a 定案；overscroll 範圍依 S-g 定案；<1100px 全解除 sticky／max-height 回文件流；**成對規則一律 `@media` 包裹**（D7，禁源序依賴）。
- [x] T2.3 — main.ts 接線：`--band-h` 維護依 S-a（CSS 原生＝零 JS、D6 作廢；RO＝三防護〔rAF 延後＋去重、變數掛 main 非 :root、必要時 scrollbar-gutter〕＋特徵偵測守衛＋e2e harness 補 `Runtime.exceptionThrown` 監聽）；**作廢 `--column-top` 體制**（`syncColumnTop()` 及其測試）；`assignSegmentsToContainers` 容器指派與教學帶接線隨遷。
- [x] T2.4 — 版面 dom 測試改寫：`layout-columns.dom.test.ts`（四區 DOM 序／欄歸屬／捲動容器數量）＋`preview-band.dom.test.ts`（**停點總數新契約**——注意 Chromium 對無可聚焦子節點的捲動容器自動加停點且不帶 `role="region"`，現斷言抓不到）＋層疊歸屬斷言（禁「規則存在性」比對，一律歸屬斷言）。
- [x] 🔀 [A] T2.5 — `mediaBlockRange` 最小強化（D7、MS2 出口條件）：掃描前剝除 `/* … */` 註解（或明訂「本批 media 區塊註解禁止內嵌孤立 `{`／`}`」機械規則），含自身測試。
- [x] 🔀 [B] T2.6 — G2 桌面硬驗收 e2e 案：1400×1000 與 1280×800、scrollY∈{0,200,400,max} 取樣，斷言頂帶完整在視窗內＋穩態 `rect.top===0`＋兩欄 `rect.top ≥ 頂帶 rect.bottom`（容許量依 S-a 回填）。`# E2E: npm run test:e2e`
- [x] 🔀 [C] T2.7 — SPEC Conventions delta（不依賴 spike 結論，前移至此）：三句入 root `SPEC.md` Conventions——(1) 拖放編排可用性不變量（獨立捲動容器、可用性不得依賴程式化捲動）；(2) skip 落點**快照謂詞**「`<main>` 內每個頂層分區於 skip-nav 須有對應落點」（註明為 `SPEC.md:145` 特化）；(3) 版位判準三句（共視不以捲動換取／低頻面板最低視覺權重／核心產出最大可視寬度）。

## MS3: 收合與可及性
**Goal:** D8 行動版目錄收合全套＋D4 五條 skip-nav＋錨點遮蔽補償落地。
**Acceptance:** 收合六項情境綠；i18n 巡檢綠（雙鍵＋`<summary>` 文案雙語齊備、零 `console.warn`）；Tab 序回歸基準寫入。

- [x] 🔀 [A] T3.1 — 收合狀態機模組（新檔，比照 `tutorial-band.ts` 單一常數出口）：key 字面值 **`eztools-statusline-builder-catalog-collapsed`**／sentinel `'1'`／謂詞「**收合 ⟺ `getItem(KEY)==='1'` 且 <1100px**」三者一體匯出；key 缺失、`getItem` 擲錯、任意怪值一律展開（fail-open）；比照 `tutorial-band.test.ts` 三情境各一斷言。
- [x] 🔀 [B] T3.2 — skip-nav 五條（D4）：nav 提升至 `<main>` 開頭（若成 grid item 比照 `#output-status` 明式 `grid-column:1/-1`＋層疊歸屬斷言）；新增「**跳至設定**」（**排第一**、落 `#global-section`）與「**跳至目錄**」（落 `#catalog-section`）；**所有錨點加 `scroll-margin-top`（綁 `--band-h`）**——repo 內零前例、須新立；i18n 雙鍵 `ui.skipToCatalog`／`ui.skipToSettings` 雙語齊備；`skip-nav.dom.test.ts:107-110` 計數斷言 **3 → 5**。
- [x] T3.3 — `<details>`/`<summary>` 標記與樣式（從零建立）：HTML 出貨態**寫 `open`**；回訪防閃動＝`@media(max-width:1099.98px)` 初載暫抑樣式＋JS 於 init 移除標記；桌面 `@media(min-width:1100px){summary{display:none}}`；三角標記／`list-style`／`:focus-visible` 焦點環／深淺主題對比／`prefers-reduced-motion` 全套新立；`.segment-lists__hint` 留收合區**外**（緊鄰 summary）；教學帶不納入收合區。
- [x] T3.4 — 持久化接線＋收合六情境 dom 測試：持久化**只由使用者意圖來源**觸發（`<summary>` click／keydown，或 toggle handler 以 `matchMedia('(max-width:1099.98px)').matches` 守衛＋程式化寫入抑制旗標——程式化 `open=true` 同樣派發 `toggle`）；跨斷點強制展開不得清除行動版偏好；六情境＝收合／展開／持久化／桌面恆展開／跨斷點強制展開後持久化值不變／localStorage 擲錯 fail-open。
- [x] T3.5 — Tab 序回歸基準：S-c 產出的「設定區起始停點序號」與「自載入起抵達設定鍵擊數」寫入版面 dom 案（Tab 序屬純 DOM 結構與 focus 順序，jsdom 可有效測試、無假綠疑慮）。

## MS4: e2e 校準與簿記
**Goal:** 既有 10 案校準＋G4／G8／skip 可見性新案；SPEC Components／BACKLOG／DRIFT 收尾。
**Acceptance:** e2e 全綠（本機）；**黃金檔零 diff ×2**；`npm test`＋`npm run typecheck` 綠。

- [x] 🔀 [A] T4.1 — 既有 e2e 校準：案 10 `caseModeSwitchScrollStable` 後備分支硬編 `#list-column` 且註解載「唯一捲動容器」語意已消滅——**id 改指新列區欄**（欄 id 依 MS2 定案回填）；案 9 `caseTutorialBandDoesNotBlockDrag` 遷移後退化為恆真——改測「目錄欄內拖曳於教學帶在場時不受阻」或承認與 G4 新案重疊而退場（擇一並記錄理由）；其餘案選擇器隨新 DOM 校準。
- [x] 🔀 [A] T4.2 — G4 拖曳幾何硬驗收 e2e 案：1400×1000 與 1280×800、固定 seed（≥3 列／≥8 段啟用、**種子釘死目錄尾段**（如 shell-out 分區）→ 非首列）；允許拖曳**前**對兩欄各設一次 `scrollTop`（非 `scrollIntoView`）；起手至 drop **全程斷言 `window.scrollY`／目錄欄 `scrollTop`／列區 `scrollTop` 三者不變**（容許量依 S-i 回填）；`toPointExpr` 只求值一次；以 `document.elementFromPoint` 命中驗證取代 rect 落界。
- [x] 🔀 [A] T4.3 — G8＋skip 可見性 e2e 案：G8＝390×844 頂帶 sticky 生效下目錄收合後**列區起始完整落在視窗內**（教學帶顯示／已 dismiss **兩種前置態都要驗**）；skip＝跳轉後落點 rect 不與頂帶 rect 相交（1400×1000 與 390×844 各一）＋**聚焦中的 skip-link 本身**未被頂帶遮蔽（`elementFromPoint` 命中該連結）。
- [x] 🔀 [B] T4.4 — SPEC Components 改寫（依 PLAN 對帳表逐條執行）：drop `:57-60` 形態語＋**`:61-62`「同一捲動容器」（最承重）**；replace `:63` 右欄句／`:69-71` 摺疊序／`:72` 鈕位／40dvh 掛終端框句；add 捲動停點新契約；keep×4；overscroll 依 S-g 結論落地；`:156`「全 7 案」改無計數措辭＋註明案數以 `CASES` 陣列為單一事實來源；兩層書寫（「不變量（變更需重議）」引 Conventions／「現行形態（sprint 15，可調整）」含收合 key 字面值與完整謂詞）。
- [x] 🔀 [C] T4.5 — BACKLOG＋DRIFT 簿記：BACKLOG「statusline-builder 第三輪真機驗收批」條目註記**部分失效**＋逐條對照表（失效／保留／改寫／新增，比照 sprint 14 對 sprint 09 的處理）；sprint14 DRIFT `--column-top` 相關條目作廢註記；OQ-5（持久化旗標小工廠**不抽**）留痕入本批 DRIFT。
- [x] T4.6 — 全面驗證收尾：`npm test`＋`npm run typecheck` 綠；**黃金檔零 diff ×2**（`npm run golden:update` 後 `git status` 乾淨——本批不應觸及 emit 鏈，出現 diff 即誤傷訊號）；`npm run test:e2e` 全綠。`# E2E: npm run test:e2e`（本機限定）
