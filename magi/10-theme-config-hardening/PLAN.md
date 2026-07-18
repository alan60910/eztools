# 06 殘項批 — 主題即時同步、config 遷移階梯、verify-dist 測試網、repo 衛生

> Type: feat＋chore 混合  •  Scale: major（跨全站五頁＋三個獨立模組＋repo 層屬性）
> Seed: `magi/BACKLOG.md` 06 衍生殘項五條（2026-07-18 促升）
> **Rev 2（2026-07-18）：吸收 MAGI plan review round 1（4 票）全部 7 條採納項
> ＋3 條低成本少數意見；Q1/Q2 依審查實測關單。見 `MAGI_PLAN_REVIEW.md`。**

## Context

sprint 06（statusline-ui-refresh）交付全站主題與 verify-dist 白名單體制時，
DRIFT 留下五條殘項進 BACKLOG，至今橫跨四個 sprint 未收。本 sprint 一次收攏：
兩條使用者可感（主題即時跟隨／跨分頁同步、powerline 尾隨空格文件註記）、
三條防禦性基建（CONFIG_VERSION 遷移階梯、verify-dist 自動測試、
`.gitattributes` 基線）。共同點：都是「現在做成本最低」的項目——主題模組
與 verify-dist 皆已集中化、config 遷移仍只有一版歷史。

EOL 現況（review 實測校正）：repo **已簽入二進位 byte-exact 測試輸入**
（`tools/*/fixtures/` 之 `.apng`／`.gif`／`.mkv`／`.webm`，另 magi/ 下多枚
`.png`），惟此類格式檔頭含 NUL byte、git 內容啟發式必然判二進位，加上
golden 已以 `-text` 隔離、index 內 CRLF 簽入檔實測為 **0**，故 renormalize
實質風險趨近於零——W4 仍以顯式標記＋實證取代啟發式兜底。

## Goals & Non-Goals

**Goals**

- G1 主題即時同步：OS 偏好變更即時反映 toggle 鈕狀態（`matchMedia`
  change）；跨分頁切換即時同步（`storage` 事件，含 key 被清除時回
  「跟隨系統」——`applyTheme(null)` 分支首次獲得真實呼叫端）。
- G2 config 遷移階梯：`migrateConfig` 改階梯式（版本步進函式＋while 鏈）
  ＋「v2 存檔存活」canary 回歸案，堵未來 v3 bump 忘寫遷移的資料損失陷阱。
- G3 verify-dist 可測化：檢查邏輯拆為可 import 函式＋合成 dist fixture
  正反向測試；script 擷取 regex 嚴謹化（大小寫不敏感、跳過 HTML 註解）。
- G4 `.gitattributes` 基線：補 `* text=auto`＋byte-exact／二進位例外顯式
  標記＋renormalize 實證。
- G5 README 一句註記：powerline 無箭頭模式末段尾隨空格為契約行為。

**Non-Goals**

- 不改主題三態模型與「toggle 按過即不再可達跟隨系統」的既有取捨（06 D4）。
  跨分頁 storage 清除回跟隨系統屬**外部事件路徑**，非 toggle 可達性變更。
- 不 bump CONFIG_VERSION、不引入 v3 schema。
- verify-dist 檢查語意不加嚴、不放寬——**顯式豁免兩項**：(i) `<script>`
  掃描改大小寫不敏感（收嚴）；(ii) HTML 註解內的 `<script>` 不再視為違規
  （刻意放寬：註解內 script 不執行故不管制）。除此之外重構前後對同一
  dist 判定結果一致。
- 不動 golden fixtures 的 `-text` 隔離體制。

## Design options considered

**D1 入口頁同步接線（G1）**
- (a) **延伸既有 inline script**（維持零 module JS）＋同步 verify-dist
  白名單——推薦。成本：+15–25 行 vanilla JS＋白名單一次更新。
- (b) 入口頁改載 module script 消費 `src/theme.ts`——打破「入口頁零框架
  JS」慣例（SPEC Conventions 明文），不採。
- (c) 只做四工具頁——入口頁 aria-pressed 過期、五頁行為不一致，不採。

**D2 遷移階梯形狀（G2）**
- (a) **raw-level 步進表**：`MIGRATION_STEPS[n]: raw → raw`（版本 n→n+1），
  收尾走**migrate 專用正規化出口**（見 W2 機制明文）——推薦。v1 輸出須與
  現行 `migrateConfig` deepEqual（既有 v1 遷移測試原封不動作凍結證據）。
- (b) 只加 canary 測試、不重構（YAGNI）——canary 確能擋「bump 忘寫遷移」，
  但階梯現在鋪好 v3 只需加一步函式；此刻有 1738 案回歸網，重構成本最低。
- 定案：(a)＋(b) 都做——階梯是結構、canary 是警報，互補不重疊。

**D3 verify-dist 可測化（G3）**
- (a) **檢查函式化**：per-check 函式吃 distDir（或預讀內容）回傳 failure
  訊息陣列；CLI 殼彙整輸出、exit 1——對外行為（訊息前綴、exit code）
  不變，殼保持零依賴 plain node——推薦。
- (b) 測試以子行程跑整支 script 對 fixture dist——免重構但斷言粒度粗、
  Windows spawn 慢；僅保留至多一條端到端煙霧案，不作主體。

**D4 `.gitattributes` 基線（G4）**
- (a) **`* text=auto` 全域基線＋顯式例外**（golden `-text` 維持；jsonl
  fixtures `eol=lf`；簽入二進位顯式標 `binary`）＋renormalize 實證——推薦。
- (b) 只逐檔加例外、不設全域基線——蓋不住未來新檔，正是 06 DRIFT 指出的
  暴露面，不採。

## Recommended approach

**W0 前置 PoC（review 升格，約 30 分鐘；W3 的 hard gate）**
- 抽 `scripts/verify-dist.mjs` 任一 check 為函式到獨立 checks 模組，驗證
  三件事同時成立：
  1. **entry guard**：CLI 殼以
     `import.meta.url === pathToFileURL(process.argv[1]).href` 判定主模組
     （裸字串比對在 Windows 恆假——`file:///E:/...` vs `E:\...`），vitest
     import checks 模組時零副作用（不掃 dist、不 `process.exit`）。
  2. **typecheck 落點**：tsconfig include 現僅 `["src","tools"]`——checks
     模組以 JSDoc 型別註記＋新增第三 tsconfig（`checkJs`＋
     `types:["node"]`）納入 `npm run typecheck`，或手寫 `.d.mts`；PoC 定案
     擇一，不得讓新碼逃出 strict 網。
  3. **行為凍結**：`node scripts/verify-dist.mjs` 對現有 dist 的輸出訊息
     序列與 exit code 與重構前 byte 級一致。
- Windows 本機＋（merge 前）ubuntu CI 兩平台各驗一次。

**W1 主題即時同步（G1）**
- **首件：測試 harness 擴充**（review 4/4＋3/4 採納，成本非平凡）：
  `theme.test.ts` 的 fake 需升級——可變 `matches` 的 FakeMediaQueryList
  （含 `addEventListener` 捕捉）、`window` listener 捕捉面、dispatch 可攜
  結構化 payload（`key`／`newValue`／`matches`）——否則無法區分「resync
  讀到新值 vs 舊值」與 storage 各分支。先寫一條 storage-clear 案＋一條
  matchMedia-change 案跑通，再展開矩陣。
- `src/theme.ts` 新增 `initThemeSync(button)`（與 `initThemeToggle` 同構、
  由呼叫端傳鈕）：
  - `matchMedia('(prefers-color-scheme: dark)')` `change` 監聽：三態 CSS
    下視覺本就即時跟隨，此監聽負責 toggle 鈕 `aria-pressed` 重同步；惰性
    全域＋try/catch。**明文承認退化面**：Safari <14 僅有已棄用
    `addListener`，try/catch 吞錯後即時跟隨靜默失效、首次載入仍正確——
    比照專案一貫降級哲學，不補 fallback，程式註解記一句。
  - `window` `storage` 監聽（`key === THEME_STORAGE_KEY`，含 `key === null`
    之 clear 全清事件）：重讀 `getStoredTheme()` → `applyTheme(值或 null)`
    ＋ toggle 重同步；他分頁清除紀錄即回「跟隨系統」（外部事件路徑，
    不改 toggle 對外雙態）。
- 接線：四工具頁＋`tools/_probe/` 的 main.ts 於 `initThemeToggle` 後呼叫。
- `index.html` inline script 增補等價 vanilla 邏輯（維持「與 theme.ts
  對齊但各自維護」的 06 既有體制）；`scripts/verify-dist.mjs`
  `ENTRY_ALLOWED_INLINE_SCRIPTS` 白名單同步更新；順帶把 index.html 註解中
  `src/theme.ts:102-105` 類**硬編行號引用改為函式名引用**（W1 改動後行號
  必位移）。
- **inline 端行為測試**（review 4/4 採納，堵「白名單只凍 byte 不驗行為」）：
  測試自 repo 根 `index.html` 抽出 inline script body，以 `new Function`
  搭配 stubGlobal 假物件執行，跑與 module 版同一組 listener 行為斷言
  （OS change／storage 設值／清除／無關 key／讀取拋錯）——inline 版與
  `initThemeSync` 同進自動化網，語意漂移在單元層即紅。
- module 版測試：同組矩陣直接對 `initThemeSync` 斷言。

**W2 config 遷移階梯（G2）**
- **重構前先補凍結測試**（review 指出之凍結真空）：v1 raw 夾帶顯式
  `powerlineArrow: false, mode: 'powerline'`（及反向 `true, 'plain'`）→
  斷言遷移輸出**無條件依 mode 派生、忽略夾帶值**。步進函式不得寫成
  fill-if-missing——此語意翻轉現行零測試可攔。
- `tools/statusline-builder/config.ts`：`migrateConfig` 改步進表＋while，
  形狀示意（細節以凍結測試 deepEqual 對齊為準）：
  ```ts
  type MigrationStep = (raw: Record<string, unknown>) => Record<string, unknown>
  const MIGRATION_STEPS: Record<number, MigrationStep> = {
    1: migrateV1toV2,  // raw 層：剝除 v2 專屬欄（現僅 rowSeparators）＋
  }                    // powerlineArrow 依 mode 無條件派生
  // while (version < CONFIG_VERSION) { step 缺席 → defaultConfig()（視同
  //   未知版本，不得對 undefined 求值拋 TypeError——deserializeConfig 的
  //   try/catch 不包 migrate，throw 即硬崩）；有 step → raw = step(raw) }
  ```
- **正規化出口明文**（review 4/4 採納的字面陷阱）：migrate 收尾走
  `sanitizeConfigCore`＋派生欄顯式搬運（**不走** `sanitizeConfig`）——
  現行 migrate/deserialize 的不對稱（Core 排除 `rowSeparators`）本身是
  受測契約（config.test.ts「即使 raw 湊巧夾帶亦不遷移」），統一收尾若
  照字面用 `sanitizeConfig` 即違約。v2 直入路徑維持 `sanitizeConfig` 不變。
- 補獨立測試：刻意呼叫缺步進的中繼版本 → 斷言不 throw、回傳預設 config。
- **canary 回歸案**（Q1 已裁決：現役＋合成各一）：
  - build on **既有** `fixtures/reference-7row.json`（已簽入、已有 sanitize
    往返案——canary 的新增價值在 migration-forgotten 維度，非重複）；
    fixture 內 `version: 2` **永久凍結**，測試檔明文註記「bump CONFIG_VERSION
    時勿重生本檔——本檔代表『舊存檔』」。
  - 另造合成最小 v2 fixture，選擇標準明文：涵蓋 `auto` 配色、`bar`、多列
    `row`、`rowSeparators` 等 v2 特徵欄。
  - 斷言粒度：與凍結的預期 sanitize 輸出**整份 deepEqual**（非僅關鍵欄
    存活——粗粒度漏得住部分欄位損失）。
- 既有 v1 遷移測試全數不動、必須維持綠（凍結證據）。

**W3 verify-dist 可測化（G3）**
- 前置：W0 PoC 定案的 guard／tsconfig 結構全面套用。
- 檢查函式化（D3-a）：各 check 拆為具名函式進 checks 模組（每函式回傳
  failure 訊息陣列、生成順序與現行一致）、CLI 殼零依賴不變；對外輸出
  （`verify:dist FAIL - ` 前綴、訊息順序、exit code）byte 級不變。
- regex 嚴謹化（具體形式）：script 擷取改
  `/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi`（`i` 旗標收大寫變體）；
  **僅於 script 擷取路徑**先剝 HTML 註解（`<!--[\s\S]*?-->`）再 matchAll
  ——anchor 類檢查維持對原文比對，不受波及（Non-Goal 豁免範圍守住）。
  補護欄負向案：inline 腳本體不得含 `</script>` 或巢狀註解（regex 解析
  HTML 的既知脆弱面，以測試釘死輸入形狀）。
- 測試：vitest 於 tmpdir 合成最小 dist fixture——正向全過一案＋逐 check
  負向變體（缺 `<main>`、未白名單 inline script、帶屬性 script、大寫
  `<SCRIPT>` 仍抓到、註解內 script 不誤判、dangling anchor、nerd/woff2
  回歸、缺 vendor/ffmpeg 等）。**跨平台斷言規範**：失敗訊息含反斜線相對
  路徑（Windows）、`readdirSync` 列舉順序不穩——斷言採 containment／
  正規化分隔符後比對／訊息「集合」而非序列，禁止全字串精確比對多筆序列。
- 順帶收 06 的人工同步脆弱點：新增測試斷言 repo 根 `index.html` 抽出的
  inline script 正規化後必在 `ENTRY_ALLOWED_INLINE_SCRIPTS` 中——白名單
  與源檔漂移在單元測試層即紅，不必等 build。

**W4 `.gitattributes` 基線（G4）**
- 寫入：檔頭補 `* text=auto`；例外**顯式列**（後行優先、越精確越優先，
  疊加順序已審查確認）——
  - golden `tools/statusline-builder/__golden__/** -text`（既有維持）；
  - statusline stdin fixtures `*.jsonl eol=lf`；
  - 簽入二進位**必做**顯式標記（Q2 盤點已裁決「確定存在」）：
    `*.apng`／`*.gif`／`*.mkv`／`*.webm`／`*.png` 標 `binary`——實作時以
    `git ls-files` 產完整清單；不得僅賴 `text=auto` 內容啟發式兜底
    （`git ls-files --eol` 查的是現行屬性，無法預告啟發式判定）。
- **實證步**：拋棄分支實跑 `git add --renormalize .` → `git diff --stat`
  對帳。實測 index 內 CRLF 簽入檔為 0，預期**零 diff**；出現任何內容
  diff（尤其二進位／golden）即停手回報。實證結果記 WORKS。
- README／CONTRIBUTING 級知識落點走 Spec deltas（SPEC Conventions 補
  EOL 政策句，見下）。

**W5 README 註記（G5）**
- README「statusline-builder 注意事項」補一句：powerline 關箭頭模式末段
  帶尾隨空格（三後端一致、契約行為；部分 statusline 消費端顯示時會
  右修剪）。

依賴順序：**W0（PoC hard gate）→ W3 → W1**（白名單更新走新測試面）；
W2／W4／W5 彼此獨立可平行。

## Open questions（review round 1 後全數收斂）

- ~~Q1 canary fixture 份數~~ → **已裁決**：現役 `reference-7row.json`
  （version 永凍 2）＋合成最小各一，斷言整份 deepEqual。
- ~~Q2 renormalize CRLF 舊檔處置~~ → **已裁決**：實測 index 零 CRLF、
  預期零 diff；仍以拋棄分支實跑一次作最後實證，Context 宣稱已同步修正。
- Q3 入口頁 inline script 增量 → 保留原方案（五頁行為一致優先）；實作時
  **量化**增量（行數／gzip bytes）記入 WORKS，若離譜再回頭裁（不預期）。

## Spec deltas

### root `SPEC.md`
- **Section: Components** — modify
  Why: `src/theme.ts` 職責擴充（OS 偏好即時跟隨＋跨分頁 storage 同步）。
  New content: 主題模組描述補「matchMedia change／storage 事件雙監聽，
  OS 變更與跨分頁切換即時同步 toggle 態；**跨分頁 storage 清除（外部
  事件、非 toggle 路徑）時回跟隨系統**」——措辭明示不與「對外僅雙態的
  toggle 切換」衝突。
- **Section: Conventions** — modify
  Why: 入口頁 inline script 例外範圍、工具頁範本要點、repo EOL 政策三處
  需跟進本 sprint 交付。
  New content: (a) 例外句改「唯一例外為主題切換 inline script（含 toggle
  監聽**及其同步機制——OS 偏好變化、跨分頁切換**）」；(b) 工具頁範本
  要點補「main.ts 於 `initThemeToggle` 後呼叫 `initThemeSync`」；(c) 新增
  repo 衛生句「repo 以 `* text=auto` 為 EOL 基線；byte-exact fixtures 須
  於 `.gitattributes` 顯式 `-text`／`binary` 豁免」。
- **Section: Status** — modify
  Why: 慣例上每 sprint 於 Status 落交付段。
  New content: Status 段**末尾**（格式對齊既有 sprint 段落）加 sprint 10
  交付摘要一段（主題即時同步、config 遷移階梯、verify-dist 測試化、
  .gitattributes 基線、README 尾隨空格註記）。

### root `CLAUDE.md`
- **Section: Conventions** — modify
  Why: 入口頁 inline script 與 theme.ts 雙軌對齊是 AI agent 高頻踩點，
  CLAUDE.md 現無此約束（review 採納）。
  New content: 補一句「入口頁主題 inline script 須與 `src/theme.ts` 邏輯
  對齊，修改須同步兩處＋verify-dist 白名單」。

### magi/`PRD.md`
(none)

### magi/`TECHSTACK.md`
- **Section: Framework / runtime** — modify
  Why: TECHSTACK 有與 SPEC 相同的「唯一例外為主題切換 inline script」
  鏡射句，SPEC 改則此處同步、勿一改一留（review 採納）。
  New content: 鏡射句同步為「唯一例外為主題切換 inline script（含 toggle
  監聽及其同步機制）」。

## Verification

- W0 PoC 三綠（Windows 本機）：`npm test`（import 零副作用）＋
  `npm run typecheck`（新 checks 模組在網內）＋
  `node scripts/verify-dist.mjs`（CLI 行為 byte 不變）。
- `npm test` 全綠：W1 harness 擴充後之 module＋inline 雙面行為矩陣、W2
  凍結測試（powerlineArrow 夾帶）＋缺步進 fallback＋canary 兩 fixture、
  W3 fixture 正反向與白名單同步斷言；既有 1738 案零回歸（v1 遷移測試與
  statusline golden 全數原樣通過＝行為凍結證據）。
- `npm run build && npm run verify:dist` 通過（W1 白名單同步後）。
  **明記殘留 gap**（review 少數意見收錄）：`build && verify:dist` 現僅
  deploy.yml（push main）執行，test.yml（DEV push／PR）不建置——本驗收
  項為本機／merge 前手動保證，非 DEV CI 強制；是否移入 test.yml 另案。
- W4 拋棄分支 renormalize 實證：零 diff＋`__golden__/**` 零變動，結果與
  `git ls-files --eol` 前後對帳記入 WORKS。
- 手動 smoke（本機）：雙分頁開入口頁＋任一工具頁，互切主題即時同步、
  aria-pressed 同步翻轉；OS 深淺切換下未手動切換過的分頁即時跟隨。
  真機驗收批 checklist 候選另補一項（review 少數意見）：**聚焦 toggle 鈕
  時**由外部（OS 切換／他分頁）觸發 aria-pressed 變化，確認 SR 播報行為
  可接受或記為已知取捨。

## Review 收斂記錄

- Round 1（2026-07-18，4 票：fable-5／opus AWN、sonnet／haiku RC）：
  REQUEST-CHANGES，全數 (b) 實作細節級——7 條採納項已全數吸收至上文
  （W0 新設、W1 harness＋inline 測試、W2 機制明文＋凍結測試、W4 前提
  修正、Spec deltas 增補含 CLAUDE.md／TECHSTACK 由 none 轉 modify）；
  少數意見收錄 3 條（註解剝除範圍限定、Safari<14 退化明文、SR 播報
  checklist 項），其餘 3 條（test.yml gap 已於 Verification 明記、行號
  註解已入 W1、inline 增量量化已入 Q3）。詳見 `MAGI_PLAN_REVIEW.md`。
- 依 §7.5 分級無架構級異議，不再跑 round 2，逕行 `/magi:tasks`。
