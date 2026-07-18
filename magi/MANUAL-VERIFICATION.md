# 手動驗證清單（Manual Verification）

> 這份文件彙整所有 **需要真人手動驗收** 的關卡 —— 開發／測試 subagent 都已完成，
> 這些是自動化無法涵蓋、必須由使用者在真瀏覽器／真機上眼睛確認的項目。
> 做完一項就勾一項；量測值直接填回本文件對應欄位，並回報 coordinator 勾對應 task。

## 這些關卡對應的 task

| Task | 工具 / Sprint | 內容 | 目前狀態 |
|------|--------------|------|---------|
| #5   | 入口骨架 (S1) | GitHub Pages 部署驗證 | pending |
| #23  | APNG→GIF (S2) | 手動 E2E ＋ a11y checklist | in_progress（等人） |
| #37  | GIF 編輯 (S3) | 手動 E2E ＋ a11y checklist | pending |
| #41  | 影片轉換 (S4) | SP-1 驗收（hard gate：真載真轉＋URL 定案） | in_progress（等人） |
| #51  | 影片轉換 (S4) | 手動 E2E ＋ a11y ＋ 量測收數 | pending |
| #73  | statusline (S5) | SP-3 使用者總 gate（含真機掛載） | pending（延後） |

> 這 6 項都不是「還有 agent 在跑」，是等你本人執行。做這些之前，**開發類 subagent 可以全部關閉**，不影響任何進行中的工作。

## 共用啟動方式

```bash
npm run dev       # http://localhost:5173/  （開發伺服器）
npm run build     # 產生 dist/
npm run preview   # http://localhost:4173/  （預覽 build 結果，最接近正式站）
npm test          # 自動化測試（非手動）
```

- 工具頁一律開 **子路徑**，不要只測根頁：`.../tools/<slug>/`。
- `base: './'`，正式站是 project page：`https://alan60910.github.io/eztools/`。
- 螢幕報讀（SR）測試：Windows 用 NVDA，macOS 用 VoiceOver。
- reduced-motion 可用 OS 設定，或 DevTools → Rendering → 模擬 `prefers-reduced-motion: reduce`。

---

# Gate 1 — 部署驗證（task #5 / T2.2）

> 正式站 URL：`https://alan60910.github.io/eztools/`。CI 的 `verify:dist` 只檢查本地 build 產物，
> **不會**去抓正式站；正式站的子路徑解析、真 404、ffmpeg wasm 傳輸、字型渲染，只能真人用瀏覽器看。

## A. 一次性倉庫設定（僅倉庫管理者，workflow 無法自動化）
- [ ] **Pages 來源設為 GitHub Actions**：Settings → Pages → Build and deployment → Source =「GitHub Actions」（不是「Deploy from a branch」）。沒設好每次部署都會失敗。
- [ ] **確認 Actions 已啟用**：Settings → Actions → General → Actions permissions = 允許執行（第三方 action 已 pin：`checkout@v4`、`setup-node@v4`、`upload-pages-artifact@v3`、`deploy-pages@v4`）。
- [ ] **（僅確認，不需改）github-pages 環境分支限制**：Settings → Environments → github-pages 預設只允許 `main`，符合 DEV 開發 / main 部署策略。
- [ ] workflow 層 `permissions`（`contents: read`、`pages: write`、`id-token: write`）已寫在 `deploy.yml`，不需手動調。

## B. 觸發部署（人工 gate）
- [ ] **取得使用者明確確認後，才把 `DEV → main` merge**（push/merge 到 main 觸發 `deploy.yml`）。這是刻意的人工發布 gate，不得代為 merge。
- [ ] （替代）手動觸發：Actions →「Deploy to GitHub Pages」→ Run workflow（`workflow_dispatch` 已開）。

## C. 看 Actions run（先確認 CI 綠燈再看站）
- [ ] Actions →「Deploy to GitHub Pages」→ 開最新 run，確認三個 job 依序綠燈：
  - [ ] `windows-test`（Windows Node 24：`npm ci` → typecheck → test）—— 跨平台 gate，紅了就不 build/deploy。
  - [ ] `build`（Ubuntu：typecheck → test → `npm run build` → `npm run verify:dist` → 上傳 artifact）。
  - [ ] `deploy`（`actions/deploy-pages@v4`，環境 github-pages）。
- [ ] `deploy` job 環境顯示正式頁 URL：`https://alan60910.github.io/eztools/`。

## D. 瀏覽器驗正式入口頁（CI 做不到的部分）
- [ ] 開 `https://alan60910.github.io/eztools/`，入口頁載入。
- [ ] 工具清單靜態渲染，顯示 4 張卡：APNG→GIF、GIF 編輯、影片格式轉換、Claude Code statusline 產生器。
- [ ] **靜態優先檢查**：關掉 JavaScript 重載，工具清單仍完整可見（入口頁 zero-JS 設計）。
- [ ] DevTools → Network 硬重載，頁面 CSS/資產全部 200，**無 404**（驗 `base: './'` 在 `/eztools/` 子路徑正確）。

## E. 逐一驗每個工具頁（子路徑 base 正確 ＋ 資產 ＋ 無 404）
每個 URL：開頁 → DevTools Network 硬重載 → 確認所有 CSS/JS/wasm/font 都 200、**無 404**：
- [ ] `.../eztools/tools/apng-to-gif/`
- [ ] `.../eztools/tools/gif-editor/`
- [ ] `.../eztools/tools/video-converter/`
- [ ] `.../eztools/tools/statusline-builder/`
- [ ] （sprint-01 舊探針，仍部署）`.../eztools/tools/_probe/`
- [ ] **入口頁導覽**：4 張卡都能點進正確的 `/tools/<slug>/`；工具頁的「返回入口」連結能回入口頁。
- [ ] **video-converter**：Network 應看到 `.../eztools/vendor/ffmpeg/ffmpeg-core.js` 與 `ffmpeg-core.wasm`（wasm 約 32MB）皆 200；若 404 表示 vendor 資產沒隨 build 複製。
- [ ] **statusline-builder**：Nerd Font 終端預覽（powerline 箭頭／segment glyph）正確渲染。字型是 base64 內嵌在 CSS，**不會**有獨立 `.woff2` 請求 —— 只需確認 glyph 有出來，不是看 network。

## F. 純手動、無法自動化的步驟（摘要）
- [ ] Pages → Source = GitHub Actions（一次性；workflow 無法自我設定）。
- [ ] 授權並執行 `DEV → main` merge（刻意的人工發布 gate）。
- [ ] 真瀏覽器目視正式站：渲染、導覽、DevTools Network 404 掃描。

---

# Gate 2 — APNG → GIF 手動 E2E ＋ a11y（task #23 / S2-T4.3）

> 頁面：`tools/apng-to-gif/`。PLAN 把手動 pass 綁在 **preview build** 上。
> 逐 frame delay（ms→cs）、透明 flag、NETSCAPE loop 次數等語意由自動化 byte 級測試（`convert.test.ts`）涵蓋；
> 手動只判斷「視覺播放正常」、幀數、下載檔名。

## 0. 啟動 / 頁面基礎
- [ ] `npm run build` → `npm run preview`，開 `/tools/apng-to-gif/`。（dev 也可，但 preview 最準）
- [ ] 分頁標題 `APNG 轉 GIF｜EZTools`；單一 `<h1>` = `APNG 轉 GIF`；頂部有 `← 返回 EZTools`（href `../../`）；footer = `EZTools — 所有處理皆於瀏覽器端完成，不會上傳任何檔案。`

## 1. Fixtures
- [ ] 具名 fixture：`tools/apng-to-gif/fixtures/sample-2frame.apng`（2 幀、含透明＋半透明、numPlays=5，下載名應為 `sample-2frame.gif`）。
- [ ] 一個真實 APNG（含半透明像素 ＋ 非 `none` disposeOp，走真正合成路徑）。
- [ ] 一個非動畫 PNG（驗單幀通知路徑）。
- [ ] 一個非 PNG 檔（驗拒收）。

## 2. 核心 E2E 轉換（兩個 APNG）
- [ ] 選檔後 `#original-preview` 出現並動畫，`#selected-filename` 顯示檔名。
- [ ] 按 `開始轉換`（`#convert-button`），進度區出現，完成後 `#result-preview` 出現且**視覺播放正確**（無殘影/閃爍/邊緣錯誤）。
- [ ] 幀數看起來對（fixture 明顯循環 2 幀）。
- [ ] `下載 GIF`（`#download-link`）下載檔名為來源名把 `.png`/`.apng` 換成 `.gif`（fixture → `sample-2frame.gif`）；用外部檢視器開確認會動。

## 3. 非動畫 PNG ＋ 非 PNG（通知與錯誤）
- [ ] 選非動畫 PNG：黃色 `role="status"` 通知（`#warning-message`）= `來源為非動畫 PNG，將轉為單幀 GIF。`；仍產出單幀 GIF。
- [ ] 選非 PNG：`role="alert"` 錯誤（`#error-message`）= `不是 PNG 檔案：缺少有效的 PNG 檔頭簽章（magic bytes）`；不進行轉換。

## 4. 純鍵盤全流程（不用滑鼠，焦點全程可見）
- [ ] `Tab` 到 `← 返回 EZTools`（可見焦點）。
- [ ] `Tab` 到檔案 input `#file-input`：視覺 `sr-only` 但**必須在 tab 序**；聚焦時 drop-zone 卡（`.file-drop`）顯示 `#1d4ed8` 實線邊框。
- [ ] 對 input 按 `Enter`/`Space` → 開原生檔案選擇器（拖放的鍵盤等價）；選 fixture。
- [ ] `Tab` 到 `透明門檻（0–255）`（`#alpha-threshold`，預設 `128`）與 `半透明背景合成色`（`#matte-color`，預設 `#ffffff`），可調。
- [ ] `Tab` 到 `開始轉換`（`#convert-button`），`Enter`/`Space` 轉換。
- [ ] 完成後焦點**自動移到**結果面板 `#result-section`（`tabindex="-1"`），焦點環可見。
- [ ] 續 `Tab` 到播放/暫停鈕（`#play-pause-button`）與 `下載 GIF`，`Enter` 下載。

## 5. 螢幕報讀（真跑 NVDA/JAWS/VoiceOver）
- [ ] **進度** 從 `#progress-status`（`role="status"` polite）播報，節流（每 ~10% 或 500ms）：`解碼中 1/N 幀` → `編碼中 1/N 幀` → `轉換完成`。（進度橫跨 decode＋encode 兩階段，總步數 = 幀數×2。）
- [ ] **完成** 雙訊號：status 播 `轉換完成`，且焦點移到結果區（`aria-labelledby="result-preview-heading"`，讀 `轉換後 GIF 預覽`）。
- [ ] **非動畫通知** 由 `role="status"` 播：`來源為非動畫 PNG，將轉為單幀 GIF。`
- [ ] **錯誤** 由 `role="alert"` 立即播（非 PNG 訊息）。
- [ ] **預覽 alt**：原始 = `原始 APNG 動畫預覽`；結果 = `轉換後 GIF 預覽：<下載名>.gif`。
- [ ] **播放/暫停鈕** 狀態：用 `aria-pressed`（false↔true）＋切換可見標籤（`暫停`↔`播放`）。⚠️ 已知開放 nit：aria-pressed＋標籤雙訊號可能讓 SR 讀出矛盾（如「播放, pressed」）—— 若聽到矛盾請記下。

## 6. reduced-motion（poster）
- [ ] 開 OS「減少動態」→ 重載選 fixture：預覽預設**暫停**，顯示 frame-0 靜態 poster；播放鈕讀 `播放`、`aria-pressed="true"`。
- [ ] 頁面開著時切換 OS 設定（`matchMedia` 監聽）→ 播放狀態自動跟著變。

## 7. 暫停（WCAG 2.2.2，motion off）
- [ ] reduced-motion OFF 選 fixture → 自動播放，鈕讀 `暫停`。
- [ ] 按下：原始＋結果兩預覽都凍結於 frame-0 poster；鈕變 `播放`、`aria-pressed="true"`。
- [ ] 再按：兩預覽恢復動畫；鈕回 `暫停`、`aria-pressed="false"`。
- [ ] 選檔後（尚未轉換）暫停控件就該可用（只有原始預覽時也能暫停）。

## 8. Worker 真跑 ＋ fallback
- [ ] **真 worker**：轉換時 DevTools（Chrome：Sources → Threads）確認有專屬 Web Worker 跑 encode；UI 不凍結；`編碼中 …` 進度來自 worker `postMessage`。
- [ ] **fallback 分支**（worker 建構失敗 → 主執行緒 `convertToGif`）：WORKS 標為**已知未測**（風險低，走同一純函式）。可 (a) 暫時讓 `createEncodeWorker()` 失敗一次確認主執行緒仍完成且輸出一致；或 (b) 就在 WORKS 記為「接受未測」並勾此框。

## 9. 大檔 gate
- [ ] 用估算解碼記憶體（W×H×4×幀數）> 1 GiB 的 APNG：解碼前出 `role="status"` 警告 `此動畫預估解碼記憶體用量約 <N> MiB，轉換可能導致瀏覽器變慢或沒有回應。仍要繼續嗎？`，焦點移到 `仍要繼續`（`#warning-continue-button`）。
- [ ] `仍要繼續` 可鍵盤聚焦、啟用後消警告並續轉；不觸發則不解碼任何像素。

## 10. a11y 雜項 / 視覺
- [ ] 每個可聚焦控件都有明顯焦點指示。
- [ ] 對照文件對比值抽查不會太淡（主鈕 `#1d4ed8`/白 ≈6.71:1；錯誤 `#991b1b`/`#fee2e2` ≈6.80:1；警告 `#92400e`/`#fef3c7` ≈6.36:1；進度填色 ≈5.42:1）。
- [ ] `#file-input` `accept` = `image/png,image/apng`。

---

# Gate 3 — GIF 編輯 手動 E2E ＋ a11y（task #37 / S3-T4.5）

> 頁面：`tools/gif-editor/`。v1 **只支援**：刪除/還原幀（非破壞性「保留」勾選）、逐幀 delay（floor 20ms）、
> 一鍵套用同一 delay、播放次數（無限或 N 次）。其他（重排/裁切/縮放/插入/繪圖/文字/非 GIF 輸入）都是 Non-Goal，UI 不該出現。

## Fixtures
- [ ] 極小 sanity：`tools/gif-editor/fixtures/sample-edit.gif`（99-byte、2 幀、byte-stable）。
- [ ] 真實多幀 GIF：`node_modules/gifuct-js/demo/{horses,dog,jblack}.gif`（複製出來載入）。
- [ ] 一個多幀 GIF（~500+ 幀）測分頁（50/頁）與解碼凍結。
- [ ] 一個解碼後 > ~1 GiB 的大 GIF 觸發記憶體 gate（若無則記為未測）。
- [ ] 一個非 GIF 檔（真 PNG 或改名的 JPG）測 magic-byte 拒收。
- [ ] （可選 edge）含 Plain Text Extension 的 GIF：已知 gifuct 上游 bug 會 throw → 走損壞檔錯誤路徑。

## A. 載入 / 解碼
- [ ] 返回連結 `← 返回 EZTools` 能回入口；單一 `<h1>` = `GIF 編輯`。
- [ ] 前言揭露重新量化＋正規化：`來源極低延遲（含 0 秒）的幀會被正規化為至少 20 毫秒` 與 `重新量化為新色盤…不保證與原始檔案逐 byte 相同`。
- [ ] Drop zone `拖放 GIF 檔案到此處，或選擇檔案` 支援點選 **與** 拖放；選後 `#selected-filename` 顯示檔名。
- [ ] 解碼：status 播 `解碼中…` → `解碼完成，共 N 幀`。
- [ ] 解碼成功前不顯示原始預覽與幀清單（不出現空清單/停用 pager）。
- [ ] 非 GIF → `role=alert`：`不是 GIF 檔案：缺少有效的 GIF 檔頭簽章（magic bytes）`。
- [ ] 損壞/截斷 GIF → `GIF 檔案已損壞或格式不受支援，無法解析`，或零幀時 `這個 GIF 沒有可用的影格`；轉換鈕維持停用。
- [ ] 流程中途選第二個檔（尤其記憶體警告開著時）→ 不雙重渲染/覆蓋，新檔乾淨勝出。

## B. 幀清單編輯
- [ ] 每列：縮圖（裝飾）＋ `保留幀 N` 勾選（預設勾）＋ `幀 N 停留時間（毫秒）`（min 20、step 10）。幀號 1-based、跨頁全域。
- [ ] 取消 `保留幀 N` → 該列淡化但不移位、焦點不移、delay 仍可編；status 播 `幀 N 已標記刪除`。重勾 → `幀 N 已標記還原`。
- [ ] 取消最後一個保留幀 → status 追加 `…；已刪除全部幀，請至少保留一幀才能轉換`，`開始轉換` 停用。
- [ ] 單幀 delay 設 <20（如 5）後 blur/Enter → 值吸附到 20ms；**無**逐鍵播報（commit-on-change）。
- [ ] `全部套用停留時間（毫秒）` 填值後按 `套用至全部幀` → 所有幀 delay 更新，status 播 `已將全部 N 幀停留時間設為 X ms`；確認**跨所有頁**生效，不只當前頁。

## C. 播放次數（loop）＋ 真瀏覽器播放驗證
- [ ] `無限循環` 預設勾、停用 `播放次數（次）`；切換播 `播放次數已設為 ∞`。
- [ ] 取消無限、設 N（如 3）→ 播 `播放次數已設為 N 次`；<1/NaN 夾到 1。
- [ ] **關鍵 gate**：匯出播放次數=3，用新分頁開下載的 GIF，確認**明顯播 3 次後停**；無限→永遠循環；1→播一次停。
- [ ] 載入的 GIF 既有 loop 正確預填（無限來源→無限勾；有限→顯示次數）。

## D. 純鍵盤導覽
- [ ] Tab 序：返回連結 → 檔案 input（drop 卡 `:focus-within` 焦點環）→（解碼後）暫停鈕 → skip-link → 分頁 → 幀列 → 轉換控件。
- [ ] Skip-link `跳至轉換控制區`（預覽/暫停區後第一個 Tab）→ Enter 直跳 `轉換設定`（`#convert-section`），略過所有幀列（不必 Tab 過上百列）。
- [ ] 分頁鈕 `上一頁`/`下一頁` 在幀列**之前**可達；第 1 頁 `上一頁` 停用、末頁 `下一頁` 停用。
- [ ] 換頁後焦點落在新頁第一個 `保留幀` 勾選（不掉到 `<body>`）。
- [ ] 所有控件純鍵盤可操作；每個可聚焦控件有可見焦點。

## E. 螢幕報讀（NVDA/VoiceOver）
- [ ] `#status-message`（role=status）：`解碼中…`、`解碼完成，共 N 幀`、保留切換訊息、`已將全部 N 幀停留時間設為 X ms`、`播放次數已設為 ∞`/`… N 次`、`轉換完成`。
- [ ] `#page-position-status`（role=status polite）：換頁播 `第 X 頁，共 Y 頁，顯示幀 a–b`（en dash）。
- [ ] `#progress-status`（role=status polite）：encode 時播 `編碼中 done/total 幀`（節流），後 `轉換完成`。
- [ ] `#memory-warning-text`（role=status）：觸發時播記憶體 gate 提示。
- [ ] 解碼凍結感：~500 幀 GIF 上，確認 `解碼中…` 在同步解碼凍結**之前**有被播/繪（yield-before-decode 盡力而為，主觀判斷）。
- [ ] 列語意：勾選名恰為 `保留幀 N`；delay input 名恰為 `幀 N 停留時間（毫秒）`，不漂移含數值；縮圖 canvas `aria-hidden` 靜默。
- [ ] 幀清單區以地標/region nav 可達為 `幀清單`；轉換進度群組 `轉換進度`；完成後焦點移到結果區（`轉換後 GIF 預覽`）並播完成。

## F. 暫停（WCAG 2.2.2）
- [ ] 單一全域暫停鈕（`暫停`）同時控原始＋結果兩預覽。
- [ ] 按暫停 → 動畫 `<img>` 隱藏、靜態 poster `<canvas>` 顯示；鈕變 `播放`、`aria-pressed="true"`。再按反向。
- [ ] 原始 poster 名 = `原始 GIF 預覽（靜態畫面）`；結果 poster 名 = `轉換後 GIF 預覽（靜態畫面）`（role=img＋aria-label）。

## G. reduced-motion
- [ ] 載入前開 OS `prefers-reduced-motion: reduce`：預覽首次顯示即**暫停**（poster 顯示、動畫 img 隱藏、鈕讀 `播放`、`aria-pressed="true"`）。
- [ ] 預覽顯示時切換 OS 設定 → 播放狀態即時翻（免重載）。
- [ ] 選新檔重置為自動播放，**除非** reduced-motion 啟用（則維持暫停）—— 兩種都驗。
- [ ] reduced-motion 也套用到結果預覽，不只原始。

## H. 記憶體警告 gate
- [ ] 載入解碼後 > ~1 GiB 的 GIF → 警告 `此 GIF 解碼後預估記憶體用量約 N MiB，處理可能導致瀏覽器變慢或沒有回應。仍要繼續嗎？`，`仍要繼續` 得焦點。
- [ ] 按 `仍要繼續` 續解碼、清警告；門檻以下無 gate 直接進行。

## I. Worker 真跑（DevTools）
- [ ] 按 `開始轉換` 時 DevTools Sources/Threads 確認專屬 module worker（`encode.worker`）在主執行緒外 encode。
- [ ] `#progress-bar` 前進、`編碼中 done/total 幀` 節流（≥10% 或 ≥500ms 一次，不是逐幀）。
- [ ] 幀 buffer 是**複本**傳輸：轉一次後不重載再轉**同一檔**仍成功（source `decoded` 未被 detach）。
- [ ] fallback：worker 建構失敗時仍在主執行緒完成、結果相同（手動難逼，至少確認正常路徑走 worker）。

## J. 結果 / 匯出 ＋ byte 級 / roundtrip
- [ ] 轉換後結果預覽（`轉換後 GIF 預覽`）顯示、焦點移入、status `轉換完成`。
- [ ] 結果 poster 是**第一個保留（輸出）幀**：刪第 1 幀後轉換，確認暫停/reduced-motion 的結果 poster 顯示新首幀，**非**被刪的原第 1 幀。
- [ ] 大小比較 `原始 X KB → 結果 Y KB（縮小 Z% / 增加 Z%）`。
- [ ] `下載 GIF` 檔名 `<原始名>-edited.gif`；外部檢視器開為有效動畫 GIF。
- [ ] roundtrip：把匯出的 GIF 重載回工具 → 幀數 = 上次保留幀數；編輯的 delay 與播放次數反映（色盤/bytes 與來源不同是揭露過的重新量化，非 bug）。
- [ ] （可選，用 GIF inspector）byte 級意圖：保留幀數正確；逐幀 GCE delay = 編輯 ms÷10（cs）；NETSCAPE loop 無限→`0`、播一次→省略 NETSCAPE、N 次→寫 `N−1`；trailer 存在。

## K. 入口連結
- [ ] EZTools 入口頁把 GIF 編輯列為可用工具，連到 `./tools/gif-editor/`。

---

# Gate 4 — 影片轉換 SP-1 驗收（task #41 / S4-T1.4，HARD gate）

> 頁面：`tools/video-converter/`。自動化子集（build worker-chunk emit ＋ preview HTTP 200 ×3）已記 GREEN，
> 以下是折進本 gate 的**使用者部分**。⚠️ **dev 綠燈對 URL 建構沒有背書力**（見 PLAN SP-1）—— preview 子頁真跑才是權威。
>
> vendor 期望 bytes：`ffmpeg-core.js` = 111,804；`ffmpeg-core.wasm` = 32,232,419（`predev`/`prebuild` 由 `scripts/vendor-ffmpeg.mjs` 複製到 `public/vendor/ffmpeg/`）。
> URL 方案暫定 (a)：直接絕對 URL（`vendorAssetUrl`，`../../vendor/ffmpeg/...` 上兩層）。後果：core 下載發生在 worker 的 import/Emscripten 內、**無 byte 事件**，載入 core 只有時間驅動 heartbeat。此 gate 由使用者確認或推翻 (a)。

## A. 重跑自動化斷言（快速、非承載，但重新做一次）
- [ ] `npm run build` exit 0。
- [ ] worker chunk 有出：`dist/assets/worker-*.js` 為自足 IIFE；tool chunk `tool-video-converter-*.js` 內含 `new URL('worker-<hash>.js', import.meta.url)` 且檔名與實際 emit 的 worker 完全吻合。
- [ ] `npm run verify:dist` exit 0（斷言 `dist/vendor/ffmpeg/ffmpeg-core.js` 存在、`.wasm` 存在且 >20MB、anchor slug 在）。
- [ ] `npm run preview`：`GET` `.../vendor/ffmpeg/ffmpeg-core.js` 與 `ffmpeg-core.wasm` 皆 200（js `text/javascript`、wasm `application/wasm`）；記錄有無 `Content-Encoding`（preview 無；GH Pages gzip 是另一個部署後檢查）。

## B. DEV 真載 ＋ 真轉（dev 綠燈無 URL 背書力）
- [ ] `npm run dev`，開 `http://localhost:5173/tools/video-converter/`。
- [ ] 選小的真影片（如 `tools/video-converter/fixtures/media/a-h264-aac.mkv`）。
- [ ] `ffmpeg.load()` 成功（無靜默 CDN/unpkg fallback；core 從同源 `/vendor/ffmpeg/` 載）。
- [ ] 一次真轉換完成、產出可播 MP4。
- [ ] DevTools Network 確認 core `.js`/`.wasm` 打本地 `vendor/ffmpeg/`（同源），非 `unpkg.com`。

## C. PREVIEW 從子頁真載 ＋ 真轉（★權威 run）
- [ ] `npm run build` → `npm run preview`，開 `http://localhost:4173/tools/video-converter/`（**不是**根頁 —— 根頁 smoke 會假綠、遮住上兩層 URL 解析問題）。
- [ ] 選同檔跑一次真轉換到完成。
- [ ] Network 斷言 core `.js` 與 `.wasm` 皆 200 從 `.../vendor/ffmpeg/`（非 404、非 unpkg）—— 這是「`../../` 上層 URL 在正式深度真的解析」的承載檢查。
- [ ] 確認取得 `createFFmpegCore` 且 worker 真的跑 convert。

## D. 定案並記入 WORKS.md
- [ ] URL 方案：確認 (a) 直接絕對 URL 或推翻為 (b) `toBlobURL`（暫定 (a)，preview 真失敗才推翻）。
- [ ] 載入 core 播報文案：(a) 無 byte 事件，敲定時間驅動 heartbeat 文案 —— 現為 `核心元件下載中（首次載入約 32 MB，請稍候）`（每 10s 重發，`CORE_LOADING_HEARTBEAT_MS`）。
- [ ] `classWorkerURL` fallback：確認**不需要**（worker chunk 自足）—— 記錄。
- [ ] wrapper 0.12.15 × core 0.12.10 配對可用（尤其 `ffprobe` 能跑 —— 非官方預設 0.12.9）—— 記錄。

---

# Gate 5 — 影片轉換 手動 E2E ＋ a11y ＋ 量測（task #51 / S4-T4.3）

> 頁面：`tools/video-converter/`。簽入媒體：`fixtures/media/a-h264-aac.mkv`（H.264 CBP＋AAC）、`b-vp8-vorbis.webm`（VP8＋Vorbis）。
> 其他案例需自製或外部檔（desktop ffmpeg 產；配方見 `fixtures/generate-fixtures.mjs`）。

## Fixtures / 決策路徑
- [ ] H.264＋AAC MKV → 預期 **REMUX**（快、數秒）。
- [ ] VP8/VP9 WebM（用 `b-vp8-vorbis.webm` 或真 VP9+Opus）→ 預期 **transcode** 全轉碼。
- [ ] HEVC MP4（外部，如 test-videos.co.uk h265；libx265 encode 會 hang）→ 預期 hevc copy ＋ `-tag:v hvc1` ＋ `HEVC 部分瀏覽器無法播放` 通知 ＋ Chrome/Firefox 預覽失敗子狀態 ＋ 檔案仍可下載。
- [ ] 10-bit H.264 MP4（`yuv420p10le`）→ 預期 transcode（白名單排除）。
- [ ] 無音訊（純視訊）來源 → 正常轉、無音訊通知。
- [ ] 含字幕 MKV → `字幕將被丟棄` 通知。
- [ ] 多音軌 MKV → `僅保留第一音訊軌` 通知。
- [ ] 純音訊來源（mp3/opus）→ 音訊 MP4 輸出 ＋ `來源為純音訊，將輸出音訊 MP4` 通知；結果 `<video>` 用 AUDIO aria-label 文案。
- [ ] 旋轉直拍來源（手機直式 / rotate=90）→ 輸出**正立**播放（不歪躺）。⚠️ 真旋轉檔與真 VP9+Opus 檔是明確延到本 gate 的兩個交叉檢查（SP2-INVENTORY §4）。
- [ ] AV1 輸入（外部）→ 乾淨失敗到錯誤狀態（AV1 解碼不可用；不得 crash UI）。
- [ ] 0-byte 檔 ＋ 假副檔名的非影片檔 → 優雅錯誤（role=alert），非 crash。

## 限制 / gate 行為
- [ ] 大檔（> 512 MB，`limits.ts` 的 `MEMORY_GATE_BYTES`）→ 記憶體 gate `warn-continue`：`#memory-warning`（role=status）顯示 `此檔案約 <N> MiB，超過建議上限 512 MiB…仍要繼續嗎？`；兩鈕 `#memory-warning-continue-button`「仍要繼續」、`#memory-warning-reselect-button`「重新選擇」。
- [ ] 「重新選擇」回 idle 並重聚焦檔案 input。
- [ ] 「仍要繼續」續行且**不**阻擋（warn-continue，非硬擋）。
- [ ] copy-fallback：餵一個 stream 可 copy 但瀏覽器不能播的來源 → 播報 `直接封裝失敗，改用完整轉碼重試…` 後盲重試。
- [ ] 連續轉換：`轉換其他檔案`（`#convert-another-button`）背對背轉兩檔 → MEMFS 清理/實例重用正常（無累積 heap OOM）。

## 進度 / ETA（慢 transcode 時觀察）
- [ ] `#progress-bar`（aria-label `轉換進度`）每 progress 事件更新；`#progress-status` 依節奏播報。
- [ ] 節奏 = 每 10% 或每 30s（取較低頻，`PROGRESS_ANNOUNCE_MIN_DELTA=0.1`、`PROGRESS_ANNOUNCE_MIN_INTERVAL_MS=30000`），確認**不吵**（非舊 500ms）。
- [ ] 首播 percent <1 只顯 `已完成 N%`（無 ETA，外插發散）；之後 `已完成 N%，預估剩餘<eta>`。
- [ ] ETA 文案（`formatEta`）：`不到 1 分鐘`（<60s）、`不到 2 分鐘`（60–90s）、`約 N 分鐘`（>90s，ceil）。
- [ ] 停滯 >60s 無進度變化 → `仍在處理中` heartbeat（`STALL_HEARTBEAT_MS`）。

## 取消（三狀態，各觸發後再轉一次感受 reload 成本）
- [ ] 載入 core 時取消 → 中止 load、播 `已取消`、焦點回檔案 input。
- [ ] probing 時取消 → terminate+rebuild、`已取消`、焦點回檔案 input。
- [ ] converting 時取消 → terminate+rebuild、`已取消`、焦點回 `#convert-button`「開始轉換」。
- [ ] 每次取消後再轉 → 觀察 SP-7 reload 成本（第二次 `load()` 時間；HTTP/wasm code-cache 命中感）。

## 純鍵盤導覽
- [ ] Tab 到 sr-only 檔案 input `#file-input`（保留於 tab 序），Enter/Space 開 OS picker。
- [ ] Tab 到 `#convert-button`「開始轉換」，Enter/Space 啟用。
- [ ] 轉換開始，焦點自動移到 `#cancel-button`「取消」（在進度 region 地標 `轉換進度` 內，region nav 可達）。
- [ ] gate 鈕（`仍要繼續`/`重新選擇`）鍵盤可達；gate 開時 `仍要繼續` 自動聚焦。
- [ ] 完成時焦點落 `#result-section`（tabindex=-1、`轉換結果`），**非** `<video>`。
- [ ] `#download-link`（`下載 <輸出名>`）、`#convert-another-button`（`轉換其他檔案`）、錯誤 `#error-reset-button`（`重新開始`）皆鍵盤可操作；reset/another 重聚焦檔案 input。

## 螢幕報讀（各 live region 都要驗有播）
Live regions：`#status-message`(status)、`#progress-status`(status polite)、`#error-message`(alert)、`#memory-warning`(status)。
- [ ] 載入 core：`核心元件下載中（首次載入約 32 MB，請稍候）`（每 ~10s heartbeat）。
- [ ] probing：`分析檔案中…`。
- [ ] ready — 單一合併播報 `分析完成：<策略>；<通知>。`。策略：`可直接快速 remux`／`需轉碼，預估較慢`／`無法預判格式，將完整轉碼（較慢）`／`可快速輸出音訊`／`需轉碼音訊（較慢）`。通知（NOTICE_TEXT）：`字幕將被丟棄`、`HEVC 部分瀏覽器無法播放`、`僅保留第一視訊軌`、`僅保留第一音訊軌`、`來源為純音訊，將輸出音訊 MP4`、`來源格式（如 AV1）可能不受支援，轉換可能失敗`。
- [ ] converting：`已完成 N%`／`已完成 N%，預估剩餘…`；停滯 `仍在處理中`。
- [ ] done：`轉換完成` 在焦點移動**前**播（rAF×2 延遲，避免被焦點讀出蓋掉）。
- [ ] 預覽失敗（HEVC copy 在 Chrome/Firefox）：`轉換完成` 後同節點覆寫為 `此格式無法在本瀏覽器預覽，檔案仍可下載`；`<video>` 隱藏但下載保留。
- [ ] error：role=alert 訊息 ＋ 可展開 `技術細節（ffmpeg 記錄末尾）` `<details>`（log 末 10 行）。
- [ ] cancelled：`已取消`（＋各取消狀態焦點）。
- [ ] `<video>` aria-label：`轉換後影片預覽：<輸出名>`（純音訊 `轉換後音訊預覽：<輸出名>`）。輸出名規則：`orig.ext`→`orig.mp4`；`.mp4` 輸入→`x.converted.mp4`（`deriveOutputName`）。

## reduced-motion
- [ ] 設 `prefers-reduced-motion: reduce`：無自動動畫，結果 `<video>` **不自動播放**（`controls preload="metadata"`、無 autoplay/poster）—— 確認沒有 autoplay/loop 潛入。

## 量測 / 收數（回填 PLAN 暫定值、記 WORKS.md）
- [ ] **SP-3 記憶體上限**：把輸入尺寸拉到失敗點，抓 faststart 第二次寫入的瞬時峰值 → 定 gate 門檻（暫定 512MB）＋敲定警告文案。量測值：`__________`
- [ ] **SP-5 transcode 基準**：1080p / 30s 全轉碼 wall time → 定播報節奏（暫定 10%/30s）＋ ETA 公式＋執行 timeout 上限。量測值：`__________`
- [ ] **SP-6 copy 可播性**：產 10-bit H.264、High 4:4:4、HEVC Main10（HEVC 外部），copy→MP4，在真 Chrome/Firefox/Safari `<video>` 播 → 定白名單邊界、決定是否需 H.264/HEVC level-cap gate。結論：`__________`
- [ ] **SP-7 reload 成本**：量第二次 `load()` 時間（直接 URL vs blob；HTTP/wasm code-cache 命中）→ 定 cancel→retry core-bytes 快取策略。量測值：`__________`
- [ ] 每次轉換另記：wall-clock 時間、輸入大小 vs 輸出 MP4 大小、remux/transcode 分類。
- [ ] 確認旋轉來源輸出正立；下載 MP4 在原生桌面播放器可播。

---

# Gate 6 — statusline 產生器 SP-3 使用者總 gate（task #73 / S5-T4.4）

> 頁面：`tools/statusline-builder/`。完整清單見 `magi/05-statusline-builder/T4.4-SP3-CHECKLIST.md`（下方為同步副本）。
> 前置：`npm run dev`，開 `http://localhost:xxxx/tools/statusline-builder/`。與 SP-0 同批做。

## A. 功能／產出（dev 環境）
- [ ] 選 5–6 個 segment（含 model／cwd／git-branch／context-used／cost／clock），拖曳＋上下移鈕排序。
- [ ] 切 plain ↔ powerline，看預覽箭頭鏈與顏色語意翻轉。
- [ ] 色選三態（終端預設／ANSI256 swatch＋spinbutton／truecolor）各試一次，預覽即時變色。
- [ ] 百分比段掛閾值：套四套模板各看一次；自訂改幾個桶顯示「自訂」。
- [ ] 前綴輸入：試合法字＋試貼上換行/emoji/PUA → role=alert 拒收。
- [ ] 產出三份（.sh／.ps1／settings.json）複製＋下載各一次。
- [ ] 重整頁面 → 設定還原（localStorage 不丟）。

## B. 真機掛載（★核心 —— 本 sprint 從未在真 Claude Code 驗過）
- [ ] 把下載的 `statusline.ps1`（帶 MOTW）依 settings 片段掛上你的 Claude Code（Windows wrapper 形 `powershell -NoProfile -ExecutionPolicy Bypass -File`）。
- [ ] statusline **真的顯示**、無 tofu（glyph 需終端有 Nerd Font；若無，預覽提示已警告，可測純文字模式對照）。
- [ ] 顏色（ANSI256／truecolor）正確；powerline 箭頭正確著色。
- [ ] 百分比 segment 隨真實 context/rate 變動變色。
- [ ] clock／resets_at 有掛 `refreshInterval` → 會更新。
- [ ] session 早期 null 期（剛開 session）：百分比顯 `--`、不崩。
- [ ] 下載的 `.sh`（Git Bash）也掛一次驗（若用 WSL/Git Bash）。
- [ ] **MOTW**：未 `Unblock-File` 的下載 .ps1 在預設 ExecutionPolicy 是否被擋？wrapper 形是否解決？（記結果，驗 README 提示是否正確）

## C. a11y（鍵盤＋螢幕報讀）
- [ ] 全程鍵盤：Tab 走完 segment 清單（分區/skip）、色盤導覽（pattern B 的 16 swatch＋spinbutton）、閾值 disclosure 展開/收合、mode 切換。
- [ ] NVDA（或 VoiceOver）實聽：
  - [ ] segment 移位播報「<名稱> 移至第 N 位（共 M）」。
  - [ ] 套用閾值模板批次播報「已套用<模板>，10 段已更新」。
  - [ ] mode 切換焦點移轉＋顏色語意翻轉播報。
  - [ ] 複製成功播報「已複製 <產物別>」。
  - [ ] icon/powerline 啟用時 Nerd Font 提示（aria-describedby）於聚焦控件時讀出。
  - [ ] 預覽 aria-label 讀出純文字（無 PUA 垃圾字元；箭頭不進 label）。
  - [ ] 每列控件可辨（「model — 前綴」「model — 上移」而非 25× 同名）。

## D. 量測（回填 PLAN 暫定值）
- [ ] statusline 腳本單次執行耗時（.ps1／.sh 各測 —— F3「必須快」給數）。量測值：`__________`
- [ ] SP-6 色盤 pattern B 的 NVDA 實聽結論（可用？不可用則回退候選 A＋popup）。結論：`__________`

## E. SP-0 對帳連動（若同時做了 SP-0 擷取）
- [ ] provisional 條件欄（session-name/effort/vim/agent/pr/repo/worktree）實遇時對照真實 stdin，回報哪些欄位形狀與轉述 schema 不符 → coordinator 拆 provisional。

---

## 做完之後
- 每項驗完就勾；量測欄填回本文件。
- 回報 coordinator 勾對應 task（#5 / #23 / #37 / #41 / #51 / #73），量測值回填各 sprint PLAN 暫定處與 WORKS.md。
- 若發現與規格不符或新 bug，記在對應 sprint 的 `DRIFT.md` / `WORKS.md`。
