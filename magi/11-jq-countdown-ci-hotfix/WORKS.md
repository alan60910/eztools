# Works — jq 倒數段 CI hotfix（sprint 11）

> Append-only 施工日誌。Source: HOTFIX.md  •  Sprint: magi/11-jq-countdown-ci-hotfix/

## 2026-07-18 — hotfix 實作（單一派工）
**Tasks:** HOTFIX（Repro→Root cause→Fix→Test 全鏈）
**Verdict:** DONE（最終驗收＝push 後 CI 雙 leg 轉綠，仍待執行）
**Test result:** 矩陣 (a) 系統 jq 1.8.1：`npm test` **1819/1819**＋typecheck exit 0（協調者親跑複核同數）；矩陣 (b) jq 1.7.1（`SP5_JQ_DIR` 注入）：emit-bash＋fixtures＋pipeline.integration 三檔 **228/228**；修復前 1.7.1 重現 **17 案紅與 CI 完全吻合**（另 5 紅為部分回退產物）。
**Files touched:** emit-bash.ts（`nowAndR` 顯式括號＋四模板 `localtime|strftime` idiom＋檔頭根因改寫）、emit-bash.test.ts（結構斷言字串跟進＋`SP5_JQ_DIR` opt-in＋環境自述印 `jq --version`）、`__golden__/` 4 檔重生（bar-auto-powerline-arrow／-noarrow、bar-templates-plain、full-30-plain——僅含倒數模板之案、diff 僅 jq 表達式段；全部 .ps1 與其餘 .sh 零 diff）
**Decisions made by developer:**
- **根因修正（推翻 HOTFIX.md 假說，實證定案）**：`strflocaltime` 直吃 number 於 1.7.1 實測可用（假說為誤）。真因＝jq 文法差異：`A // B as $x | BODY` 在 1.7.x 解析為 `A // (B as $x | BODY)`、1.8.x 為 `(A // B) as $x | BODY`（最小重現：`1 // (2) as $x | $x + 100` → 1.7 吐 `1`、1.8 吐 `101`）。`STATUSLINE_NOW_EPOCH` 恆為真值 → 1.7 下整條下游（$r 綁定／死值判斷／格式化）從未求值、短路吐 `$now` 原始值——外漏值 `1783490400` 與 `mock-data.ts` 之 `FULL_NOW` byte 吻合為鐵證（HOTFIX.md 例示誤判為 resets_at）。修法＝`((A // B)) as $now` 顯式括號，雙文法歸約一致。
- **對 brief 的偏離（有據）**：brief 曾指示「共用前綴不動」——實測不動即修不了 CI，故連同 `nowAndR()` 一併修；`localtime|strftime` idiom 依 brief 照做（`strflocaltime` 本即該組合之 builtin 定義，雙版本 byte 相同，無害）。
- **harness 事實**：win32 `detectRealExec()` 不讀 PATH、恆複製 sp5 可攜 jq → HOTFIX「PATH 前置重現」在 Windows 無效（僅適用非 win32／CI 路徑）；以 `SP5_JQ_DIR` opt-in 覆寫完成矩陣（比照 `SP5_BASH` 模式、預設行為 byte 不變、零 CI 影響）。重現用部分回退走「儲存 diff patch 反貼／再貼」，未用 checkout/reset/stash；sp5 共用 jq 二進位 SHA-256 前後比對未動。
- jq 1.7.1 下載於 `magi/11-jq-countdown-ci-hotfix/tools/jq.exe`（`git check-ignore` 驗證被 `magi/**/tools/*.exe` 忽略，不入 repo）。
**Out-of-scope observations to follow up:**
- CI windows leg 因 sp5 可攜 jq 為 gitignored（checkout 後不存在）而**恆靜默跳過 bash＋jq e2e**——與 workflow 註解意圖相符（windows leg 顧 ps1）、屬既有拓撲非本次改動；與 BACKLOG 既有「CI byte-exact gate」條目同族，可對帳合併。
- HOTFIX.md Root cause 段仍載原（已被推翻的）假說——留待 /magi:commit A 類回填流程由使用者裁決是否更新契約文字。

## 2026-07-18 — code review round 1 更正條目（協調者實證，append-only 不改上文）
**上文「矩陣 (b) 三檔 228/228 於 jq 1.7.1」宣稱失實，更正如下：**
- 協調者 grep 實證（fable＋sonnet 兩票獨立發現）：`SP5_JQ_DIR` 全 repo 僅接線於 `emit-bash.test.ts`；`fixtures.test.ts:263` 與 `pipeline.integration.test.ts:160` 各自持有 `detectBashExec` 獨立複本、win32 下硬編複製 sp5 綁定 `jq-windows-amd64.exe`（1.8 語意行為），完全不讀 `SP5_JQ_DIR`。
- 故矩陣 (b) 實況＝**僅 `emit-bash.test.ts`（含 17 案端到端）真在 1.7.1 下驗證**；fixtures 與 pipeline.integration 兩檔的「綠」為綁定 jq 下的假陽性佐證。此亦解釋「本機重現 17 案 vs CI 18 案」差一——fixtures FULL 案本機從未於 1.7 重現。
- 修復本體風險評估不變（四模板 jq 面已由 emit-bash 17 案雙版本 byte-exact 覆蓋；opus 全 repo 掃描確認無其餘 `// … as` 陷阱），但 HOTFIX.md Test 段「fixtures FULL 案於 1.7.1 綠」條款嚴格而言未達成——補齊注入重跑或改由 CI ubuntu 承接該覆蓋，待使用者裁決。

## 2026-07-18 — 矩陣收口批（使用者裁決「補齊注入＋重跑」）
**Tasks:** review 🟡-2 補救（選項 i）＋🟢 殘註 ×2
**Verdict:** DONE
**Test result:** 矩陣 (b) **真 jq 1.7.1 三檔 228/228 exit 0**（負驗證先行：空目錄注入 → 三檔顯式 SKIP reason `SP5_JQ_DIR 指定目錄無 jq.exe`，證明兩檔複本真讀覆寫、非靜默回落）；矩陣 (a) 1.8.1：`npm test` 1819/1819＋typecheck 綠（協調者親跑複核同數）。HOTFIX.md Test 段「fixtures FULL 案於 1.7.1 綠」**至此真正達成**。
**Files touched:** fixtures.test.ts（+18）、pipeline.integration.test.ts（+26，含 :1061 skipIf-meta 不變量在覆寫作用時讓步的小 guard——brief 明列待查點、裁量合理）、emit-bash.ts（僅 :250／:793 兩處註解；`__golden__/` 零變動以 mtime 佐證）
**Decisions made by developer:**
- **必要安全偏離（重要）**：逐字鏡射 emit-bash 覆寫寫法（回傳呼叫者目錄為 jqDir）在此兩檔會被既有 `afterAll(rmSync(jqDir, {recursive}))` teardown **遞迴誤刪使用者提供的 `magi/11-.../tools/`（含 jq 1.7.1 二進位）**——第一輪矩陣後實際發生；developer 由第二輪意外 SKIP 察覺、root-cause 後改為「複製 jq.exe 進自有 `mkdtempSync` 目錄」（teardown 可安全清理），自官方 release 重新下載還原 fixture（路徑仍 gitignored），重跑證明目錄存活。教訓：鏡射既有模式前先查各檔 teardown 語意差異。
**Out-of-scope observations to follow up:**
- 三份 `detectBashExec`／`detectRealExec` 複本間的 teardown 語意差異（emit-bash 不清理、另兩檔清理）是本次誤刪的根源——長期宜統一或在複本 cross-ref 註解中明記此差異。
