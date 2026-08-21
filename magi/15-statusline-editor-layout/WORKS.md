# WORKS — sprint 15 statusline-editor-layout（append-only journal）

## 2026-08-12 — MS0 完成：e2e harness 逐案 viewport（S-d）
**Tasks:** T0.1, T0.2
**Verdict:** DONE
**Test result:** unit 1935/1935（協調者親跑復核；developer 跑批時 `catalog-sample-values.dom.test.ts` 出現一次既知 flake timeout，隔離重跑 9/9 過、復核跑全綠——屬 sprint 14 BACKLOG 既載條目，非本批引入）；e2e 11/11（10 既有案零迴歸＋新空殼案），exit 0
**Files touched:** `scripts/e2e-statusline.mjs`（+94/−4）、`magi/15-statusline-editor-layout/spikes/S-d-RESULT.md`（新）
**Decisions made by developer:**
- 既有 10 案不逐案添 `viewport` 欄位，一律落 `DEFAULT_VIEWPORT = {1400,1000}` 單一常數（diff 最小化；「帶原值」語意由預設值承擔）。
- 空殼案錨定元素選 `#preview-section` 而非 `.segment-lists`——後者高度隨目錄行數任意成長，中心點可能捲動後仍在視窗外。
- 空殼案 `viewport-probe-1280x800` **永久保留**於 CASES（第 11 案，逐案 viewport 的常駐迴歸哨兵）；檔頭案件清單註解同步補記。
**Out-of-scope observations to follow up:**
- `catalog-sample-values.dom.test.ts` 全批負載下 5000ms timeout flake 再現一次（BACKLOG 既有條目，本批不處理）。

## 2026-08-13 — MS1 前半：原型骨架＋三 lane 並行 spike（S-a／S-f／S-i）
**Tasks:** T1.1, T1.2, T1.7, T1.8
**Verdict:** DONE ×4
**Test result:** spike 任務無 vitest 範疇；S-f lane 附跑 unit 1934/1935（1 既知 flake，隔離 9/9）；各 spike 皆以 CDP 真瀏覽器取得機械證據
**Files touched:** `spikes/proto/`（6 新檔＋S-a 實驗註記）、`spikes/s-f/`（3 新檔）、`spikes/s-i/`（3 新檔）、`spikes/S-a-RESULT.md`、`spikes/S-f-RESULT.md`、`spikes/S-i-RESULT.md`
**Decisions made by developer:**
- **S-a 三定案**：(1) 捲動模型＝**M1′-a**（M1′-b 頂帶 T1 門檻不過＋外框超 100dvh 66–2913px；M2 三 viewport footer 恆不可達，因 M1′-a 已過門檻故不觸發使用者裁決）；(2) 遮蔽殘差＝**候選 2 接受＋量化**（桌面 max-scroll 固定殘差 ~134.156px＝footer 高＋wrapper 底 padding，兩輪獨立實驗證明與 wrapper 高無關——補償高同步增加 maxScroll 恆抵銷，候選 1 數學不成立）、e2e 容許 ≤140px；(3) **`--band-h`＝ResizeObserver**（1–5 列終端內容使頂帶高擺動 ~82px 桌面／~76px 行動＋行動版控件換行第二變異軸 69–146px，寫死值不可行）→ 觸發條件任務 T1.9（S-e）。
- **S-f**：D8 狀態機 11/11 成立；推薦機制 **(a) summary-only 監聽**（天生免疫程式化寫入誤判）；兩平台坑：初載暫抑樣式需 `<noscript>` 逃生門；summary click 後讀 `open` 需 setTimeout(0)/rAF（queueMicrotask 讀到舊值）。
- **S-i**：Chromium 原生邊緣自動捲動實證（觸發帶 <24px、~700px/s 衝頂、來源欄同受影響、不跨容器外溢）；G4 定案 **±2px（實質嚴格）＋座標離容器邊緣 ≥40px 安全帶**，否決大幅放寬容許量路線。
**Out-of-scope observations to follow up:**
- proto 頁首 mock @1400 寬 ≈268px vs 真實 236px（同量級；S-a 已註記敏感度不影響判定）。
- S-f 坑 1（目錄項須靜態 HTML 才守 fail-open）於真實 app 的適用性須在 T1.11 回填時校準——真實目錄本為 JS 渲染，fail-open 語意實際覆蓋的是「init 半路擲錯」情境。

## 2026-08-13 — MS1 後半：四並行 spike（S-b／S-g／S-j／S-c），五門檻全過
**Tasks:** T1.3, T1.4, T1.5, T1.6
**Verdict:** DONE ×4（MS1 五個 gate——S-a／S-b／S-c／S-g／S-j——全數通過）
**Test result:** spike 量測任務；S-b lane 附跑 unit 1934/1935（同款既知 flake）、S-g lane 附跑 1935/1935；各 spike CDP 量測全 exit 0
**Files touched:** `spikes/s-b/`（proto 副本＋2 量測腳本）、`spikes/s-g/`（proto 副本＋wheel-grid.mjs）、`spikes/s-j/`（proto 副本＋measure-width.mjs）、`spikes/s-c/`（proto 副本＋tab-walk.mjs）、`spikes/S-b-RESULT.md`、`S-g-RESULT.md`、`S-j-RESULT.md`、`S-c-RESULT.md`
**Decisions made by developer:**
- **S-b：G9 通過**（目錄可見 10≥8 項、列區 2≥2 完整群組、輔助判準 608px≥479.4px＝sprint14 基準×85%）；**OQ-2 定案＝設定欄不設獨立捲軸**（自然高 440px，餘裕 40–168px）。
- **S-g：D2 定案＝兩欄皆掛 `overscroll-behavior: contain`（O1）**；3 組態×2 狀態可捲命中面積 77.8–100% 全過 ≥30% 門檻，PLAN 禁止條件未觸發；MS2 CSS 指令已載入 RESULT。
- **S-j：D3 定案＝`minmax(340px, 1fr) 1.6fr 0.9fr`**；原候選 `1:1.6:0.9` 於 1280×800 差 3px 截斷 P90，二分搜尋得過關邊界 339px→取 340px；兩 viewport P90 截斷率 0/30、列區恆最寬。
- **S-c：gate 通過**（skip 路徑兩 viewport 皆 6 擊 ≤ 基線 10×2）；**Chromium 下 fragment navigation 的 focus starting point 實證生效**（Enter 後下一 Tab 落 `#global-section`）→ MS3 skip-link 維持零 JS 純錨點實作；純 Tab 對照路徑 195 停點（高於 PLAN 估 76–180，因 5 條 skip-link 自身計入停點＋列區 7 控件/列口徑）。
**Out-of-scope observations to follow up:**
- **S-b 零餘裕警示**：G9 列區判準通過但零餘裕，且 scrollY≥350 起退化為 1 群組（與 S-a 已接受的 N4 殘差同源、134.156px 逐位吻合）——MS2 落地後須以真實 DOM 列高覆核 G9。
- S-b：OQ-2 有限風險——`#global-section` 兩條件式子節點同顯＋最壞頂帶封頂時理論超預算 ~100px，MS2 後真機覆核，不預先加捲軸。
- S-b：真實 dist `.builder-columns__settings` clientHeight(472) vs scrollHeight(517) 有 45px 落差（該欄無高度限制規則），已記錄不根治。
- S-j：en locale 段名較寬——雙語零截斷需下限 410px（已驗證列區仍最寬）；RESULT「五之 2」節載取捨，MS2 裁量。
- S-j：390×844 單欄 en 5/30 截斷，供 MS3 參考。
- S-c：WebKit focus starting point 誠實聲明已入 RESULT；列區控件清點採 sprint14-S5 既有口徑（7/列）非窮舉真實模板。
- S-g：兩個 CDP 平台坑載入 RESULT（Space 鍵需 keyDown+char；單 session ~120–150 指令後 mouse event 停 ACK→逐組合開新 session）。

## 2026-08-13 — 暫停點（使用者指示：紀錄進度後暫停）
**MS1 進度：** T1.1–T1.8 完成（8/11）；**五門檻全過、三個 OQ 消解**（OQ-1＝M1′-a、OQ-2＝不設捲軸、D2/D3 定案）；**無需使用者裁決的斷點**（M2 未勝出、G9 未觸壓縮頁首）。
**MS1 剩餘：** T1.9（S-e jsdom 承接——已因 S-a 判 ResizeObserver 而**確定觸發**）→ T1.10（S-h 規模探測，須在 S-e 之後或之前循序跑——兩者皆暫改 tools/ 工作區）→ T1.11（收尾簿記：spike 結論回填 PLAN.md＋TECHSTACK delta＋S-f 坑回填 §D8）。
**之後：** MS2 版面手術（T2.1–T2.7，使用者已核准跑到 MS2 完成）。

## 2026-08-15 — T1.9：S-e jsdom 承接（RO 修法定案）
**Tasks:** T1.9
**Verdict:** DONE
**Test result:** 探針/修法各輪實測後已全數還原；協調者親跑復核 `npm test` **1935/1935（64/64 檔）全綠**、102.57s、exit 0（本輪零 flake）；developer 收工輪曾見 2 檔 timeout 型 flake（`catalog-sample-values` 與 `layout-columns`，隔離重跑 19/19 過——連跑 6 輪 npm test 負載偏高所致，既知型態）
**Files touched:** `magi/15-statusline-editor-layout/spikes/S-e-RESULT.md`（新，唯一留存）；`tools/statusline-builder/main.ts`／`vite.config.ts` 實驗後 byte-for-byte 還原、臨時 `test/setup-resize-observer.ts` 已刪；`git status --porcelain` 前後一致（協調者複核同）
**Decisions made by developer:**
- **探針實測**：`init()` 裸插 `new ResizeObserver(()=>{})` → **17 檔紅（82 案）**，`ReferenceError: ResizeObserver is not defined`，與 PLAN「17 個測試檔 await import('./main.js')」數字吻合。
- **兩修法皆實測轉綠**：修法 A（特徵偵測守衛，比照 `src/theme.ts` 惰性＋try/catch）與修法 B（vitest `setupFiles` no-op stub，臨時掛 `vite.config.ts` test 區塊）各自讓 17 檔全綠。
- **定案＝複合形**：**A 為主**（生產碼守衛）＋**一次性同步初始寫入**（獨立於 RO 回呼，比照 `syncColumnTop()` 模式——否則 jsdom 下回呼永不觸發、`--band-h` 永不被設定，T2.4 測不到初始值）＋**B 補強備用**（僅 jsdom 生效、可觸發的 setupFiles stub，供進階 spy 斷言）；施工程式碼已載 RESULT，MS2 T2.3 可直接照做。
**Out-of-scope observations to follow up:**
- 跨兩修法共通關鍵取捨（上述「一次性同步初始寫入」）已標給 MS2 T2.3——純守衛跳過或純 no-op stub 皆會讓 jsdom 下 `--band-h` 恆缺席，T2.4 的版面 dom 斷言須以初始寫入路徑為測試標的。

## 2026-08-15 — T1.10：S-h 規模探測（測試網連動成本下界）
**Tasks:** T1.10
**Verdict:** DONE
**Test result:** spike 窗口內：vitest 真連動紅 **2 檔／6 案**（`preview-band.dom.test.ts` ×2、`layout-columns.dom.test.ts` ×4，皆 DOM/CSS 結構契約斷言；另 2 案 timeout 型 flake 隔離重跑轉綠、排除計數）；**e2e 11/11 全綠、0 紅**。還原後：developer 收工輪 vitest 1935/1935＋e2e 11/11；協調者親跑復核 vitest **1935/1935（64/64 檔）**、105.55s、exit 0
**Files touched:** `magi/15-statusline-editor-layout/spikes/S-h-RESULT.md`（新，唯一留存）；`tools/statusline-builder/index.html`／`style.css` 骨架手術後 byte-for-byte 還原；`git status --porcelain` 前後一致（協調者複核同）
**Decisions made by developer:**
- 骨架＝M1′-a 最小代表性重排（頂帶升格 `<main>` 直接子節點＋三欄收 `.builder-columns`、sticky＋max-height calc＋S-j 軌寬＋S-g contain、`--band-h` 寫死 200px、JS 完全不接），嚴守「保留所有既有 id/class、只搬不刪」紀律。
- **下界結論**：main.ts 與測試網的節點查找不依賴父層路徑，62 檔／1929 案（拖曳/resolve/emit/i18n/色彩/閾值全邏輯層）與 e2e 全案在結構重排下存活——MS2 測試網必改面收斂於 `preview-band.dom.test.ts`＋`layout-columns.dom.test.ts` 兩檔（與 TASKS T2.4 預劃完全吻合）；MS4 T4.1 校準壓力低於預期。
**Out-of-scope observations to follow up:**
- **e2e harness 不重建 dist**：`scripts/e2e-statusline.mjs` 見既存 `dist/` 只印警告不重建——凡驗 statusline-builder 改動必須先手動 `npm run build`，否則靜默測到舊 dist（已載 RESULT §三／§五；MS4 SOP 須注意，本批未修）。

## 2026-08-15 — T1.11：MS1 收尾簿記（MS1 完成）
**Tasks:** T1.11
**Verdict:** DONE　——　**MS1 全 11 任務完成、五門檻全過、出口條件滿足**
**Test result:** n/a（純文件簿記）；協調者抽驗：TECHSTACK diff 7+/3−、PLAN.md 519→765 行、回填節在 :635、正文註記 23 處
**Files touched:** `magi/15-statusline-editor-layout/PLAN.md`（尾端新增「Spike 結論回填（MS1 出口）」節——十 spike 逐一＋裁決檢查聲明「升裁決條件皆未觸發」；正文 21+ 處〔MS1 定案／回填〕短註記，原句零刪改，含 D6「CSS 原生傾向」不成立、候選 1 數學證偽、D8 之 S-f fail-open 語意校準、Verification 節 MS4 SOP dist 重建提醒）；`magi/TECHSTACK.md`（基線句拆「CSS 基線」＋新增「JS 平台 API 基線」段補 `ResizeObserver`；原生元素未入、比照 `<dialog>` 先例）
**Decisions made by developer:**
- 協調者簡報漏列 `S-j-RESULT.md`（誤記九份），developer 自行辨識補讀並回填全部十個 spike——結論完整性不受影響。
**Out-of-scope observations to follow up:**
- 無新增；MS1 carry-forward 警示（G9 零餘裕覆核、OQ-2 真機覆核、en 410px 裁量、dist 重建 SOP）皆已載入 PLAN 回填節供 MS2–MS4 取用。

## 2026-08-15 — MS2 核心手術批：T2.1–T2.4（結構＋CSS＋接線＋版面測試網）
**Tasks:** T2.1, T2.2, T2.3, T2.4
**Verdict:** DONE ×4
**Test result:** developer 收工 1952/1953（唯一紅＝既知 flake，隔離 9/9 綠）；協調者親跑兩輪：第二輪 **1952/1953＋隔離重跑 9/9 綠**（唯一紅同款 `catalog-sample-values` timeout 型；第一輪另見 `layout-columns` 連跑負載下偶紅，同 timeout 型）；`npm run typecheck` exit 0；`npm run build` exit 0；`npm run verify:dist` exit 0；案數 1935 → **1953（+18）**
**Files touched:** `tools/statusline-builder/index.html`（934 行 diff）、`style.css`（316）、`main.ts`（112）、`layout-columns.dom.test.ts`（435，24 案）、`preview-band.dom.test.ts`（208，15 案）、`scripts/e2e-statusline.mjs`（+153 累計，S-d 改動完整保留）
**Decisions made by developer:**
- **T2.1**：`<main>` 直接子節點序＝skip-nav（3 條不變）→ `#output-status` → `#error-message` → `#preview-section` → `.builder-columns`（恰三欄：`.builder-columns__catalog#catalog-section`｜`.builder-columns__list#list-column`｜`.builder-columns__settings`）→ `#segment-hidden-pool` → `#output-dialog`；機械覆核＝節點行多重集新舊完全相同、僅多 2 個 wrapper div；產出腳本鈕零新節點（`margin-left:auto` 自然落右端＋斷言鎖住）；教學帶起始標記逐字保留遷目錄欄頂。
- **T2.2**：頂帶 `max-height:40dvh`＋全斷點 sticky z-index:2；`.preview-terminal` 撤 40dvh 改 `flex:1 1 auto; min-height:0`（**連同 `min-height:3rem` 一併撤**——互斥、極矮視窗壓縮鏈死點，理由入註解）；`.builder-columns` 無條件 grid＋`row-gap:2rem`（<1100px 天然單欄），≥1100px 才給 `minmax(340px,1fr) 1.6fr 0.9fr`；兩欄 sticky＋`var(--band-h,192px)` 後備＋contain；斷點相依規則全數收單一 `@media (min-width:1100px)` 塊、media 外零基準規則。
- **T2.3**：`syncColumnTop()` 全鏈刪除（grep `--column-top`/`syncColumnTop` 於 tools/+scripts/+src/ 零殘留，唯一命中＝斷言其不存在的測試案）；新增 `syncBandHeight()`（Math.round 去重、掛 `<main>` 非 :root）＋`wireBandHeightObserver()`（typeof 早退＋try/catch、rAF 延後＋scheduled 合併）；init 先同步寫入再掛 RO（S-e 複合形）；`assignSegmentsToContainers` 零改動（id 查找不依賴父層）；harness 增 `Runtime.exceptionThrown` 監聽（例外即 FAIL）。
- **T2.4**：layout-columns 24 案（四區序／欄歸屬／OQ-2 無捲軸／D3 軌寬／--band-h 接線／舊體制零殘留／層疊歸屬斷言 ×4）＋preview-band 15 案（停點新契約、D5 整包、z-index 機械比較 band<skip-link）；檔級 `vi.setConfig({testTimeout:30_000})` 比照三處既有先例。
- **裁量四則**：S-j 採 **340px**（en 截斷者為 aria-hidden 裝飾 hint、升 410 恆侵蝕列區，留 MS3/BACKLOG）；`scrollbar-gutter` **不加**（回饋迴圈於本版型無成立路徑，註解載重評條件）；setupFiles stub **不加**（S-e「不需要就不加」，改以顯式案鎖守衛＋初始寫入契約）；`.builder-columns__catalog` 類名**復用**（sprint 14 退役斷言改寫為「復用且必須是目錄欄」）。
- 外圍測試校準 **0 檔**（只搬不刪紀律奏效，與 S-h 下界預測一致）。
**Out-of-scope observations to follow up:**
- **flake 惡化警示**：`catalog-sample-values.dom.test.ts` 於本 session 全批負載下由「偶發」轉「常發」（developer 5/5、協調者 2/2 輪皆現；隔離恆綠、單案標稱 2284ms）——index.html +5.6KB 註解墊高 jsdom parse 成本所致；修法＝比照本批 layout-columns 檔級 testTimeout 30s 先例，**已核准折入 T2.5 lane 執行**（一行、有三處 repo 先例、防 MS2–MS4 每輪驗證噪音），T4.5 BACKLOG 簿記同步改寫該條目。
- `@media (max-width:1099.98px)` 區塊已完全消失（全 repo 零引用）——MS3 D8 加行動版規則時須重建，D7 成對紀律屆時才真正適用。
- `.builder-columns` 的 `row-gap:2rem` 為 <1100px 堆疊補的間距——MS3 收合設計若另有間距規劃須重談。
- e2e 案 10 `#list-column` 語意變更／案 9 教學帶遷移重疊性——本批僅留註解，實質校準屬 T4.1（既列 TASKS）。

## 2026-08-15 — MS2 尾批三並行 lane：T2.5／T2.6／T2.7（MS2 完成）
**Tasks:** T2.5, T2.6, T2.7
**Verdict:** DONE ×3　——　**MS2 全 7 任務完成、四項出口條件全數滿足**
**Test result:** 協調者合流總驗證 `npm test` **64/64 檔、1956/1956 案全綠**（105.39s、exit 0、**零 flake**——testTimeout 體制化後 `catalog-sample-values` 首次於全批負載下穩綠）；e2e **13/13 全綠**（2 新 G2 案＋既有 11 案，developer 連跑兩輪防 flake、fresh build）；`npm run typecheck` exit 0（兩 lane 各自複核）
**Files touched:** `tools/statusline-builder/layout-columns.dom.test.ts`（mediaBlockRange 強化＋3 自身測試）、`tools/statusline-builder/catalog-sample-values.dom.test.ts`（檔級 testTimeout 30s，協調者核准之微修）、`scripts/e2e-statusline.mjs`（+2 G2 案，累計 291+/11−）、`SPEC.md`（+9 行三句 Conventions）
**Decisions made by developer:**
- **T2.5**：採「掃描前剝除註解」治本路線——`stripCssComments` 以**等長空白**替換 `/* … */`（保留換行與位移，回傳 index 仍對映原字串座標）；對外介面與 3 處呼叫點零更動；自身測試三例（孤立 `{`／孤立 `}`／無註解回歸）。
- **T2.6**：新增 `g2-preview-band-sticky-1400x1000`／`-1280x800` 兩案（共用 `runG2PreviewBandSticky`；seed 沿案 10 五列組態；先斷 `maxScroll>0` 防假綠）。**⚠️ 容許量範圍再校準（審查時須關注）**：實測真 dist 發現 N4 遮蔽自「頂帶達穩態」起即線性連續退化至 max-scroll、無平台期（與 S-a 原型判定矩陣「兩處未過皆 max-scroll 側、皆 N4 遮蔽」同型態；已驗證與 seed 無關——目錄恆渲染全 ~24 項、主導頁高）——依 S-a-RESULT「MS2 實作後有出入須重新量測校準」授權，將 ≤140px 容許的適用範圍自「唯 max-scroll 取樣點」改為「**任何穩態後取樣點**」（穩態捲距逐輪動態量測非硬編；穩態前取樣點維持零容許、實測恆 +32px 餘裕）；檔頭與 inline 皆有長註解。
- **T2.7**：三句以 PLAN Spec deltas（:513-527）措辭落 SPEC.md Conventions 節尾（比照 sprint 06a/09/10 條目的時序附掛＋出處標記慣例）；`SPEC.md:145` 行號確認未漂移；skip 謂詞依規約文本性質**不帶**「尚未達成」暫時性註記（MS3 T3.2 使其完全成立）。
**Out-of-scope observations to follow up:**
- **既有 11 e2e 案在 MS2 手術後全數存活**（T2.6 實測兩輪）——T4.1「既有案紅燈清單」目前為**空**；但案 9／案 10 的**語意過時**問題（見前批帳目）不因綠燈而消失，T4.1 仍須依 TASKS 處理（改寫或退場並記理由）。
- T2.6 的容許量範圍再校準屬**門檻定義層變更**，須於 `/magi:review-code` 審查與 DRIFT.md 留痕。

## 2026-08-15 — MS3 收合與可及性：T3.1–T3.5（MS3 完成）
**Tasks:** T3.1, T3.2, T3.3, T3.4, T3.5（＋一件協調者核准 flake 微修）
**Verdict:** DONE ×5　——　**MS3 全任務完成、三項出口條件（六情境綠／i18n 巡檢綠／Tab 基準寫入）全數滿足**
**Test result:** 協調者出口總驗證 `npm test` **66 檔／1992/1992 全綠**（112.89s、exit 0）；`npm run typecheck` exit 0；各批中途複核：T3.1∥T3.2 合流後 65 檔 1980 全綠、T3.3+T3.4 後 66 檔 1990 全綠
**Files touched:** `catalog-collapse.ts`＋`catalog-collapse.test.ts`（新，T3.1）；`index.html`／`style.css`／`messages.ts`／`skip-nav.dom.test.ts`（T3.2）；`index.html`／`style.css`／`main.ts`／`messages.ts`／`catalog-collapse.dom.test.ts`（新，T3.3+T3.4）；`layout-columns.dom.test.ts`（T3.5）；`tutorial-band.dom.test.ts`（flake 微修）
**Decisions made by developer:**
- **T3.1**：三位一體匯出（`CATALOG_COLLAPSE_KEY`／`CATALOG_COLLAPSE_SENTINEL='1'`／`isCatalogCollapsed()`）＋set/clear 雙具名函式＋**額外匯出 `CATALOG_COLLAPSE_BREAKPOINT_QUERY`**（`(max-width: 1099.98px)` 字面單一出口防漂移）；桌面態謂詞短路不讀 localStorage；18/18。
- **T3.2**：五條 skip（「跳至設定」第一落 `#global-section`、「跳至目錄」落 `#catalog-section`）；grid item 條件句判定**不適用**（MS2 已撤 main grid）；`scroll-margin-top` 集中多選擇器一條規則、置於 media 塊**外**（遮蔽成因＝全斷點 sticky 頂帶，非兩欄）＋字面位置守衛斷言；i18n 雙鍵雙語。
- **T3.3+T3.4**：`<details id="catalog-collapse-details" open>` 包四個目錄分類 section；`html.js-init-pending` 暫抑標記＋`<noscript>` 逃生門；機制 (a) summary-only click/keydown＋**double-rAF** 延後讀 `open`（S-f 坑）；跨斷點強制展開/恢復用同源 BREAKPOINT_QUERY；六情境＋3 靜態檢查全綠；**外圍測試零校準**；實證 jsdom 無 matchMedia 且 details 原生 click-toggle 同步但不派發 toggle 事件（強化機制 (a) 正當性）。
- **T3.5**：兩基準常數入 layout-columns——`SKIP_PATH_KEYSTROKE_COUNT=6`（與 S-c 一致）；`SETTINGS_SECTION_FIRST_STOP_ORDINAL=50`（vs S-c 原型 195：原型種子 21 列×7 控件＝147 停點 vs 真實開機預設零啟用段；＋summary 新停點 +1——屬基準校準非放寬，差因逐條入註解）。
- **flake 微修**（協調者核准）：`tutorial-band.dom.test.ts` 檔級 testTimeout 30s（第 6 處先例；全批負載 26s vs 隔離 10s、隔離 22/22 恆綠——index.html 增量墊高 boot 成本所致）。
**Out-of-scope observations to follow up:**
- **既存 i18n 漂移（非本批引入）**：`messages.ts` zh-Hant `catalogHint`「中間『已選擇』欄」vs `index.html` 靜態後備文案「下方『已選擇』清單」——runtime 因 `applyI18n` 無條件覆寫而不可見；供 T4.5 簿記或 BACKLOG。
- e2e 層的 Tab 序總數／summary 可見性差異依 PLAN 測試層歸屬規定歸 e2e（MS4）；jsdom 口徑邊界已在測試註解載明。

## 2026-08-16 — MS4 e2e 校準與簿記：T4.1–T4.6（MS4 完成＝sprint 15 實作全數完成）
**Tasks:** T4.1, T4.2, T4.3（lane A 循序）∥ T4.4（lane B）∥ T4.5（lane C）；T4.6（協調者親自執行——純驗證電池、零程式碼改動，證據首手，偏離「派工」慣例之理由如實記錄）
**Verdict:** DONE ×6　——　**MS4 全任務完成、出口條件（e2e 全綠／黃金檔零 diff ×2／npm test＋typecheck 綠）全數滿足；sprint 15 全 31 任務收工**
**Test result:** 協調者親跑：`npm test` **66 檔／1992/1992 全綠**（87.61s、exit 0、零 flake）；`npm run typecheck` exit 0；`npm run golden:update` ×2 前後 `git status --porcelain` 快照逐位元相同（零 diff ×2）；`npm run build` exit 0 後 `npm run test:e2e` **19/19 全綠**（87567ms、exit 0）。lane A 自跑 e2e 連三輪 19/19 零 flake
**Files touched:** `scripts/e2e-statusline.mjs`（+1314/−46，13 案→19 案）；`SPEC.md`（Components bullet 版面段兩層改寫＋:156 無計數化）；`magi/BACKLOG.md`（第三輪真機驗收批逐條對照＋flake 條目結案＋syncColumnTop 子項作廢）；`magi/14-statusline-ux-round2/DRIFT.md`（--column-top 條目作廢註記）；`magi/15-statusline-editor-layout/DRIFT.md`（新建 PRE-SEEDED 前置留痕，協調者另補 2 條）
**Decisions made by developer:**
- **T4.1 案 9＝改寫非退場**，id 改 `tutorial-band-does-not-block-catalog-drag`：與 G4 不重疊（G4 驗拖曳全程捲動幾何、教學帶已 dismiss；本案驗教學帶**在場**時自目錄欄起手的跨欄拖曳可建立且不誤觸 dismiss）；另加「`#catalog-section` contains 教學帶」前提斷言防再度恆真化。案 10：`#list-column` id 保留（語意校準為列區欄）、`window.scrollY` 主判準實證為活路徑、後備分支標注為逃生路徑、補兩欄 `scrollTop` 進不變斷言。
- **T4.2 G4 真機新發現（門檻定義層調整，已入 DRIFT、review 須關注）**：`dragstart` 後 `body.is-segment-dragging` 命中區擴張（sprint14 T5.11 設計）造成一次性、有界、可逆位移，且通道隨 viewport 不同（1400×1000 走 scroll anchoring 補償 `scrollTop`+40px；1280×800 不補償、畫面下移 40px）——判準以**執行期實測擴張量**為該次跳動上界（`getComputedStyle` 加總、零 CSS 字面複製），其餘階段與 drop 後回歸維持 ±2px 嚴格，S-i 失效模式（數百 px 持續累積）仍會打紅。來源段取 shell-out 分區**首項** `git-branch` 非目錄最末 `clock`（後者貼容器下緣、與 ≥40px 安全帶直接衝突）；G4 基線於捲至頂帶穩態後取（scrollY=0 時目錄尾段任何 scrollTop 皆進不了視窗）。harness 新增 `dragFixedPoints`（座標單次求值、五階段取樣、不 scrollIntoView）；既有 `dragBySelector` 建立位移 dy 3→2（八個既有拖曳案實測零影響）。
- **T4.3**：G8 收合觸發＝seed 收合 key（import `catalog-collapse.ts` 常數、`seedExpr` 加 `collapseCatalog` 選項——走「曾收合後回訪」真實 init 路徑，避開 summary 非同步翻轉時序坑）；「列區起始完整落在視窗內」口徑＝穩態下 `#list-column`／`#selected-section` top ≥ 頂帶 bottom＋首錨點 `#add-pending-row` 完整入視窗＋`elementFromPoint` 命中。skip 相交斷言豁免 ×2：「跳至預覽」（TASKS 已豁免、落點即頂帶）＋「跳至產出腳本」（MS2 產出鈕已居頂帶右端、落點為頂帶後代，同構不適用；補償斷言＝Enter 後 activeElement＋elementFromPoint 命中該鈕）。
- **T4.4**：對帳表 10 列逐條執行（「同一捲動容器」全文 grep 歸零）；兩層書寫＋收合 key/sentinel/完整謂詞入文；skip 連結第三條依真實 DOM 寫「跳至已選擇」（修正協調者簡報的「跳至列區」不精確措辭）。發現 SPEC 硬編行號引用漂移問題（既有 `:145` 引用已位移；新寫 `:183-190` 同類）——已入 DRIFT C 節，建議下一批改錨點式引用。
- **T4.5**：BACKLOG 第三輪條目比照 sprint 09 先例逐條對照（保留×4／改寫×1／失效＋改寫×1／保留＋新增×1＋新增驗項 5 項）；flake 條目劃掉結案（六檔體制化）、未消化順手項拆出保留；sprint15 DRIFT.md 以 PRE-SEEDED 檔頭新建（A 節不預判、B 節 OQ-5／T2.6／flake 體制化、C 節 i18n 漂移／檔頭措辭落差）。
- **協調者補記**：DRIFT 另補 2 條（SPEC 行號漂移、G4 命中區擴張門檻調整）；T4.6 由協調者親自執行（黃金檔快照比對法：`git status --porcelain` 前後 diff 為零＝零新 diff，工作樹本就帶 sprint 15 未提交改動，不能以「status 乾淨」字面判讀）。
**Out-of-scope observations to follow up:**
- G4 命中區擴張的兩通道位移屬 S-i 結論的真機補充，未回填 PLAN 正文（留 review-code 判定是否需要）——已入 DRIFT B 節。
- PLAN §D4「skip 落點不與頂帶相交」判準對 5 條中 2 條在新版面下邏輯不適用（落點即頂帶／在頂帶內）——e2e 已以補償斷言處理並註明，SPEC 未載此判準故無矛盾；措辭精確化留下一批。

## 2026-08-16 — /magi:review-code（7 角度）＋使用者授權修復批（11 🟡 全處理）
**Tasks:** code review（角度 1–7，模型輪替 fable/opus/sonnet/haiku）＋修復批 lane α（main.ts＋catalog-collapse.dom.test.ts）∥ β（css-scan-test-utils.ts 新檔＋layout-columns＋skip-nav＋SPEC）∥ γ（e2e 五修）∥ δ（style.css／index.html／SPEC 註解與引用微修 ×2 輪）＋協調者簿記（BACKLOG 🟡-11 條目、PLAN 三處回填、DRIFT 產出與已修註記）
**Verdict:** review＝**APPROVE-WITH-NITS**（🔴 0／🟡 11／🟢 採納 Note 9＋Minority 8；APPROVE ×1＋AWN ×6）；修復批＝DONE ×4 lane，11/11 🟡 全消
**Test result:** 修復批後協調者總驗證：`npm test` 66 檔 **2000/2000**（88.08s、exit 0）；typecheck exit 0；黃金檔零 diff ×2（porcelain 快照逐位元同）；fresh build 後 e2e **21/21**（96134ms、exit 0；lane γ 另連兩輪 21/21）
**Files touched:** `MAGI_CODE_REVIEW.md`（新）＋`DRIFT.md`（review 正式版覆寫前置留痕＋已修註記）；main.ts（🟡-1 前移＋try/finally）；catalog-collapse.dom.test.ts（🟡-2 boot 掛 class＋🟡-10 rAF 沖刷）；css-scan-test-utils.ts（新，🟡-4）；layout-columns/skip-nav.dom.test.ts（🟡-4/5dom/6dom/9）；SPEC.md（🟡-9 口徑＋:60 錨點化）；e2e-statusline.mjs（🟡-3/5/6/7/8＋isSteady，19→21 案）；style.css/index.html（δ 註解同步 ×5 處）；PLAN.md（B-2/B-3 回填 ×3 處）；BACKLOG.md（testTimeout 七檔修正＋🟡-11 條目）
**Decisions made by developer:**
- 審議機制：政策角度制 7 票、majority >3.5；6 件本職角度未過門檻發現全數經協調者親自實證（grep／原碼比對）後依專家單票條款採納；drift 分類兩件 A 類主張（各 1 票）裁歸 B／C 並保留少數意見＋消解行動（均已同日執行完畢）。
- 🟡-1 採並用：(a) `applyInitialCatalogCollapseState()` 前移 init 起手（擲錯時收合態仍正確）＋(b) try/finally 不吞錯；🟡-2 紅→綠機械自證（兩處移除點全註釋時 :200/:295 轉紅，main.ts md5 逐位元還原）。
- 🟡-3 上界改「目標列之上列群組實測長高總量＋2px」（實測 40 vs 上界 42，舊 200）＋`G4_GROUP_GROWTH_CEILING=64` 天花板；🟡-5/8 G2 補穩態點殘差 ≈0（容許 4px，斜率 1 實測佐證）＋劣化單調性＋`maxScroll≥steadyThreshold` 防呆＋isSteady 改實際 scrollY。
- 🟡-4 helper `css-scan-test-utils.ts`（`stripCssComments`／`allMediaBlockRanges`／`mediaBlockRange(occurrence)`）＋「@media (min-width:1100px) 恰 2 區塊」契約；skip-nav 升「不落在任何同條件區塊」。
- 🟡-9 快照謂詞口徑＝「`<main>` 內（透明 wrapper 穿透、扣 hidden/aria-hidden/dialog）帶 accessible name 之 section/region 分區皆須有 skip 落點覆蓋」，兩例注入式負向控制證敏感度；SPEC Conventions 句尾釘同口徑。
- 新 e2e 案 ×2：`d8-catalog-summary-desktop-1400x1000`（D8 桌面硬條件入回歸網）、`catalog-collapse-summary-click-persist-390x844`（S-f 雙 rAF 平台坑的真機護欄）。
**Out-of-scope observations to follow up:**
- 「init 半路擲錯仍解除暫抑」無自動化測試掛點（需可注入擲錯的 boot 手法）——lane α 建議獨立 task，未入本批。
- G2 max-scroll 實測遮蔽 133.6px 距 140 平頂僅 ~6px——內容再增時平頂會轉為卡死；插值上界已有量測基礎（lane γ 註記）。
- 未處理 Note／Minority 全數留 DRIFT C（keydown 暫態、awaitPromise、RO entries 讀值、SPEC 停點措辭、SKIP 常數、exceptionThrown 正控制、dvh 過場、340px 截斷哨兵等）。
