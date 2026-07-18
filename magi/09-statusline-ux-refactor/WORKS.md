# Works — statusline-builder UX 重構（真機回饋批）

> Sprint: magi/09-statusline-ux-refactor/ • 派工紀錄（append-only）

## 2026-07-17 — Wave 1：schema＋兩顆純 helper（M1×2＋M2×1 平行）
**Tasks:** T1.1, T1.2, T2.1（3 developer 平行，檔案互斥）
**Verdict:** DONE ×3
**Test result（協調者親驗，非採信回報）:** config.test 89/89、row-separators.test 20/20、segment-defaults.test 35/35（各單檔 exit 0）；wave 收攏 `npm test` **1501 passed／19 skipped（43 檔，exit 0）**、`npm run typecheck` exit 0
**Files touched:** config.ts＋config.test.ts（T1.1）；row-separators.ts＋test（新，T1.2）；segment-defaults.ts＋test（新，T2.1）
**環境事件（協調者處置）:** T1.1 全量測試揭露本機 node_modules 缺 jsdom（3 個 dom.test 檔起不來）——`npm install` 補回（+38/-23 packages），dom 測試恢復（auto-color-duplicate-hint 20/20 驗證）。此為環境修復、非依賴變更，package.json 零改動
**Decisions made by developer（協調者複驗後接受）:**
- **T1.1**：`sanitizeConfig` 拆 `sanitizeConfigCore`（不含 rowSeparators）＋外層——`migrateConfig` v1 路徑改走 core，從源頭排除 v1 遷移產生 v2 欄位的可能（含測試釘住）；長度 clamp 上界＝`catalog.ids.length`
- **T1.2**：API **只收 real index、不設 slot-index 入口**（`removeRealAt`／`insertNullAtReal`／`padToLength`），pending-only 操作在結構上即 no-op（round 2 footgun 封死在介面層）；「隨機」矩陣改窮舉 ≤4 ops 全組合（4273 節點）＋Array.splice ground truth，避免非決定論
- **T2.1**：`isSegmentFieldAtDefault` 簽章比 brief 多帶 `descriptor` 參數（variant 預設需 `variants[0]`，無 descriptor 無法判定）——T2.2 接線點本就同時持有兩者，零成本；模組不 import segments.ts（傳入 descriptor 解耦，同 config.ts 慣例）；VARIANT_LABELS 為 main.ts 對照表複製值（註記 M5 收斂單一來源）
**Out-of-scope observations to follow up:**
- T1.2 `padToLength` 目前無呼叫者，接線與 real↔slot 換算歸 T1.7
- T2.2 接線時注意 `isSegmentFieldAtDefault(seg, descriptor, key)` 三參數形

## 2026-07-17 — Wave 2：三消費點逐列 SEP（T1.3∥T1.4∥T1.5 平行）
**Tasks:** T1.3, T1.4, T1.5（3 developer 平行，resolve.ts／emit-bash.ts／emit-ps1.ts 檔案互斥）
**Verdict:** DONE ×3
**Test result（協調者親驗）:** resolve.test 126/126、emit-bash.test 119/119（113 既有＋6 新）、emit-ps1.test 169/169；wave 收攏 `npm test` **1517 passed／19 skipped（43 檔，exit 0）**、`npm run typecheck` exit 0、`git diff --stat -- __golden__/` **空**（凍結鎖成立——三後端改動下既有 golden 全數 byte 不變，no-override fast path 實證）
**Files touched:** resolve.ts＋resolve.test.ts（T1.3）；emit-bash.ts＋emit-bash.test.ts（T1.4）；emit-ps1.ts＋emit-ps1.test.ts（T1.5）
**Decisions made by developer（協調者複驗後接受）:**
- **T1.3**：`enabledRowOrder`（全 enabled 段相異 row 值升冪）獨立於 `renderRowOrder`（存活列），存活列以 `indexOf` 映射回啟用位取覆寫——C2 契約落地；docstring 補節
- **T1.4**：SEP 宣告拆三分支（單列恆 bare `SEP=` 綁列 0／多列無覆寫沿用單一 `SEP=`＝fast path／多列有覆寫逐列 `SEP_${r}=`，未覆寫列亦退全域值宣告）；`joinPlain` 改收 sepVar 參數（呼叫端定 `SEP` 或 `SEP_k`）；順手修復並行期 typecheck 暫紅
- **T1.5**：單一 helper `rowSeparatorValue(config, rowIndex)`＝`(rowSeparators?.[k] ?? separator).value`，fast path 靠 `??` 結構性保證非額外分支；`separatorExpr`／`joinPlain` 本體零改動
**Out-of-scope observations to follow up:**
- 並行期兩位 developer 都正確識別「他 lane 的暫時性 typecheck 紅」並以範圍過濾自證清白（tsc 輸出 grep 自身檔名零匹配）——wave 收攏後全量 exit 0 坐實

## 2026-07-17 — Wave 3：golden 契約＋UI 接線（T1.6∥T1.7），M1 完結
**Tasks:** T1.6, T1.7（2 developer 平行，scripts/golden/測試 vs main.ts/index.html/style.css 互斥）
**Verdict:** DONE ×2——**M1（T1.1–T1.7）全數完成**
**Test result（協調者親驗）:** wave 收攏 `npm test` **1559 passed／19 skipped（44 檔，exit 0）**、`npm run typecheck` exit 0；golden 稽核親驗——`git diff --stat __golden__/` **空**＋`git status --porcelain` 恰 6 個新檔（3 案 × sh/ps1），「既有凍結＋只增新檔」契約坐實
**Files touched:** statusline-golden-configs.ts＋golden-statusline-ps1.mjs＋multirow-golden-configs.ts＋emit-bash.test.ts＋emit-ps1.test.ts＋pipeline.integration.test.ts＋__golden__/×6 新（T1.6）；main.ts(+243/-3)＋index.html(+33)＋style.css(+36)＋row-separator-control.dom.test.ts 新 23 案（T1.7）
**Decisions made by developer（協調者複驗後接受）:**
- **T1.6**：powerline 惰性的機械證據改為「同 config 注入垃圾 rowSeparators 前後 byte 相同」對比案（測試無歷史 bytes 可參照）；powerline 明列清單 bash 側 8 檔、ps1 側 6 檔（ps1 canonical 清單本就不同）；端到端整列死亡案 git-branch 段沿 T7.3 受控 temp repo 慣例釘 cwd
- **T1.6**：一次全量跑遇 2 個並行子程序負載下的暫時性失敗，單檔重跑＋兩次全量重跑皆綠，判環境 flakiness 非迴歸（協調者收攏跑亦綠，接受）
- **T1.7**：`commitSegmentMove` 接線不復用 `planSegmentMove` 回傳（slot-index 空間 vs real-index 空間不相容），新增唯讀鏡射的 `computeRowSeparatorsAfterMove` 重算 sourceRow/srcDrains、insert-then-remove 同序套用
- **T1.7**：`normalizeRowSeparatorsField` 於 main.ts 本地重實作 config.ts 的 trim/omit 正規形規則（removeRealAt 可留下未修剪尾 null）
**Out-of-scope observations to follow up（review-code 關注點）:**
- T1.7 的 `computeRowSeparatorsAfterMove` 鏡射 `planSegmentMove` 內部邏輯（其回傳形不外露 sourceRow/srcDrains）——兩處邏輯漂移風險，可評估讓 planSegmentMove 回傳形補欄位收斂
- T1.7 的 `normalizeRowSeparatorsField` 與 config.ts 清洗層規則雙寫——同漂移風險
- T1.6 觀察到並行子程序負載下真執行案偶發 flaky（重跑即綠），CI 若加並行度需留意

## 2026-07-17 — T2.2：預設值標示渲染，M2 完結
**Tasks:** T2.2（單 developer，main.ts 串行段首棒）
**Verdict:** DONE——**M2（T2.1–T2.2）完結**
**Test result（協調者親驗）:** `npm test` **1571 passed／19 skipped（45 檔，exit 0）**；新 default-hint.dom.test.ts 10 案（整頁 boot 模式）＋既有 4 dom.test 全綠；typecheck 0（developer 回報，收攏全量坐實）
**Files touched:** main.ts、style.css、default-hint.dom.test.ts（新）；segment-defaults.ts 零改動
**Decisions made by developer（協調者複驗後接受）:**
- 淡化同步走 `commitConfig()` 尾端單一收束點（涵蓋全部欄位變動路徑，不逐 handler 補呼叫）＋`buildSegmentRows()` 尾端補 init 初始態（init 依既有慣例不呼叫 commitConfig）
- a11y：提示 span 全部 `aria-hidden="true"`、不入 accessible name（守 SPEC「label[for]/legend 承載」慣例，避免 SR 名稱冗長）——與 PLAN D2「走 G5 字串表」不衝突，M5 時只翻 span 文字
- 選項 C（值＝預設淡化）順帶交付（opacity 0.6 class）
**Out-of-scope observations to follow up:** 無

## 2026-07-17 — T3.1＋T3.2：defer-commit＋enable-into-target（C1 落地）
**Tasks:** T3.1（Sonnet 級）, T3.2（**Opus 級**——本 sprint 唯一 Critical 設計核心）
**Verdict:** DONE ×2
**Test result（協調者親驗）:** defer-enable.dom.test 14/14、enable-into-target.dom.test 14/14、typecheck 0；developer 全量 1585→1599 綠（協調者於 T3.3/T3.4 收攏時全量坐實）
**Files touched:** main.ts＋defer-enable.dom.test.ts（T3.1）；enable-into-target.ts（新純模組）＋main.ts＋enable-into-target.dom.test.ts（T3.2）
**Decisions made by developer（協調者複驗後接受）:**
- **T3.1**：介面採獨立函式 `markSegmentEnabledDeferred(id): SegmentConfig|undefined` 而非 options 旗標——「defer＋停用」組合在型別層直接不存在；回傳段參照供 T3.2 續寫＋測試白盒觀察；冪等
- **T3.2**：seam 落新純模組 enable-into-target.ts（`planEnableIntoTarget` = planSegmentMove 去來源列步驟的**純插入**語意；不 wrapper 物化虛擬來源——C1 的中間態就是要消滅的）；commitSegmentMove export＋開頭停用段分派，已啟用段行為零變；唯一 commit 以 Storage.setItem spy 計數實證；I4b 收口（唯一 commit 後補跑雙同步）有專案
**Out-of-scope observations to follow up:** 無

## 2026-07-17 — T3.3＋T3.4：目錄拖曳＋來源感知清理＋播報語意
**Tasks:** T3.3, T3.4（同 developer 串做，main.ts 同區域）
**Verdict:** DONE ×2
**Test result（協調者親驗）:** catalog-drag.dom.test 14/14；全量 `npm test` **1613 passed／19 skipped（exit 0）**；developer 另證 build 成功
**Files touched:** main.ts、index.html、style.css、catalog-drag.dom.test.ts（新）
**Decisions made by developer（協調者複驗後接受）:**
- **T3.3**：`dragSource: 'row'|'catalog'|null` 模組狀態＋`endDragCleanup()` 單一冪等出口（取代 dragend＋5 個 drop handler 各自的六步驟重複），opacity 依來源分派節點；目錄項不接自身 drop——落點沿用中欄既有 handler，commitSegmentMove 依 enabled 自動分派（「已啟用項退化純 move」零額外分支）；drop 當下即清 rAF/class（原留給 dragend，時序提早無副作用）
- **T3.4**：`performCrossRowMove` 第四參數 `origin='move'` 預設值使既有呼叫點零改動；`announceSegmentLanded` 集中兩模板；checkbox 啟用播報含 BACKLOG:37 情境案（越界 clamp 播視覺顯示編號非 row 值，實跑驗證）
- jsdom 無 DragEvent——以 MouseEvent 手工 dispatch 模擬，真拖曳界線留 T3.5/T6.1 e2e（報告記明）
**Out-of-scope observations to follow up:**
- T3.5 交接：目錄項未上 data-testid；「已加入」播報屬 i18n 文字，e2e 斷言改屬性錨

## 2026-07-17 — T3.5：data-testid 上錨＋e2e 改造，M3 完結（M1–M3 批次收工）
**Tasks:** T3.5
**Verdict:** DONE——**M3（T3.1–T3.5）完結；本次 /magi:go 批次 M1＋M2＋M3 全數交付**
**Test result（協調者親驗）:** `npm run test:e2e` **5/5 真跑通過（Edge headless，非 skip，exit 0）**；`npm test` **1613 passed／19 skipped（exit 0）**；`npm run typecheck` exit 0
**Files touched:** index.html、main.ts、scripts/e2e-statusline.mjs
**Decisions made by developer（協調者複驗後接受）:**
- 七類節點上錨（row-group＋data-row-index、segment-row、segment-grip、row-select、pending-row-group／delete、catalog-item、row-separator-preset）——「動到哪錨到哪」，未全頁撒錨
- SNAPSHOT_EXPR 整個移除 heading textContent 欄位（「第 N 列」i18n 文字），改讀 `data-row-index` 數值；快照擴充 `separatorOverride` 欄——**直讀 DOM 控件值**（code-facing value 非顯示文字）而非重演 localStorage 正規化邏輯，避免 e2e 腳本與 main.ts 邏輯雙寫
- root SPEC Conventions 的 data-testid 慣例宣告留給 /magi:commit 落地（Spec deltas 既定分工，developer 正確不越權）
**Out-of-scope observations to follow up:** 無

## 2026-07-17 — M4/M5 Wave A＋B：T5.1→(T5.2∥T5.3)＋T4.1（雙鏈交錯平行）
**Tasks:** T5.1, T5.2, T5.3, T4.1（M5 純模組鏈與 M4 main.ts 鏈檔案互斥並行）
**Verdict:** DONE ×4
**Test result（協調者親驗）:** messages.test 49/49；row-groups＋row-select 71/71；resolve＋segments＋emit 雙後端（golden 鎖）513/513；preview-band.dom.test 7/7；T4.1 收攏全量 `npm test` **1681 passed／19 skipped（exit 0）**；typecheck 0；e2e 5/5（developer 本機真跑）
**Files touched:** messages.ts＋messages.test.ts（新，T5.1）；row-groups.ts／row-select.ts＋tests（T5.2）；resolve.ts／segments.ts＋tests（T5.3）；main.ts／index.html／style.css＋preview-band.dom.test.ts（T4.1）
**Decisions made by developer（協調者複驗後接受）:**
- **T5.1**：`t(locale)` 回整本字典；`Messages.segments: Record<SegmentId,…>`（type-only import）使 30 段全覆蓋成**編譯期事實**；en 初稿自評待打磨清單留 T5.5
- **T5.2**：`computeRowSelectOptionOps` 順手加選填 locale 轉發（否則注入語意不一致）——範圍內合理擴充
- **T5.3**：單一事實來源反轉（messages 是源、segments 消費）；headAria 改走 `segmentAriaText(id, locale)` accessor；循環 import 以 type-only 擦除實證安全；golden 鎖 306/306 綠證腳本輸出零變
- **T4.1**：頂帶自身承載 role=region＋tabindex=0（無額外 wrapper）；情境標籤縮短＋原全文保留為 aria-label（WCAG 2.5.3 可見文字為 aria-label 子字串）；#output-section 過渡安置 main 內 grid-area:output、內部零動（T4.2 直接抬進 dialog）；變體 B 以 CSS class 快照、不進 shipping HTML
- 兩版截圖（桌面＋390×844 各二）已交使用者選擇；390×844 實測頂帶低於 40dvh
**Out-of-scope observations to follow up:**
- 使用者變體 A/B 選擇未回——現行預設 A，切 B 為一行 class，屆時任一任務順帶
- T5.1 en 待打磨清單（rowDeleted 複數 hedge、git-dirty aria 措辭一致性）→ T5.5

## 2026-07-17 — T4.2＋T4.3＋micro-fix＋T4.4 spike（M4 完結；含 gate 基建修復與驗收條修訂）
**Tasks:** T4.2, T4.3, micro-fix（timeout）, T4.4（spike）
**Verdict:** T4.2/T4.3/micro-fix DONE；T4.4＝dialog 相容 DONE＋列群組可見性 **BLOCKED-FINDING**（協調者裁決收斂，見下）——**M4 完結**
**Test result（協調者親驗）:** output-dialog.dom.test 14/14＋全量 1695 綠（T4.2）；skip-nav.dom.test 8/8（T4.3）；fixtures＋pipeline 82/82＋19 skip（micro-fix 後）；T4.3 收攏時全量曾連續紅在 reference-7row **timeout**（5000ms 預設 × 52 檔並行負載，隔離綠、byte 正確）→ 根因查明為 gate 基建非迴歸，micro-fix 顯式 timeout 30s 後 developer 全量兩次綠
**Files touched:** main.ts／index.html／style.css＋output-dialog.dom.test.ts（T4.2）；main.ts／index.html＋skip-nav.dom.test.ts（T4.3）；fixtures.test.ts＋pipeline.integration.test.ts 僅 timeout 參數（micro-fix）；sp1/ spike 工件 5 件（T4.4，零生產碼）
**Decisions made by developer（協調者複驗後接受）:**
- **T4.2**：主動加顯式「關閉」鈕＋backdrop click 關閉——fallback 非模態路徑下 Esc 不原生關閉，無關閉鈕舊瀏覽器會被困；close 事件為焦點還原唯一出口（不分關閉來源）；#output-status 常駐 main 開頭補 grid-area 防 auto-placement 重疊
- **T4.3**：skip「跳至產出腳本」＝聚焦鈕不觸發開窗；10 個 boot 案掃描零殘存
- **micro-fix**：pipeline 檔級 `vi.setConfig({testTimeout:30_000})`（20+ 真 spawn 案逐案改易漏；vitest 每檔隔離不外溢）
**T4.4 spike 發現與協調者裁決:**
- 頂帶 ≤40dvh **全尺寸 PASS**（375×667＝40.0% 內部捲動如設計、390×844＝31.5%、桌面 27.9%）
- 「完整列群組可見」**全尺寸 FAIL、結構性不可達**（單段編輯列 428–520px、雙段列群組 983px；<1100px 目錄欄 2460px 前置把首列群組推至 y≈3374px）→ **裁決：據數據修訂 PLAN 驗收措辭**為「頂帶正下方立即可見已選擇欄起始」＋採納 CSS order 修法（<1100px 已選擇欄視覺提前）——已回寫 PLAN D4 A-1
- dialog 相容：Edge 真機五項全過（首次驗證原生 Esc cancel→close→焦點還原鏈）；Firefox <98／Safari <15.4 靠既有 feature-detect fallback 達「不炸可操作」底線；**採納**防禦 CSS 一行 `dialog.output-dialog:not([open]){display:none}`——fallback 定案已回寫 PLAN D4 A-2
- CSS order＋防禦 CSS 兩項排入 T5.4 落地後 micro-fix-2（style.css 現被 T5.4 佔用）
**Out-of-scope observations to follow up:**
- 真機 checklist（T6.2）驗收條同步採修訂措辭

## 2026-07-17 — T5.4＋micro-fix-2（i18n-dom 機制＋版面兩修）
**Tasks:** T5.4, micro-fix-2（T4.4 兩項採納建議落地）
**Verdict:** DONE ×2
**Test result（協調者親驗）:** i18n-dom.dom.test 19 案綠（developer 自報 29 屬計數口徑差異）；T5.4 收攏全量 **1722 passed／19 skipped（53 檔，exit 0）**；micro-fix-2：build／typecheck 0、工具目錄 1362 綠、Edge 真機 getComputedStyle 驗證 dialog 防禦行為
**Files touched:** i18n-dom.ts＋i18n-dom.dom.test.ts（新）、main.ts、index.html、style.css、messages.ts（加域）、mock-data.ts（註解）（T5.4）；style.css（micro-fix-2）
**Decisions made by developer（協調者複驗後接受）:**
- **T5.4**：`data-i18n-attr="attr:key;attr2:key2"` 格式定案；THRESHOLD_TEMPLATE_LABELS 常數刪除、雙寫收斂單一 key；lang-toggle 字典 key 以「當前語言下顯示的文字」為語意
- **T5.4 關鍵發現（T5.6 簡化）**：clone 實例皆掛活文件樹，切換時單次 `applyI18n(document, locale)` 全樹掃即覆蓋主樹＋全部已掛載實例——無需逐 clone 點追蹤迴圈；不翻轉面（imperative textContent/setAttribute、row-select 選項、preview aria）如期留 T5.6
- **micro-fix-2**：order 修法用互斥 media range（<1100 flex column＋catalog order:1）避免 cascade 風險；防禦行 `dialog.output-dialog:not([open]){display:none}` 實測三態正確
**micro-fix-2 誠實揭露（協調者記錄，後續處置）:**
- 首列群組標題 y≈3374.6→881.9px（改善 ~2493px），但修訂後驗收未全綠：390×844 已選擇欄頂可見、列群組標題仍低於摺線 38–154px；375×667 欄頂 716>667。殘餘成本＝排序說明段＋「＋新增一列」鈕固定高度
- CSS order 只動視覺序，Tab／SR 線性序仍走 DOM（WCAG 1.3.2/2.4.3 分歧）——正解＝DOM 欄序真搬＋撤 CSS hack（同時使視覺/Tab 序一致），需動 index.html，**排入 T5.5 落地後評估**（或併 T6.2 以真機驗收定奪；使用者原話僅要求預覽置頂不被擋，已全數滿足——此條屬內部加固，避免鍍金）
**Out-of-scope observations to follow up:**
- micro-fix-3 候選：DOM 欄序真搬（治 a11y 分歧＋殘餘摺線）；行動版排序說明段可收合化（另一選項）——留待使用者／真機驗收定奪

## 2026-07-17 — T5.5＋T5.6：全量文案遷移＋切換重繪（M5 完結；M4＋M5 批次收工）
**Tasks:** T5.5（Opus 級）, T5.6
**Verdict:** DONE ×2——**M5（T5.1–T5.6）完結；本次 /magi:go 批次 M4＋M5 全數交付**
**Test result（協調者親驗，批次終驗四軌）:** `npm test` **1737 passed／19 skipped（55 檔，exit 0）**、`npm run typecheck` exit 0、`npm run test:e2e` **5/5**（fresh dist）、golden 稽核零既有變動（僅 M1 的 6 個新檔 untracked）；i18n-meta-scan 4/4、lang-switch 11/11
**Files touched:** messages.ts（7→20+ 域、en 全量）／main.ts／index.html＋i18n-meta-scan.dom.test.ts（T5.5）；main.ts／i18n-dom.ts／segment-defaults.ts＋test／render-preview.ts（追加核准）／messages.ts＋lang-switch.dom.test.ts（T5.6）
**Decisions made by developer（協調者複驗後接受）:**
- **T5.5**：`msg()`／`segLabel()` 即時求值助手；validateUserText 改回傳 reason、呼叫端組句（拒收訊息 i18n 化的正確分層）；site chrome（footer／theme-toggle／head meta）維持 zh 並入 meta 案文件化排除清單；三張硬編常數表刪除
- **T5.6**：`initLangToggle` 增 `onLocaleChanged` callback（i18n-dom 不 import main.ts，依賴方向正確）；default-hint 改 11-kind tagged union 結構化描述（segment-defaults 維持零 messages import，render 層 t() 解讀）——zh byte 一致（default-hint.dom.test 零改動全綠）、en 全英文；切換句以切換後語言播報
- **T5.6 render-preview.ts 追加核准**（developer 先旗標、協調者核准）：PreviewInit.locale 選填＋setLocale 方法＋buildPreviewSpec 選填 locale——不改則 preview 永遠 zh resolve（真實既有缺口非 rebuild 引入）；零破壞（兩個 render-preview 測試檔零編輯全綠）
- **T5.6 順手修真 bug**：`buildSegmentRows()` 二次呼叫（每次語言切換）殘留舊列與新列同 id 並存、querySelector 撈到舊未翻譯節點——rebuild 前移除追蹤舊列。lang-switch.dom.test 比照 pipeline 檔級 testTimeout 30s（負載實證兩次全量）
**Out-of-scope observations to follow up:**
- en 翻譯品質把關留 T6.2 真機 checklist en 抽查區（T5.1 打磨清單已於 T5.5 處置）

## 2026-07-18 — /magi:review-code（8 角度面板）＋post-fix
**Tasks:** /magi:review-code（使用者指定比照 review-plan 多方位審議；真機驗收遞延下 sprint）＋post-fix（使用者核准 Important #1/#3/#4，#2 併下 sprint）
**Verdict:** **APPROVE-WITH-NITS**（8/8 面板：R2/R5 APPROVE＋6× A-W-N）；**0 Critical、4 Important（全協調者親驗 CONFIRMED）、~19 Note**；DRIFT Status: DETECTED（A:1→已修、B:彙整、C:多）
**審議模式:** 8 互斥角度 magi:reviewer（R1 契約漂移／R2 三後端 golden／R3 正確性／R4 測試品質／R5 注入面／R6 a11y／R7 i18n／R8 衛生），Critical/Important 協調者逐項讀碼複驗
**重點結論:** 契約兌現度極高（A 類僅 1 項一行級）；三後端「啟用位」同構三處同源逐碼證同；注入面零缺口（新通道與既有共用逸出咽喉）；C1/C2 修法逐案推演正確；使用者三項拍板全數如實。4 Important＝en WCAG 2.5.3（A 類）／meta-scan 屬性盲區／main.ts 缺 `*/`／提交集污染＋gitignore 缺口
**post-fix（dev-postfix，協調者終驗 1738 passed／19 skipped exit 0、typecheck 0）:**
- en `scenarioCondFull` 前綴化＋兩語言四組 `Full.startsWith(Short)` meta 案——**meta 案當場抓出 zh「早期」組既存同型違規**，一併修（詞序『早期 session（…）』）＋index.html pre-JS fallback（:164/:170）與 mock-data.ts:183 字面同步（協調者核准擴大）
- main.ts:151 補 `*/`（ColorMode docstring 還原）
- .gitignore `**/.xreview-prompt.md`→`**/.xreview-*.md`（check-ignore 驗證命中）
- meta-scan 屬性巡檢（Important #2）依使用者指示併下 sprint 測試批（DRIFT C 類）
**產出:** MAGI_CODE_REVIEW.md＋DRIFT.md（A 已勾銷、B/C 供 /magi:commit 對帳；提交集建議清單見 R8 段）
**Out-of-scope observations to follow up:** 見 DRIFT.md C 類（真機驗收批、測試加固批、雙寫收斂、衛生項）

## 2026-07-17 — M6：T6.1＋T6.2＋T6.3 終驗，sprint 實作全數完成
**Tasks:** T6.1, T6.2, T6.3（終驗協調者親跑）
**Verdict:** DONE ×3——**M1–M6 全 27 任務完成，sprint 09 實作面收官**
**Test result（T6.3 協調者親跑五軌）:** `npm test` **1737 passed／19 skipped（55 檔，exit 0）**（本機 Windows＝bash＋ps1 雙 leg 滿載；per-CI-leg 基準留 CI 驗）、`npm run typecheck` exit 0、`npm run build` exit 0＋`verify:dist` all checks passed、`npm run test:e2e` **7/7**（含兩新案首輪全綠）、golden 稽核：既有零 diff＋恰 6 個 M1 新檔；工作樹 97 檔待 commit（全 sprint 累積，未 commit 依規矩）
**Files touched:** scripts/e2e-statusline.mjs（T6.1，5→7 案）；T6.2-CHECKLIST.md（新）
**Decisions made by developer（協調者複驗後接受）:**
- **T6.1**：拖曳起點落 `.catalog-item__name`（checkbox 豁免區外的合法起點，查碼佐證）；剪貼簿斷言改 `#output-status` is-empty 翻轉（headless 權限不定）；**Esc 用 CDP `Input.dispatchKeyEvent` 真實注入**（JS dispatchEvent 不觸發原生 dialog cancel——關鍵正確取捨）；播報「已加入」zh 字面比對明標為例外非唯一依據
- **T6.2**：en 抽查表 15 條直取 messages.ts 字典值對照；F 區如實揭露 micro-fix-2 殘餘＋micro-fix-3 回報通道；G 區明注協調者代跑項
**待使用者事項（真機驗收前置）:**
- T6.2-CHECKLIST.md 待使用者親測回報（A–F 區）
- 變體 A/B 圈選（現行 A）；micro-fix-3（行動版欄序 DOM 真搬）去留
**Out-of-scope observations to follow up:** 無——殘留事項已全數記入 checklist 與 BACKLOG 候選
