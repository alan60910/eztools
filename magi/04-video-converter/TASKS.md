# Tasks — 影片格式轉換工具（video-converter）

> Source: PLAN.md（r2.1，經 2 輪 MAGI 審議收斂）   •   Sprint: magi/04-video-converter/

排程原則：SP-1（阻斷級）最前；SP-2 為 probe.ts 前置 gate；瀏覽器綁定量測
（SP-3/5/6/7）採「暫定值實作＋收數回填」，集中到 T1.4 與 T4.3 兩個使用者
gate。gate 暫定值：512 MB warn-continue；cadence 每 10% 或 30s 擇低頻
（SP-5 收數後回填）。

## Milestone 1: 供應鏈＋阻斷級 spikes（SP-1／SP-4）
**Goal:** ffmpeg.wasm 在本專案 Vite 鏈上「dev／build／preview 三段真載可行」定案，node 直跑可行性判明。
**Acceptance:** vendor 複製鏈可重現（pin 斷言過）；SP-1 三段驗收記入 WORKS（URL 方案、loading-core 文案、classWorkerURL 需否、wrapper×core 配對）；SP-4 成敗與 timeout／慢測隔離決策記入 WORKS；`npm test`／`typecheck` 全綠不受影響。

- [x] T1.1 — 安裝 `@ffmpeg/[email protected]`／`@ffmpeg/[email protected]`／`@ffmpeg/[email protected]`（exact pin）＋`scripts/vendor-ffmpeg.mjs`（複製前斷言 core version===pin、複製 esm 雙檔至 `public/vendor/ffmpeg/`）＋npm hooks `{predev, prebuild}`（**pretest 不掛**）＋`.gitignore` 加 `public/vendor/`＋vite.config `optimizeDeps.exclude`。測試：手跑 vendor script 後雙檔存在且 wasm >20MB；`npm test` 不退化。
- [x] 🔀 [A] T1.2 — SP-4 spike：core ESM node 直跑 PoC（墊片逐項：`self`/`btoa`/`locateFile`/`ENVIRONMENT`；`createFFmpegCore` 直呼＋`-f lavfi -i testsrc` <1s 轉檔；耗時量測 → testTimeout 與慢測隔離決策）。產出＝可行性結論＋決策，記 WORKS；PoC 腳本放 `scripts/`（不進 build 鏈）。
- [x] 🔀 [B] T1.3 — 工具頁骨架 `tools/video-converter/index.html`＋`style.css`（`_probe` 慣例；**tools.ts 保持 planned**，guard 不觸發）＋暫時 `spike.ts` harness（真載鈕／testsrc 轉檔鈕／記憶體 ramp／基準／重載量測鈕——供 T1.4 與 T4.3 收數用，T3.2 移除）＋URL 構造純函式（`../../` 上溯，註記深度依賴）＋單元測試。
- [x] T1.4（自動化子集完成；人工 mini-gate 併入 T4.3） — SP-1 驗收：自動化子集（`vite build` 確認 worker chunk emit＋接線；`vite preview`＋HTTP 200 斷言 core/wasm）→ **使用者 mini-gate（hard gate）**：dev 與 preview 各自 `tools/video-converter/` 子頁真載＋真轉一次（dev 綠燈對 URL 構法無背書力——preview 為準）；定案 URL 方案（(a) 上溯直傳 vs (b) toBlobURL）＋loading-core 播報文案＋classWorkerURL 備援需否＋wrapper×core 配對確認。全部記 WORKS。

## Milestone 2: SP-2 盤點／fixtures＋純函式核心
**Goal:** 決策矩陣的事實基礎（encoder 盤點＋真實 ffprobe JSON）落地，三個純邏輯模組全綠。
**Acceptance:** fixtures 簽入（≥6 組＋1 外部真實檔）；probe/convert-plan/limits 測試全綠（含 rotation args、progress=0 無 ETA、白名單邊界）；矩陣定稿參數記 WORKS。

- [x] T2.1 — SP-2 全套【probe.ts 前置 gate】：`-decoders`/`-encoders`/`-muxers` 盤點（libx264/aac/libvpx/dav1d…）；ffprobe 可用性＋`-of json -o` 實測；真實 ffprobe JSON fixtures 擷取簽入（H.264+AAC MKV／VP9+Opus WebM／HEVC／無音軌／多軌／損壞＋至少 1 組非本專案產生）；ffprobe 缺席降級判定；rotation copy/transcode 一致性；`-c copy` 失敗樣態（ret/log）。執行環境：SP-4 成立走 node，否則併 T1.4 harness 匯出。結果記 WORKS。
- [x] 🔀 [A] T2.2 — `probe.ts`：ffprobe JSON → `StreamInfo`（欄位照 PLAN 型別契約；防禦畸形輸入）＋測試（以 T2.1 簽入 fixtures 為基準）。
- [x] 🔀 [B] T2.3 — `limits.ts`：記憶體 gate（暫定 512 MB warn-continue）＋進度 clamp／cadence／**進度率式 ETA**（`elapsed×(1−progress)/progress`，progress=0 無 ETA 分支）＋輸出檔名推導＋測試。
- [x] T2.4 — `convert-plan.ts`：白名單矩陣（h264/hevc 8-bit 4:2:0＋safe profile；其餘轉碼）＋`-map 0:v:0? -map 0:a:0?`＋無音軌／純音訊／影音皆無分支＋`-sn`＋faststart＋notices＋rotation args → `ConversionPlan`；args 陣列鎖定測試全分支（依 T2.1 盤點結果修正 encoder 假設）。

## Milestone 3: client＋UI 全流程
**Goal:** 瀏覽器端完整轉檔流程與 a11y 契約落地。
**Acceptance:** `npm test`／`typecheck`／`build` 全綠；播報映射表逐列有對應實作；SP-4 成立則 node 整合測試綠（獨立慢測 project）。

- [x] T3.1 — `ffmpeg-client.ts`：生命週期契約（`new FFmpeg()`/`load()` 延後瀏覽器期；絕對 URL 雙傳；job 間 deleteFile＋unmount 清理；取消三態＝loading-core 中止／probing／converting terminate＋重建；core bytes 快取；OOM 收斂錯誤）＋自足性單元斷言（load 雙 URL 非空）。
- [x] T3.2 — `main.ts` 全流程＋`index.html`/`style.css` 完成版（移除 spike.ts）：狀態機 idle→gate→loading-core→probing→ready→converting→done(/preview-failure)/error/cancelled；**播報映射表全列**（loading-core 三分支心跳／ready 三變體＋notices／converting cadence＋ETA＋停滯心跳／done focus 競態處理／error role=alert／cancelled focus 回開始鈕）；取消鈕在進度 region 內＋focus 移轉；video aria-label（audio-only 音訊語意）＋onerror 子態；下載連結原子設定；isProcessingFile 併發防護。
- [x] T3.3 — SP-4 成立 → node 真轉檔整合測試（fixture 自舉、獨立 vitest project／慢測隔離、不入預設 `npm test`）；不成立 → 已知限制記 WORKS＋PLAN 註記。

## Milestone 4: 接線＋deltas＋人工 gate
**Goal:** 工具上線接線完成、專案級文件同步、人工驗證收數回填。
**Acceptance:** 時序三閘同一 commit 全綠；verify-dist 擴充斷言過；deltas 與 PLAN 宣告一致；T4.3 checklist 由使用者回報後收數回填。

- [x] 🔀 [A] T4.1 — 時序三閘（同 commit）：`tools.ts` 翻 available＋`tools.test.ts` tripwire 2→3＋`verify-dist.mjs`（ENTRY_ANCHOR_SLUGS 加 slug＋vendor 雙檔斷言＋若備援啟用加三檔斷言）。
- [x] 🔀 [B] T4.2 — Spec deltas 落地：SPEC.md（Components／Conventions×2：vendor 慣例＋worker 澄清／Status——標注 GPL 前置）＋TECHSTACK.md（Framework／Deployment／Constraints）＋README License 段 GPL 聲明草稿（最終文字 commit 時與使用者確認）。
- [ ] T4.3 — 手動 E2E＋a11y checklist（**使用者 gate**）＋量測收數：樣本 recipe（含 rotation 直拍）全案例；SP-3 記憶體上限／SP-5 效能基準→cadence/gate 值回填／SP-6 可播性（level 需否）／SP-7 重載成本——數據回填 PLAN 暫定值並記 WORKS。

---
Hard gates：T1.4（SP-1 mini-gate）、T4.3（總 gate）。lane 並行：T1.2+T1.3、T2.2+T2.3、T4.1+T4.2（檔案集互斥）。
