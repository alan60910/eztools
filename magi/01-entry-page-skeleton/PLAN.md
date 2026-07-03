# 建立入口頁面與專案骨架

> Type: feat  •  Scale: major  •  Artifact: PLAN.md
> Revised: 2026-07-02 — 依 MAGI plan review round 1（5 reviewer）修訂

## Context
EZTools 是純靜態的網頁工具合集（APNG→GIF、GIF 編輯、影片轉檔），由
GitHub Pages 直接託管（remote 已確認：`alan60910/eztools`，project page，
網址 `https://alan60910.github.io/eztools/`）。目前 repo 只有文件、沒有任
何程式碼。本 sprint 建立可持續擴充的專案骨架（建置工具、目錄結構、測試
框架、部署流程），並完成第一個可見成果：入口頁面。

## Goals & Non-Goals

### Goals
- 建立 TypeScript 專案骨架：package.json（含 lockfile）、tsconfig、
  .gitignore、建置設定
- 入口頁面（index.html）：**靜態優先** — 建置期由 `src/tools.ts` 注入三個
  工具（APNG→GIF、GIF 編輯、影片轉檔）的清單，標示「規劃中」；JS 停用
  時仍完整可讀
- 確立「每工具一資料夾」的完整慣例：入口自動掛入（glob）、工具邏輯落點、
  共用導覽與樣式的消費方式（供未來 sprint 直接套用）
- 測試框架就緒：`vitest run` 一次性執行，對入口頁渲染函式做斷言
- GitHub Actions 自動建置並部署到 GitHub Pages（含完整 permissions/
  environment 設定與一次性 Pages 前置設定）
- 同步 README 的 Installation/Usage 為實際指令

### Non-Goals
- 不實作任何工具功能（APNG→GIF 等留給後續 sprint）
- 不引入 ffmpeg.wasm 等重量級依賴（見「已知限制與前瞻註記」）
- 不做 i18n、深色模式等入口頁進階功能

## Design options considered

### 選項 A：無打包工具（純 HTML + tsc 編譯）
- 成本：最低，零依賴。
- 風險：未來工具需要打包 WebAssembly 資源、拆分模組時會很痛苦；沒有
  dev server 與 HMR，開發體驗差。

### 選項 B：Vite 多頁面應用（MPA）+ vanilla TypeScript（推薦）
- 成本：低。依賴精簡（vite + typescript + vitest），設定少。
- 風險：低。Vite 產出純靜態檔案，符合 GitHub Pages 限制；MPA 讓每個工具
  是獨立入口頁。注意：MPA 入口需註冊於 `rollupOptions.input`，本計畫以
  glob 自動探索解決（見 Recommended approach），使「新增工具＝新增資料夾
  ＋在 tools.ts 登記一筆」成立（誠實的兩步驟，非零設定）。
- wasm 注意：Vite 打包 wasm 資源沒問題，但 ffmpeg.wasm 多執行緒版需
  SharedArrayBuffer（COOP/COEP header），是 **GitHub Pages 平台限制**、
  非打包工具問題 — 見「已知限制與前瞻註記」。

### 選項 C：SPA 框架（React/Vue + router）
- 成本：中高。工具彼此獨立、共享狀態極少，SPA 優勢用不上；bundle 變大。

### 選項 D：Astro / SvelteKit static 等靜態站框架
- Astro 的「多頁靜態＋互動島」形態確實貼合本專案，但多一層框架與心智
  成本；工具本體是重客戶端邏輯（canvas/wasm），vanilla TS + Vite 更直接。
  故不採，但記錄於此供未來重新評估。

**推薦選項 B**：Vite MPA + vanilla TypeScript。

## Recommended approach

建議實作順序：**先跑最小部署（步驟 5，placeholder 頁）打通 CI 未知數，
再實作入口頁**（步驟 3-4），最後補文件（步驟 6）。

1. **專案初始化**
   - `package.json`：`"type": "module"`；scripts：`dev` / `build` /
     `preview` / `test`（**`"test": "vitest run"`**，另設 `test:watch`）；
     `engines` 釘 Node 版本
   - devDependencies：`vite`、`typescript`、`vitest`、`@types/node`
   - `tsconfig.json`（browser、strict、noEmit）＋ `tsconfig.node.json`
     （vite.config 用）
   - `.gitignore`（`node_modules/`、`dist/`）；**提交 `package-lock.json`**
2. **目錄結構慣例**（本 sprint 的核心交付之一，將固化進 SPEC 與 CLAUDE）
   ```
   index.html              # 入口頁（建置期注入清單，靜態輸出）
   src/
     tools.ts              # 工具清單資料 —— 唯一事實來源
     render.ts             # 清單 → HTML 字串的純函式（供 plugin 與測試）
     style.css             # 共用樣式（含 a11y 基線）
     lib/                  # 未來跨工具共享程式碼的落點
   tools/
     <tool-slug>/
       index.html          # 工具頁入口（glob 自動掛入，不改 vite.config）
       main.ts             # 工具邏輯（與 HTML 共置）
     _probe/index.html     # 本 sprint 的巢狀路徑驗證頁（兼作工具頁範本）
   vite.config.ts          # base: './'；glob 掃描 tools/*/index.html 組 input
   .github/workflows/deploy.yml
   ```
   - **入口註冊**：`vite.config.ts` 以 glob 掃描 `tools/*/index.html` 自動
     產生 `rollupOptions.input` — 新增工具不需改建置設定
   - **新增工具的慣例（兩步驟）**：新增 `tools/<slug>/` 資料夾 ＋ 在
     `src/tools.ts` 登記一筆（名稱、描述、路徑、狀態）
   - **工具頁範本**（以 `_probe` 示範並固化）：`<html lang="zh-Hant">`、
     返回入口的相對路徑連結（`../../`）、`main.ts` 中
     `import '../../src/style.css'` 消費共用樣式
   - **base 採 `'./'` 相對路徑**：去除 repo 名稱耦合（改名/自訂網域免改）；
     以 `_probe` 頁驗證巢狀資源解析，若有邊角問題則退回 `'/eztools/'`
3. **入口頁面（靜態優先）**
   - 自訂小型 Vite plugin 以 `transformIndexHtml` 在建置/開發期呼叫
     `render.ts`，把 `tools.ts` 清單注入 `index.html` — 產出為純靜態
     HTML，**不依賴客戶端 JS**，JS 停用/失敗時清單仍完整可見
   - a11y 規範：「規劃中」工具為**不可聚焦的非連結元素**（不產生指向
     404 的 `<a>`），狀態以可見文字標籤「規劃中」傳達（不得僅靠顏色）；
     `<html lang="zh-Hant">`、`<title>`、`meta description`、`meta viewport`
   - 純手寫極簡 CSS（**拍板：不引入 CSS 框架**），`style.css` 內建 a11y
     基線：保留 `:focus-visible`、文字/狀態對比達 WCAG AA、
     `prefers-reduced-motion`、輕量 reset
4. **測試**：`render.ts` 為純函式（清單入、HTML 字串出），vitest（node
   環境，無需 jsdom）斷言：卡片數量、「規劃中」項目不產生連結、狀態
   標籤存在。
5. **部署**（`.github/workflows/deploy.yml`）
   - **一次性手動前置**：repo Settings → Pages → Source 設為
     「**GitHub Actions**」（workflow 檔無法代勞，未設定則部署必失敗）
   - workflow：trigger `push` to `main` ＋ `workflow_dispatch`；
     `permissions: { contents: read, pages: write, id-token: write }`；
     `concurrency: pages` 群組；build job（checkout → `actions/setup-node`
     釘 Node 版本＋`cache: npm` → `npm ci` → `npm run build` →
     `actions/upload-pages-artifact` 上傳 `dist/`）→ deploy job
     （`environment: github-pages`、`actions/deploy-pages`）；actions 釘版
   - **分支策略（已採定）**：`DEV` 為開發分支，`main` 為部署分支；
     DEV→main 合併即發布。`github-pages` environment 預設僅允許 default
     branch（main），與此策略一致。
6. **文件同步**：更新 README 的 Installation（`npm install`）與 Usage
   （`npm run dev` / `build` / `test`），避免門面文件與骨架脫節。

## 已知限制與前瞻註記（不在本 sprint 範圍，但影響骨架決策）

- **ffmpeg.wasm × GitHub Pages**：多執行緒核心（`@ffmpeg/core-mt`）需
  `SharedArrayBuffer` → 需 COOP/COEP header，而 **GitHub Pages 無法自訂
  HTTP header**。未來影片轉檔 sprint 動工前必須先做 spike：實測單執行緒
  核心效能、或以 `coi-serviceworker` 於 root 注入 header（會影響 SW scope
  與 base 設定）。此註記將寫入 TECHSTACK Constraints；骨架不預先實作，
  但 root 保留放置 Service Worker 的可能性。

## Open questions
（無 — round 1 審查後全部收斂：repo 名稱已由 remote 確認；分支策略採
DEV 開發/main 部署；CSS 拍板純手寫＋a11y 基線。若對「已採定」決策有
異議請提出。）

## Spec deltas

### root `SPEC.md`
- **Section: Architecture overview** — modify
  Why: 補上打包工具與 MPA 結構的具體決定，並記錄部署管線。
  New content: Vite MPA + vanilla TS、glob 自動入口、「main push → GitHub
  Actions build → deploy-pages」的 CI/CD 部署管線。
- **Section: Components** — modify
  Why: 入口頁面從「規劃中」變為已實作元件。
  New content: 入口頁面（建置期靜態注入）、tools.ts 資料模組、render.ts。
- **Section: Public surface** — modify
  Why: 入口頁 URL、`tools/<slug>/` 路徑慣例與 base 設定即對外契約。
  New content: 站台 URL、每工具 `tools/<slug>/` 的路徑慣例、相對 base。
- **Section: Conventions** — modify
  Why: 確立目錄結構與新增工具的兩步驟慣例。
  New content: 檔案佈局、glob 自動掛入、tools.ts 登記、工具頁範本
  （lang/返回連結/樣式消費）、CSS 策略（手寫＋a11y 基線）。
- **Section: Status** — modify
  Why: 專案從「尚未有程式碼」進入「骨架與入口頁完成」。
  New content: 骨架完成、三工具待開發、部署管線運作中。

### root `CLAUDE.md`
- **Section: Run / test commands** — modify
  Why: 專案骨架建立後有了實際指令。
  New content: `npm run dev` / `npm run build` / `npm test`（vitest run）。
- **Section: Conventions** — modify
  Why: agent 最常讀 CLAUDE.md，掛載新工具的慣例需同步於此。
  New content: 新增工具兩步驟慣例、工具頁範本要點、CSS 策略。
- **Section: Workflow rules** — modify
  Why: push 到 main 會觸發正式部署，是 agent 的實質工作流約束。
  New content: 「push/merge 到 main 會自動部署至 GitHub Pages；日常開發
  在 DEV 分支」。

### magi/`PRD.md`
(none)

### magi/`TECHSTACK.md`
- **Section: Framework / runtime** — modify
  Why: 打包工具從「待定」確定為 Vite（MPA 模式）。
  New content: Vite + vanilla TypeScript，MPA 多入口（glob 自動探索）。
- **Section: Test framework** — modify
  Why: 測試框架從「待定」確定為 vitest。
  New content: vitest（`vitest run` 一次性執行）。
- **Section: Deployment** — modify
  Why: 部署由「GitHub Pages（靜態託管）」細化為具體管線。
  New content: GitHub Actions（setup-node → build → upload-pages-artifact
  → deploy-pages）自動部署至 GitHub Pages；Pages Source = GitHub Actions。
- **Section: Constraints** — modify
  Why: 記錄 GitHub Pages 無法自訂 header 的平台限制及其對 wasm 的影響。
  New content: 無法送 COOP/COEP → SharedArrayBuffer 受限；ffmpeg.wasm
  多執行緒需 coi-serviceworker workaround 或改用單執行緒核心（待 spike）。

## Verification
- `npm test`（= `vitest run`）一次性執行並通過：render 函式斷言（卡片數、
  規劃中項目無連結、狀態標籤存在）
- `npm run build` 產出純靜態 `dist/`；**`npm run preview` 本機驗證**：
  入口頁與 `tools/_probe/` 巢狀頁的 CSS/JS 資源皆無 404（base 驗證左移，
  不等部署後才發現）
- 瀏覽器停用 JS 後開啟入口頁，工具清單仍完整可見（靜態優先驗證）
- 鍵盤 Tab 遍歷入口頁：焦點可見；「規劃中」項目不可聚焦、不產生連結
- 一次性前置完成：repo Settings → Pages → Source = GitHub Actions
- DEV 合併至 main 後，GitHub Actions 部署成功，
  `https://alan60910.github.io/eztools/` 開啟無資源 404
- README 的 Installation/Usage 已更新為實際指令
