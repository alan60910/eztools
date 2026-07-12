# SPEC

Architecture and feature spec, kept in sync with the codebase. Updated by
`/magi:commit` when project-level changes warrant it.

## Architecture overview
EZTools 是一個純靜態的網頁工具合集，以 TypeScript 開發，部署於 GitHub Pages。
沒有後端伺服器，所有處理（媒體轉換／編輯與開發者小工具之設定產生）皆在使用者的
瀏覽器端完成。以 Vite 建置為 MPA（Multi-Page Application）：入口頁面
（`index.html`）靜態列出所有工具；入口頁零框架 JS，唯一例外為 `<head>`
內主題切換 inline script（零依賴、零網路請求，白名單受 verify-dist
斷言把關）；各工具為 `tools/<slug>/` 下的獨立頁面，建置時自動掃描收錄。入口頁清單於建置／開發期由 `src/tools.ts`
（唯一資料來源）經 `src/render.ts` 注入 HTML。部署管線：push/merge 到
`main` 觸發 GitHub Actions：`npm ci` → typecheck/test → `vite build` →
`actions/deploy-pages` 部署 `dist/` 至 GitHub Pages。

## Components
- 入口頁面 — 工具總覽與導覽（靜態產生，依 `available`／`planned` 狀態產生卡片）
- 工具清單資料模組 `src/tools.ts`（唯一事實來源，定義各工具中繼資料與狀態）
- 渲染模組 `src/render.ts`（依清單資料產生入口頁 HTML 的純函式）
- 全站主題模組 `src/theme.ts`（唯一事實來源：三態主題邏輯——`<html>`
  無 `data-theme` 跟隨系統、`data-theme="dark"`／`"light"` 為手動覆寫，
  優先次序 localStorage＞系統偏好＞淺色預設；對外僅雙態的 toggle 切換、
  `aria-pressed` 同步、localStorage 讀寫皆 best-effort）；五頁共用的
  footer（作者／GitHub／授權連結）與主題切換鈕則以共用 markup＋
  `src/style.css` token 呈現，各頁 `<head>` 另有防 FOUC 的 inline
  bootstrap script（見 Conventions／Architecture overview 的零框架 JS
  例外）
- 工具頁範本 `tools/_probe/`（新增工具的起始骨架範本）
- APNG → GIF 轉換工具 — apng-js 解碼 → 共用 `src/lib/` 合成／編碼管線
  （module Web Worker）；位於 `tools/apng-to-gif/`
- GIF 編輯工具 — gifuct-js 解碼＋走訪 application extension 抽 loop →
  共用 composite 全幀化 → 純函式編輯（刪幀／停留時間／播放次數）→ 共用
  gif-encode 重編碼（module Web Worker）；位於 `tools/gif-editor/`
- 共用純邏輯模組 `src/lib/`（composite 合成、gif-encode 編碼管線、
  gif-reader（byte 級測試 oracle）、共用測試工具）
- 影片格式轉換工具 — ffmpeg.wasm（單執行緒 core，self-host vendor）
  ffprobe 探測 → 白名單 remux 優先／轉碼後備／blind-transcode 降級 → MP4；
  位於 `tools/video-converter/`
- Claude Code statusline 產生器 — segment 目錄（tri-path 描述子）／閾值變色／
  執行期 join／三後端產生器（bash／ps1／settings.json 片段）＋emit-ansi oracle，
  零 runtime 依賴；圖示改為通用 emoji（不再簽入任何字型資產，預覽以系統
  monospace＋原生 emoji 渲染）；powerline 段間箭頭（``）由 config schema
  `powerlineArrow` 欄位條件化，新建 config 預設關閉（色塊直接相接＋每段
  右側 padding），既有 v1 存檔依原 `mode` 自動遷移續用箭頭觀感；**多列
  輸出**：`SegmentConfig.row?: number`（選填、缺欄視同 0，CONFIG_VERSION
  維持 2 不 bump）驅動 `resolve()` 回傳 `rows: StyledRun[][]`（按渲染列序
  分組、空列壓縮，全隱藏退化為單一空列 `[[]]`），三後端與預覽逐列同步
  輸出，行尾契約＝列間單一 LF join、無尾隨換行；**三欄滿版版面**（左＝
  segment 目錄 transfer-list，勾選原位灰化留位、不重排；中＝已選擇，依
  渲染列分組，各列群組容器自帶地標／標題可跳達；右＝即時預覽＋產出腳本
  sticky），斷點 3→2→1 欄退化；config schema 現為 CONFIG_VERSION 2（含
  v1→v2 遷移，`row` 為 v2 內選填欄）；位於 `tools/statusline-builder/`

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
  `import '../../src/style.css'` 消費共用樣式（入口頁零框架 JS，唯一
  例外為主題切換 inline script（含 toggle 監聽），故改以 `<link>`
  消費樣式）；範本並含 `<meta name="color-scheme">`、換頁白閃防護
  critical style、header 尾端主題切換鈕（`.theme-toggle`）、`main.ts`
  於任何渲染前 `import '../../src/theme.ts'`、五頁共用 footer 構成
  （隱私句＋作者／GitHub／授權連結）——以 `tools/_probe/` 為範本
- 樣式策略：純手寫 CSS、不引入框架，a11y 基線（`:focus-visible`、WCAG AA、
  `prefers-reduced-motion`）全站適用
- a11y 實作細節：「規劃中」工具卡不產生 `<a>`、不可聚焦，狀態以可見文字標籤傳達
- 工具頁 CPU 密集的「編碼／轉檔運算」採 module Web Worker（worker 可由
  vendored 依賴內建提供，不限自寫 `*.worker.ts`；合成等前處理得留主執行緒）；
  SharedArrayBuffer 不可用之硬約束見 magi/TECHSTACK.md Constraints
- 大型第三方 runtime 資產以 npm exact pin 為源，建置期（predev/prebuild
  hook）自 node_modules 複製至 `public/vendor/<name>/`（不進 git），複製
  腳本斷言版本與 pin 同步、verify-dist 斷言產物存在；經 dynamic import／
  Worker 載入之 runtime JS/wasm 資產一律以顯式同源**絕對** URL 載入，
  禁止依賴套件內建 CDN fallback
- 非執行型小型第三方靜態資產（字型／圖片／資料，約數十 KB 級）可直接
  簽入工具目錄：須附授權聲明檔、來源版本＋再生工序記錄（provenance），
  並列入 README 第三方元件段；以 HTML/CSS 同源相對參照載入、由 Vite
  資產管線處理，不受上述絕對-URL 條文約束；本慣例不設全站硬編上限，
  下一個簽入此類資產的工具須自帶 verify-dist 斷言把關存在性與大小
  （statusline-builder 的 Nerd Font subset <100KB 曾是此類活例＋把關
  斷言，sprint 06a 已將字型資產與該斷言一併移除，見 Status）
- 工具頁骨架：header（含返回入口連結）／`<main>`／footer、單一 `<h1>`、
  描述性 `<title>`、meta description
- 互動工具 a11y 不變量：拖放具鍵盤等效（原生 file input 留在 tab
  order）、進度／狀態用 aria-live、動態結果做焦點管理、自動播放媒體可暫停
  ＋尊重 prefers-reduced-motion、資訊性 alt、錯誤用 role=alert；暫停控制
  與靜態 poster 須在媒體開始播放當下即可用（不得延後至後續流程階段）；
  live region 須常駐 a11y tree（不得以 display:none／hidden 切換承載播報）；
  媒體之替代呈現（poster 等靜態代表畫面）須繼承等效文字——canvas 頂替
  `<img>` 時以 role=img＋aria-label 比照對應 alt，不得因元素替換而遺失
- 可編輯項目清單 a11y 不變量：批次／狀態切換操作須經常駐 live region
  播報；項目刪除採非破壞性切換（焦點不遷移）；裝飾性縮圖 aria-hidden、
  項目身分承載於控件 accessible name；含值控件（spinbutton／textbox 等）
  之 accessible name 以 `label[for]`＋獨立 id 承載、不得以 wrap-label 包
  裹（避免現值滲入名稱）；大量項目須有 skip 機制與分頁
  （或等效導覽策略），換頁／視圖切換須管理焦點並播報
- 工具可含多模組切分（如 decode/composite/convert/worker），純邏輯模組須
  為 node 可測（不 import DOM runtime）；跨工具共用的純邏輯模組置於
  `src/lib/`，同樣須為 node 可測（不 import DOM runtime）
- localStorage key 統一格式 `eztools-<scope>-<name>`；全站範圍慣例可省略
  scope（如全站主題 `eztools-theme`）。此慣例為 06a 新增，不追溯既有
  key——statusline-builder 既有的設定存檔 key 維持原命名不變

## Status
入口頁骨架已完成（Vite MPA 架構、工具清單注入機制、a11y 基線）。部署
workflow 已就緒（首次部署待 Pages 前置設定與合併 main 驗證）。
apng-to-gif、gif-editor、video-converter、statusline-builder 四工具皆已可用；
PRD 四大工具目標完成，statusline-builder 已上線（Claude Code statusline 設定
產生器；segment schema 基準版與人工重核註記見 README）。
video-converter 之「上線」宣告以 GPL 授權聲明落地（README License 段）
為前置。

sprint 06a（statusline-builder UI refresh 第一段）已交付：segment 圖示
全面改為通用 emoji（不再要求終端安裝字型，簽入字型資產與其建置工序、
verify-dist 的字型把關斷言皆已移除，改為「字型資產不得回歸」的負向
斷言）；powerline 段間箭頭（``）改由 config schema `powerlineArrow`
欄位條件化，新建 config 恆預設關閉，config schema 隨之升版至
CONFIG_VERSION 2（v1→v2 自動遷移，既有 v1 powerline 存檔續用原箭頭
觀感）；全站（入口頁＋四個工具頁）新增深／淺主題切換（跟隨系統／手動
切換／localStorage 記憶，含換頁白閃防護）與統一 footer（作者／GitHub／
授權連結）。

sprint 06b（statusline-builder 多列輸出＋三欄版面＋排序語意）已交付：
`SegmentConfig.row` 選填欄驅動多列輸出（`resolve()` 回傳
`rows: StyledRun[][]`，按渲染列序分組、空列壓縮、全隱藏退化 `[[]]`；
三後端與預覽同步逐列輸出，行尾契約＝列間單一 LF join、無尾隨換行）；
版面由單欄改三欄滿版（左＝segment 目錄 transfer-list、中＝已選擇依
渲染列分組（列群組容器自帶地標／標題）、右＝即時預覽＋產出腳本
sticky），斷點 3→2→1 欄退化；排序語意重構為「依渲染列分組」清單，
上／下移＝同列內交換、跨列移動走「顯示於第 N 列」select 與拖曳插入；
列可暫存為 UI 空列（位置制、可居中間；純顯示態、不入存檔——config
恆無空列，跨列移動搬空來源列時原地保留為空列）；
CONFIG_VERSION 維持 2（`row` 為既有版本內選填欄，不 bump）。06c（目錄
擴充 25→30 段、bar 正交欄、重置倒數、tokens 三段、auto 配色等）待其
交付時再更新本段。
