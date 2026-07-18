# 🧠 MAGI Plan Review — 06 殘項批（主題即時同步、config 遷移階梯、verify-dist 測試網、repo 衛生）

**Sprint:** magi/10-theme-config-hardening/ • **Document:** PLAN.md • **Round:** 1

## Dashboard

```
┌────────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES（皆屬計畫文字增補級，見 §裁決）  │
├────────────────────────────────────────────────────────────┤
│  Mode: majority      Threshold: vote_sum > 2.0             │
│  OK weight: 4 / 4    Degraded: no                          │
├────────────────────────────────────────────────────────────┤
│  ✅ claude:fable-5（AWN）   ✅ claude:opus（AWN）          │
│  ✅ claude:sonnet（RC）     ✅ claude:haiku（RC）          │
├────────────────────────────────────────────────────────────┤
│  🔴 Critical: 1     🟡 Important: 6                        │
│  🟢 Minority: 6     🔬 Spikes: 4                           │
└────────────────────────────────────────────────────────────┘
```

> ⚠️ **同 vendor 湊票揭露**：四票皆為 claude 系模型（fable-5／opus／sonnet／
> haiku），無跨 vendor 驗證。各票獨立執行、發現高度互補（實測型 vs 機制型
> vs 細節型），但共同盲點風險仍高於異質陣容。

## Verdict

**REQUEST-CHANGES** — 但依 §7.5 分級，**全部採納項皆為 (b) 實作細節／計畫
文字級**，無 (a) 架構級：四票一致認可 D1–D4 的方向選型（無人要求改設計形
狀），要求的是「動工前把機制明文定案」。處置建議：修訂 PLAN（吸收下列採納
項＋補 Implementation notes）後**直接進 `/magi:tasks`，不需再跑一輪 review**。

值得記錄的正面確證（fable／opus 實測）：storage 事件語意（同分頁不觸發、
clear 時 key=null、重讀 storage 天然冪等）正確；canary 攔截機制推演成立且
`fixtures/reference-7row.json` 實存；`.gitattributes` 後行優先疊加正確；
index 內 **0 個 CRLF 簽入檔**；deploy.yml／test.yml 無需改動；Spec deltas
主體對帳無誤。

## 🔴 Critical (adopted)

- **[vote: 4/4 — fable(1)+opus(1)+sonnet(1)+haiku(1)] W3 import 化的工程前置未定案——照字面實作會直接打破「npm test 全綠」驗收**
  - Where: scripts/verify-dist.mjs:38-55、286-291；tsconfig.json include；PLAN §W3
  - 子點（含個別出票者）：
    1. **（sonnet-Critical／opus-spike）entry guard 缺席**：現行整支腳本
       「載入即執行」且頂層 `process.exit(1)` 收尾——vitest 一 import 就對
       真實 `dist/`（多半未 build）跑檢查並砍掉 worker 行程，整批測試連坐
       紅。且常見 `import.meta.url === process.argv[1]` 守衛在 Windows 恆假
       （URL vs 原生路徑），須用 `pathToFileURL(process.argv[1]).href` 比對。
    2. **（fable-Important）typecheck 落點衝突**：tsconfig include 僅
       `["src","tools"]`——測試放 `scripts/` 逃出 typecheck（違 strict 慣例），
       放 `src/` 匯入無型別 `.mjs` 即紅。需定案：獨立 checks 模組＋JSDoc
       型別＋第三 tsconfig（checkJs）或手寫 `.d.mts`。
    3. **（fable／haiku／opus-spike）tmpdir fixture 跨平台斷言**：失敗訊息含
       反斜線相對路徑（Windows）、`readdirSync` 列舉順序不穩——斷言採
       containment／正規化分隔符／集合比對，勿全字串精確比對序列。
    4. **（haiku）「byte 級不變」的保證方式與新 regex 具體形式未附**：
       函式化後訊息順序、`verify:dist FAIL - ` 前綴的凍結手段要明文。
  - Suggested fix: 把 spike（見 🔬-1）升格為 sprint 首任務：30 分鐘 PoC 定案
    guard 寫法＋typecheck 結構，PLAN W3 補上述四子點的機制明文。

## 🟡 Important (adopted)

- **[vote: 4/4 — fable(1)+opus(1)+sonnet(1)+haiku(1)] W2 遷移階梯機制未定案處會破行為凍結**
  - Where: tools/statusline-builder/config.ts:411-415；PLAN §D2-a／W2
  - 子點：
    1. **（opus／fable）「統一走現行 sanitize」與 rowSeparators 排除契約相衝**：
       現行 migrate 走 `sanitizeConfigCore`（排除 rowSeparators，config.test.ts:860
       凍結），v2 直入走 `sanitizeConfig`（含之）——D2-a 字面「統一 sanitize」
       直譯即違約。需明文：遷移收尾維持 Core＋派生，或步進於 raw 層顯式剝除
       v2 專屬欄。
    2. **（fable）v1 顯式夾帶 `powerlineArrow` 的覆寫語意是凍結真空**：現行
       無條件依 mode 派生（忽略夾帶值），但零測試釘住——若步進寫成
       fill-if-missing，語意無聲翻轉且全套測試仍綠。重構**前**先補凍結測試
       ＋明文「無條件覆寫、不得 fill-if-missing」。
    3. **（sonnet）缺步進函式的失敗模式未定義**：`MIGRATION_STEPS[n]` 查無
       函式時須回 `defaultConfig()`（比照未知版本），不得對 undefined 求值
       拋 TypeError——`deserializeConfig` 的 try/catch 不包 migrate，會硬崩。
       補一條直接斷言「缺步進不 throw、回預設」的獨立測試。
    4. **（haiku）MIGRATION_STEPS 結構／簽名在 PLAN 附示意**，讓 deepEqual
       驗證方式可預先檢視。

- **[vote: 4/4 — fable(1)+opus(1)+sonnet(1)+haiku(1)] W4/Q2 前提依實測修正——二進位 fixture 實存、churn 近零、golden 保護需一次實證**
  - Where: PLAN §Context／W4／Q2；tools/*/fixtures/*.{apng,gif,mkv,webm}、magi/**/*.png
  - 實測事實（fable／opus 各自跑 `git ls-files --eol`）：index 內 CRLF 簽入檔
    **0 個** → renormalize 預期**零 diff**，Q2 可當場關閉；簽入二進位確定
    存在（apng/gif/mkv/webm 四類 byte 級測試輸入＋magi 下 png）→
    「若盤點有」條件句改**必做步**，顯式列 `binary`／`-text` 標記，勿僅賴
    `text=auto` 內容啟發式（sonnet：`ls-files --eol` 查的是現行屬性，無法
    預告啟發式判定）。Context 段「repo 尚無 byte-exact 消費者」宣稱不成立
    （sonnet），須改寫。golden 保護與零 diff 預期以**拋棄分支實跑
    `git add --renormalize .`** 一次實證（sonnet／haiku）。

- **[vote: 4/4 — fable(1)+opus(1)+sonnet(1)+haiku(1)] 入口頁 inline 同步邏輯無任何行為測試——W1 把未測分岔面翻倍**
  - Where: index.html:32-74；PLAN §D1-a／W1
  - 白名單只凍 byte 不驗行為；theme.test.ts 只測 module 版。inline 若寫錯
    （key 比對、clear 分支）會同時通過白名單與單元測試，只剩手動 smoke。
    建議擇一：(i) 測試以 `new Function` 執行從 index.html 抽出的 script
    body、配 stubGlobal 假物件跑與 module 同組 listener 斷言（fable／opus）；
    (ii) 行為對照 checklist 逐分支打勾（sonnet）；haiku 另要求 PLAN 附
    inline 新增段完整程式碼（storage null 分支易漏）。至少擇 (i)，成本低
    且一勞永逸。

- **[vote: 3/4 — opus(1)+sonnet(1)+haiku(1)] 測試 harness 需非平凡擴充，W1 測試案才寫得出來**
  - Where: src/theme.test.ts:43-48
  - 現行 fake 的 `matchMedia` 回固定 `{matches}`、無 addEventListener；
    `dispatch` 不帶事件物件。需要：可變 `matches` 的 FakeMediaQueryList＋
    window listener 捕捉＋可攜 payload（`key`/`newValue`/`matches`）的
    dispatch，否則無法區分「resync 讀到新值 vs 舊值」與 storage 各分支。
    PLAN「比照現行防禦、stubGlobal 直接觸發」低估了這一步——列為 W1 首件。

- **[vote: 3/4 — fable(1)+opus(1)+haiku(1)] canary 設計細節明文：沿用既有 fixture、version 永凍、斷言粒度**
  - Where: PLAN §W2 canary／Q1；tools/statusline-builder/fixtures.test.ts:78-98
  - `reference-7row.json` 已存在且有 sanitize 往返案——canary 直接 build-on
    它（不另造 fixture），新增價值在 migration-forgotten 維度（opus）；
    fixture 內 `version: 2` 須永久凍結、測試檔註記「bump 時勿重生本檔」
    （opus）；斷言粒度升為「與凍結預期輸出整份 deepEqual」或至少全部
    非預設欄，只斷言少數關鍵欄會漏部分欄位損失（fable）；合成最小 fixture
    的選擇標準（涵蓋 auto 色／bar／多列）明文（haiku）。Q1 依此定案：
    現役＋合成各一。

- **[vote: 3/4 — fable(1)+opus(1)+haiku(1)] Spec deltas 需一輪增補（七個單票子點，彙整採納）**
  - Where: PLAN §Spec deltas
  - 子點（各為單票觀察，實務上一次修完）：
    1. （opus-Important）Components delta「storage 清除回跟隨系統」與既有
       「對外僅雙態」矛盾——措辭點明「僅限外部 storage 事件、非 toggle 路徑」。
    2. （haiku-Important）Conventions delta 三特性並列易誤讀為三個獨立監聽
       ——改「含 toggle 監聽及其同步機制（OS 偏好變化、跨分頁切換）」。
    3. （fable）SPEC「工具頁範本要點」清單漏補「main.ts 於 initThemeToggle
       後呼叫 initThemeSync」。
    4. （fable）G4 的 repo 級 EOL 政策無 living doc 落點——補 SPEC
       Conventions 一句：「`* text=auto` 基線；byte-exact fixtures 須顯式
       `-text`／`binary` 豁免」。
    5. （opus）TECHSTACK.md:12-13 有同句「唯一例外為主題切換 inline script」
       鏡射——SPEC 改則 TECHSTACK 同步，勿一改一留（TECHSTACK delta 由
       none → modify）。
    6. （haiku-Important）CLAUDE.md Conventions 補一句「入口頁主題 inline
       script 須與 src/theme.ts 對齊並同步 verify-dist 白名單」（AI agent
       高頻踩點，CLAUDE.md delta 由 none → modify 可併裁決）。
    7. （haiku-Note）Status 段新摘要插入點與格式對齊既有段。

## 🟢 Minority（未過門檻，保留供參）

- [2/4 — fable+opus] W3 剝 HTML 註解實為**語意放寬**（註解內 script 由 FAIL
  變 PASS）且須限定僅作用於 script 擷取路徑、不波及 anchor 檢查；補
  「inline 腳本體不得含 `</script>`／巢狀註解」護欄測試。
- [2/4 — sonnet+haiku(spike)] Safari <14 無 MQL `addEventListener`——
  try/catch 降級後即時跟隨靜默失效，屬合理退化但應在 PLAN／註解明文承認。
- [1/4 — sonnet] index.html:27-29 硬編 `src/theme.ts:102-105` 行號註解，W1
  改動後必過期——改函式名引用。
- [1/4 — sonnet] 聚焦 toggle 鈕時外部觸發 aria-pressed 變化可能被 SR 主動
  播報——真機驗收 checklist 補項。
- [1/4 — sonnet] `build && verify:dist` 只在 deploy.yml（push main）跑，
  test.yml（DEV/PR 門檻）不建置——Verification 段明講此殘留 gap 免誤讀。
- [1/4 — haiku] inline script 增量宜量化（行數／gzip bytes）再裁 Q3。

## 🔬 Spike candidates

- **[flagged by: fable+opus+sonnet] verify-dist import 化 PoC（建議升格為
  sprint 首任務）**：抽一支 check 函式＋`pathToFileURL` 版 entry guard＋
  JSDoc 型別＋（第三 tsconfig 或 checkJs），跑 `npm test`＋`npm run
  typecheck`＋`node scripts/verify-dist.mjs` 三綠於 Windows 本機與 ubuntu
  CI，確認 import 零副作用、CLI 行為 byte 不變。約 30 分鐘。
- **[flagged by: sonnet+haiku] 測試 harness 擴充最小案**：先寫一條
  storage-clear 案＋一條 matchMedia-change 案跑通擴充後的 fake，再展開矩陣
  （對應 🟡-4）。
- **[flagged by: sonnet+haiku] renormalize 拋棄分支實跑**：定案
  `.gitattributes` 前實跑 `git add --renormalize .` 看 `git diff --stat`，
  確認二進位與 golden 零 diff（對應 🟡-2；fable/opus 實測已預期零 churn，
  此為最後一道實證）。
- **[flagged by: haiku] `storage.clear()` → `event.key === null` 語意**：
  fable 已對規格確證此語意正確，低優先；若 W1 測試含 clear 分支即順帶覆蓋。

## ⚠️ Degraded mode

無降級（4/4 成功）。惟見上方同 vendor 揭露。
