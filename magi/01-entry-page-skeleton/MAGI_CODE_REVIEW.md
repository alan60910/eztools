# 🧠 MAGI Code Review — DEV @ f4d6b45（全部新增檔 vs 空基線）

**Diff scope:** 全部未追蹤新檔（repo 僅 Initial commit；排除 package-lock.json 與 magi/01-*/ 流程文件）
**Contract:** magi/01-entry-page-skeleton/PLAN.md（2026-07-02 修訂版） • **Date:** 2026-07-02

## Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  VERDICT: APPROVE-WITH-NITS（4/5；R4 投 REQUEST-CHANGES）│
├──────────────────────────────────────────────────────────┤
│  Mode: supermajority    Threshold: 3.34（即 ≥4/5 票）     │
│  OK weight: 5 / 5       Degraded: no                     │
├──────────────────────────────────────────────────────────┤
│  ✅ R1-架構  ✅ R2-前端  ✅ R3-CI  ✅ R4-測試  ✅ R5-契約 │
│  R1:AWN  R2:AWN  R3:AWN  R4:RC  R5:AWN                   │
├──────────────────────────────────────────────────────────┤
│  🔴 Critical: 0     🟡 Important (adopted): 1            │
│  🟢 Minority: 20    Drift: A×2  B×4  C×5                 │
└──────────────────────────────────────────────────────────┘
```

> 面板組成同 plan review：5 個獨立 Claude reviewer 實例、視角分工（無跨廠商驗證）。
> 視角分工使議題集中於單一鏡頭，2–3 票的跨視角收斂項實務上仍是強訊號。
> 多位 reviewer 有實跑 test/tsc/build 並實測宣稱（如 `--passWithNoTests` exit 0、
> `{ main: ...spread }` 覆蓋語意、對比驗算），非純閱讀式審查。

## Verdict

**APPROVE-WITH-NITS** — 無 Critical、無阻擋合併的缺陷。五位一致確認：交付本體正確
（靜態優先入口頁經 dist 實證零 JS 零 `<a>`、a11y 契約逐條落實且對比可驗算、部署
workflow 為官方 canonical pattern、glob 掃描邊界處理正確、測試 5/5 綠、tsc 乾淨）。
R4 的 REQUEST-CHANGES 集中於「測試未接到閘門上」——該憂慮被 R1/R3 以 Important
呼應（3/5，見 minority 強訊號），建議合併前低成本補上。

## 🔴 Critical (adopted)

（無）

## 🟡 Important (adopted)

- **[vote: 4/5 — R1(A) + R2(C) + R4(Issue+A) + R5(Issue+A)] `--passWithNoTests` 於真測試落地後殘留**
  - Where: package.json:13
  - PLAN 明訂 `"test": "vitest run"`；旗標是 M1 無測試時的權宜（WORKS 有記錄），
    T3.1 後未回收。R4 實測：測試檔 glob 匹配不到時 exit 0 靜默全綠 —— 重命名/搬移/
    誤 exclude 測試檔都不會紅燈。
  - Suggested fix: 移除 `--passWithNoTests`。

## 🟢 Minority（未達 4 票；依票數分組）

### 跨視角收斂（2–3 票，強訊號）

- **[vote: 3/5 — R1+R3+R4] CI／建置無任何品質閘門**（Important ×3）
  - deploy.yml 只 `npm ci → npm run build`；`vite build` 走 esbuild 不做型別檢查，
    vitest 不在 CI。型別回歸與測試紅燈都不會擋部署。三位不約而同指出此 workflow
    是未來所有工具 sprint 的模板，「無閘門」會被固化。
  - Fix: 新增 `"typecheck"` script（tsc --noEmit 雙 tsconfig），CI build 前跑
    `npm test` ＋ typecheck；同步補 PLAN 步驟 5。
- **[vote: 3/5 — R1+R4+R5] 資料夾／tools.ts／slug-path 三者一致性無自動防護**（Note）
  - 顯示清單（tools.ts）與被建置頁面（資料夾掃描）雙事實來源：available 但無資料夾
    → 上線 404 連結；path 與 slug 對應純靠人工。R1 建議建置期交叉檢查（available
    無對應 slug 即 throw），R4 建議 invariant 測試（path === './tools/'+slug+'/'）。
- **[vote: 2/5 — R1+R5] `_probe` 隨站部署到正式站**（Note）
  - 掃描不排除底線資料夾，`/tools/_probe/` 公開可達。屬本 sprint 刻意設計但未表態
    長期去留。Fix: 掃描時略過 `_` 開頭，或在 SPEC 明記「隨站發布屬預期」。

### 單一視角（1 票）

**架構（R1，皆經實測）**
- `rollupOptions.input` 以資料夾名當 key，`tools/main/` 會靜默覆蓋根入口（Important；
  spread 覆蓋語意已實測）。Fix: key 加前綴（`tool-${slug}`）或撞名即 throw。
- `html.replace(str, str)` 的 `$` 特殊序列會被誤解（Note；已實測 `$&` 展開）。
  Fix: 改函式取代器 `() => renderToolList(tools)`，零行為變更。

**前端 a11y（R2）**
- 全域 `list-style: none` 使 Safari/VoiceOver 移除清單語意（Important）。
  Fix: render.ts 的 `<ul class="tool-list">` 加 `role="list"`。
- `minmax(260px, 1fr)` 在 <308px 視窗水平溢出（Note）→ `minmax(min(260px,100%),1fr)`。
- `_probe` 範本無 `<main>` 地標與 meta description，缺口會被未來工具頁複製（Note）。
- 缺 favicon，每次載入 404（Note）；`.tool-link` 樣式與全域 `a[href]` 重複（Note）。

**CI（R3）**
- **首 commit 務必包含 package-lock.json**——`npm ci` 與 `cache: npm` 缺它雙雙硬失敗
  （Note，但為首次部署最大失敗點；lockfile 已驗證與 package.json 同步）。
- 未用 configure-pages `enablement: true` 自動啟用 Pages（Note；手動前置已記載，屬取捨）。
- node-version 24 為大版本浮動釘；actions 用 tag 而非 SHA；.gitignore 可補
  `.env*.local`/`*.log`（皆 Note）。

**測試（R4）**
- 注入 plugin 與 discoverToolEntries 零測試；佔位符不匹配時 `replace` 原樣返回，
  會**靜默出貨空清單**（Important）。Fix: 加注入測試斷言結果含 tool-list 且佔位符已消費。
- 真實 tools.ts 資料零斷言（fixture-only）；available 分支 exact-string 脆弱斷言；
  escapeHtml 五分支僅測二（皆 Note）。

**契約（R5）**
- SPEC deltas 部分落地（見 DRIFT A-2，coordinator 已複核屬實）（Important）。
- SPEC Status「CI 部署流程」措辭較實況樂觀（workflow 已寫、從未跑過）（Note）。
- 樣式消費雙軌（入口頁 `<link>` vs 工具頁 import）有原則但未寫成慣例（Note）。

## Untested paths
- vite.config.ts：discoverToolEntries、inject-tool-list plugin — flagged by R1, R4
- src/tools.ts 實際資料（fixture-only 測試）— flagged by R4
- 部署 workflow 端到端 — 從未執行（T2.2 使用者關卡）— flagged by R3, R5

## 附註
- WORKS.md M4 條目「全部 Spec deltas 均已落地」經複核為過度陳述，更正記錄已附加於
  WORKS.md（append-only，原條目保留）。
