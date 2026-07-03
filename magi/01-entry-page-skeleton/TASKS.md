# Tasks — 建立入口頁面與專案骨架

> Source: PLAN.md（2026-07-02 修訂版）   •   Sprint: magi/01-entry-page-skeleton/

## Milestone 1: 專案骨架與建置管線
**Goal:** `npm run dev / build / preview` 可運作，glob 自動入口與相對 base 經 `_probe` 巢狀頁驗證無誤。
**Acceptance:** `npm run build` 產出 `dist/`；`npm run preview` 下入口 placeholder 與 `tools/_probe/` 的 CSS/JS 資源皆無 404。

- [x] T1.1 — 專案初始化：`package.json`（`"type": "module"`、scripts `dev`/`build`/`preview`/`test`=`vitest run`/`test:watch`、`engines` 釘 Node 版本）、devDependencies（`vite`、`typescript`、`vitest`、`@types/node`）、`.gitignore`（`node_modules/`、`dist/`）；執行 `npm install` 並**提交 `package-lock.json`**；`tsconfig.json`（browser、strict、noEmit）＋ `tsconfig.node.json`（vite.config 用）
- [x] T1.2 — `vite.config.ts`：`base: './'`；以 glob 掃描 `tools/*/index.html` 自動組 `rollupOptions.input`（新增工具不需改設定）。測試：放入臨時假資料夾確認被自動收錄後移除
- [x] T1.3 — 工具頁範本 `tools/_probe/`（`index.html`：`lang="zh-Hant"`、返回入口的 `../../` 相對連結；`main.ts`：`import '../../src/style.css'`）＋最小 `src/style.css` stub 與根 `index.html` placeholder。驗證：`npm run build && npm run preview`，`_probe` 巢狀頁共用資源無 404（base 驗證左移）

## Milestone 2: 部署管線打通（最小端到端）
**Goal:** 以 M1 骨架先打通 CI 唯一無法本機驗證的環節，再回頭做入口頁。
**Acceptance:** 合併 DEV→main 後 GitHub Actions 部署成功，`https://alan60910.github.io/eztools/` 與 `/tools/_probe/` 開啟無資源 404。

- [x] T2.1 — `.github/workflows/deploy.yml`：trigger `push` to `main` ＋ `workflow_dispatch`；`permissions: { contents: read, pages: write, id-token: write }`；`concurrency` pages 群組；build job（checkout → `actions/setup-node` 釘版＋`cache: npm` → `npm ci` → `npm run build` → `actions/upload-pages-artifact` 上傳 `dist/`）→ deploy job（`environment: github-pages`、`actions/deploy-pages`）；所有 actions 釘定版本
- [ ] T2.2 — 部署驗證（**含使用者手動步驟**）：(a) 一次性前置：repo Settings → Pages → Source 設為「GitHub Actions」（僅 repo 管理者可做）；(b) 經使用者確認後合併 DEV→main 觸發首次部署；(c) 驗證站台與 `_probe` 巢狀頁無 404

## Milestone 3: 入口頁面（靜態優先 + a11y）
**Goal:** 入口頁在建置期靜態注入三工具卡片，JS 停用仍完整可用，a11y 合規，渲染邏輯有測試保護。
**Acceptance:** `npm test` 通過；停用 JS 後清單完整可見；Tab 遍歷焦點可見且「規劃中」項目不可聚焦。

- [x] 🔀 [A] T3.1 — `src/tools.ts`（工具清單資料與型別：名稱、描述、路徑、狀態；三工具皆「規劃中」）＋ `src/render.ts`（清單→HTML 字串純函式：「規劃中」項目**不產生 `<a>`**、含可見文字標籤「規劃中」）；vitest 測試（node 環境）：卡片數量、規劃中項目無連結、狀態標籤存在
- [x] 🔀 [B] T3.2 — `src/style.css` 完整版：a11y 基線（保留 `:focus-visible`、文字/狀態對比 WCAG AA、`prefers-reduced-motion`、輕量 reset）＋入口頁卡片版面（不引入 CSS 框架）
- [x] T3.3 — 根 `index.html` 本體（`lang="zh-Hant"`、`<title>`、`meta description`、`meta viewport`）＋自訂小型 Vite plugin（`transformIndexHtml` 於建置/開發期呼叫 `render.ts` 注入清單，靜態輸出）。驗證：停用 JS 清單可見；`npm run preview` 無 404；鍵盤 Tab 遍歷檢查（依賴 T3.1）

## Milestone 4: 文件同步（Spec deltas 落地）
**Goal:** 專案級文件與骨架一致，兌現 PLAN 宣告的 Spec deltas。
**Acceptance:** 文件內容與實際骨架相符；`/magi:commit` 的 delta 比對可通過。

- [x] 🔀 [A] T4.1 — 更新 `README.md`：Installation（`npm install`）、Usage（`npm run dev` / `build` / `test`）
- [x] 🔀 [B] T4.2 — 依 PLAN `## Spec deltas` 逐條更新：root `SPEC.md`（Architecture overview／Components／Public surface／Conventions／Status）、root `CLAUDE.md`（Run-test commands／Conventions／Workflow rules）、`magi/TECHSTACK.md`（Framework／Test framework／Deployment／Constraints 含 ffmpeg.wasm × COOP/COEP 前瞻註記）

---
備註：
- 任務順序即依賴順序：M1 → M2 → M3 → M4；M2 完成前不動入口頁（先收斂 CI 未知數）。
- 🔀 lanes 檔案互斥：T3.1（src/tools.ts、src/render.ts、tests）vs T3.2（src/style.css）；T4.1（README.md）vs T4.2（SPEC/CLAUDE/TECHSTACK）。
- T2.2 含 agent 無法代做的手動步驟（Pages Source 設定、合併 main 的確認），派工時需回報使用者。
