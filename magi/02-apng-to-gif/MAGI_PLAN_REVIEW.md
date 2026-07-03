# 🧠 MAGI Plan Review — APNG → GIF 轉換工具

**Sprint:** magi/02-apng-to-gif/ • **Document:** PLAN.md（2026-07-03 初版）• **Round:** 1

## Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES（4/5 — R1/R2/R3/R4；R5 投 AWN）    │
├──────────────────────────────────────────────────────────────┤
│  Mode: supermajority    Threshold: 3.34（即 ≥4/5 票）         │
│  OK weight: 5 / 5       Degraded: no                         │
├──────────────────────────────────────────────────────────────┤
│  ✅ R1-架構  ✅ R2-a11y  ✅ R3-依賴  ✅ R4-測試  ✅ R5-契約  │
│  R1:RC   R2:RC   R3:RC   R4:RC   R5:AWN                      │
├──────────────────────────────────────────────────────────────┤
│  🔴 Critical: 0    🟡 Important (adopted): 0                 │
│  🟢 Minority: 30（跨視角強訊號 ×4）    🔬 Spikes: 5          │
└──────────────────────────────────────────────────────────────┘
```

> 面板組成同前兩輪：5 個獨立 Claude（Opus）reviewer 實例、視角分工（無跨
> 廠商驗證）。視角分工使議題集中於單一鏡頭，故無單一議題達 4 票採納線；
> 2 票的跨視角收斂項實務上是強訊號。多位 reviewer 有實查證據（npm registry
> 中繼資料、gifenc dist 原始碼、apng-js d.ts、現有 repo 程式碼），非純閱讀式審查。

## Verdict

**REQUEST-CHANGES**（verdict 票 4/5 過門檻）。五位一致肯定大方向：Option A
（apng-js 解碼 ＋ gifenc 編碼）契合純靜態／無 COOP-COEP 硬約束，無人主張改
方案；且多項事實已審查期實證——**apng-js 1.1.5 與 gifenc 1.0.3 皆 MIT、零
runtime 依賴**（R1/R3/R5 各自查證），`parseAPNG` 於 node 不觸 DOM、**open
question 3 成立**（R3/R4 實證），與既有 MPA 的整合面（worker 檔不會被誤當
入口、available 防護、path/slug 一致）健全（R1 對照程式碼確認），sprint 01
的 R4 教訓（測試閘門）已落實。退回原因不是設計錯誤，而是**契約層缺口**：
界面型別與 node 可測性互斥、合成語意未釘死、兩項 gifenc API 事實與計畫相左
（延遲單位、無型別）、互動 a11y 零契約、Verification 深度不足。全部屬「修
PLAN 文字＋釘死介面契約」層級，修訂成本此刻最低。

## 🔴 Critical (adopted)

（無）

## 🟡 Important (adopted)

（無議題達 ≥4/5 採納線——見下方跨視角強訊號）

## 🟢 Minority（未達 4 票；依票數與視角分組）

### 跨視角收斂（2 票，強訊號）

- **[vote: 2/5 — R1(I)+R4(I)] 跨層 payload 用 `ImageData` 與「convert.ts node 可測」互斥**
  - Where: Recommended approach 解碼層「輸出 ImageData[]」↔ 轉換層「純函式 node 可測」
  - 專案 vitest 跑預設 node 環境（無 vitest config、無 jsdom devDep），node 無
    `ImageData` 全域；照 PLAN 實作則 G7 與 V1 全部落空。tsconfig lib 含 DOM，
    typecheck 會過、runtime 才炸，更陰險。
  - Fix（兩位收斂）：跨層 payload 釘為純結構
    `{ data: Uint8ClampedArray, width, height }`（＋delayMs、loop）；convert.ts
    禁止 runtime import 觸 DOM 的程式碼（type-only 可）。附帶解掉 worker
    Transferable 問題（裸 ArrayBuffer 天然可轉移）。
- **[vote: 2/5 — R1(I)+R4(I)] dispose_op／blend_op 合成：語意未釘死＋零自動化覆蓋**
  - Where: Recommended approach 解碼層；Goals G2；Verification
  - R1（語意面）：blend SOURCE 需 clearRect-then-draw（canvas 預設即 OVER）、
    dispose PREVIOUS 是「幀矩形區域」級快照還原、首幀 PREVIOUS 降級
    BACKGROUND——全未寫進計畫，是 APNG→GIF 最經典錯誤源。R4（驗證面）：這段
    被切在 browser-only 側，V1/V2 都測不到，僅剩手動 E2E 兜底。
  - Fix（收斂）：合成抽成純函式 `composite(prev, frame, disposeOp, blendOp,
    rect)`（吃吐結構型 RGBA），canvas 只負責 PNG→RGBA；node 以 2×2/3×3 手造
    幀建 dispose/blend 真值表單測；PLAN 明訂上述三條語意。
- **[vote: 2/5 — R2(I)+R5(I)]（[deltas]）工具頁新基線未宣告 Conventions delta，模式無法傳承**
  - Where: Spec deltas → root SPEC.md Conventions；Non-Goals（不修 `_probe`）
  - `<main>`＋meta description 與本 sprint 首建的互動 a11y 模式（live region、
    焦點管理、拖放鍵盤等效、動畫暫停、alt）都未寫入 SPEC Conventions delta，
    而 `_probe` 又明訂不修——改良變一次性即興，下一個工具仍從殘缺範本起步，
    重演 sprint 01 DRIFT A-2 的漂移型態。
  - Fix：Conventions delta 增列「工具頁含 `<main>`＋meta description」與互動
    工具 a11y 不變量（條目見 R2 單視角段）。
- **[vote: 2/5 — R5(I)+R4(N)] Goals↔Verification 孤兒承諾：a11y／`<main>`／meta 無查核點**
  - Where: Goals G6 vs Verification 全段
  - 承諾了 `<main>`、meta description、`lang="zh-Hant"`、WCAG AA，但 Verification
    只有「鍵盤可完成流程」一句——「宣稱已落地但實際未驗」的溫床（A-2 教訓）。
  - Fix：增列可自動化斷言（dist 的 `tools/apng-to-gif/index.html` 含 `<main>`、
    `<meta name="description">`、`lang="zh-Hant"`）＋具體手動 a11y checklist。

### 單一視角 Important（1 票；R3 兩項為實證事實，建議無條件採納）

- **[R3，已實證] gifenc `delay` 單位是毫秒（內部自行 /10）——PLAN 的 ms→cs 預換算會造成 10 倍加速**
  - 實測 gifenc 1.0.3 dist：`writeFrame` 內 `Math.round(delay/10)`。照 PLAN 實作
    所有延遲變 1/10，且 PLAN 的單元測試只驗自家換算、抓不到。
  - Fix: convert.ts 直接傳 ms（clamp 下限改 20ms），測試鎖「傳給 gifenc 的值是 ms」。
- **[R3，已實證] gifenc 無 TypeScript 型別、`@types/gifenc` 不存在——strict typecheck 必失敗**
  - PLAN 明列 `npm run typecheck` exit 0 為驗證條件，卻未規劃型別 shim。
  - Fix: 檔案清單增 `declare module 'gifenc'` ambient 宣告（最小簽名），並列為
    sprint 產出；TECHSTACK delta 補記（另見 R3 deltas Note）。
- **[R2] 自動播放動圖無暫停機制（WCAG 2.2.2 Level A）**——本頁是全站動態最強
  處，站台的 reduced-motion CSS 對動畫「圖片格式」無效。Fix: reduced-motion 預
  設第一幀 poster＋播放切換鈕（frame 0 已現成）。
- **[R2] 進度無 aria-live／完成無焦點管理（WCAG 4.1.3 AA）**——SR 使用者無從
  得知進度與完成。Fix: `role="status"`＋節流更新；完成時焦點移至結果區。
- **[R2] 兩個預覽 `<img>` 無 alt 契約（WCAG 1.1.1 Level A）**。Fix: 契約化資訊
  性 alt＋「動畫」語意。
- **[R1] O(N) 全幀物化＋worker 結構化複製的峰值記憶體**——open Q2 的 1GB 警戒
  線在處理症狀；gifenc 支援逐幀 writeFrame、APNG 合成只需畫布現況＋當前幀，可
  串流化。Fix: 至少 postMessage 帶 transfer list ＋ 在 PLAN 記錄「O(N) vs 串流」
  取捨；若記憶體是硬約束改 frame iterator。
- **[R5] `parseAPNG` 驗證掛在未驗證假設上（條件式驗證不可證偽）**——R3/R4 已實
  證 node 可測成立。Fix: open Q3 升級為既定事實，V2 改為無條件驗證。
- **[R4] APNG binary fixture 來源／產製未定義，V2 不可重現**。Fix: 附 chunk 級
  產生器腳本（acTL/fcTL/fdAT，~數百 bytes、2 幀、非零 delay、含非 none
  disposeOp），腳本與產物一併入庫。
- **[R4] V1 GIF 斷言過淺**——header/trailer/幀數證不出延遲／迴圈／透明語意。
  Fix: byte 級讀回 GCE（每幀 delay、transparent flag）與 NETSCAPE loop 斷言
  （順帶能抓到 R3 的 10 倍延遲 bug）。

### 單一視角 Note（1 票）

**架構（R1）**
- 只有「編碼」進 worker，解碼＋合成（同樣重活）留主執行緒——「不凍結 UI」目標
  部分落空；明講取捨或評估 OffscreenCanvas。
- [deltas]「CPU 密集採 Worker」慣例措辭比實作寬，發起工具即部分違反——改為
  「CPU 密集『編碼』階段採 worker」或註記 v1 例外；SPEC 可補一行工具可含多模組
  切分（decode/convert/worker）之結構慣例。
- 非 APNG fallback 邊界模糊：`createImageBitmap(原始檔)` 會照收 JPEG/WebP，靜默
  長出「任意影像→GIF」路徑——以 PNG magic bytes 限定 fallback，或刻意支援並寫進
  Goals。
- `encode.worker.ts` 應明訂為 convert.ts 純函式的薄委派（fallback 直呼同一函
  式），並補 worker→主執行緒錯誤通道（`{type:'error'}` ＋ `onerror`）。

**前端 a11y（R2）**
- 錯誤用 `role="alert"`、非阻斷警示用 `role="status"`；「大檔警示可續行」須為可
  聚焦按鈕。
- file input 必須留在 tab order（視覺隱藏用 sr-only clip 技法，勿 display:none）；
  放置區以 `<label>`/按鈕觸發同一 input。
- 工具頁骨架契約：header（含返回連結）／main／footer、單一 `<h1>`、描述性
  `<title>`（如「APNG 轉 GIF｜EZTools」）；新互動元件對比比照基線紀律
  （≥4.5:1 文字、≥3:1 UI/焦點）。

**依賴／供應鏈（R3）**
- 維護狀態敘述倒置：凍結的是 gifenc（2021 起無新版），apng-js 反而近期有維護
  （1.1.5，2025-01）——更正風險段，兩者 exact pin＋lockfile。
- [deltas] TECHSTACK delta 遺漏「gifenc 需自備 ambient 型別宣告」這一隱含技術棧
  事實。
- apng-js 實際 API 為 camelCase 數值列舉（`numPlays`/`disposeOp`/`blendOp`、
  影像為 Blob），非 PLAN 寫的 snake_case 字串——wrapper 內做列舉映射。
- 「npm audit 決定版本」對兩個零依賴葉套件近乎空轉——把關重點改為 exact pin。

**測試（R4）**
- 手動 E2E 缺客觀驗收標準（「延遲／迴圈近似」不可判定）＋未指名 fixture——語意
  正確性移交 byte 級自動斷言，手動只留主觀項。
- worker fallback 分支零觸發驗證——至少 devtools 確認 worker 路徑實走＋fallback
  一次注入式驗證，或明記已知未測。
- V3「available 分支既有測試涵蓋」對真實資料誇大（fixture-only，sprint 01 已記）
  ——加一條對真實 `tools` 陣列或 dist HTML 斷言 `<a href="./tools/apng-to-gif/">`。

**契約（R5）**
- Open Q4 與 Recommended approach 矛盾（靜態 PNG 已定案「照轉＋提示」卻仍列開
  放）——移除或改寫為已定。
- Context 誤植：available 建置期防護在 `vite.config.ts` 的
  `assertAvailableToolsHaveEntries`（:29-41），非 render.ts；且該 throw 路徑無
  測試涵蓋，勿與 render 單元測試混寫。
- [deltas]「無 SAB」事實三處重述（TECHSTACK Constraints 已有）——Conventions 只
  寫正向慣例並引用既有 Constraints，TECHSTACK delta 聚焦新依賴＋worker 模式。

## 🔬 Spike candidates（彙整去重）

1. **[R1+R5 提出；R3+R4 已實證通過→建議直接升級為事實]** `parseAPNG` node 直測
   fixture 中繼資料：apng-js 1.1.5 解析層不觸 DOM（Blob 為 Node ≥18 全域）。
   關閉 open Q3。
2. **[R1+R4] gifenc node PoC**：結構型 RGBA 幀 → quantize/applyPalette/
   GIFEncoder → byte 讀回斷言 GIF89a、GCE delay、NETSCAPE loop、透明 index。
   一次跑通即同時定案 V1 深度與 delay 單位。
3. **[R3+R5] 透明處理路徑二擇一**：手動 threshold＋matte→quantize＋指定
   transparentIndex vs gifenc 內建 `oneBitAlpha`/`clearAlphaColor`——用含半透
   明 fixture 比對輸出，於瀏覽器＋桌面檢視器實播驗收（殘影／閃爍／邊緣），
   定案 open Q1/Q5。
4. **[R1] worker 傳輸模式峰值記憶體**：~50 幀 1000×1000 帶／不帶 transfer list
   的 postMessage 峰值量測，確立傳輸契約（若採納結構型 payload 則此 spike 併
   入實作驗證）。
5. **[R4] 最小多幀 APNG fixture 產生器**：chunk 級腳本產 2 幀 fixture（含非
   none disposeOp），parseAPNG 讀回驗真值；腳本＋產物入庫。

## Untested paths（依現行 PLAN）
- decode.ts 的 dispose/blend canvas 合成 — flagged by R1, R4（本次最大缺口）
- worker fallback 分支 — flagged by R4
- `assertAvailableToolsHaveEntries` throw 路徑 — flagged by R5（sprint 01 遺留）

## 附註 — 審查期已實證的正面事實
- apng-js 1.1.5：MIT、零依賴、內建 d.ts、2025-01 仍有發版（R1/R3/R5 查證）
- gifenc 1.0.3：MIT、零依賴、格式凍結可接受（R1/R3/R5 查證）
- `parseAPNG` node 可測（R3/R4 原始碼查證）；PLAN 的 licence 開放項可視為已解
- MPA 整合面（entry key 前綴、available 防護、path/slug 一致）與 PLAN 描述相符
  （R1 對照 vite.config.ts / src/tools.ts）
