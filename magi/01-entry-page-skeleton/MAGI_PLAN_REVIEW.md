# 🧠 MAGI Plan Review — 建立入口頁面與專案骨架

**Sprint:** magi/01-entry-page-skeleton/ • **Document:** PLAN.md • **Round:** 1 • **Date:** 2026-07-02

## Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES（4/5 票）                       │
├──────────────────────────────────────────────────────────┤
│  Mode: supermajority    Threshold: 3.34（即 ≥4/5 票）     │
│  OK weight: 5 / 5       Degraded: no                     │
├──────────────────────────────────────────────────────────┤
│  ✅ R1-架構  ✅ R2-前端  ✅ R3-CI  ✅ R4-測試  ✅ R5-契約 │
│  R1:RC  R2:RC  R3:RC  R4:RC  R5:AWN                      │
├──────────────────────────────────────────────────────────┤
│  🔴 Critical: 0     🟡 Important (adopted): 1            │
│  🟢 Minority: 21    🔬 Spikes: 4                          │
└──────────────────────────────────────────────────────────┘
```

> **面板組成說明**：config 僅配置單一 CLI（claude），且使用者要求「多方位審議、
> 不限 3 票」，故本輪以 5 個獨立 Claude reviewer 實例（各帶不同專業視角、權重 1）
> 取代跨 CLI MAGI。無跨廠商交叉驗證；但視角彼此獨立，重疊議題仍具交叉驗證效力。
> 另因視角分工，議題天然集中於單一鏡頭，supermajority 門檻（≥4 票）較難達成 —
> 「🟢 少數意見」中 2–3 票的跨視角收斂項實務上仍是強訊號，請勿視為雜訊。

## Verdict

**REQUEST-CHANGES**（R1 架構、R2 前端、R3 CI、R4 測試 均要求修改；R5 契約為 APPROVE-WITH-NITS）

五位 reviewer 一致認同核心選型（Vite MPA + vanilla TypeScript + vitest + GitHub
Pages）方向正確、範圍克制。要求修改的原因集中於三類：
1. **部署段落過度濃縮**：缺 Pages Source 前置設定、workflow permissions/
   environment、package-lock.json — 缺任一項首次部署必失敗（R1/R3/R4 收斂）。
2. **本 sprint 的核心承諾「確立可套用慣例」有留白**：MPA 入口註冊機制、工具邏輯
   與共享碼落點、共用導覽/樣式消費方式（R1/R2/R4 收斂）。
3. **入口頁客戶端渲染的取捨未被評估**（R2），以及 ffmpeg.wasm 在 GitHub Pages
   的 SharedArrayBuffer 硬限制未入論證（R1/R4）。

均屬計畫層面可窄幅修正的項目，無需推翻架構。

## 🔴 Critical (adopted)

（無）

## 🟡 Important (adopted)

- **[vote: 4/5 — R1(1) + R3(1) + R4(1) + R5(1)] [deltas] 部署管線這一新架構事實未宣告於 Spec deltas**
  - Where: PLAN.md `## Spec deltas`（TECHSTACK Deployment、root SPEC.md）
  - 本 sprint 新增 GitHub Actions + `actions/deploy-pages` 的 CI/CD 部署管線，是
    技術棧與架構層級「由未明變已定」的事實，但 deltas 只更新了 TECHSTACK 的
    Framework/Test framework 與 SPEC 的四個章節，獨漏部署管線。
  - Suggested fix: 增列 TECHSTACK **Deployment — modify**（GitHub Actions 自動建
    置 dist/ 並部署至 GitHub Pages）；SPEC 的 Architecture overview（或新增
    Deployment 小節）補記「main push → build → deploy-pages」管線。
  - Reviewer details: R1 併同建議記錄 base-path 部署慣例；R4 強調部署流程是後續
    sprint 與維運都會參照的架構事實；R5 判定現有 Deployment 文字未錯、屬精確度補強。

## 🟢 Minority（未達 4 票門檻；依票數與主題分組）

### 跨視角收斂（2–3 票，強訊號）

- **[vote: 3/5 — R1+R3+R4] deploy workflow 缺 `actions/deploy-pages` 必要設定**（Important）
  - 需 `permissions: {pages: write, id-token: write, contents: read}`、
    `environment: github-pages`、`upload-pages-artifact(dist)` → `deploy-pages`
    job 結構、`concurrency` 群組。缺任一項部署直接失敗。
- **[vote: 2/5 — R3+R4] repo Settings → Pages → Source 須一次性手動設為「GitHub Actions」**（Important；R5 亦以 spike 提出）
  - 此前置無法由 workflow 檔完成，未設定則 deploy job 必失敗、Verification 永不可達。
- **[vote: 2/5 — R1+R4] 「加一個資料夾即掛入」對 Vite MPA 不成立**（Important）
  - MPA 需在 `rollupOptions.input` 註冊每個 HTML 入口；且 `src/tools.ts` 與
    `vite.config.ts` 形成雙重事實來源。建議以 glob 自動探索 `tools/*/index.html`
    或誠實改寫慣例為兩步驟。
- **[vote: 2/5 — R1+R2] 目錄慣例只定義一半**（Important）
  - 工具 TS 邏輯與共享程式碼落點未定（R1）；工具頁共用導覽/header/footer 與
    `style.css` 的消費方式未定（R2）。留白會使後續每個工具 sprint 各自發明。
    建議補「工具頁範本」＋共享碼佈局（如 `tools/<slug>/main.ts` 共置、共享碼進 `src/lib/`）。
- **[vote: 2/5 — R3+R4] `npm ci` 需要已提交的 package-lock.json；CI 未釘 Node 版本**（Important）
  - 另需 `.gitignore`（node_modules/、dist/）與 `actions/setup-node`（釘版本＋cache: npm）。
- **[vote: 2/5 — R1+R3] base `/eztools/` 硬編碼耦合 repo 名稱；該 open question 其實已可關閉**（Note）
  - remote 已確認為 `alan60910/eztools`（project page），base 目前正確；可評估
    `base: './'` 相對路徑去除耦合（未來改名/自訂網域皆免改）。
- **[vote: 2/5 — R2+R4] 煙霧測試對象選錯：`tools.ts` 純資料近乎恆真，該測的是渲染輸出**（Note）
  - 渲染測試需 vitest `environment: jsdom/happy-dom`（依賴清單未列）；宜斷言卡片
    數量、「規劃中」項目的非互動性與狀態標記。

### 單一視角（1 票）

- **[R2] 入口頁採客戶端渲染，no-JS/首屏/SEO 全面退化**（Important）— 內容本質是
  靜態清單，建議「靜態優先」：build 階段由 tools.ts 產生靜態 HTML（漸進增強），
  選項比較中完全沒有這條軸線。
- **[R2] 「規劃中」狀態的 a11y 呈現未定義**（Important）— 應為不可聚焦的非連結
  元素＋可見文字標籤（不得僅靠顏色），避免指向 404 的假連結。
- **[R3] 部署綁 main、工作在 DEV，Verification 懸空**（Important）— `github-pages`
  environment 預設僅允許 default branch；需確立 DEV→main 的合併/發布流程並改寫驗收條件。
- **[R4] `npm test` 若為裸 `vitest` 會進 watch 模式卡住驗證**（Important）— 應定義
  `"test": "vitest run"`。
- **[R4] base 路徑驗證可左移**（Important）— `vite preview` 已可在本機重現 base 解析，
  不必等部署後才發現 404。
- **[R5] README Installation/Usage 佔位符將在骨架落地後過時**（Important）— README
  不在四份 delta 追蹤文件內，需在 approach/Verification 增列同步步驟。
- **[R5] [deltas] SPEC `Public surface` 被入口頁 URL/路徑慣例直接觸及卻漏列**（Important；R1 部分重疊）
- **[R1] 選型論證「Vite 對 wasm 支援良好」掩蓋 GitHub Pages 無法設 COOP/COEP header 的硬限制**（Important）— 詳見 Spike S3。
- **[R1] 依賴/設定細節**（Note）— `@types/node`、tsconfig app/node 雙檔、`"type": "module"`。
- **[R1] 設計選項遺漏 Astro**（Note）— 宜補一兩句公允比較說明為何不採。
- **[R2] 手寫 CSS 未規範 a11y 基線**（Note）— `:focus-visible`、AA 對比、
  `prefers-reduced-motion`、輕量 reset。
- **[R2] 缺 `<html lang="zh-Hant">` 與 title/description/viewport**（Note）。
- **[R2] [deltas] 目錄/掛載慣例只進 SPEC 未同步 CLAUDE.md Conventions**（Note）— agent 最常讀的是 CLAUDE.md。
- **[R2] [deltas] 「純手寫 CSS」決策未落 delta，且與 open question #3 自相矛盾**（Note）— 先收斂再記錄。
- **[R5] [deltas] CLAUDE.md Workflow rules 未反映 push-to-main 觸發部署**（Note）— 待分支策略拍板後補。
- **[R5] [deltas] SPEC Architecture overview delta 的 Why「架構從未定…」用字誇大**（Note）— 實際缺口僅打包工具與 MPA 結構。

## 🔬 Spike candidates

- **[flagged by: R1, R4]（R1 並列為正式 Issue）S3 — ffmpeg.wasm 能否在 GitHub Pages 上運作**
  Risk: `@ffmpeg/core-mt` 需 SharedArrayBuffer → 需 COOP/COEP header，而 GitHub
  Pages 無法自訂 header。若假設為假，PRD 旗艦功能「影片轉檔」在既定託管上可能跑
  不起來，host 與骨架（SW 註冊點）決策需回頭重做。
  Validation: 最小 PoC 部署至 Pages，實測 `crossOriginIsolated`、單執行緒核心轉檔、
  `coi-serviceworker` workaround；結論回饋 TECHSTACK Constraints。
- **[flagged by: R1, R2, R3, R4, R5] S2 — Vite MPA 巢狀工具頁（`tools/<slug>/index.html`）在 base 下資源路徑正確且可自動掛入**
  Risk: glob 自動探索不成立則慣例名不副實；巢狀頁在 `/eztools/` 前綴下資源 404
  要到第一個工具 sprint 才發現，慣例需重做。
  Validation: 放一個 dummy `tools/_probe/index.html`，glob 組 input，
  `npm run build && npm run preview` 驗證共用 CSS/JS 與返回連結無 404 後移除。
- **[flagged by: R3]（R5 相近）S1 — 端到端最小部署 spike**
  Risk: Pages source/permissions/environment/base 任一錯誤都只能 push 後才發現。
  Validation: 先以 placeholder index.html + 完整 workflow 跑通
  `https://alan60910.github.io/eztools/`，再實作真正入口頁。
- **[flagged by: R2] S4 — 入口頁「靜態優先 vs 客戶端渲染」最小原型比對**
  Risk: 默認客戶端渲染，實作後才發現 no-JS 空白/FCP 慢，改為 build-time 產生等於重寫。
  Validation: 兩個最小原型比對 JS 停用可用性與首屏內容後定案。

## 建議處置

Round 1。依嚴重度分流：
- **架構層（需在計畫定案）**：入口頁渲染策略（靜態優先 vs CSR）、MPA 入口註冊機制
  （glob）、工具頁慣例補完、ffmpeg.wasm/Pages 限制的前瞻註記。
- **計畫補寫層（幾句話可修）**：部署段落補 permissions/environment/Pages source/
  lockfile/setup-node、`vitest run`、base 驗證左移、分支策略收斂、deltas 補列
  （TECHSTACK Deployment、SPEC Public surface/部署管線、CLAUDE Conventions）、
  README 同步、a11y 基線與 lang/meta。

建議：修訂 PLAN.md 採納上述後再進 `/magi:tasks`；修訂幅度屬窄幅補強，無 Critical
阻斷項，可視需要決定是否複審。
