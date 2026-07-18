# Hotfix — CI ubuntu leg 倒數段 18 案全紅：jq 版本分岔（本機 1.8.1 vs CI 1.7.x）
> Severity: high  •  Reported: 2026-07-18

## Repro

- GitHub Actions `test.yml`（DEV push，commit 5eb1843）ubuntu leg：
  `emit-bash.test.ts` 端到端 byte-exact 17 案＋`fixtures.test.ts` FULL 情境
  1 案紅，共 18 案。症狀完全一致：凡預期含格式化倒數（`↺ 2h (08:00)`／
  `↺ 4d (07/13 00:00)`）之處，實收皆為**原始 `resets_at` epoch 整數字串**
  （如 `1783490400`）；null-hidden 與 expired-hidden 分支亦失效直接吐
  epoch（如預期整段隱藏、實收 `…|1783494000`）。
- 本機 Windows（Git Bash 5.2＋jq **1.8.1**）同批測試全綠（sprint 10 gate
  1819/1819 實證）。
- 本機重現法：取得 jq 1.7.1 可攜二進位（比照 05 面板慣例，置
  `magi/**/tools/` 之類 gitignore 覆蓋處、**不入 repo**），將其目錄前置
  PATH 後重跑 `npx vitest run tools/statusline-builder/emit-bash.test.ts`
  ——預期重現 CI 同款 18 紅。修復驗證亦以此雙版本矩陣進行。

## Root cause（實證定案——2026-07-18 A 類回填；初始假說已推翻）

- **真因＝jq 1.7.x ↔ 1.8.x 文法優先級差異**：`A // B as $x | BODY` 在
  1.7.x 解析為 `A // (B as $x | BODY)`、1.8.x 為 `(A // B) as $x | BODY`
  （最小重現：`1 // (2) as $x | $x + 100` → 1.7 吐 `1`、1.8 吐 `101`）。
  倒數模板共用前綴 `nowAndR()` 之
  `(env.STATUSLINE_NOW_EPOCH // empty | tonumber?) // (now | floor) as $now`
  正中此形：`STATUSLINE_NOW_EPOCH` 為真值時，1.7 短路整條下游（`$r`
  綁定／死值判斷／格式化皆未求值）、直接吐出 `$now` 原始值——外漏值
  `1783490400` 與 mock 之 `FULL_NOW` byte 吻合為鐵證（原文誤判外漏值為
  resets_at）。
- 初始假說「`strflocaltime` 直吃 number 為 jq 1.8 專屬寬容、1.7 拋錯」
  經 1.7.1 實測**推翻**（number 直入兩版皆可用）；留檔備考。
- 影響面（依真因收斂，修正原文高估）：受害面＝**顯式設
  `STATUSLINE_NOW_EPOCH` 之呼叫端**（byte-exact 測試套件為大宗）＋手動
  釘時之 jq<1.8 使用者；env 缺席之生產預設路徑（回落腳本端真時鐘）在
  1.7 誤解析下 `//` 落入右運算元、仍正確求值——非「所有 Linux jq1.7
  使用者」全面故障。
- 時間軸：倒數段為 06c（`523cb`，2026-07-17 推送）交付；CI ubuntu leg
  自該次起即紅，本次為首次被檢視。sprint 10（`5eb1843`）未觸碰 emit
  路徑，僅為揭露者、非引入者。

## Fix

- **`nowAndR()` 共用前綴顯式外層括號（`((A // B)) as $now`）——真因
  所在的實際修法（A 類回填追認）**：使 `as` 綁定在兩代 jq 文法下唯一
  歸約；派工 brief 原「共用前綴不動」指示經實測推翻（不動即修不了），
  偏離過程見 WORKS.md。
- `tools/statusline-builder/emit-bash.ts` 四模板改 jq 1.6+ 通用 idiom：
  `strflocaltime` 的 number 直入改走 broken-down 路徑
  （`$r | localtime | strftime(fmt)` 或等效——以與 oracle
  `emit-ansi.toAnsi` 輸出 byte 一致為準繩擇定）。
- 修復準則：**執行輸出契約不變**——oracle（emit-ansi）、resolve、ps1
  後端皆不動；bash 腳本**執行輸出** vs oracle 於 jq 1.7.1 與 1.8.1 下皆
  byte-exact。注意：模板文字改變 → 含倒數模板之**黃金檔（腳本文字）需
  `golden:update` 重生**——重生 diff 須人眼可解釋（僅 jq 表達式段變化、
  不含倒數模板之黃金檔零 diff）。
- 若重現揭示回落機制屬模板結構問題（錯誤被 passthrough 吞成 raw
  epoch），死值分支一併收斂為明確 `''`（Suffix）／`empty`（Countdown），
  不得回落原始值。
- `emit-bash.test.ts` 環境自述補印 `jq --version`（CI log 可稽，杜絕
  下次版本分岔盲飛）。

## Test

- 本機雙 jq 矩陣：**1.8.1（現況）與 1.7.1（可攜）皆須**
  `emit-bash.test.ts` 全綠＋`fixtures.test.ts` FULL 案綠；黃金檔零 diff。
- 全套迴歸：`npm test` 1819 全綠（Windows 本機）＋`npm run typecheck`。
- 最終驗收：push DEV 後 `test.yml` ubuntu＋windows 雙 leg 轉綠。

## Rollback plan

- 修復為 emit-bash.ts 單檔窄改——revert 該 commit 即回現狀（本機綠、
  CI 紅），不影響其他段與其他後端。
- 若 jq 1.6+ idiom 在 1.8.1 下產生輸出分岔（不預期；黃金檔會攔），
  備案一＝腳本內 jq 版本偵測雙路徑；備案二＝README 明訂 bash 後端需
  jq ≥1.8（下策，需使用者裁決）。
