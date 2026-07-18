# Works — 06 血緣衛生尾批（sprint 12）

> Append-only 施工日誌。Source: TICKET.md  •  Sprint: magi/12-hygiene-tail/

## 2026-07-18 — M1 程式面清理（雙 lane 平行）
**Tasks:** T1.1（lane A）、T1.2（lane B）
**Verdict:** DONE
**Test result:** lane A 目標檔 17/17（14 既有＋3 新 clipboard spy）；lane B 目標三檔 284/284；協調者親跑全套 `npm test` **1824/1824 exit 0**＋`npm run typecheck` 三鏈 exit 0。全套首兩輪各有 1 案 timeout 紅（見觀察欄），隔離與末輪全套皆綠。
**Files touched:** main.ts（+18/−few：copy-ps1 呼叫端前置 `UTF8_BOM`、BOM 規則註解更新）、output-dialog.dom.test.ts（+73：spy 逐案安裝／還原 descriptor）、emit-ps1.ts（+19：宣告 :1128／:1172 與累加單一點 `pushLines` :543-559 補 `powerlineArrow` 門檻）、emit-ps1.test.ts（+15：負向鎖 ×2）、`__golden__/` 3 檔純刪除（powerline-noarrow −7／bar-auto-powerline-noarrow −4／multirow-powerline-noarrow −10）
**Decisions made by developer:**
- lane A 採 TICKET 傾向方案 (a)：BOM 只在 `copy-ps1` 呼叫端組 payload（`UTF8_BOM + lastOutputs.ps1`），`copyOutput` 保持通用；bash／settings 通道斷言無 BOM；測試中 BOM 一律 `'﻿'` escape 避免原始碼嵌不可見字元。未觸發回退方案 (b)。
- lane B 查證累加為單一點（`pushLines`，所有段 emit 共用，經 `state.rowVars.bgt`）——單列／多列一次收斂；`powerline-threshold` golden 經 `scripts/golden-statusline-ps1.mjs` 查證 arrow 預設為 true → 零 diff 符合預期；arrow=true 案與全部 .sh 零 diff 實證。
- 協調者複核：黃金檔 diff 抽驗純刪除、僅 $BgT 行；`joinPowerline` 讀取面零觸碰。
**Out-of-scope observations to follow up:**
- `i18n-dom.dom.test.ts:245`（語言切換再次 click 案）於全套並行負載下踩 5s 預設 timeout（四輪全套中兩紅兩綠、單檔隔離 14s 內 19/19 穩綠）——非本批改動所致之既有脆性；候選去處＝BACKLOG「09 測試網加固批」（該案 testTimeout 放寬或 boot 減重）。

## 2026-07-18 — M2 失效引用清理
**Tasks:** T2.1
**Verdict:** DONE
**Test result:** 開發者親跑全套 1824/1824 TEST_EXIT=0＋typecheck 三鏈 exit 0＋指定 i18n dom 測試 23/23；協調者複核：`git grep '\.t[0-9]*-report' -- tools/` **0 筆**（exit 1）＋全套 `npm test` exit 0 再驗。
**Files touched:** emit-bash.ts／emit-ps1.ts（檔頭 JSDoc）、index.html（HTML 註解 ×2）、main.ts（註解 ×5）、render-preview.ts、segment-defaults.ts——純註解／文案，`__golden__/` 零新增 diff（工作樹既有 3 檔差異為 T1.2 產物，逐 hunk 核對確認）。
**Decisions made by developer:**
- 9 處 dotfile 報告引用逐處擇 (a) 內嵌語意或 (b) 改指已簽入落點（`magi/05-statusline-builder/WORKS.md` T2.3 節／`render-preview.ts` 型別定義／當地內嵌註解），語意保留、死指標歸零。
- 「main.ts:426 既有語意過時」定位定案：區間逐一核對後，實際過時者＝T5.6 JSDoc 內「同 main.ts 既有 VARIANT_LABELS 缺表慣例」（VARIANT_LABELS 已移居 messages.ts）——不在協調者候選清單內但落在指定搜尋區間，已改述；其餘「既有」候選核對屬實不動。
**Out-of-scope observations to follow up:**
- `emit-ps1.ts:14`／`:22` 尚有 `.t15`／`.t23`（無 `-report` 後綴）字面、main.ts 有 `T5.5-report`（非 dotfile 格式）——不在本任務 done 準則 regex 內，依不擴大範圍原則未動；屬同族殘留可日後順手清。

## 2026-07-18 — M3 T3.1 盤點（協調者親執行，read-only 零改動）
**Tasks:** T3.1
**Verdict:** DONE（⛔ HALT：待使用者裁決後續 T3.2）
**Test result:** n/a（唯讀盤點）；佐證跑動：`npm run build` exit 0＋`node scripts/verify-dist.mjs` all checks passed。
**Files touched:** （無——調查性任務由協調者以唯讀指令親執行，未派開發者，於此揭露）
**盤點結論：**
- **(a) `_probe`**：vite `discoverToolEntries()` 掃所有 `tools/<slug>/index.html` → `_probe` 現況**建進 dist 公開部署**（新鮮 build 的 `dist/tools/_probe` 實證）；`verify-dist-checks.mjs` 對 _probe 零引用（排除不破門）；`tools/_probe/` 現有 index.html＋main.ts、缺 style.css stub。→ 唯一待裁決案。
- **(b) `forailook/`**：`.gitignore:10` 已收錄且目錄實體已不存在——**已自然消解，無事可做**。
- **(c) magi/05 遺留**：唯一殘留 `sp5/` 且已被 ignore（`git status --ignored` 實證 `!!`）；sp5/ 為本機 win32 測試綁定 jq（`detectRealExec` 複製來源）之**承重目錄**——建議原狀保留，不清理。

## 2026-07-18 — M3 T3.2 依裁決執行＋M4 收口 gate
**Tasks:** T3.2、T4.1
**Verdict:** DONE（sprint 12 實作全數完成）
**Test result:** 開發者：verify-dist-checks 43/43（新 check 紅綠雙證：check 短路 → 預期紅；還原 → 綠）＋全套 1827/1827＋typecheck 0＋build 0；協調者親跑複核：`npm test` **1827/1827 exit 0**＋typecheck 三鏈 0＋`npm run build` 0＋`node scripts/verify-dist.mjs` all checks passed＋新鮮 dist 實證無 `_probe`。
**Files touched:** vite.config.ts（+3：`_` 前綴跳過＋裁決註解）、tools/_probe/main.ts（+1 import）、tools/_probe/style.css（新檔 stub）、scripts/verify-dist-checks.mjs（+28：`checkNoUnderscoreToolDirs` 掛 `checkToolPageSkeleton` 後）、scripts/verify-dist-checks.test.ts（+23）、SPEC.md（:32 一句連動「僅 repo 內範本、不建進 dist」）
**Decisions made by developer:**
- 使用者裁決（2026-07-18）＝`_probe` 排除出 dist；`assertAvailableToolsHaveEntries` 不受影響佐證：`_probe` 從不在 `src/tools.ts` tools 陣列。
- 新 check 為通用規則（任何 `_` 前綴目錄），不寫死 `_probe` 字面。
- forailook/／magi/05 兩案依盤點零動作。
**M4 收口對帳（TICKET Verification 五條，協調者親驗）：**
1. `npm test` 全綠＋typecheck 三鏈 ✅（1827/1827 exit 0；三 tsc 鏈 0）
2. copy 首字元斷言 ✅（output-dialog.dom.test.ts 3 條 spy：ps1 帶 U+FEFF、bash／settings 不帶）
3. dist 內容斷言 ✅（`checkNoUnderscoreToolDirs` 紅綠雙證＋新鮮 build dist/tools 四目錄無 _probe＋verify-dist 全過）
4. 黃金檔 diff 人眼終審 ✅（恰 3 個 noarrow .ps1、21 行純刪除、僅 $BgT 行；ps1 執行 vs oracle byte-exact gate 綠）
5. 失效引用歸零＋untracked 符合裁決 ✅（`git grep '\.t[0-9]*-report' -- tools/` 0 筆；forailook 已消解、sp5 依裁保留）
**Out-of-scope observations to follow up:**
- 新檔 CRLF 警告（gitattributes `* text=auto` 下屬既知良性正規化訊息，sprint 10 已證零 churn 體制）。

## 2026-07-19 — review 收尾批（使用者裁決：回退 (b)＋修採納項全批）
**Tasks:** MAGI review 🟡-1／🟡-2／🟢-3~7 收尾（七件）
**Verdict:** DONE
**Test result:** 開發者：範圍四檔 263/263＋全套 1829/1829＋typecheck 0；協調者親跑複核：全套 **1829/1829 exit 0**（較收尾前 +2＝reject 案＋pin 案）；golden 維持恰 3 檔 21 刪零新增；BOM 回退實證（main.ts 下載 `UTF8_BOM + ps1` 保留、copy 素文）。
**Files touched:** main.ts（copy-ps1 回退素文＋BOM 註解改寫）、output-dialog.dom.test.ts（三案翻轉為「三通道皆無 BOM」＋新 reject 案）、i18n-dom.dom.test.ts（flake 案顯式 20s timeout）、emit-ps1.ts＋emit-ps1.test.ts（T1.2 新註解硬行號→符號指涉）、verify-dist-checks.test.ts（`_x` 檔案形 pin 案）、vite.config.ts（dev 語意一句）
**Decisions made by developer:**
- **T1.1 方案 (a) 回退為 (b)（TICKET 預授權回退閘，使用者 2026-07-19 裁決）**：協調者 PS 5.1 真機探針證實雙 BOM 使首 token 黏合（`?#` CommandNotFound、每渲染噴錯），且與產出腳本自帶「請以 UTF-8（含 BOM）儲存」指引互斥——修復前遵循指引的主流程反而完全正確。回退後行為矩陣：下載帶 BOM ✓／貼上依指引存含 BOM＝單一 BOM ✓／存無 BOM 之非 ASCII 角落靠腳本頭指引防線（原況）。
- Edit 工具大段中英混排＋Unicode 轉義一次性寫入曾出現字面轉義異常（單一 it() 區塊一次），開發者以位元組層級核對修正並全檔掃描確認無殘留——工具行為備忘：日後同型編輯拆小塊較穩。
**Out-of-scope observations to follow up:**
- （無新增；BACKLOG 已由協調者補「同族 `.t<n>` 短形死指標」追蹤行。）
