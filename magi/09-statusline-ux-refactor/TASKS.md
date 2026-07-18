# Tasks — statusline-builder UX 重構（真機回饋批）

> Source: PLAN.md（Rev 2，round 2 審議 APPROVE）  •  Sprint: magi/09-statusline-ux-refactor/
> 慣例：TDD（先紅後綠）；任務行內「※測」＝該任務的最低證明測試；
> 🔀 [A]/[B] 車道檔案互斥可平行派工。file:line 皆指 Rev 2 PLAN 已複核落點。

## Milestone 1: 逐列分隔符（schema＋三後端＋UI＋golden）
**Goal:** `rowSeparators` v2 選填欄落地，三後端＋預覽 byte 級一致，golden「既有凍結＋新增帶覆寫 fixture」。
**Acceptance:** `npm test` 全綠（新增 config／reindex／resolve／emit 案）；既有 golden **全數零 diff**（含 powerline 8 檔硬斷言）；新 fixture golden 進版；typecheck 綠。

- [x] T1.1 — config schema：`rowSeparators?: (SeparatorConfig|null)[]` 型別＋新增 `sanitizeRowSeparator(raw): SeparatorConfig|null`（壞形／缺項一律退 null，僅委派既有驗證核心，**不得**複用 `sanitizeSeparator` 的 return 形）＋陣列級清洗（非陣列→欄位缺席；長度 clamp 上界＝目錄段數；序列化前修剪尾端 null；全 null／空陣列→省略欄位）。落點 config.ts。※測：config.test.ts 正反案（畸形元素退 null、超長陣列 clamp、v2 舊存檔無此欄讀取存活、序列化正規形往返）。
- [x] T1.2 — reindex 純函式 helper：`rowSeparators` 與 `rowSlots` `'real'` slot 一對一平行陣列的維護 API（real-slot 增刪 splice、pending 物化＝splice 入 null＋後移、**pending-only 操作 no-op**——`removePendingRow`/`appendPendingSlot` 不觸發）。新純模組（如 row-separators.ts，node 可測）。※測：三型正反案（刪中間列／空列壓縮消滅／移列 swap 跟列走）＋pending 物化案＋**組合矩陣 spike 案**（比照 row-slots.test.ts 風格，隨機操作序列後斷言「非 null 覆寫恆黏使用者指派的視覺列」）——PLAN Spike 1，本任務先行。
- [x] T1.3 — resolve 啟用位映射：由 `config.segments` 篩 enabled 重算啟用列鍵序，把存活渲染列映射回啟用位取 `rowSeparators[啟用位] ?? config.separator`（**禁**直接用 `.map` 存活 index；resolve.ts:634-639）；`ResolveInput` 不動（locale 是 M5 的事）。※測：resolve.test「整列執行期死亡＋後列覆寫」對位案、缺項退全域案、powerline 忽略案。
- [x] 🔀 [A] T1.4 — emit-bash 逐列 SEP（結構改，三處）：`:932` 宣告在**有覆寫時**拆逐列 `SEP_k`、`joinPlain`（:833-853）內寫死 `$SEP` 改參數化／`SEP${rowSuffix}`、單列路徑（:952）SEP 綁列 0；**no-override fast path**（全 null／缺席→輸出與現行逐 byte 相同）。※測：emit-bash.test 逐列正反案＋「無覆寫 config 輸出 sha1 不變」斷言（PLAN Spike 2 前半）。
- [x] 🔀 [B] T1.5 — emit-ps1 逐列傳參（兩呼叫點）：:1117（單列）／:1163（多列）改傳逐列值，`separatorExpr`（:937）零改動。※測：emit-ps1.test 逐列正反案＋separatorExpr 零觸碰（無覆寫輸出 byte 不變）。
- [x] T1.6 — golden 契約落地：新增帶 `rowSeparators` 的 golden fixture（兩 config 來源皆補：某列覆寫＋某列 null 繼承、單列覆寫、custom 含 escape 字元）＋機械斷言「既有 golden 檔全數零 diff（powerline 8 檔明列）」＋帶 scenario 的「整列死亡＋後列覆寫」端到端案（bash＋ps1 真執行 stdout vs `toAnsi(resolve())` byte 比對——PLAN Spike 2 後半）。`git diff __golden__/` 預期＝只出現新檔。
- [x] T1.7 — 列群組 UI 控件＋main.ts 接線：各列群組 header 逐列分隔符控件（預設顯示「（全域）」、可切 preset／custom／還原繼承）；T1.2 helper 接進三個 real-slot 變異點（setSegmentEnabled :924 drain／performRowDeletion :1841／commitSegmentMove :1544）；powerline 停用比照 applyModeConstraints（:2066）；mode 切換**保值不清除**。※測：jsdom dom.test 控件渲染＋覆寫後預覽變化＋powerline 灰化。

## Milestone 2: 欄位預設值標示
**Goal:** segment 編輯列每個欄位 label 後綴「（預設：X）」。
**Acceptance:** jsdom 案綠；標示文字集中常數（M5 可直接搬字串表）。

- [x] T2.1 — 預設值判定純 helper：對比 `defaultSegmentConfig(id)`（config.ts:128-130）＋descriptor 後備（variant＝`variants[0]`、閾值桶 `{kind:'default'}`）產出各欄位預設值描述。※測：helper 單元案（八欄位型各一）。
- [x] T2.2 — buildSegmentRow 渲染標示：八欄位（列位／顯示文字／前綴／顯示樣式／顏色／fg 覆寫／閾值／bar）label 後綴標示（main.ts:1091-1272＋index.html:657-742 模板）；文字走集中常數（「預設」一詞為 M5 字串表候選）。※測：jsdom dom.test 渲染與「值＝預設」判定案。

## Milestone 3: 拖移入列（enable-into-target）
**Goal:** 目錄項可拖入中欄指定列；checkbox 鍵盤路徑補落列播報；data-testid 上錨。
**Acceptance:** seam 三情境 jsdom 綠；既有 dom.test 全綠（defer 零擾動）；e2e 既有 5 案改錨後本機綠。

- [x] T3.1 — setSegmentEnabled defer-commit 旗標（PLAN Spike 3，開工首日）：defer 模式只 mutate `enabled`——不動 rowSlots、不 relayout、不播報、不 focus。※測：「defer 不 commit／不播／不 focus」單元斷言＋既有單獨勾選路徑行為零變（既有 dom.test 全綠；I4b／syncFgOverrideDisabled 契約 main.ts:941-953 不動）。
- [x] T3.2 — enable-into-target seam：「enable at row N pos M」核心決策抽為不依賴 drag event 的函式；commitSegmentMove 整合為唯一一次 commit＋播報，slotIndex 同一同步事件內取用；**唯一 commit 後補跑 `syncSegmentEnabledUi`（:938）＋`syncFgOverrideDisabled`（:952）**（round 2 收口，防 I4b 重演）。※測：jsdom seam 直測三情境——空清單拖入唯一 pending／中間 pending 列／真實列（斷言最終 rowSlots／各段 row／單次 commit）。
- [x] T3.3 — 目錄項 draggable＋來源感知清理：dragstart 起手（**checkbox 命中區豁免**，比照 :1421 控件豁免）；抽「來源感知的冪等 endDragCleanup」單一出口（目錄 li vs 中欄 li 的 opacity／class 分派清理；07 DRIFT 合流項）；**已啟用**目錄項被拖＝退化純 move。※測：jsdom 清理冪等案（drop 無 dragend 情境 class 不卡死）＋豁免案。
- [x] T3.4 — 播報語意：`performCrossRowMove`（:1573-1586）加 origin 參數（目錄拖入「已加入」／中欄「移至」模板）；checkbox 啟用分支補落列播報（現**完全不播**，屬新增）——一律**視覺顯示編號**（slotIndexOfRealRow 映射）。※測：jsdom 文案案（兩模板×顯示編號正確性）。
- [x] T3.5 — data-testid 上錨＋e2e 5 案改造：中欄關鍵節點補 `data-testid`＋列群組容器補 `data-row-index`；e2e 既有 5 案改走錨點、序數斷言改 `data-row-index`（去除「第 N 列」文字比對）、快照擴充納**每列 separator 覆寫狀態**。※測：本機 `npm run test:e2e` 5 案綠。# E2E: scripts/e2e-statusline.mjs

## Milestone 4: 版面重構（sticky 頂帶＋dialog 產出）
**Goal:** 預覽成全寬 sticky 頂帶（≤40dvh）；產出收斂單一鈕開 `<dialog>`（stacked 三區塊）；live region／skip-nav 守 SPEC 不變量。
**Acceptance:** jsdom 手動焦點案綠；整頁 boot 案修復綠；390×844 目視預留至真機 checklist。

- [x] T4.1 — 頂帶版面：#preview-section（index.html:393-468）抽出三欄成全寬 sticky 頂帶（`max-height ≤40dvh`、終端框內部捲動）；style.css grid 三斷點重排（:1188-1263）；z-index 介於一般內容與 skip-link（:146 z:10）之間、`.skip-link:focus` 仍浮頂帶上；捲動停點契約——頂帶**接手** aside 的 role=region／tabindex=0，總數維持 2（頂帶＋#preview-terminal）；控件收斂單列緊湊形（**出兩版截圖供使用者挑**，PLAN D4 A-1）；mock 時鐘常駐 hint 一句（文字入 M5 字串表候選）。※測：jsdom 停點數量／role 案。
- [x] T4.2 — dialog 產出：「產出腳本」鈕置頂帶右端；`<dialog>` 內 stacked 三區塊（沿用 output-block：標題＋複製＋下載＋pre，**不做分頁**）；`showModal()`＋顯式焦點還原至產出鈕（不依賴瀏覽器自動）；**`#output-status` live region 常駐 dialog 外**（守 SPEC.md:102）；`#settings-path` 留左側 config 區；`.ps1` BOM（:116,1892）不動。※測：jsdom 手動焦點案（開→聚焦 dialog 首元素／關→還原產出鈕）＋live region 常駐位置案。
- [x] T4.3 — skip-nav 改造＋既有案修：「跳至產出腳本」（index.html:229）改聚焦產出鈕、「跳至預覽」指頂帶；整頁 boot jsdom 案中斷言舊 output 版面者同步改（M4 對測試的實際衝擊面，PLAN 執行順序 Rev 2）。※測：skip-nav 新語意 dom.test。
- [x] T4.4 — Spike（PLAN Spike 4）：mobile 高度預算實量（375×667／390×844、3 列 powerline，斷言頂帶 ≤40dvh 且下方至少一完整列群組可見）＋`<dialog>` 相容矩陣（Chromium／Firefox／WebKit；iOS Safari <15.4 無 showModal 的 feature-detect fallback 決策文件化）。產出：spike 報告記入 WORKS.md，fallback 決策回寫 PLAN 一句。

## Milestone 5: i18n（雙層架構）
**Goal:** messages 純核心＋i18n-dom 套用器；四純模組 locale 注入；zh-Hant／en 全量；切換重繪。
**Acceptance:** 兩字典 implement 同一 `Messages` 介面（typecheck 罩 arity）；key 集合 meta 案綠；四純模組 node 測試全綠；jsdom 三面向翻轉案綠。

- [x] T5.1 — messages.ts 純核心（PLAN Spike 5，開工首日）：`Messages` TS 介面＋zh-Hant／en 兩字典（en 先骨架）＋`t(locale,key,params)`＋插值訊息函式；**零 DOM／零 localStorage**。※測：key 集合相等 meta 案＋介面 arity typecheck 驗證＋注入 PoC（任一純模組改注入後 node 綠）。
- [x] 🔀 [A] T5.2 — row-groups＋row-select 注入：`formatMoveAnnouncement`（row-groups.ts:132-137）與 `rowSelectOptionsForSlots`（row-select.ts:68-73「第 N 列（新列）」——round 1 漏列項）改 locale／t 注入，維持零 DOM import。※測：兩模組既有測試改注入後全綠＋en 輸出案。
- [x] 🔀 [B] T5.3 — resolve＋segments 注入：`ResolveInput.locale`（**選填、預設 zh-Hant**——既有呼叫點與 M1 golden 案不破裂）；:429「重置」與 :435 headAria 走 t；segments.ts 30 段 `label`＋30 段 `icon.ariaText` 改 message key／依 segment id 查表；`segments.ts:248` 註解同步修正。※測：resolve aria en 案＋segments 查表案＋既有測試全綠。
- [x] T5.4 — i18n-dom.ts：`data-i18n`／`data-i18n-attr` 套用器＋localStorage `eztools-statusline-builder-lang`（config key 冒號式 grandfathered 加註）＋`<html lang>` 同步＋header 切換鈕；**template clone 時序**＝各 clone 點（buildSegmentRow／createColorPicker／buildThresholdEditor／列群組建構）clone 後對子樹套用；閾值 6 模板名收斂單一 message key（消 index.html:948-956／main.ts:137-144 雙寫）；mock-data.ts `label` 加註非渲染副本。※測：jsdom clone 實例文字／aria 為目標語言案。
- [x] T5.5 — 全量文案遷移：index.html 靜態文案 data-i18n 標注全量；main.ts 常數表（VARIANT_LABELS／THRESHOLD_TEMPLATE_LABELS／REJECT_MESSAGES）與動態組句（announce*／showError／aria-label setAttribute）全改 t()；M1–M4 新增文字（「（全域）」「（預設：X）」mock 時鐘 hint、「已加入」播報等）一併入表；en 字典補全（協調者起草，量級 ~210–310 條）。※測：靜態掃描案（main.ts 無殘留硬編中文樣板——grep 級 meta 斷言）＋既有 dom.test 全綠。
- [x] T5.6 — 語言切換重繪五步序：(1) 主樹重套 →(2) rebuild 中欄段列＋刷 row-select（**不涉段列焦點保全**——切換時焦點在語言鈕）→(3) 強制 preview 重 resolve →(4) `<html lang>` 翻轉 →(5) 以切換後語言經 `#global-live-status` 播報。※測：jsdom 三面向翻轉案（`<html lang>`／可見文字／aria-label，含 clone 實例與 rebuild 後段列、row-select 選項、preview aria）。

## Milestone 6: 收尾（e2e 新案＋真機驗收）
**Goal:** e2e 補拖入與 dialog 案；真機 checklist 文件；全 gate 終驗。
**Acceptance:** 本機 e2e 7 案全綠；四軌 gate 全綠；golden diff 稽核僅新檔。

- [x] T6.1 — e2e 新案 ×2：「目錄拖入指定列」（真拖曳觸發 seam）＋「產出 dialog 開→複製→Esc 關→焦點還原產出鈕」。※測：本機 `npm run test:e2e` 7 案全綠。# E2E: scripts/e2e-statusline.mjs
- [x] T6.2 — 真機驗收 checklist 文件（T6.2-CHECKLIST.md）：五子項各一區＋390×844「頂帶 ≤40dvh 且下方至少一完整列群組可見」目視＋en 介面抽查區（翻譯品質把關）＋「本機 e2e 全綠」交付前置；**不列 SR 實聽項**（2026-07-17 拍板）。
- [x] T6.3 — 全 gate 終驗（協調者親跑）：`npm test`（per-CI-leg pass/skip 無迴歸——ubuntu bash leg／windows bash+ps1 leg 各自基準，1454 僅本機參考；任何改寫／刪案在 commit 訊息列明理由）＋`typecheck`＋`build && verify:dist`＋`test:e2e`＋`git diff __golden__/` 稽核（僅新檔、既有零變動）。

---

**依賴備註**：M1 內 T1.1→T1.2→T1.3 循序，T1.4∥T1.5（🔀 emit-bash.ts vs emit-ps1.ts 檔案互斥）匯入 T1.6→T1.7；M3 內 T3.1→T3.2→T3.3/T3.4→T3.5；M5 內 T5.1→T5.2∥T5.3（🔀 row-groups/row-select vs resolve/segments 檔案互斥）→T5.4→T5.5→T5.6。M2 獨立、可與 M1 尾段並行。spike 排程已內嵌對應任務（T1.2／T1.4-T1.6／T3.1／T4.4／T5.1）。
