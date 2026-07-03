# SPEC

Architecture and feature spec, kept in sync with the codebase. Updated by
`/magi:commit` when project-level changes warrant it.

## Architecture overview
EZTools 是一個純靜態的網頁工具合集，以 TypeScript 開發，部署於 GitHub Pages。
沒有後端伺服器，所有檔案處理（圖片轉換、GIF 編輯、影片轉檔）皆在使用者的
瀏覽器端完成。以 Vite 建置為 MPA（Multi-Page Application）：入口頁面
（`index.html`）靜態列出所有工具，零 JS；各工具為 `tools/<slug>/` 下的
獨立頁面，建置時自動掃描收錄。入口頁清單於建置／開發期由 `src/tools.ts`
（唯一資料來源）經 `src/render.ts` 注入 HTML。部署管線：push/merge 到
`main` 觸發 GitHub Actions：`npm ci` → typecheck/test → `vite build` →
`actions/deploy-pages` 部署 `dist/` 至 GitHub Pages。

## Components
- 入口頁面 — 工具總覽與導覽（靜態產生，依 `available`／`planned` 狀態產生卡片）
- 工具清單資料模組 `src/tools.ts`（唯一事實來源，定義各工具中繼資料與狀態）
- 渲染模組 `src/render.ts`（依清單資料產生入口頁 HTML 的純函式）
- 工具頁範本 `tools/_probe/`（新增工具的起始骨架範本）
- APNG → GIF 轉換工具 — 瀏覽器端 apng-js 解碼 → 純函式合成（composite）→
  gifenc 編碼（module Web Worker）；位於 `tools/apng-to-gif/`
- GIF 編輯工具：頁數編輯、時間停留等基礎功能（規劃中）
- 影片格式轉換工具，如 MKV → MP4（規劃中）

## Public surface
- 靜態網頁（GitHub Pages 託管的 HTML/CSS/JS）
- 站台網址：https://alan60910.github.io/eztools/（首次部署待使用者完成前置設定）
- 每工具路徑慣例：`tools/<slug>/`（如 `/tools/apng-to-gif/`）
- 資產採相對 base（`base: './'`），站台可搬移不需改建置

## Conventions
- TypeScript（strict、ESM）
- 純前端處理，不依賴任何後端 API
- 新增工具兩步驟：建立 `tools/<slug>/`（含 `index.html` + `main.ts`，自動被
  build 收錄）＋在 `src/tools.ts` 登記一筆（狀態 `planned` → `available`
  時卡片才會產生連結）
- 工具頁範本要點：`lang="zh-Hant"`、`../../` 返回入口連結、`main.ts` 以
  `import '../../src/style.css'` 消費共用樣式（入口頁因零 JS 改以 `<link>`
  消費）——以 `tools/_probe/` 為範本
- 樣式策略：純手寫 CSS、不引入框架，a11y 基線（`:focus-visible`、WCAG AA、
  `prefers-reduced-motion`）全站適用
- a11y 實作細節：「規劃中」工具卡不產生 `<a>`、不可聚焦，狀態以可見文字標籤傳達
- 工具頁 CPU 密集的「編碼／轉檔運算」採 module Web Worker（合成等前處理得
  留主執行緒）；SharedArrayBuffer 不可用之硬約束見 magi/TECHSTACK.md
  Constraints
- 工具頁骨架：header（含返回入口連結）／`<main>`／footer、單一 `<h1>`、
  描述性 `<title>`、meta description
- 互動工具 a11y 不變量：拖放具鍵盤等效（原生 file input 留在 tab
  order）、進度／狀態用 aria-live、動態結果做焦點管理、自動播放媒體可暫停
  ＋尊重 prefers-reduced-motion、資訊性 alt、錯誤用 role=alert；暫停控制
  與靜態 poster 須在媒體開始播放當下即可用（不得延後至後續流程階段）；
  live region 須常駐 a11y tree（不得以 display:none／hidden 切換承載播報）
- 工具可含多模組切分（如 decode/composite/convert/worker），純邏輯模組須
  為 node 可測（不 import DOM runtime）

## Status
入口頁骨架已完成（Vite MPA 架構、工具清單注入機制、a11y 基線）。部署
workflow 已就緒（首次部署待 Pages 前置設定與合併 main 驗證）。
apng-to-gif 已可用（第一個工具上線）；規劃中剩 GIF 編輯與影片轉換，
下一候選為 GIF 編輯。
