# APNG → GIF 轉換工具

> Type: feat • Scale: major • Sprint: magi/02-apng-to-gif/ • 2026-07-03
> 修訂版 r2（依 MAGI plan review round 1 修訂；審查報告見 MAGI_PLAN_REVIEW.md）

## Context

入口頁骨架（sprint 01）已完成並推上 DEV：Vite MPA、工具自動掃描、靜態優先
入口頁、部署 workflow 就緒。三個工具目前全為 `planned`。本 sprint 實作
第一個實際工具 —— APNG → GIF 轉換，對應 PRD 目標「APNG → GIF 等圖片格式
轉換功能」與 BACKLOG 首位功能項。

這也是 `planned → available` 流程的首次走通：`src/tools.ts` 狀態翻轉後，
入口卡片首次產生 `<a>` 連結。render.ts 具 available 分支（產 `<a>`）；
「available 但無對應資料夾即 build 失敗」的建置期防護在 `vite.config.ts`
的 `assertAvailableToolsHaveEntries`（vite.config.ts:29-41，載入設定時執行；
其 throw 路徑目前無測試涵蓋）。全程瀏覽器端處理，維持純靜態可託管於
GitHub Pages 的硬約束；**不使用 SharedArrayBuffer**（Pages 無法設
COOP/COEP header）。

## Goals & Non-Goals

**Goals**
- 新增 `tools/apng-to-gif/` 工具頁：選檔（點選＋拖放）→ 預覽 → 轉換 →
  下載 GIF，全程在瀏覽器端完成
- 動畫語意保真：幀延遲、迴圈次數、`disposeOp`／`blendOp` 合成正確
  （合成語意契約見 Recommended approach）
- 透明度處理：GIF 僅支援 1-bit 透明 → alpha threshold（預設 128）＋
  背景色 matte（預設白，UI 可改）合成半透明像素；實作路徑以 spike S2 定案
- 輸入邊界：僅接受 PNG（以 magic bytes 判定）。APNG 正常轉換；非動畫
  PNG 照轉單幀 GIF ＋ 提示「來源非動畫」；非 PNG 一律拒收並給明確錯誤
  （**不**提供任意影像→GIF 路徑）
- `src/tools.ts` 將 `apng-to-gif` 翻為 `available`（入口頁維持零 JS 不變）
- CPU 密集的「編碼／轉檔運算」跑 module Web Worker（不需 SAB），不凍結
  UI；解碼＋合成留主執行緒為 **v1 已接受的例外**（進度回報須涵蓋解碼階段）
- 互動 a11y 契約（本 sprint 首建、將成後續工具樣板，條目見 UI 層）：
  自動播放動圖可暫停、進度／完成有 status 播報與焦點管理、預覽有資訊性
  alt、錯誤警示可被 AT 感知、拖放有鍵盤等效
- 工具頁骨架：header（含返回入口連結）／`<main>`／footer、單一 `<h1>`、
  描述性 `<title>`（「APNG 轉 GIF｜EZTools」）、meta description、
  `lang="zh-Hant"`
- 純邏輯（合成、轉換）抽離為可在 node（vitest）測試的模組

**Non-Goals**
- 批次多檔轉換、GIF → APNG 反向轉換
- GIF 編輯功能（獨立 sprint，BACKLOG 已列）
- 調色盤 dithering 選項（v1 不做；若畫質回饋需要再入 backlog）
- 引入 ffmpeg.wasm（本工具用不到；video sprint 再 spike）
- 修改 `_probe` 範本本身（範本去留為既有 backlog 項；本工具建立的慣例改
  以 SPEC Conventions 傳承，見 Spec deltas）
- JPEG/WebP 等任意影像輸入（明確拒收，見 Goals 輸入邊界）

## Design options considered

**Option A — `apng-js` 解碼 ＋ `gifenc` 編碼（採用）**
- 做法：`parseAPNG(ArrayBuffer)` 取得幀（PNG Blob ＋ 幀控制中繼資料）→
  瀏覽器解 PNG 為 RGBA → 純函式合成 → `gifenc` 量化編碼 GIF
- 成本：兩個小型純 JS 依賴（皆 MIT、**零 runtime 依賴**，審查已實證），
  無 wasm、無 SAB
- 風險（審查後更正）：**gifenc 1.0.3 為長期凍結**（2021 起無新版；格式已
  固化、零依賴，風險可接受）且**無 TypeScript 型別**（需自備 ambient 宣
  告，見 approach）；apng-js 1.1.5 近期仍有維護（2025-01）、內建 d.ts
- 有利：使用者（載入快）、未來 GIF 編輯 sprint（gifenc 可複用）
- 不利：極端追求畫質者（v1 無 dithering 的漸層區塊可能有色帶）

**Option B — WebCodecs `ImageDecoder` ＋ `gifenc`**：Firefox 不支援
`ImageDecoder`，需 fallback 路徑×2。不採；未來 progressive enhancement。

**Option C — ffmpeg.wasm（單執行緒核心）**：核心 ~30MB、冷啟動慢、單執行
緒效能差；對小圖轉檔是大砲打蚊子。不採。

**Option D — 自寫 APNG chunk parser**：重造凍結格式的輪子。僅作為 Option A
不可行時的 fallback（審查已實證 apng-js 可行，此路關閉）。

## Recommended approach

採 **Option A**，管線分層（依可測試性切界）。**跨層 payload 一律使用純結
構型別，不使用 DOM 類別**（node 可測的硬前提）：

```ts
// 跨層幀型別（type-only，全層共用）
interface RGBAFrame { data: Uint8ClampedArray; width: number; height: number }
interface DecodedAnimation { frames: RGBAFrame[]; delaysMs: number[]; loop: number /* 0 = 無限 */ }
```

1. **解碼層**（browser-only）`tools/apng-to-gif/decode.ts`
   - 輸入守門：檢查 PNG magic bytes（`89 50 4E 47 ...`），非 PNG 拒收
   - `apng-js` `parseAPNG(buffer)`：注意實際 API 為 **camelCase 數值列舉**
     —— `apng.numPlays`、`frame.disposeOp`／`frame.blendOp`（數值）、幀影
     像為 `Blob`；wrapper 內映射為自家語意型別。非動畫 PNG（parseAPNG 回
     Error）→ 以單幀處理＋UI 提示
   - 逐幀 `createImageBitmap(blob)` → canvas **僅負責 PNG→RGBA 解碼**
     （drawImage + getImageData 取出該幀的 RGBAFrame），**不在 canvas 上
     做動畫合成**
2. **合成層**（pure、node 可測）`tools/apng-to-gif/composite.ts`
   - `composite(canvasState, frame, {left, top, disposeOp, blendOp}) → 新 canvasState`
     （吃吐 RGBAFrame，畫布現況遞推）
   - 合成語意契約（APNG 規格，最易錯處逐條釘死）：
     - `blendOp SOURCE(0)`：幀矩形區域**先清除再寫入**（不得 alpha 混合）
     - `blendOp OVER(1)`：標準 alpha 合成
     - `disposeOp NONE(0)`：畫布保留
     - `disposeOp BACKGROUND(1)`：顯示後將**該幀矩形區域**清為全透明
     - `disposeOp PREVIOUS(2)`：顯示前對**該幀矩形區域**快照，顯示後還原
     - 首幀 `PREVIOUS` 依規格降級為 `BACKGROUND`
   - node 以 2×2／3×3 手造幀建 dispose×blend 真值表單元測試
3. **轉換層**（pure、node 可測）`tools/apng-to-gif/convert.ts`
   - 輸入：`DecodedAnimation` ＋ 選項（alphaThreshold、matteColor、maxColors）
   - alpha threshold ＋ matte 合成 → `gifenc` `quantize`／`applyPalette`／
     `GIFEncoder().writeFrame` 逐幀寫入（每幀 local palette）
   - **延遲單位契約：gifenc `delay` 收「毫秒」（1.0.3 內部自行
     `Math.round(delay/10)` 換 cs）——convert.ts 直接傳 ms，不得預先換
     cs**；clamp 下限 20ms（對應 2cs，多數檢視器將 <2cs 視為 10cs）
   - 迴圈：`numPlays 0` → NETSCAPE loop 0（無限）為既定；有限次數的確切
     映射（n plays vs n repeats 差一問題）於 spike S1 以檢視器行為定案
   - 模組紀律：composite.ts／convert.ts **頂層不得 import 任何觸及 DOM 的
     runtime 程式碼**（type-only import 可）
   - 輸出：GIF bytes（`Uint8Array`）
4. **UI 層** `tools/apng-to-gif/main.ts` ＋ `index.html`
   - **檔案輸入**：`<input type="file">` 必須保留在 tab order（視覺隱藏用
     sr-only clip 技法，禁 `display:none`）＋關聯 `<label>`；拖放區為輔助
     手段、觸發同一 input，具可及名稱（拖放的鍵盤等效＝原生選檔器）
   - **預覽**：原始 APNG 與結果 GIF 各以 `<img>` 呈現，**資訊性 alt**
     （「原始 APNG 動畫預覽」／「轉換後 GIF 預覽：<檔名>」）；
     `prefers-reduced-motion: reduce` 時預設顯示第一幀靜態 poster（frame 0
     已現成）＋播放／暫停切換鈕；一般模式亦提供暫停控制（WCAG 2.2.2）
   - **進度**：worker 回報幀 n/N → `<progress>` 或 `role="status"`
     aria-live="polite" 容器，**節流更新**（每 10% 或 500ms）；進度涵蓋解
     碼與編碼兩階段。轉換完成：焦點移至結果區＋status 訊息宣告完成
     （WCAG 4.1.3）；下載連結檔名 `foo.png` → `foo.gif`
   - **錯誤／警示**：錯誤（非 PNG、解析失敗）用 `role="alert"`；非阻斷警
     示（來源非動畫、大檔）用 `role="status"`；大檔警示的「仍要繼續」為可
     聚焦按鈕。大檔警告線：估算 寬×高×4×幀數 > 1 GiB 時警告可續行
   - **Worker**：`encode.worker.ts` 為 convert.ts 純函式的**薄委派**（僅
     import ＋轉發），Vite 原生 module worker；fallback（worker 建構失敗，
     如舊版 Firefox <114）於主執行緒**直呼同一函式**——不存在第二份編碼邏
     輯。`postMessage` 幀資料**帶 transfer list 轉移 ArrayBuffer**（避免
     結構化複製使峰值翻倍）；錯誤通道：worker `onerror` ＋ 結構化
     `{type:'error', message}` 訊息
   - **記憶體取捨（明訂）**：v1 採「全幀物化（O(N)）＋ Transferable」，
     換取三層界面清晰；gifenc 支援逐幀 writeFrame、合成只需畫布現況＋當前
     幀，若實測記憶體成為硬瓶頸，降級路徑為 frame iterator 串流化（介面
     已按幀切分，改動局部）
   - **頁面骨架**：header（返回入口連結）／`<main>`／footer、單一
     `<h1>`、`<title>` 為「APNG 轉 GIF｜EZTools」、meta description、
     `lang="zh-Hant"`；樣式沿用 `import '../../src/style.css'` ＋ 工具區域
     樣式，新互動元件（按鈕、放置區、進度）對比比照基線紀律（文字
     ≥4.5:1、UI 元件與焦點 ≥3:1），比照 style.css 檔頭慣例註記驗算

**新增依賴**（本專案首批 runtime dependencies）：`apng-js@1.1.5`、
`gifenc@1.0.3` —— **exact pin ＋ lockfile**（兩者皆零依賴葉套件，npm audit
對其無有效訊號，不作為選版依據；audit 照常跑全樹）。兩者 licence 已於
review 實證為 MIT。**gifenc 無官方型別且 `@types/gifenc` 不存在**：專案自
備 ambient 宣告 `tools/apng-to-gif/gifenc.d.ts`（quantize／applyPalette／
GIFEncoder 最小簽名），列為本 sprint 產出。

**前置 spikes**（實作首日完成，產物直接沉澱為測試腳手架）：
- **S1 — gifenc node PoC**：結構型 RGBA 幀 → quantize/applyPalette/
  GIFEncoder → byte 讀回斷言（GIF89a header、GCE 每幀 delay、NETSCAPE
  loop、trailer）。定案 delay 傳值與有限迴圈映射，PoC 即 V1 測試雛形
- **S2 — 透明處理路徑二擇一**：手動 threshold＋matte→quantize＋指定
  transparentIndex vs gifenc 內建 `oneBitAlpha`／`clearAlphaColor`；以含
  半透明 fixture 輸出，瀏覽器＋桌面檢視器實播驗收（殘影／閃爍／邊緣）
- **S3 — APNG fixture 產生器**：chunk 級腳本（acTL/fcTL/fdAT）產出最小
  2 幀 fixture（非零 delay、含非 none disposeOp），腳本
  `tools/apng-to-gif/fixtures/generate.ts` 與產物一併入庫

**檔案清單（預期）**：`tools/apng-to-gif/index.html`、`main.ts`、
`decode.ts`、`composite.ts`、`convert.ts`、`encode.worker.ts`、
`gifenc.d.ts`、`style.css`（如需）、`composite.test.ts`、
`convert.test.ts`、`decode.test.ts`（metadata 部分）、`fixtures/`
（generate.ts ＋ 產物）；`src/tools.ts` 一行狀態改 `available`（path 已登
記為 `./tools/apng-to-gif/`，與 slug 一致）。

## Open questions

（round 1 review 已定案多數原始問題：Q3 parseAPNG node 可測性經 R3/R4 原
始碼查證**成立、升為事實**；Q4 靜態 PNG 定案「照轉單幀＋提示、非 PNG 拒
收」；Q1/Q5 透明與調色盤路徑收斂為 spike S2 於實作首日定案。）

1. 有限迴圈次數（numPlays n>0）→ NETSCAPE loop 的差一映射：S1 以實際檢視
   器行為定案（0=無限為既定，不受此影響）
2. 大檔警告線 1 GiB 估算是否合適：v1 先採用，實測後可調

## Spec deltas

### root `SPEC.md`
- **Section: Components** — modify
  Why: APNG → GIF 工具由「規劃中」轉為可用，需反映實際元件。
  New content: 條目改為可用狀態，並簡述「瀏覽器端 apng-js 解碼 → 純函式合
  成 → gifenc 編碼（Web Worker）」管線與 `tools/apng-to-gif/` 位置。
- **Section: Conventions** — modify
  Why: 確立未來所有工具共用的不變量：執行緒策略、頁面骨架與互動 a11y 基線
  （本 sprint 為首個互動工具、即後續樣板；`_probe` 不修，慣例以 SPEC 傳承）。
  New content: 新增（a）「工具頁 CPU 密集的『編碼／轉檔運算』採 module
  Web Worker；SAB 不可用之硬約束見 TECHSTACK Constraints」（措辭對齊實
  作：合成等前處理得留主執行緒）；（b）「工具頁骨架含 header（返回連結）
  ／`<main>`／footer、單一 `<h1>`、描述性 `<title>`、meta description」；
  （c）「互動工具 a11y 不變量：拖放具鍵盤等效（原生 file input 留在 tab
  order）、進度／狀態用 aria-live、動態結果做焦點管理、自動播放媒體可暫停
  ＋尊重 prefers-reduced-motion、資訊性 alt、錯誤用 role=alert」；（d）工
  具可含多模組切分（decode/composite/convert/worker）之結構慣例。
- **Section: Status** — modify
  Why: 第一個工具上線，狀態段落需更新。
  New content: apng-to-gif 為 available，規劃中剩 GIF 編輯與影片轉換，
  下一候選為 GIF 編輯。

### root `CLAUDE.md`
(none)

### magi/`PRD.md`
(none)

### magi/`TECHSTACK.md`
- **Section: Framework / runtime** — modify
  Why: 引入專案首批 runtime 依賴、worker 執行模式與自備型別宣告，屬技術棧
  事實。
  New content: 記錄 `apng-js@1.1.5`／`gifenc@1.0.3`（exact pin、皆 MIT 零
  依賴；gifenc 無官方型別，專案自備 ambient 宣告）與「module Web Worker
  ＋ Transferable」編碼執行模式（無-SAB 約束引用既有 Constraints，不重述）。

## Verification

**自動化（`npm test`，node 環境、無 DOM 依賴）**
- `composite.test.ts`：dispose（NONE/BACKGROUND/PREVIOUS）× blend
  （SOURCE/OVER）真值表，含首幀 PREVIOUS 降級、部分幀矩形（left/top 非
  0）案例——以 2×2／3×3 手造 RGBAFrame 斷言像素級輸出
- `convert.test.ts`：
  - 選項正規化、alpha threshold／matte 合成
  - **byte 級讀回斷言**：輸出 GIF 的 `GIF89a` header、trailer `0x3B`、幀
    數、每幀 GCE delay bytes（驗「傳給 gifenc 的是 ms、輸出 cs 正確」，可
    抓 10 倍延遲 bug）、transparent flag、NETSCAPE loop（0=無限）
  - delay clamp（<20ms → 20ms）
- `decode.test.ts`（metadata 部分）：`parseAPNG` 直測 S3 fixture——幀數、
  各幀 delay、numPlays、disposeOp/blendOp 真值（node 可測已實證，無條件執行）
- 入口整合：斷言真實 `src/tools.ts` 中 apng-to-gif 為 available 且
  `renderToolList` 對**真實資料**產出 `<a href="./tools/apng-to-gif/">`
  （回收 sprint 01 fixture-only 盲點）

**建置檢查（`npm run typecheck`、`npm run build` exit 0）**
- dist 含 `tools/apng-to-gif/`；dist 的 `tools/apng-to-gif/index.html` 含
  `<main>`、`<meta name="description">`、`lang="zh-Hant"`（可自動化斷言）
- dist 根 index.html 仍為零 `<script`（靜態優先不變量）且含上述 `<a>`

**手動 E2E（dev ＋ preview，綁定具名 fixture）**
- 以 S3 fixture ＋ 一個真實世界 APNG（含半透明與非 none dispose）轉換：
  GIF 播放正常、幀數與下載檔名（`foo.png`→`foo.gif`）正確（延遲／迴圈的
  語意正確性由 byte 級自動斷言承擔，手動只驗「視覺播放正常」）
- 鍵盤單獨完成全流程（選檔→轉換→下載）；焦點可見
- a11y checklist：SR 可感知進度與完成（status 播報＋焦點移轉）、預覽 alt
  正確、暫停鈕有效、`prefers-reduced-motion` 下預設 poster、錯誤訊息以
  alert 呈現、「仍要繼續」按鈕可聚焦
- worker 路徑實走確認（devtools 見 worker 執行緒）；fallback 分支以注入建
  構失敗驗證一次（或於 WORKS 明記已知未測）

**依賴把關**
- `apng-js@1.1.5`／`gifenc@1.0.3` exact pin、lockfile 同 commit；
  `npm audit` 全樹 0 高危（兩葉套件本身零依賴，audit 非其把關手段）；
  licence MIT 已於 review 實證，WORKS 記錄即可
