# Tasks — 06 殘項批（主題即時同步、config 遷移階梯、verify-dist 測試網、repo 衛生）

> Source: PLAN.md（Rev 2，含 MAGI review round 1 採納項）  •  Sprint: magi/10-theme-config-hardening/
> 依賴鏈：M1（W0 PoC hard-gate → W3）→ M2（W1）；M3（W2）／M4（W4+W5）與 M1/M2 檔案不相交、可由 /magi:go 跨 milestone 平行。

## Milestone 1: verify-dist 可測化（W0 PoC → W3）
**Goal:** verify-dist 檢查邏輯可被 vitest import 且有合成 fixture 正反向網，CLI 對外行為 byte 級不變。
**Acceptance:** W0 三綠（import 零副作用／typecheck 在網／CLI byte 不變）；tmpdir fixture 正反向案全綠；`npm run build && npm run verify:dist` 通過。

- [x] T1.1 — **W0 前置 PoC（hard gate，後續任務全數 gate 於此）**：抽任一 check 為函式至獨立 checks 模組（`scripts/verify-dist-checks.mjs` 暫名），驗三件事於 Windows 本機同時成立——(1) CLI 殼 entry guard 用 `import.meta.url === pathToFileURL(process.argv[1]).href`（裸字串比對 Windows 恆假），vitest import 零副作用（不掃 dist、不 `process.exit`）；(2) typecheck 落點定案：JSDoc 型別＋第三 tsconfig（`checkJs`＋`types:["node"]`）或手寫 `.d.mts` 擇一，新碼不得逃出 strict 網；(3) `node scripts/verify-dist.mjs` 輸出訊息序列與 exit code 與重構前 byte 級一致。定案結構記 WORKS。
- [x] T1.2 — 全 checks 函式化：各 check 拆為具名函式（回傳 failure 訊息陣列、生成順序與現行一致），CLI 殼零依賴彙整輸出＋exit 1；對外輸出（`verify:dist FAIL - ` 前綴、訊息順序、exit code）byte 級不變；對現有真 dist 重構前後輸出 diff 為空之驗證記 WORKS。
- [x] T1.3 — regex 嚴謹化：script 擷取改 `/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi`；**僅 script 擷取路徑**先剝 HTML 註解（`<!--[\s\S]*?-->`）再 matchAll，anchor 類檢查維持對原文比對；補負向案——大寫 `<SCRIPT>` 仍抓到、註解內 script 不誤判（明記為刻意放寬豁免項）、inline 腳本體含 `</script>`／巢狀註解即紅（護欄）。
- [x] T1.4 — tmpdir 合成 dist fixture 測試面：正向最小 dist 全過一案＋逐 check 負向變體（缺 `<main>`、未白名單 inline script、帶屬性 script、dangling anchor、nerd/woff2 回歸、缺 vendor/ffmpeg）；跨平台斷言規範——containment／正規化分隔符／訊息「集合」比對，禁止多筆序列全字串精確比對；另補「repo 根 `index.html` 抽出 inline script 正規化後必在 `ENTRY_ALLOWED_INLINE_SCRIPTS`」同步斷言案（單元層擋白名單漂移）。

## Milestone 2: 主題即時同步（W1；gate 於 M1）
**Goal:** 五頁 OS 偏好即時跟隨＋跨分頁 storage 同步，module 與 inline 雙面皆有行為測試。
**Acceptance:** module＋inline 同組 listener 行為矩陣全綠；雙分頁手動 smoke 通過（**遞延**：未於本 sprint 執行，併 BACKLOG「真機驗收批」，比照 09 慣例——見 WORKS M4）；`verify:dist` 帶新白名單通過。

- [x] T2.1 — 測試 harness 擴充（W1 首件）：`theme.test.ts` fake 升級——可變 `matches` 的 FakeMediaQueryList（含 `addEventListener` 捕捉）、`window` listener 捕捉面、dispatch 可攜結構化 payload（`key`／`newValue`／`matches`）；先跑通 storage-clear＋matchMedia-change 兩條最小案再展開。
- [x] T2.2 — `src/theme.ts` 新增 `initThemeSync(button)`：matchMedia change 監聽（重同步 aria-pressed；惰性全域＋try/catch；**程式註解明文** Safari <14 無 MQL addEventListener → 靜默降級、首次載入仍正確）＋storage 監聽（`key === THEME_STORAGE_KEY` 或 `key === null` 全清 → 重讀 `getStoredTheme()` → `applyTheme(值或 null)`＋toggle 重同步）；module 版測試矩陣：OS change／storage 設值／清除／無關 key 忽略／讀取拋錯。
- [x] 🔀 [A] T2.3 — 接線四工具頁＋`tools/_probe/` main.ts：於 `initThemeToggle` 後呼叫 `initThemeSync`（範本頁同步，維持三件套完整）。
- [x] 🔀 [B] T2.4 — 入口頁 inline script 增補等價 vanilla 邏輯＋`ENTRY_ALLOWED_INLINE_SCRIPTS` 白名單同步；index.html 註解硬編行號引用（`src/theme.ts:102-105`）改函式名引用；**inline 行為測試**：測試自 repo 根 `index.html` 抽 script body、`new Function`＋stubGlobal 執行，跑與 T2.2 同組 listener 斷言；量化 inline 增量（行數／gzip bytes）記 WORKS（Q3 收數）。

## Milestone 3: config 遷移階梯（W2；與 M1/M2 檔案不相交，可平行）
**Goal:** `migrateConfig` 階梯化且行為凍結，v2 存檔 canary 警報就位。
**Acceptance:** 新增凍結／fallback／canary 案全綠；既有 v1 遷移測試與全 statusline 測試原樣通過。

- [x] T3.1 — **凍結測試先行（在重構前 commit-ready）**：v1 raw 夾帶顯式 `powerlineArrow: false, mode: 'powerline'` → 斷言輸出依 mode 派生為 `true`（忽略夾帶值）；反向 `true, 'plain'` → `false`。此測試對現行實作即綠，鎖死「無條件覆寫、不得 fill-if-missing」語意。
- [x] T3.2 — `MIGRATION_STEPS` 階梯重構：`Record<number, (raw)=>raw>`＋while；v1→v2 步進於 raw 層剝除 v2 專屬欄（現僅 `rowSeparators`）＋`powerlineArrow` 無條件派生；缺步進→`defaultConfig()`（視同未知版本、不得 throw）＋一條直接斷言「缺步進不 throw 回預設」的獨立測試；收尾走 `sanitizeConfigCore`＋派生欄顯式搬運（**不走** `sanitizeConfig`——config.test.ts「湊帶 rowSeparators 不遷移」凍結案必須原樣綠）；v1 輸出與現行 deepEqual。
- [x] T3.3 — canary 回歸案 ×2：(a) build on 既有 `fixtures/reference-7row.json`——`version: 2` 永久凍結、測試檔明文註記「bump CONFIG_VERSION 時勿重生本檔（本檔代表舊存檔）」；(b) 合成最小 v2 fixture（涵蓋 `auto` 配色、`bar`、多列 `row`、`rowSeparators`）；兩者皆斷言 `deserializeConfig` 輸出與凍結預期**整份 deepEqual**（非僅關鍵欄存活）。

## Milestone 4: repo 衛生＋文件落地（W4＋W5＋Spec deltas；可平行）
**Goal:** EOL 基線與例外顯式化並實證零波及；README 與四份 living doc 依 deltas 宣告落地。
**Acceptance:** 拋棄分支 renormalize 零 diff（golden 零變動）記 WORKS；deltas 宣告面（SPEC×3、CLAUDE.md、TECHSTACK）與實際 diff 一致；`npm test` 全綠總 gate。

- [x] 🔀 [A] T4.1 — `.gitattributes` 基線：檔頭補 `* text=auto`；顯式例外——golden `-text`（維持）、`*.jsonl eol=lf`、簽入二進位以 `git ls-files` 產完整清單標 `binary`（`*.apng`／`*.gif`／`*.mkv`／`*.webm`／`*.png`，不賴 text=auto 啟發式）；**拋棄分支實跑** `git add --renormalize .` → `git diff --stat` 對帳（預期零 diff；任何內容 diff 即停手回報），前後 `git ls-files --eol` 對帳記 WORKS。
- [x] 🔀 [B] T4.2 — 文件落地：README「statusline-builder 注意事項」補 powerline 尾隨空格一句（W5）；Spec deltas 依宣告執行——SPEC Components（外部事件、非 toggle 路徑措辭）／Conventions（例外句＋範本要點 initThemeSync＋EOL 政策句）／Status 段末尾 sprint 10 段；CLAUDE.md Conventions 補 inline script 對齊約束句；TECHSTACK 鏡射句同步。
- [x] T4.3 — 總 gate＋交付收尾：`npm test` 全綠（既有 1738＋新增全數）；`npm run build && npm run verify:dist`（Verification 已明記此項現僅 deploy.yml 強制、本機手動保證）；手動 smoke——雙分頁互切即時同步＋OS 切換即時跟隨；「真機驗收批」checklist 候補兩項落 WORKS（聚焦 toggle 鈕時外部觸發 aria-pressed 之 SR 播報行為、五頁一致性）。**（勾選範圍＝自動化 gate；手動 smoke／SR 兩項未執行、已併 BACKLOG「真機驗收批」條目追蹤）**
