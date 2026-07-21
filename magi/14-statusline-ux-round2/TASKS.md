# Tasks — Statusline Builder UX 第二輪真機回饋批

> Source: PLAN.md（Rev 4，2026-07-20）   •   Sprint: magi/14-statusline-ux-round2/

## Milestone 1: Spikes（實作前驗證）
**Goal:** 高風險假設（複合版面幾何、樣例值形檢、focus 模態、測試分層、行動版搬移）動工前以 PoC 實證，結論回填 PLAN。
**Acceptance:** S1–S5 結論（含破口與後備選型）以短備註回填 PLAN.md 對應節；D1 浮現機制定案「純 CSS `:has(:focus-visible)`」或「JS 模態旗標後備」二擇一；S1/S2/S3 完成前不動 M2。原型檔置 `magi/14-statusline-ux-round2/spikes/`，不入 dist。

- [x] 🔀 [A] T1.1 — S1 複合版面 PoC：三欄終形靜態原型（真 30 段假資料＋可 dismiss 教學帶＋目錄同居右欄單一捲動容器）。檢核：中欄 sticky×右欄 sticky 複合行為／內捲不連鎖（overscroll-behavior）／dismiss 後高度自然回收／**初載（scrollY=0）欄底可達性**（破口→`calc(100dvh − var(--column-top))` 後備）／move 鈕浮現態在捲動容器內不被裁切／**點擊收納鈕原位置無效果**／SVG 教學動畫 currentColor 深淺主題跟隨。
- [x] 🔀 [A] T1.2 — S1 附掛（時箱獨立，可溢出半天、不阻塞 S2/S3）：Chromium/Firefox 各實測「拖目錄項到欄底捲出視野的列」邊緣自動捲動；Firefox 破口則定「拖曳進行中 JS 捲動補償」方案要點。
- [x] 🔀 [B] T1.3 — S2 樣例值 dump：逐段以單段-enabled 預設 config × FULL mock 跑 `resolve()`（`mode:'plain'`，同 D2′ 正式機制），dump 30 段 toAnsi 前文字；逐段檢空值／長度／shell-out／控制碼殘留／emoji 寬度；產出「compact 版式可容納」結論＋fallback 段清單。
- [x] 🔀 [C] T1.4 — S3 控件類別矩陣：button／checkbox／select × Chromium/Firefox/Edge 四斷言（滑鼠點不浮現／Tab 進列浮現／浮現零躍動／鍵盤 move 重渲染＋還焦後浮現態延續）＋「點擊收納鈕原位置無效果」；出 D1 選型結論（select 滑鼠模態為已知變異點）。
- [x] 🔀 [C] T1.5 — S4 jsdom reveal 可斷言性：定 dom 層能證面（class／attribute；能否辨滑鼠模態→常駐「滑鼠不浮現」回歸案落 dom 或 e2e）；順帶定樣例快取隔離形（reset hook vs 強制 locale 重算）。產出測試分層表回填 PLAN。
- [x] 🔀 [A] T1.6 — S5 行動版 DOM 真搬原型：斷點欄序 reorder（清單節＝教學帶＋目錄＋已選擇**整節**搬移）＋Tab/SR 序走查；定佈局方案，防測試選擇器重寫兩次。

## Milestone 2: 版面重排（index.html＋style.css＋結構性 dom 案連動）
**Goal:** 三欄終形、右欄同居、行動版真搬、dialog 加大、move 鈕收納、教學帶結構全數落地，且每步結構性 dom 案同步遷移（套件保持綠）。
**Acceptance:** 頁面呈三欄（右欄＝教學帶→目錄→已選擇單一捲動容器）；`npm test`＋`npm run typecheck` 綠；`npm run build` 過。

- [x] T2.1 — 三欄 grid＋頂帶降級入中欄：`.preview-section` 內容遷入中欄（欄內 `sticky; top:0`）；role=region 隨遷；捲動停點改**條件式**（外層預覽節點僅在自身仍為捲動容器時保留 tabindex=0，否則停點降為 1）；skip-nav 落點改指中欄預覽；40dvh 預算改掛終端框 max-height。preview-band／skip-nav dom 案同步改寫。
- [x] T2.2 — 右欄同居結構：單一捲動容器（`sticky; top:0; max-height:100dvh; overflow-y:auto; overscroll-behavior:contain`），內容序＝教學帶→目錄 compact 列→已選擇清單（全在文件流，dismiss 高度自然回收）；依 T1.1 結論落初載可達性方案（原式或 calc 後備）；結構 dom 案同步。
- [x] T2.3 — 行動版（<1100px）DOM 真搬：摺疊序＝設定→預覽→清單（清單節整搬；Tab/SR 序＝視覺序；**micro-fix-3 就此收斂**）；media query 解除右欄 max-height／sticky；依 T1.6 佈局方案；欄序 dom 案同步。
- [x] T2.4 — dialog 尺寸：`width: min(90vw, max(640px, 55vw), 72rem)`＋`max-height: min(85dvh, 60rem)`；樣式斷言案同步。
- [x] T2.5 — move 鈕收納＋浮現（依 T1.4 選型）：收納態 `opacity:0 + pointer-events:none`（佔位零躍動、留 Tab 序）；`.row:has(:focus-visible)` 浮現或 JS 模態旗標後備；既有 move 行為斷言保留＋「預設收納、focus-visible 浮現」class 斷言＋**常駐「滑鼠點擊列內控件不加 reveal class」回歸案**（層別依 T1.5）。
- [x] T2.6 — 教學帶 markup＋SVG 動畫：抓取圖示＋一句文案＋SVG keyframes 迷你動畫（inline 靜態簽入、`aria-hidden="true"`＋`focusable="false"`、currentColor／主題 CSS 變數）；`prefers-reduced-motion` 停格＋停格版面穩定性 dom 案；「知道了」鈕結構（接線在 T3.5）。

## Milestone 3: 行為接線（main.ts＋messages.ts＋i18n）
**Goal:** mode 焦點修正、樣例值合成鏈、目錄 compact 渲染、教學狀態機、雙語文案全數接通，黃金檔早跑零 diff。
**Acceptance:** 六項回饋中 #1/#4/#5/#6 行為面可展示；`npm test` 綠；黃金檔零 diff（第一跑）。

- [x] T3.1 — D4 mode 焦點：刪 `segmentListsEl.setAttribute('tabindex','-1')`＋`.focus()` 兩行（main.ts:2734-2735）；dom 案＝正向 `expect(document.activeElement).toBe(radioEl)`＋具名 spy `vi.spyOn(segmentListsEl,'focus')` 不被呼叫＋live-region 播報訊息斷言。
- [x] T3.2 — 樣例值合成來源：逐段單段-enabled 預設 config × FULL mock 唯讀呼叫 `resolve()`（`mode:'plain'`；**不改 resolve**）；模組層 **lazy** per-locale 快取＋整批 try/catch（擲錯 fallback 至 default-hint、不阻斷 init）；暴露 test-only reset hook；單元測試含 fallback／lazy／拋錯路徑。
- [x] T3.3 — 目錄列 compact 渲染：未啟用＝`☐ 段名 樣例值`（淡化）／已啟用＝`☑ 段名 已加入`；樣例值一律 `textContent` 寫入（禁走 `instantiateTemplate` token／innerHTML 通道）；dom 案補含 `<`／`&` 文字之注入回歸斷言。
- [x] T3.4 — 語言切換重渲染接線：locale 切換事件觸發目錄列重渲染（重建快取）；dom 案「切語言後目錄 hint／已加入文字連動」（beforeEach 經 reset hook 重置快取）。
- [x] T3.5 — 教學 dismiss 接線：狀態機單一謂詞「**顯示 ⟺ 讀值 ≠ `'1'`**（key 缺失、讀取失敗、怪值皆顯示，fail-open）」；key `eztools-statusline-builder-drag-tutorial`、sentinel `'1'` 以**單一常數出口**匯出（e2e seed 引用同源）；讀寫 try/catch best-effort；dom 案＝dismiss／記憶／拋錯 fail-open／怪值顯示（皆收斂於單一謂詞斷言）＋beforeEach 清 key。
- [x] T3.6 — i18n 雙語文案：教學文案、樣例 hint fallback、「已加入」態、aria 描述——zh-Hant／en 齊備＋掛標；i18n 巡檢（靜態面）綠。
- [x] T3.7 — 黃金檔零 diff **早跑**：M3 完成即跑（早偵測 resolve 鏈耦合，不等終驗）。

## Milestone 4: e2e 校準
**Goal:** e2e 8 案在新版面下全綠，教學帶前置與拖曳回歸守住。
**Acceptance:** `npm run test:e2e` 本機 8＋新增案全綠（`# E2E: npm run test:e2e`，本機限定不進 CI）；證據記入 WORKS.md。

- [x] T4.1 — e2e 8 案選擇器與座標校準：隨三欄版面更新；**全案明文前置步驟＝dismiss 教學帶或 seed key**（引用 T3.5 同一 sentinel 常數）；拖曳座標維持 scrollIntoView＋getBoundingClientRect 紀律。
- [x] T4.2 — e2e 新增案：「教學帶不擋拖曳」**無條件**回歸案；mode 切換前後 `window.scrollY` 不變（activeElement 斷言選配）；依 T1.5 分層若「滑鼠不浮現」歸 e2e 則在此落地。

## Milestone 5: 文件、簿記與終驗
**Goal:** 契約文件與簿記收口，全套驗證關門。
**Acceptance:** 三文件 delta 落地與 PLAN spec-deltas 節一致；BACKLOG 兩動作完成；全套驗證綠（黃金檔終驗零 diff）。

- [x] 🔀 [A] T5.1 — root SPEC.md Components 改寫：汰除頂帶舊契約句（§57-64 全寬 sticky 頂帶／40dvh 頂帶自身／頂帶右端單一按鈕／雙欄退化），改述**行為契約**（三欄＋右欄同居、目錄 compact 形、行動版摺疊序、move 鈕「預設收納／鍵盤導航浮現／滑鼠點擊不浮現」（不釘選擇器）、dialog 尺寸、教學帶謂詞＋key＋sentinel `'1'`）。
- [x] 🔀 [B] T5.2 — magi/TECHSTACK.md 前端技術：補瀏覽器基線句「evergreen（Chrome/Edge/Firefox/Safari 近兩年）；CSS 基線含 :has()、:focus-visible、dvh、overscroll-behavior」。
- [x] 🔀 [C] T5.3 — magi/BACKLOG.md 兩動作：「09 真機驗收批」條目內 micro-fix-3 子項勾銷註記＋該條目過時面註記（本批版面重排使 A/C/F 區部分項目失效）。（PRD／CLAUDE 為 (none)，佐證句已在 PLAN，無檔案動作。）
- [x] T5.4 — 全套終驗：`npm test`＋`npm run typecheck`＋**黃金檔零 diff 終驗**（第二跑）＋i18n 巡檢＋e2e 全綠復核；結果記 WORKS.md（真機驗收屬出貨後第三輪回饋，不擋本批）。
