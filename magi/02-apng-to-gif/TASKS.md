# Tasks — APNG → GIF 轉換工具

> Source: PLAN.md（r2, 2026-07-03）   •   Sprint: magi/02-apng-to-gif/

## Milestone 1: 依賴基礎與前置 spikes（風險前置消除）
**Goal:** 依賴 exact pin 就緒、三個 spike（S1/S2/S3）定案，產物直接沉澱為測試素材。
**Acceptance:** `npm run typecheck`/`npm test`/`npm run build` exit 0；S1–S3 結論記入 WORKS.md；APNG fixture 與產生器入庫、parseAPNG 讀回真值通過；有限迴圈映射（open Q1）與透明路徑（S2）定案。

- [x] T1.1 — 安裝 `apng-js@1.1.5`、`gifenc@1.0.3`（**exact pin**、`dependencies` 段、lockfile 同步）；新增 `tools/apng-to-gif/gifenc.d.ts` ambient 宣告（quantize／applyPalette／GIFEncoder 最小簽名，PLAN「新增依賴」段）；typecheck 通過
- [x] 🔀 [A] T1.2 — S3：`tools/apng-to-gif/fixtures/generate.ts`（chunk 級 acTL/fcTL/fdAT＋CRC）產出最小 ≥2 幀 APNG fixture（非零 delay、含非 none disposeOp、含透明與半透明像素），腳本與產物一併入庫；`decode.test.ts`（metadata 區塊）：`parseAPNG` node 直測 fixture 的幀數／各幀 delay／numPlays／disposeOp／blendOp 真值
- [x] 🔀 [B] T1.3 — S1：gifenc node PoC 落為 `convert.test.ts` 腳手架——byte 級讀回 helpers（GIF89a header、GCE delay 與 transparent flag、NETSCAPE loop、trailer）；驗證 delay 以 **ms** 傳入（gifenc 內部 /10）；以檢視器行為定案有限迴圈（numPlays n>0）映射並記 WORKS
- [x] 🔀 [B] T1.4 — S2：透明路徑 A/B PoC（手動 threshold＋matte→quantize＋transparentIndex vs gifenc `oneBitAlpha`/`clearAlphaColor`），以含半透明手造幀輸出、瀏覽器＋檢視器實播比對（殘影／閃爍／邊緣）；決定記 WORKS，作為 T2.2 實作依據

## Milestone 2: 純函式核心（composite ＋ convert）
**Goal:** 合成與轉換兩個 node 可測純模組完成，核心語意由自動化測試鎖住。
**Acceptance:** `npm test` 全綠；composite 真值表與 convert byte 級斷言通過；兩模組頂層無任何 DOM runtime import（type-only 可）。

- [x] 🔀 [A] T2.1 — `tools/apng-to-gif/composite.ts`：`composite(canvasState, frame, {left, top, disposeOp, blendOp})`（吃吐 `RGBAFrame` 純結構）；實作 PLAN 合成語意契約六條（SOURCE 先清再寫、OVER alpha 合成、NONE 保留、BACKGROUND 區域清透明、PREVIOUS 區域快照還原、首幀 PREVIOUS 降級 BACKGROUND）；`composite.test.ts` 以 2×2／3×3 手造幀建 dispose×blend 真值表（含非零 left/top 部分幀）像素級斷言
- [x] 🔀 [B] T2.2 — `tools/apng-to-gif/convert.ts`：`DecodedAnimation`＋選項（alphaThreshold 預設 128、matteColor 預設白、maxColors）→ S2 定案路徑 → gifenc 逐幀 local palette 寫入；delay 直接傳 ms（clamp ≥20ms）、loop 依 S1 定案映射；`convert.test.ts` 用 T1.3 helpers 斷言：header/trailer/幀數/每幀 GCE delay bytes/transparent flag/NETSCAPE loop/clamp 行為/選項正規化/threshold＋matte 合成

## Milestone 3: 工具頁端到端（decode ＋ UI ＋ worker）
**Goal:** 工具頁在 dev/preview 可完整轉換 fixture，互動 a11y 契約全數落地。
**Acceptance:** dev server 手動轉換 S3 fixture 產出正確 GIF；PLAN UI 層契約逐條落地；`npm test`/typecheck/build 綠。

- [x] 🔀 [A] T3.1 — `tools/apng-to-gif/decode.ts`：PNG magic bytes 守門（非 PNG 拒收、明確錯誤）；parseAPNG wrapper（camelCase 數值列舉 → 自家語意型別）；逐幀 `createImageBitmap`＋canvas 僅做 PNG→RGBA 抽取（**不做合成**，交 composite.ts）；非動畫 PNG 單幀路徑；補完 `decode.test.ts` metadata 測試
- [x] 🔀 [B] T3.2 — `tools/apng-to-gif/index.html` ＋ 工具區域樣式：header（返回入口連結）／`<main>`／footer、單一 `<h1>`、`<title>`「APNG 轉 GIF｜EZTools」、meta description、`lang="zh-Hant"`；file input 留在 tab order（sr-only clip，禁 display:none）＋關聯 `<label>`；拖放區可及名稱；新互動元件對比達標（文字 ≥4.5:1、UI/焦點 ≥3:1）並比照 style.css 檔頭慣例註記驗算
- [x] T3.3 — `tools/apng-to-gif/main.ts` ＋ `encode.worker.ts`：選檔/拖放 → decode → composite → worker convert → 預覽＋下載（`foo.png`→`foo.gif`）；進度 `role="status"` 節流（每 10%／500ms，涵蓋解碼階段）；完成時焦點移至結果區＋status 宣告；兩預覽資訊性 alt；暫停鈕＋`prefers-reduced-motion` 預設 frame 0 poster；錯誤 `role="alert"`／警示 `role="status"`；大檔（寬×高×4×幀數 >1GiB）警告＋可聚焦「仍要繼續」；worker 為 convert.ts 薄委派、postMessage 帶 transfer list、`{type:'error'}`＋`onerror` 錯誤通道、建構失敗 fallback 主執行緒直呼同一函式

## Milestone 4: available 翻轉、文件同步與驗證收尾
**Goal:** 入口卡片長出第一個連結，Spec deltas 落地，全套驗證完成。
**Acceptance:** 全部自動化驗證綠；deltas 與 PLAN 宣告一致（供 /magi:commit §2.5 比對）；E2E checklist 完成（真人項交使用者）。

- [x] 🔀 [A] T4.1 — `src/tools.ts` 將 apng-to-gif 翻為 `available`；入口整合測試：對**真實 tools 陣列**斷言 apng-to-gif 為 available 且 `renderToolList` 產出 `<a href="./tools/apng-to-gif/">`（回收 sprint 01 fixture-only 盲點）；dist 驗證（build 後斷言 `dist/tools/apng-to-gif/index.html` 含 `<main>`/meta description/`lang="zh-Hant"`、`dist/index.html` 零 `<script` 且含上述 `<a>`）——實作為 build 後執行的 verify script／測試，接入 CI 以對 deploy.yml 最小改動為原則
- [x] 🔀 [B] T4.2 — Spec deltas 落地：root SPEC.md（Components 改可用＋管線一句；Conventions 新增 (a) worker 慣例〔編碼／轉檔運算〕(b) 工具頁骨架 (c) 互動 a11y 不變量 (d) 多模組切分；Status 更新）；magi/TECHSTACK.md（Framework/runtime：兩依賴 exact pin＋MIT 零依賴＋gifenc 自備型別宣告＋worker/Transferable 模式，SAB 引用既有 Constraints 不重述）
- [ ] T4.3 —（checklist 已整理交付，待使用者執行真人項；fallback 分支已於 WORKS 明記已知未測）手動 E2E ＋ a11y checklist（PLAN Verification 手動段）：preview 下以具名 fixture＋一個真實 APNG 完整轉換（播放正常、幀數/檔名正確）；worker 路徑實走確認（devtools）；fallback 注入驗證一次（或 WORKS 明記已知未測）；鍵盤全流程／SR 播報／reduced-motion poster／暫停鈕等真人項整理為 checklist 交使用者最終確認
