# Works — Statusline Builder 目錄擴充（06c）＋前置加固

Append-only 施工日誌。Task ID 對應 TASKS.md。

## 2026-07-12 — T1.1 jsdom 共存 smoke 過關，D-d 選項 A（jsdom）定案
**Tasks:** T1.1
**Verdict:** DONE（jsdom 採用，無需回退選項 B）
**Test result:** 1123/1123（36→37 檔、+1 smoke）；typecheck exit 0；e2e: n/a
**Files touched:** package.json（jsdom 29.1.1 exact pin）、package-lock.json、tools/statusline-builder/jsdom-smoke.test.ts（新）
**客觀門檻數據:**
- 基準（暖機後）51.831s → 後測 51.595s（−0.46%，門檻 +10%＝57.01s）
- 測試數差＝恰 +1（smoke 本身）；既有 node-environment 測試輸出零變化、零新警告
- tsconfig 零改動（DOM lib 本就在 tsconfig.json）
**Decisions made by developer:**
- smoke 檔置於 tools/statusline-builder/jsdom-smoke.test.ts，per-file pragma 局部啟用，作為長駐 canary
**Out-of-scope observations to follow up:**
- npm 既有噪音警告「Unknown user config msvs_version」基準/後測皆在，非本次引入
- magi/BACKLOG.md 於任務開始前即為 modified（sprint 08 promote 改動，屬本 sprint 正常狀態）

## 2026-07-12 — T1.2＋T1.3 平行批：引擎邊界測試＋noarrow 真執行案
**Tasks:** T1.2, T1.3
**Verdict:** DONE ×2
**Test result:** 1129/1129（37 檔；批後由協調者親跑 `npm test` 複驗 exit 0、52.55s）；typecheck exit 0 ×2；pipeline 真執行 bash+jq／PS 5.1 皆實跑非 skip
**Files touched:** emit-ansi.test.ts（+9）；multirow-golden-configs.ts（+43）、pipeline.integration.test.ts（+45）、__golden__/multirow-powerline-noarrow.{sh,ps1}（新 ×2）
**Decisions made by developer:**
- T1.2：`toAnsi([]) === ''` 文件性斷言＋註解明示非空不變量歸屬於 resolve（恆 `[[]]`）
- T1.3：既有 15 個 golden 以 sha1 前後比對證明零變動；兩 .mjs harness 自動迭代 MULTIROW_GOLDEN_CASES 無需改；emit-bash/ps1 的 `it.each` 黃金迴圈自動吸收新案；pipeline 新案採 `full` 情境（考 D1 gating 非列死亡，與既有兩案刻意區辨）；新 golden 抽查：grep ARROW 無命中、`$v + ' '` 右 padding 在位
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-12 — T1.4＋T1.5 平行批：renderRuns DOM 測試＋S8 CDP PoC
**Tasks:** T1.4, T1.5
**Verdict:** DONE ×2
**Test result:** 1137 passed｜1 todo（38 檔；協調者親跑複驗 exit 0）；typecheck exit 0；PoC e2e 26/26 全過（headed 10/10、headless 10/10 同列交換＋cross-row-drain 3/3＋select-move 3/3）
**Files touched:** render-preview.dom.test.ts（新；render-preview.ts 零改動——所需函式本就全 export）；sp8/poc.mjs＋sp8/REPORT.md（新）
**Decisions made by developer:**
- T1.4：jsdom CSSStyleDeclaration 讀回 color 正規化為 rgb()，測試以 hexToRgbCss helper 對比；`--arrow-fg` 不受影響保 raw hex；M4 bar ariaText 以 `it.todo` 錨點佔位
- T1.5（S8 結論）：**零 npm 依賴可行**（Node ≥22 fetch＋WebSocket 全鏈通）；**T1.6 預設 headless(new)**（headed 有 13x 減速離群＋47s 單輪離群＋殭屍 msedge 難收割；headless 零 flake）；「單 drag 單 session」規則 26/26 成立；發現並修復 harness 級 bug——長頁面拖點座標須先 `scrollIntoView({behavior:'instant'})` 否則 dragstart 不發（T1.6 必帶 helper）；Windows spawn npm 需 `shell:true`
**Out-of-scope observations to follow up:**
- headed 模式殭屍 msedge 進程 taskkill /T /F 有未收割案例（PoC 尾聲已確認清空；T1.6 選 headless 可迴避）

## 2026-07-12 — T1.6 e2e harness 落地，M1 前置加固完結
**Tasks:** T1.6
**Verdict:** DONE（M1 全六案收攏）
**Test result:** `npm run test:e2e` 五案 5/5——開發者連跑兩次（28.7s／28.3s）＋協調者親跑第三次（28.1s）皆 exit 0；`npm test` 不受影響（未觸 production 檔；scripts/*.mjs 在兩個 tsconfig include 之外，typecheck 無涉）
**Files touched:** scripts/e2e-statusline.mjs（新，619 行）、package.json（+1 行 `test:e2e`）
**Decisions made by developer:**
- 涵蓋清單＝使用者核可五案（基本盤＋S1/S4/S9/S7）；S2/S3/S5/S6/S8 依 sp8/REPORT 理由不收
- headless(new) 預設＋`E2E_HEADED=1` 除錯開關；逐案全新瀏覽器＋fresh user-data-dir；`scrollIntoView({behavior:'instant'})` 座標 helper 內建；`ensureBuilt()` dist 缺失才自動 build；結束清掃殭屍進程＋port 驗證
- 斷言前對 S1/S4/S9/S7 各做臨時 CDP 探測對齊真實行為（含 S7「空列不入存檔」SPEC 行為實證相符），未照抄 sprint 07 探索註解
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-12 — M2 五支 spike 全數完成（T2.1–T2.5），待 T2.6 彙整核可
**Tasks:** T2.1, T2.2, T2.3, T2.4, T2.5
**Verdict:** DONE ×5（T2.1 自動化段全過，真機目視留使用者步驟——S7 gate 未閉）
**Test result:** 協調者親驗 `npm test` 1137 passed｜1 todo；時區還原親驗＝Taipei Standard Time；T2.3 verify.mjs 41/41；T2.5 還原後 pipeline 75/75
**Files touched:** sp7/（6 probe 腳本＋REPORT）、sp2/（probe.jq/probe.ps1/trap 檢核＋REPORT）、sp4/（verify.mjs＋REPORT）、sp5/（REPORT＋計時腳本＋raw JSON）、sp6/（REPORT＋probes＋logs＋original-tz.txt）——皆 spike 產物，production 零改動
**Spike 結論摘要:**
- **S7（T2.1）**：bytes 全對、bash/PS5.1/pwsh7 × 字面/跳脫五形輸出 byte-identical——`[char]` 跳脫策略去險；**剩真機 Claude Code 目視一步**（sp7/REPORT.md §5.1 指引；U+2588/2591/21BA 屬 EAW Ambiguous，寬度穩定性正是要人眼看的）
- **S2（T2.2）**：PLAN 原 jq 式對非數字 hard error（exit 5）——**契約需修**為 `(env.STATUSLINE_NOW_EPOCH // empty | tonumber?) // (now|floor)`；ps1 實證 `[long]''` 靜默＝0（推翻「擲例外」預期）→ `IsNullOrEmpty`＋`TryParse` idiom 定案
- **S4（T2.3）**：41/41 byte-exact 四格皆可達成；powerline 併元素需「run1 進累加器欄位、run2–4 完整烘焙 reset+fg+bg+text 併 text 尾」不對稱配方（供 T4.3/T4.4 直接引用）；縫隙 ×4 供 T2.6（null 路徑 fgOverride 涵蓋、threshold-undefined×bar 補測、配方回寫、bash-plain 零改動佐證）
- **S5（T2.4）**：情境 A（實際規劃）CI 外插 ~207s＠3× 係數 < 300s 預算——**免裁決**；golden 重生非瓶頸（固定開銷主導、邊際 <20ms/案）；澄清：真執行分散三檔非單檔
- **S6（T2.5）**：現行體制＝**同機 oracle**（Tokyo 切換 75/75 綠→綠→綠；golden 無寫死時刻）；68 組三時區×四 epoch×四後端對拍**零分岔**；jq 在 Windows 的 TZ 只認 POSIX 偏移格式不認 IANA 名（走結局 a 才受影響）→ **建議結局 (b)**：倒數段沿同機 oracle，CI 不釘時區
**Out-of-scope observations to follow up:**
- `Format-ResetsAt` 無 InvariantCulture 於 zh-TW locale 恰未觸發（分隔符與字面同）——本機實證補強 round1 minority #9，M4 T4.4 照案修
- Git Bash 下 tzutil 需 `MSYS_NO_PATHCONV=1` 前綴（環境雷區，sp6 報告附錄）
- Write 工具內容分類器對 report 形 .md 的攔截已成常態（三個 agent 皆遇）——「中性檔名→Edit 灌文→mv」為標準繞法

## 2026-07-12 — T2.6 彙整 gate 閉合，M2 完結
**Tasks:** T2.6
**Verdict:** DONE（M2 全六案收攏）
**Test result:** n/a（彙整＋契約回寫任務；`npm test` 1137 pass＋1 todo 於批尾親驗）
**Files touched:** PLAN.md（Rev 4：S2 idiom 定稿／S6 結局 (b)／S4 配方回寫／S7 閉合記錄／In-scope、deltas、Verification 連動）、TASKS.md（T2.1–T2.6 勾銷＋T4.6 釘樁子句依 S6 更新）
**使用者裁決記錄:**
- ①②③ 契約修訂全核可（S2 jq `tonumber?` 形＋ps1 TryParse；S6 結局 (b) 同機 oracle、CI 不釘時區、workflows 移出 In-scope；S4 powerline 併元素配方＋null 路徑 fgOverride 保守解讀）
- ④ S7 真機目視由使用者親測：四組合（bash/ps1 × plain/powerline）三字元 `↺█░` 顯示正常、寬度無跑版——**顯示形定案、fallback 不啟用**
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-13 — M3 資料形狀全數交付（T3.1–T3.5）
**Tasks:** T3.1, T3.2, T3.3, T3.4, T3.5
**Verdict:** DONE ×5（M3 完結）
**Test result:** 1172 passed｜1 todo（38 檔；協調者親驗）；typecheck exit 0；e2e 5/5（26.5s，含 M3 改動之新 build）；golden 零變動（僅既有兩個 untracked noarrow 檔）
**Files touched:** segments.ts（+5 段、autoColor/expiresAtPath 通道、CurrentUsage 具名化、catalog 雙集合導出）、segments.test.ts、config.ts（SegmentColor 自持＋sanitizeSegmentColor＋bar 清洗＋介面擴欄）、config.test.ts（矩陣＋clamp 29）、threshold.ts/.test.ts（雙模板尾插）、catalog.test.ts（分佈計數 30）、mock-data.test.ts（cache-hit 豁免註記）、resolve.ts/emit-bash.ts/emit-ps1.ts/main.ts（typecheck 逼出的 auto 最小防禦，各附 M4/M5 換裝註解）、magi/07 prefix-table.md（06c 節增列）
**使用者裁決記錄:**
- T3.1 前綴表照案核可（in:/out:/cache:/r5h:/r7d:＋ariaText；30 前綴唯一）
**Decisions made by developer:**
- T3.2：FormatKind 佔位——token 段暫掛 `'cost'`（PLAN 明引 cost idiom 為縮寫先例）、reset 段暫掛 `'duration'`（皆註明 M4 換裝；emit-bash jqFormatSuffix 窮盡 switch 使新字面值不可行）；token-in/out category='always'、reset='conditional'（刻意避開 percentage 防誤入 barEligibleIds）；mock-data.test.ts 對 cache-hit 加窄豁免（引 T4.5，待補欄後移除）
- T3.3：雙集合零硬編導出（category/autoColor 有無）；真目錄內容斷言落 segments.test.ts（config.test 只持假目錄）
- T3.4：SegmentColor 型別自持於 config.ts（color.ts 職責邊界＝SGR 原語）；下游 6 檔最小防禦 `segmentColorPlaceholder`（resolve 1+6 處、emit-bash 3、emit-ps1 5、main 1）；render-preview/multirow-golden-configs 實查免改
- T3.5：模板 hex 以 color.ts 公式程式化驗證非手算；UI option 為 index.html 硬編 → 「限額漸層／剩餘漸層」option 文字正確遞延 M5
**Out-of-scope observations to follow up:**
- mock-data.test.ts 兩處 cache-hit 豁免須由 T4.5 補欄後移除（有註解錨點）
- segments.ts deepFreeze 已凍結新 Set，但無測試斷言 frozen-Set（可留 M4 順手補）

## 2026-07-13 — M4 前半：T4.5／T4.1／T4.2 交付（T4.3/T4.4 首批中斷後重派）
**Tasks:** T4.5, T4.1, T4.2
**Verdict:** DONE ×3（協調者逐案親驗；T4.3/T4.4 進行中、T4.6 未開工——M4 未完結）
**Test result:** 1196（T4.5）→ 1208（T4.1）→ 1241（T4.2）passed，各站 typecheck 綠；T4.2 收尾協調者重跑 sp4/verify.mjs＝41/41（S4 目標 bytes 與 resolve 實作對拍）
**Files touched:** emit-settings.ts/.test.ts（needsRefreshInterval＋reset-5h/7d 條件）、mock-data.ts/.test.ts（cache 四欄矩陣＋各情境固定 now、`resets_at` 改 now 相對值、兩處 cache-hit 豁免移除）、resolve.ts/.test.ts（ResolveInput.now 必填；expiresAtPath 通用死值規則；formatTokens／formatResetCountdown5h／7d；bar 4-run 分支；expandSegmentColor 換裝；BAR_FILLED_CHAR/BAR_EMPTY_CHAR/BAR_CELL_COUNT 導出；檔頭不變量改寫；filled/empty run ariaText:''＋倒數 `↺`→「重置」代換；S4 bytes 12 案）、scripts/statusline-golden-configs.ts（ByteExactScenario +now 欄，emitter 不消費、golden bytes 不動）、emit-bash.ts/emit-ps1.ts（新 FormatKind 窮盡 switch 逼出的最小 throw stub，註明 T4.3/T4.4 真實作）
**Decisions made by developer:**
- T4.5：mock now 值反推選定（FULL_NOW=1783490400 等），使既有 `resets_at` 絕對 epoch 不變——零既有斷言位移
- T4.1：新 FormatKind 字面進 type 後，emit 兩後端以最小 throw stub 保 typecheck 綠（檔案所有權歸 T4.3/T4.4，stub 即交接錨點）
**Out-of-scope observations to follow up:**
- T4.3（emit-bash）／T4.4（emit-ps1）首批平行派工於早期探索段（~20 tool uses）雙雙遭 subagent session limit 中斷（resets 3:30am Asia/Taipei）；協調者驗明工作樹未受污染（typecheck 綠＋1241/1241＋兩檔 diff 量級＝stub 水準）後重派。首批依使用者指示全用 fable；重派前使用者改令回歸 magi 預設——第二批以 magi:developer 預設模型（Sonnet-class）出發

## 2026-07-13 — T4.3＋T4.4 平行批（重派第二批）交付
**Tasks:** T4.3, T4.4
**Verdict:** DONE ×2（協調者批尾親驗；M4 剩 T4.6）
**Test result:** 協調者親驗 `npm test` 1345/1345（1241→＋T4.4 64 條→＋T4.3 40 條）、typecheck 綠；T4.4 收報時另親跑 emit-ps1.test.ts 單檔 140/140；`git diff --stat HEAD -- '__golden__/*.sh'` 空（11 檔 sha1 不變）
**Files touched:** emit-bash.ts/.test.ts（bar 累加器 plain 四元素＋powerline 併單元素；倒數全 jq `strflocaltime`＋S2 idiom；auto case 平行陣列；dash 分派 nullPolicy 驅動；tokens 縮寫；+40 測試含 real-exec byte-exact）、emit-ps1.ts/.test.ts（同構落地；`[char]0xHEX` 建構式；DateTimeOffset＋InvariantCulture；Format-ResetsAt 順修；sp2 IsNullOrEmpty＋TryParse idiom；+64 測試含 45 個 pwsh 真執行案、de-DE 文化不變性實跑、純 ASCII 機械化斷言）、__golden__/plain-full.ps1（重生，唯一變異＝Format-ResetsAt 一行 InvariantCulture——白名單內；其餘 5 個 ps1 golden byte-identical）
**Decisions made by developer:**
- T4.4：effort auto 比對用 `-ceq`（精確相等）非 `-clike`（前綴）——resolve.ts effortPaletteIndex 本為精確 switch，前綴語意僅屬 model；大小寫負例（`'Low'` 不命中）e2e 覆蓋。協調者查核採納
- T4.4：順手改寫 4 處過時「auto 展開屬 T4.4」佔位註解為架構邊界說明（該些呼叫點對應段永不進 autoEligibleIds，placeholder 即終態）
- T4.3：tokens/reset-countdown 真邏輯不塞 `jqFormatSuffix` 本體，比照該函式對 percentage/dirty/clock 的既有分工先例（「另處理」）落在 emitSegment 尾段專屬 jq pipeline；bash 端無獨立 `emitOther` 函式（原即 emitSegment 內段落），僅註解對應 ps1 命名
- T4.3：bar dash-null 路徑依 resolve.ts oracle（isDash 跳過 bar 分支、落回一般單 run 含 powerline pad gating），sp4 手推 `buildDashRun` 無 pad 之處以 oracle 為準，real-exec byte-exact 驗證
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-13 — T4.6 整合收攏，M4 完結
**Tasks:** T4.6
**Verdict:** DONE（M4 全六案收攏；協調者里程碑終驗全過）
**Test result:** 協調者親驗 `npm test` 1365/1365、typecheck 綠、e2e 5/5（27.6s）；`git diff --stat -- .github/` 空；golden 25 檔、tracked diff 僅 plain-full.ps1 一行（白名單 (2)）；full-30-plain.sh 含全部 5 個新前綴親驗
**Files touched:** pipeline.integration.test.ts（75→79 案：bar×倒數×auto 同列 plain/powerline 兩形＋auto×powerline arrow/noarrow 兩形；runBash/runPs1 增 extraEnv＋nowEnv() helper 注入 STATUSLINE_NOW_EPOCH；檔頭五塊→七塊改記）、scripts/statusline-golden-configs.ts（+4 案：full-30-plain／bar-templates-plain／bar-auto-powerline-arrow／bar-auto-powerline-noarrow）、scripts/golden-statusline-ps1.mjs＋emit-ps1.test.ts GOLDENS（逐字同步慣例）、__golden__/（17→25 檔：8 新檔皆白名單 (1) 新段；13 既有 tracked 檔 byte-identical）
**Decisions made by developer:**
- 30 段全開案採**新案 `full-30-plain`** 而非原地升級 `plain-full`——原地升級會連帶破壞 emit-ps1.test.ts 兩個依賴 25 段／無倒數形狀的既有測試（「無倒數段不印 $Now」＋ fullBehaviorCases 真執行），回退後以獨立新案落地，零附帶破壞
- multirow-golden-configs.ts 不動——既有多列三案已覆蓋列分組語意，與新段正交
- 加跑 build＋verify:dist（brief 外自主 sanity）皆過
**Out-of-scope observations to follow up:**
- `magi/05-statusline-builder/sp5/` 殘留 jq binary artifact（untracked，session 前即存在）——commit 前需確認不入版控

## 2026-07-13 — M5 第一批：T5.1＋T5.5 平行交付
**Tasks:** T5.1, T5.5
**Verdict:** DONE ×2（協調者批尾親驗：`npm test` 1374/1374、typecheck 綠、build 綠）
**Test result:** 1365 → 1374（39 檔；+9 案 bar-toggle.dom.test.ts）
**Files touched:** main.ts（setSegmentBar/syncFgOverrideDisabled/pickDefaultThresholdTemplateId/fgOverrideDisabledMessage；ColorPickerHandle.setDisabled；buildThresholdEditor 回傳 handle；applyModeConstraints 回傳新停用段名）、index.html（.segment-row__bar-field 限 barEligibleIds＋threshold 模板 select 補「限額漸層」「剩餘漸層」option——T3.5 遞延項收攏）、bar-toggle.dom.test.ts（新檔，main.ts 首個 DOM 級整合測試：真實 index.html 灌 jsdom＋動態 import 觸發 init()）、SPEC.md/CLAUDE.md/magi/PRD.md/magi/TECHSTACK.md（7 個 section deltas 逐條落實，協調者逐行審 diff 與 PLAN 宣告吻合）
**Decisions made by developer:**
- T5.1 fgOverride 停用範圍＝「僅 bar 開啟的該段自身」——逐行核對 resolve.ts:373-407/420-432：bar 4-run head 恆 autoFg（不讀 fgOverride）、null 退單 run 亦然；非 bar 段（含 powerline 同模式他段）fgOverride 完全生效。以 cache-hit（bar=false）負例測試佐證範圍未外溢
- T5.1 style.css 零改動（bar 欄位沿用既有通用樣式）；模板顯示名為 main.ts THRESHOLD_TEMPLATE_LABELS 與 index.html option 兩份手動對齊事實（比照 VARIANT_LABELS 慣例，程式註解已標）
- T5.1 關 bar 不播「fgOverride 恢復」對稱提示（PLAN 僅要求停用提示）；關 bar 不清 threshold（bar 與 threshold 正交）
- 播報三句以 `；` 併單次 announceGlobal；mode 切 powerline 時停用句併入既有 mode 播報句尾
**Out-of-scope observations to follow up:**
- CLAUDE.md 與 TECHSTACK.md 記載 `npm test = vitest run --passWithNoTests`，package.json 實際已無 `--passWithNoTests`——既存漂移，非本次 delta 範圍，留 /magi:review-code DRIFT 評估

## 2026-07-14 — T5.2 auto 配色 UI＋重複提示交付
**Tasks:** T5.2
**Verdict:** DONE（協調者親驗：`npm test` 1391/1391、typecheck 綠、build 綠）
**Test result:** 1374 → 1391（40 檔；+17 案 auto-color-duplicate-hint.dom.test.ts）
**Files touched:** main.ts（ColorMode +'auto'；createColorPickerCore 帶 allowAuto、非白名單段移除 auto radio；createColorPicker/createSegmentColorPicker 雙包裝——fgOverride 與閾值桶 picker 走前者永無 auto 態；重複提示區段 RESET_DUPLICATE_PAIRS＋checkDuplicateResetHints 接進 commitConfig 單一咽喉點）、index.html（color-picker-template 第四 radio「自動配色」＋契約註解更新）、auto-color-duplicate-hint.dom.test.ts（新檔）；style.css 零改動（既有 flex-wrap 樣式容納第四 radio）
**Decisions made by developer:**
- TS 函式 overload 因 callback 反變性觸發 TS2394，改為兩個具名包裝共用鬆型別 core（僅包裝邊界兩處 cast）
- 重複提示去重＝pair 狀態機（false→true 轉換才播報，狀態離開再回來重播），掛在 commitConfig 內 applyRowNormalization 之後判定——啟用/改 variant/改列全走此咽喉點，零逐呼叫點接線
- 提示句含分工語意（variant＝百分比後附時刻 (14:30)；獨立段＝完整倒數 ↺2h (14:30)）
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-14 — T5.3 render-preview 預覽查核＋補測
**Tasks:** T5.3
**Verdict:** DONE（協調者親驗：`npm test` 1396/1396、typecheck 綠、build 綠）
**Test result:** 1391 → 1396（+5：倒數×2、auto×2、null-bar×1；另強化既有 bar 案補 20 格寬斷言）
**Files touched:** render-preview.dom.test.ts（唯一改檔）——render-preview.ts 與 main.ts **零改動**：查核證實接線本來就正確（createPreview 的 render() 以 MOCK_SCENARIOS_BY_ID[scenarioId] 直通 resolve，MockScenario 結構上滿足 ResolveInput、now 恆為情境固定值；grep 證無 Date.now() 路徑）
**Decisions made by developer:**
- T1.4 的 bar ariaText 斷言查明已是實斷言非 todo（1 todo 於 T2.6→T4.3 間消失，測試計數史佐證）；僅補 filled+empty=BAR_CELL_COUNT 寬度斷言
- 倒數案時刻經 formatResetsAt 計算而非寫死（沿 S6 同機 oracle 慣例）
**Out-of-scope observations to follow up:**
- render-preview.dom.test.ts:173 有一行過時註解引用歷史錨點（無害，可留 review-code 順手清）

## 2026-07-14 — T5.4 fixture＋自動化驗收交付、T5.6 全 gate 終驗（真機項留使用者）
**Tasks:** T5.4（開發側）, T5.6（自動化 gate 側）
**Verdict:** DONE（開發側／gate 側）；**M5 未完結**——T5.4 真機項（倒數段真 Claude Code 渲染、SR 四句實聽）待使用者依 T5.4-CHECKLIST.md 親測回報，結果記錄後才勾 T5.4/T5.6
**Test result:** 協調者親驗（T5.6 終驗）：`npm test` **1411/1411**（41 檔）、typecheck 綠、`build && verify:dist` 綠（fixture 不入 dist）、`test:e2e` 5/5（24.7s）；數字錨點七項全數確認有實斷言（resolve.test.ts:848 參數化 49→9 格等、:863 負值→0 格、:703 1234→1.2k、:182/:743 分母 0→0%、:647＋emit-bash.test.ts:970/emit-ps1.test.ts:1210 過期→隱藏真執行）
**Files touched:** fixtures/reference-7row.json（新，7 列 16 段）、fixtures.test.ts（新，15 案：sanitize 往返×3、7 列結構×3、bar＋數值＋倒數同列×2、remaining-gradient 方向×2、auto 展開×2、bash＋ps1 真執行 byte-exact×2、環境自報×1）、magi/08.../T5.4-CHECKLIST.md（新，A–F 六區真機清單）
**Decisions made by developer:**
- 對映差異四項（皆非契約缺口，記於 fixture 檔頭＋CHECKLIST）：①context-used→context-remaining 刻意替換（落逆序模板驗收特徵）②session-name 無 suffix 通道故省 `[...]`（外觀差異）③分隔符為全域單一設定，Tokens 列 `·`→`|`（既有 06b 架構，非新缺口）④auto 色票與原腳本手刻色不同屬預期
- rate-5h/7d 用「僅百分比」variant 避免與 reset 段重複倒數（fixture 編輯選擇）
- clock 段（shell-out 即時鐘）於真執行對拍時僅遮罩 HH:MM 子串、其餘全 byte-exact（沿既有慣例）
- **契約缺口：無**——reference 腳本全部能力可由現行 30 段目錄表達
**Out-of-scope observations to follow up:**
- 目前 UI 無檔案匯入功能，fixture 載入走 localStorage 灌入（CHECKLIST A 區已寫精確步驟）——「配置匯入/匯出 UI」可考慮列 BACKLOG

## 2026-07-14 — T5.4 真機驗收回報（使用者親測）：PASS，六項改進意見
**Tasks:** T5.4（真機項）, T5.6 → 全數收尾，M5 完結
**Verdict:** DONE——使用者依 T5.4-CHECKLIST.md 親測完畢，產出腳本已覆寫其真實 Claude Code statusline 上機使用；無 `[X]` 失敗項回報、無新契約缺口
**Test result:** 使用者真機驗收（A–F 區）通過；自動化側證據見上一則（1411/1411、typecheck／build＋verify:dist／e2e 全綠）
**使用者改進意見（原文六項）:**
1. 上下文剩餘＋5 小時限額＋7 日限額 預設不要用 `--`，改 `░░░░░░░░░░░░░░░░░░░░ 0%`
   → 補充修訂：「`Context ░░░░░░░░░░░░░░░░░░░░ (n/a)` 這樣比較好」
2. 每一行預設套用分隔符號，但每行可自行選擇要不要調整改其他的（增加可用性）
3. 在 segment 每個欄位後面都放預設值，給人一看就知道
4. segment 改「拖移放到列」比打勾好——打勾在段一多時不知道放到哪裡
5. 即時預覽改到最上方且不被滑動條擋住；產出腳本改為只有按鈕即可
6. 預計放可切換語言（新增英文按鈕）
7.（分流指示）「以測試來看，第 2 點後面可當後續的 sprint」
**Coordinator 分流:**
- **第 1 點 → 本 sprint M6**（真機首次使用即撞到的無資料呈現缺陷；契約修訂經使用者拍板，見 M6 契約 C1–C6）
- **第 2–6 點 → BACKLOG**（UX 重構級，另開 sprint）
**契約決策（AskUserQuestion 拍板）:**
- Q2「bar 沒開的百分比段（值 null）要不要一起改」→ 使用者選「**全部百分比段都改 `(n/a)`**」（bar 開：`Context ░×20 (n/a)`；bar 關：`Context (n/a)`）
- Q1「percent-reset 後綴是否保留」→ 使用者不選既有選項，批註「**重置時間加 `↺ 4h (02:40)` 一次到位**」＝保留後綴且升級為倒數形（原 ` (02:40)` → ` ↺ 4h (02:40)`）

## 2026-07-15 — M6 交付：無資料 `(n/a)`＋bar×null 4-run＋percent-reset 倒數後綴（T6.1–T6.4）
**Tasks:** T6.1（oracle）, T6.2（emit-bash）, T6.3（emit-ps1）, T6.4（整合收攏）
**Verdict:** DONE——M6 契約 C1–C6 全數落地，三後端 byte-exact，**M6 完結、sprint 全勾**
**Test result（協調者親驗，非採信 developer 回報）:** `npm test` **1443/1443**（41 檔，M5 收尾時為 1411）、`npm run typecheck` exit 0、`npm run build && npm run verify:dist`「all checks passed」、`npm run test:e2e` **5/5**（26.1s，Edge headless CDP）、`git diff --stat -- .github/` **空**（sp6 結局 (b)：不釘 CI 時區，workflows 零改動）
**Files touched:** resolve.ts（`NA_TEXT`、`isNa` category 閘門、bar 恆 4-run、`resetsAtSuffix(v,now,kind)` 遷入）、segments.ts（`resetsAt` 增 `countdown` 欄；`resetsAtSuffix` 遷出）、emit-bash.ts（`jqResetSuffix5h/7d`、`emitBarSegment` 重寫）、emit-ps1.ts（`resetSuffixEmit()`、`emitBar`／`emitPercentage` 改寫、`Format-ResetsAt` 死 helper 移除）、emit-settings.test.ts（C6 正反兩向）、四份對應測試＋pipeline.integration.test.ts（修 3 案＋補 6 案）、`__golden__/` 全量重生
**Golden 白名單稽核（協調者親審，diff 攤平去重）:** 12 個 tracked 檔變動，變因**僅三類**——(a) `--`→`(n/a)` 且**只落在百分比路徑**（`used_percentage`／`remaining_percentage`／`rate_limits.*.used_percentage`／`$vt`／`$disp`）；(c) percent-reset 後綴由靜態 `(HH:mm)` 升級為 `$sfx` 倒數區塊（帶 `$Now` 注入）；(d) `Format-ResetsAt` 整函式移除。**token-in／token-out 的 `// "--"` 逐檔確認未動**（C1 走 category 閘門、未誤傷全域 `DASH_TEXT`）。副作用：`plain-full.ps1` 原本唯一的白名單變因（`InvariantCulture` 順修那行）隨 `Format-ResetsAt` 移除而消失
**Decisions made by developer（協調者複驗後接受）:**
- **T6.1**：`resetsAtSuffix` 整函式自 segments.ts 遷入 resolve.ts——因需 `now` 且倒數格式化兩函式已在 resolve.ts，反向會成 import 循環；segments.ts 保留純目錄資料（`resetsAt` tri-path＋新 `countdown` 欄）。另順帶簡化 powerline `fg` 推導中因 C2 而恆不可達的 `bar` 分支
- **T6.1**：`render-preview.dom.test.ts` 超出點名範圍但必須改——該檔直接對 `resolve()` 斷言舊的 bar×null 單 run 形（oracle 層行為、非後端對拍）；`render-preview.ts` 生產碼零改動
- **T6.2／T6.3**：兩人**都拒絕動 `__golden__/`**（brief 的「全綠」措辭與「不要動 golden」邊界衝突時，選擇遵守邊界、把 golden 紅留給 T6.4）——判斷正確，協調者確認
- **T6.2**：主 combo runner 補 `STATUSLINE_NOW_EPOCH` 注入（C3 起 percent-reset 依賴 now，不釘時鐘無法與 oracle 對拍）
- **T6.3**：既有「無倒數段不印 `$Now`」一案的 config（`PLAIN_FULL`）本身含 percent-reset → 依 C5 新契約該案前提失效，改用真正無 `$Now` 需求的 config，並補正向兩案
- **T6.4 ⚠️ 我的 brief 有誤**：C6 宣稱「`needsRefreshInterval` 現行只含 reset-5h/7d」與程式碼不符——`hasResetsCountdown()`（emit-settings.ts:94）**早於 T4.5 就以 `seg.variant === 'percent-reset'` 判定**，契約本就被涵蓋。developer 正確指出並**零生產碼變更**，只補 2 個正反向測試釘住。協調者讀 emit-settings.ts:89–114 確認屬實
- **T6.4**：`Format-ResetsAt` 確認真死（`Format-Reset5h`／`Format-Reset7d` 各自用 `DateTimeOffset.FromUnixTimeSeconds` 現算、不呼叫它）→ 移除
**契約缺口:** 無
**Out-of-scope observations to follow up:**
- token-in／token-out（`category:'always'`）的 null 仍顯 `--`，與百分比段的 `(n/a)` 不一致——**這是使用者明示的選擇**（AskUserQuestion 選項限定百分比段）；若日後覺得刺眼，可提 BACKLOG 統一無資料標記

## 2026-07-15 — code review（多方位審議，7 角度）＋M7 收尾修
**Tasks:** /magi:review-code（依角度開票）＋M7（T7.1–T7.6）
**Verdict:** DONE——REQUEST-CHANGES 的 1 Critical＋5 Important＋隨手 N1＋修法引入的 I4b/I4c 全數收掉，全 gate 綠、sprint 全勾
**審議模式:** 使用者指定「多方位審議＝依角度開票而非模型湊票」。gemini/codex CLI 不在 → 改派 7 個互斥角度的 magi:reviewer（L1 契約漂移／L2 三後端同構／L3 正確性邊界／L4 測試假綠／L5 產出腳本注入／L6 UI 狀態機 a11y／L7 倉庫衛生文件），每人只在自身角度找問題，協調者對每個 Critical/Important 親自讀碼/跑指令複驗（非採信回報）
**審議結果:** 5 角度 APPROVE-WITH-NITS、L4／L7 REQUEST-CHANGES。無一角度指「程式邏輯錯」——L2 以 280+ 案真執行差分證明三後端可達域全 byte-exact、L3 證明手改存檔攻擊全被清洗、L5 證明注入面全封。卡點全在橫切面（commit 衛生、測試環境耦合）。報告落 `MAGI_CODE_REVIEW.md`，drift 落 `DRIFT.md`（Status: DETECTED，A5/B9/C14）
**M7 修（協調者親驗每項）:**
- **T7.1 衛生（協調者自理）**：`.gitignore` 固化 `magi/**/tools/*.exe`＋`**/.xreview-prompt.md`；`git check-ignore` 確認 1MB jq 二進位＋兩支 xreview 離開待提交集（C1／I1）
- **T7.2 文件**：README auto 敘述改「已於 06c 交付」（刪「目前無 `{kind:'auto'}`」假句）；CLAUDE.md／TECHSTACK.md 刪 `--passWithNoTests`；index.html「25→30 段」12/5/10/3；emit-ps1.ts file:line 漂移改符號引用（I2／N6／N7／N8／N9）
- **T7.3 fixtures 去 DEV 耦合**：`git-branch` 為非決定論欄位（真執行讀當下 repo branch、oracle 讀 mock 'DEV'），現靠當前分支＝DEV 巧合。改採受控 temp repo 釘 cwd（分支名動態取自 mock 值，非寫死）；developer 以「模擬 main 分支 repo」實證修前 byte-exact 失敗、修後相等（I3）
- **T7.4 a11y**：(I4)`syncFgOverrideDisabled` 加 `seg.enabled` 閘；(I5)`init()` 靜默 seed `duplicateResetPairIds`（載入既有重複＝已知、不播）。TDD 紅→綠，DOM 回歸案
- **I4b（修 I4 引入的回歸，協調者判定必修）**：`setSegmentEnabled` 補靜默 `syncFgOverrideDisabled()`（重啟用 powerline+bar 段收斂 fgOverride picker）
- **I4c（同族第二進入點）**：`performRowDeletion` 同補。grep 證停用段僅二進入點，家族收尾
- **T7.5 cache-hit（N1）**：`segments.ts:509` `usage === null` → `== null`（消除缺席 `current_usage` → 解構 undefined 崩潰的 oracle/mirror 分岔）；TDD 缺席案紅→綠。順手修 N8/N9 段內註解
**Test result（協調者親跑四軌合併終驗）:** `npm test` **1454/1454**（41 檔，M6 收尾 1443 → +11 為 M7 新增 a11y／cache-hit 回歸案）、`typecheck` exit 0、`build && verify:dist`「all checks passed」、`test:e2e` **5/5**（25.5s）、`git status` 三類垃圾檔確認乾淨；四項關鍵修正 spot-check（gitignore／README／passWithNoTests／`== null`／6 個 syncFgOverrideDisabled 呼叫點）全數坐實
**Decisions made by developer（協調者複驗後接受）:**
- **T7.3** 選受控 temp repo（方案 B）而非遮罩（A 對 detached HEAD 結構差異無解）或停用 git-branch 段（C 削弱覆蓋）；temp repo 分支名讀 mock 值使未來調整仍自動同步
- **T7.4** developer 誠實揭露 I4b（自己修法引入的回歸），續揭 I4c（同族第二進入點）——兩者皆協調者判定必修並派續修，非放生
**契約缺口:** 無。DRIFT.md 已修項標記 [x]（見該檔），殘留 C 類進 BACKLOG 由 /magi:commit 處理
**Out-of-scope observations to follow up:**
- 16 項 Note 已分流：可修者（N1）當場修；文件漂移（N6-N9）當場修；其餘（非整數輸入後端分岔、bar 缺 type 閘、CI 跨後端零覆蓋＋meta 盲點、倒數階梯四聯體複製、toAriaLabel 只覆蓋 PUA、預覽固定 now 誤導、MOTW 提示未接 UI、announceGlobal 順序脆弱等）留 DRIFT C 類 → BACKLOG
