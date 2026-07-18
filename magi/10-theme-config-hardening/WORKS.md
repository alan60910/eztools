# Works — 06 殘項批（sprint 10）

> Append-only 施工日誌。Source: TASKS.md  •  Sprint: magi/10-theme-config-hardening/

## 2026-07-18 — M3 config 遷移階梯（wave 1，與 M1 平行派工）
**Tasks:** T3.1, T3.2, T3.3
**Verdict:** DONE
**Test result:** 1761/1762（config.test.ts＋fixtures.test.ts 範圍 109/109 全綠；唯一紅為既有失敗，見下）；typecheck（tsconfig.json leg）exit 0；e2e n/a
**Files touched:** tools/statusline-builder/config.ts（+71/−15 內）、config.test.ts（+97）、fixtures.test.ts（+23）；`reference-7row.json` 未動（依規格凍結）
**Decisions made by developer:**
- T3.1 凍結測試（v1 顯式夾帶 powerlineArrow 兩向案）於重構**前**先跑、對現行實作即綠後才動 config.ts——依 brief 的 red-green 順序要求執行並留證。
- `MIGRATION_STEPS` 為 `Record<number, (raw)=>raw>`＋while；version 非 number 或查無步進 → `defaultConfig(catalog)`（不對 undefined 求值）；收尾僅走 `sanitizeConfigCore`（rowSeparators 不遷移契約原樣保留）；另補 version 1.5 中繼版本防禦案。
- canary (a) 沿用簽入之 `reference-7row.json`＋整份 deepEqual＋「bump CONFIG_VERSION 勿重生本檔」明文註記；(b) 合成最小 v2（涵蓋 auto／bar／多列 row／rowSeparators）預期輸出凍結為字面值 `toEqual`。
**Out-of-scope observations to follow up:**
- **既有測試失敗（協調者已親自複現確認 pre-existing）**：`tools/statusline-builder/i18n-meta-scan.dom.test.ts:71` 紅——offenders 為 main.ts 內含引號之 zh-TW 註解行（T5.14／I5 等 09 後期註解），撞上 strip 的既知窄盲點（BACKLOG「sprint 09 測試網加固批」明載「字串內 `//`、同行 throw」盲點家族）。developer 以 `git stash` round-trip 驗證 base commit（5147cc1）同樣失敗；協調者單檔重跑複現（1 failed | 3 passed）。**與本 sprint 變更無關，但將擋 T4.3「npm test 全綠」總 gate——留待使用者裁決**（候選：併本 sprint 小修 strip／改寫 main.ts 該批註解措辭／記錄豁免留給加固批）。
- developer 於平行派工期間使用 `git stash`/`pop` 驗證 pre-existing——結果無損（M1 developer 的工作樹變更 round-trip 後原樣），但此手法與平行 developer 有踩踏風險，後續 brief 應明文禁止 stash、改用 `git worktree` 或唯讀比對。

## 2026-07-18 — M1 verify-dist 可測化（wave 1，與 M3 平行派工）
**Tasks:** T1.1, T1.2, T1.3, T1.4
**Verdict:** DONE
**Test result:** 1800/1801（新 suite 39/39；唯一紅＝既有 i18n-meta-scan EOL bug，見下）；typecheck 三 tsconfig 鏈 exit 0；`npm run build && npm run verify:dist` 綠。協調者親跑複核同數。
**Files touched:** scripts/verify-dist-checks.mjs（新，474 行）、scripts/verify-dist-checks.test.ts（新，486 行/39 案）、scripts/verify-dist.mjs（292→76 行薄殼）、tsconfig.scripts.json（新）、package.json（僅 typecheck 一行加第三鏈）
**Decisions made by developer:**
- W0 三驗證全過：guard 用 `pathToFileURL(process.argv[1]).href` 比對；typecheck 落點採「第三 tsconfig（checkJs＋allowJs＋types:["node"]）」方案並做過負驗證（注入型錯 → TS2339 紅 → 移除復綠）；byte 凍結以「真 dist 全過」＋「八類同時失敗的變異 dist」雙情境對舊版 stdout/stderr diff 均為零、exit code 相符。
- 發現 `verify-dist.mjs` 的 shebang 在 Vite/Vitest esbuild 管線下不可 import（plain node 可）——CLI 殼煙霧案改走子行程實跑（正合 PLAN D3-b「至多一條端到端煙霧案」預留），checks 模組本身 39 案直接 import 零副作用。
- 白名單／normalizeScriptBody／extractInlineScripts 移至 checks 模組並 export；T1.4 白名單↔repo 根 index.html 漂移案落 `verify-dist-checks.test.ts:423`（非空洞：斷言至少抽到 1 支 script）。
- T1.3 護欄案含「`</script>` 截斷仍紅」與「巢狀註解記號塌縮至首個 `-->`」釘死案，註解明記鏡射瀏覽器 raw-text 解析行為。
**Out-of-scope observations to follow up:**
- **既有紅測根因確定（standalone repro 驗證）**：`i18n-meta-scan.dom.test.ts` 的 `stripNonRuntime` 以 `split('\n')` 切行後用 `/\/\/.*$/` 剝註解——本機 `core.autocrlf=true` 使 `main.ts` 工作樹為 CRLF，殘尾 `\r` 令 `$` 錨定失效、行註解剝除全面 no-op，342 條合法 `//` 註解被誤判為未剝 CJK。**EOL 敏感 bug：LF checkout（CI ubuntu）綠、CRLF checkout（Windows 本機）紅**——與本 sprint W4 的 EOL 議題同族。最小修復＝該測試改 `split(/\r?\n/)`（一行），屬 09 測試網範疇，待使用者裁決是否併本 sprint 收。

## 2026-07-18 — M2 主題即時同步（wave 2，gate 於 M1 後派工）
**Tasks:** T2.1, T2.2, T2.3, T2.4
**Verdict:** DONE
**Test result:** 1814/1815（theme.test.ts 25/25＝既有 17＋新 8；theme-inline.test.ts 新 6/6；verify-dist-checks 39/39 含白名單漂移案；唯一紅＝既有 i18n-meta-scan EOL bug）；typecheck 三鏈綠；`npm run build && npm run verify:dist` 綠。協調者親跑複核同數。
**Files touched:** src/theme.ts（+51）、src/theme.test.ts（+190/−）、src/theme-inline.test.ts（新）、index.html（+56/−）、scripts/verify-dist-checks.mjs（僅 ENTRY_ALLOWED_INLINE_SCRIPTS 字串）、五個 main.ts 接線（各 +4/−）
**Decisions made by developer:**
- TDD 紅綠序全程留證：harness 先升級（17/17 保綠）→ 對未存在的 `initThemeSync` 先寫測試（8 紅）→ 實作轉綠→補滿矩陣；inline 測試同法（先對舊 index.html 跑出 4/6 紅再改）。
- `initThemeSync` 刻意不做初始同步（僅接外部事件監聽），呼叫慣例恆為 `initThemeToggle` 緊接 `initThemeSync`——五個 main.ts 與 inline script 同構。
- index.html 為 CRLF——developer 以 Node script 改寫確保 byte 級 CRLF 保留並驗證無混入 LF 行（呼應本 repo 已知 EOL 敏感面）。
- inline script 增量量化（Q3 收數）：43→65 行（+22）、raw 1400→2267 bytes（+867）、gzip 485→594（+109）——遠低於顧慮門檻，Q3 關單。
**Out-of-scope observations to follow up:**
- checks 模組 `ENTRY_ALLOWED_INLINE_SCRIPTS` 上方英文註解未跟進新監聽敘述（brief 明文僅准改字串內容）——M4 文件輪或 commit 前順手補。
- brief 誤記 theme.test.ts 既有案數為 21（實為 17）——協調者筆誤，不影響交付。

## 2026-07-18 — M4 repo 衛生＋文件落地（W4＋W5＋Spec deltas＋既有紅測修＋總 gate）
**Tasks:** T4.1, T4.2, T4.3
**Verdict:** DONE（自動化面）；手動真機 smoke／SR 播報 checklist 未執行，見下
**Test result:** 1815/1815 全綠、exit 0（既有紅測 `i18n-meta-scan.dom.test.ts` 已隨 T4.3 CRLF 一行修收復，單檔重跑 4/4）；`npm run typecheck` exit 0（三 tsconfig 鏈）；`npm run build && npm run verify:dist` 末行 `verify:dist: all checks passed`
**Files touched:**
- `.gitattributes`（改寫：檔頭 `* text=auto` 全域基線＋既有 `*.sh`／golden `-text` 兩條保留＋新增 `*.jsonl eol=lf`＋五條二進位副檔名 `binary` 規則，逐條 zh-TW 註解）
- `README.md`（statusline-builder 注意事項段末補 powerline 關箭頭尾隨空格一句）
- `SPEC.md`（Components 主題模組 bullet 補 matchMedia／storage 雙監聽敘述；Conventions 兩處——範本要點例外句＋`initThemeSync` 接線點、新增 repo 衛生 bullet；Status 段末尾新增 sprint 10 交付段）
- `CLAUDE.md`（Conventions 補 inline script／`src/theme.ts` 對齊約束句）
- `magi/TECHSTACK.md`（:12-13 鏡射句同步補「含 toggle 監聽及其同步機制」）
- `scripts/verify-dist-checks.mjs`（僅 `ENTRY_ALLOWED_INLINE_SCRIPTS` 上方英文註解補一句，未動邏輯／字串）
- `tools/statusline-builder/i18n-meta-scan.dom.test.ts`（`stripNonRuntime` 的 `split('\n')` 改 `split(/\r?\n/)`＋一句 zh-TW 註解，僅此一處）
- `magi/10-theme-config-hardening/TASKS.md`（M4 三項打勾）
**Decisions made by developer:**
- T4.1 renormalize 實證嚴格照 brief 四步序執行（`git add -A` 快照 A → `git add --renormalize .` 快照 B → 三項斷言 → `git reset` mixed 還原）：快照 A／B `git diff --cached --stat` 尾 5 行逐 byte 相同；`git diff --cached --stat -- tools/statusline-builder/__golden__/` 為空；`git ls-files --eol | grep -c 'i/crlf'` = 0；`git reset` 後 `git status --short` 與步驟前一致（僅多出本任務自己對 `.gitattributes` 的修改，無任何既有檔案內容被觸動）。全程未建分支、未 commit。
- 二進位副檔名盤點以 `git -c core.quotepath=false ls-files` 全量清點（避開含 CJK 檔名時 quotepath 引號逃逸干擾 shell 後處理的陷阱），確認 repo 內僅 `.apng`／`.gif`／`.mkv`／`.webm`／`.png` 五種簽入二進位副檔名，另核對 `.jsonl` 僅 `magi/05-statusline-builder/fixtures/stdin-dump.jsonl` 一枚——與 brief 盤點指示一致，無新增未列副檔名。
- `*.jsonl eol=lf` 依 brief 字面用副檔名萬用字元（非鎖單一路徑），先以 `git ls-files '*.jsonl'` 核實現存路徑僅一枚後才落規則。
- SPEC Status 新增段落涵蓋範圍對照 WORKS 既有 M1–M3 記錄逐項覆核（主題同步機制細節、config 遷移階梯形狀、verify-dist 39 案測試面、`.gitattributes` 基線、README 註記），未新增任何未經前三個 milestone 實際交付的敘述。
**Out-of-scope observations to follow up:**
- T4.3 acceptance 原列「手動 smoke（雙分頁互切即時同步＋OS 切換即時跟隨）」與「真機驗收批 checklist 候補兩項（聚焦 toggle 鈕時 SR 播報行為、五頁一致性）」——本次 dispatch brief 僅明文要求 CRLF 一行修＋總 gate＋diff stat，未涵蓋互動式真機／瀏覽器操作（agent 執行環境無法操作真實瀏覽器雙分頁）；比照本 repo 既有慣例（sprint 09 T6.2-CHECKLIST 亦曾遞延至 BACKLOG「真機驗收批」），建議此二項比照辦理、留給下一個真機驗收批次或使用者親自驗收，不在本次自動化 gate 範圍內視為阻斷。
- `magi/BACKLOG.md`（M1/M2/M3 已修改的既有殘項條目）與 `package.json`／`index.html` 等其他工作樹既有變更皆為 M1–M3 交付、非本次 M4 觸碰範圍，維持原樣未動。

**協調者最終複核（2026-07-18）：** `npm test` **1815/1815 全綠**、`npm run typecheck` 三鏈 OK、`npm run verify:dist` all checks passed——與 developer 回報一致。sprint 實作面（M1–M4）完成；遞延項＝手動雙分頁 smoke／OS 切換真機驗證／SR 播報 checklist 兩項（比照 09 慣例併「真機驗收批」，使用者亦可即時以 `npm run dev` 親驗）。i18n-meta-scan 一行修為使用者裁決併入之跨 sprint 微修（觸及 09 測試檔），供 /magi:review-code 對帳時識別。

## 2026-07-18 — code review nits 修復批（4 票 AWN 後，使用者裁決「修採納項＋高價值 nits」）
**Tasks:** review 採納項 ×1＋minority nits ×7（對映 MAGI_CODE_REVIEW 🟡-1、🟢-1/3/4/5/6/11/12）
**Verdict:** DONE
**Test result:** **1819/1819 全綠 exit 0**（1815＋新 4：多步接力 ×3＋`<!--` 護欄 ×1）；typecheck 三鏈 exit 0；`npm run build && npm run verify:dist` 綠。協調者親跑複核同數。
**Files touched:** config.ts（`migrateConfig` 選填 steps 參數＋`_migrateConfigForTest` 測試用 export，生產呼叫端零改動）、config.test.ts（多步接力 describe ×3＋:323/:422 toStrictEqual）、fixtures.test.ts（:117 toStrictEqual）、verify-dist-checks.mjs（`<!--` 護欄 raw-scan＋`MIN_WASM_BYTES` export）、verify-dist-checks.test.ts（跨界構造釘死案＋改 import 常數）、verify-dist.mjs（`process.exitCode`＋argv[1] undefined guard）、theme.test.ts（try/catch 獨立性測試重寫——僅 MQL 缺 addEventListener、斷言 storage 監聽獨立掛載且事件真同步）、theme-inline.test.ts（sentinel 斷言）、index.html（:17/:40 註解改指 checks 模組；Node script 改寫、134/134 行 CRLF 保持、白名單 body byte 不變、漂移測試綠）
**Decisions made by developer:**
- 多步注入採「選填參數＋測試用 `_migrateConfigForTest` export」路線（brief 選項 b＋a 混成）；`deserializeConfig` 未動、既有 config 測試 96/96 原樣綠。
- `<!--` 護欄以「原文 raw-scan 繞過註解剝除」實作，白名單比對主路徑不變；真 dist 驗證全綠（護欄僅攔畸形構造）。
- toStrictEqual ×3 改後全數直接綠——證實無隱藏 undefined 欄位漂移。
- index.html :24 的「由 scripts/verify-dist.mjs 判定」句刻意不改（描述執行入口而非白名單位置，仍準確）——防 scope creep 的自持，正確。
**Out-of-scope observations to follow up:** （無新增）
