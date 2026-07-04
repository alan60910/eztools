# Tech stack

## Language(s)
- TypeScript

## Framework / runtime
- 純靜態前端網頁（瀏覽器端執行，無後端）
- Vite 8.1.3 + vanilla TypeScript 6（strict、ESM）；Node >= 22（engines）
- MPA：`vite.config.ts` 以函式 `discoverToolEntries` 自動掃描
  `tools/*/index.html` 組成 `rollupOptions.input`；`base: './'`（相對路徑）
- inline plugin `inject-tool-list`：於 `transformIndexHtml` 建置／開發期將
  `src/tools.ts` 清單經 `src/render.ts` 注入根 `index.html`（靜態優先，
  入口頁零 JS）
- runtime dependencies：`apng-js@1.1.5`／`gifenc@1.0.3`（exact pin、MIT、
  零 transitive 依賴）；`gifuct-js@2.1.2`（exact pin、MIT、自帶型別、
  一顆 transitive dep `js-binary-schema-parser@^2.0.3`——lockfile 鎖定
  解析版、MIT、零下游）；gifenc 無官方型別，專案自備 ambient 宣告
  `src/lib/gifenc.d.ts`
- 工具頁 CPU 密集的編碼／轉檔運算採 module Web Worker，幀資料以
  Transferable 轉移（無-SAB 約束見下方 Constraints，不重述）

## Database / storage
- 無（所有處理在瀏覽器端記憶體中完成）

## Deployment
- GitHub Pages（靜態託管），project page：https://alan60910.github.io/eztools/
  （首次部署待使用者完成前置設定）
- `.github/workflows/deploy.yml`：push `main` ＋ workflow_dispatch 觸發；
  permissions `contents:read`／`pages:write`／`id-token:write`；concurrency
  group `pages`；build job（checkout@v4 → setup-node@v4 node24、cache npm →
  npm ci → build → upload-pages-artifact@v3 dist）→ deploy job
  （environment `github-pages`、deploy-pages@v4）
- 分支策略：DEV 開發、main 部署（merge 即發布）
- 前置需求（一次性）：GitHub Settings → Pages → Source = GitHub Actions

## Test framework
- vitest 4.1.9（`npm test` = `vitest run --passWithNoTests`）

## Constraints
- 產出必須是純靜態檔案，可直接由 GitHub Pages 託管
- 不得依賴任何後端服務或伺服器端 API
- 檔案處理（轉檔、編輯）皆在瀏覽器端完成（可能需要 WebAssembly，如 ffmpeg.wasm）
- GitHub Pages 無法自訂 HTTP header，因此無 COOP/COEP，`SharedArrayBuffer`
  不可用；未來若 ffmpeg.wasm 採多執行緒版本，需 `coi-serviceworker`
  workaround 或改用單執行緒核心，動工前需先 spike 驗證
