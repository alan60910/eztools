# Drift — 建立入口頁面與專案骨架
> Source: MAGI 5-reviewer panel（supermajority, ok_weight 5, threshold ≥4/5）  •  Generated: 2026-07-02  •  Status: DETECTED

## A. Contract violations
- [x] ✅已修復（2026-07-02 post-review fix）`test` script 為 `vitest run --passWithNoTests`，PLAN 明訂 `vitest run` — files: `package.json:13`
  [vote 4/5 — R1(A)+R4(A)+R5(A)+R2(C)] 旗標為 M1 權宜、T3.1 真測試落地後未回收；
  測試檔 glob 匹配不到時靜默全綠（R4 實測 exit 0）。
  Proposed PLAN/SPEC update: 移除旗標回歸 PLAN 值；或於 PLAN 步驟 1 註記保留理由。
- [x] ✅已修復（2026-07-02 post-review fix：SPEC 四段補齊，WORKS 更正記錄已附加）PLAN 宣告的 SPEC deltas 僅部分落地，WORKS M4 自述「全部落地」過度 — files: `SPEC.md`, `magi/01-entry-page-skeleton/WORKS.md`
  [vote 1/5 — R5；coordinator 逐條複核屬實，故保留] 缺：Architecture overview 的
  CI/CD 部署管線一句、Components 未列 tools.ts/render.ts、Public surface 缺
  `tools/<slug>/` 路徑慣例與相對 base、Conventions 缺工具頁範本細節與手寫 CSS 策略。
  Proposed PLAN/SPEC update: 補齊 SPEC 四段對應內容；WORKS 更正記錄已附加。

## B. Below-the-contract decisions
- [ ] 依 npm audit 將 vite/vitest/typescript/@types/node 上修至 8.1.3/4.1.9/6.0.3/26.1.0
  [R1+R5；PLAN 未釘版，WORKS 有記錄，audit 0 漏洞] — 背書。
- [ ] 新增 `src/vite-env.d.ts`（CSS side-effect import 的型別支援）[R1+R5] — 必要。
- [ ] render.ts 對 name/description/path 做 HTML escape [R1+R2] — 正面防護。
- [ ] CI 管線未含 test/typecheck 閘門 [R3+R4] — 契約 build job 步驟本就未列，程式忠實
  照做；實務缺口，建議上升到契約層級補列（見 MAGI_CODE_REVIEW 3/5 強共識項）。
- （單票記錄：佔位符 token `<!--tool-list-->` 自選 [R5]、transformIndexHtml
  `order:'pre'` [R1]、engines 範圍式 `>=22` [R5]、`color-scheme: light` [R2]）

## C. Out-of-scope observations
- [ ] `_probe` 隨站部署至正式站的長期去留未表態 [R1+R5]
- [ ] 首個 commit 務必包含 package-lock.json，否則 `npm ci`/`cache: npm` 雙雙硬失敗 [R3]
- [ ] 專案無 lint/format 工具與對應 CI 檢查 [R4]
- [ ] README License 段為佔位符 [R5]
- [ ] footer 與 header 標語語意重複 [R2]
