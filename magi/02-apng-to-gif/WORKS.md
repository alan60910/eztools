# Works — APNG → GIF 轉換工具

Sprint 實作歷程（append-only）。

## 2026-07-03 — M1 依賴基礎與前置 spikes 完成（S1/S2/S3 全定案）
**Tasks:** T1.1, T1.2, T1.3, T1.4（T1.2 lane A ∥ T1.3+T1.4 lane B 平行）
**Verdict:** DONE
**Test result:** vitest 5 檔 30/30（新增 decode metadata ×2、convert PoC 腳手架）；`npm run typecheck`、`npm run build` exit 0；`npm audit` 0 漏洞；coordinator 複跑全數確認
**Files touched:** package.json, package-lock.json, tools/apng-to-gif/gifenc.d.ts（新）, tools/apng-to-gif/fixtures/generate.ts（新）, tools/apng-to-gif/fixtures/sample-2frame.apng（新, 271 bytes）, tools/apng-to-gif/decode.test.ts（新）, tools/apng-to-gif/gif-reader.ts（新）, tools/apng-to-gif/convert.test.ts（新）
**Decisions made by developer:**
- gifenc.d.ts 簽名逐一對照 node_modules/gifenc/src/*.js 核實；僅宣告本 sprint 最小面（quantize/applyPalette/GIFEncoder），default export／reset 等刻意不宣告
- fixture 設計：delayDen=1000 使 delayNum 1:1 對映 ms（避免浮點歧義）；numPlays=5 刻意非預設值（證明 acTL 真的被解析）；幀 0 走 IDAT（兼任 default image，符合常見 APNG 寫法）；兩幀 dispose/blend 錯開（NONE/SOURCE vs BACKGROUND/OVER）防假通過；產生器決定性輸出（SHA256 兩次一致）
- **S1 定案（迴圈映射）**：numPlays 0 → repeat 0（無限）；numPlays 1 → repeat -1（省略 NETSCAPE ext＝播一次；不可用 0，0 是無限）；numPlays n>1 → repeat n−1（NETSCAPE 計數為「再重複 n 次」慣例；依 gifenc 原始碼 encodeNetscapeExt 逐字寫入驗證）。瀏覽器實播確認留 T4.3
- **S1 實證**：delay 傳 120(ms) → GCE 讀回 12(cs)，byte 級鎖住 gifenc 內部 /10 契約（可抓 10 倍延遲 bug）
- **S2 定案（透明路徑）**：採 **Path A**（手動 threshold＋matte ＋ 保留透明 index 直接覆寫）。Path B（gifenc oneBitAlpha/rgba4444）以對抗性 fixture 實測否決：全透明白色像素被最近鄰映射到不透明近白色調色盤項（alpha 距離優勢被 RGB 距離抵銷），會把透明洞渲染成實色；且 clearAlphaColor 無法表達「半透明存活像素對使用者選定背景 matte」的需求。Path A 的保留 index 覆寫為決定性行為，半透明像素實測正確混白（[200,50,50,140] → [225,142,142]）
- lane B 的臨時 PoC 檔以移出 repo 方式清理（遵守全域「刪檔需使用者確認」規則，未執行刪除）
**Out-of-scope observations to follow up:**
- T2.2 提示：保留透明槽位僅在該幀確有透明像素時佔用（省調色盤預算）；「找未用 RGB」最壞 256³ 掃描可加短路（除非 profiling 顯示必要否則不動）

## 2026-07-03 — M2 純函式核心完成（composite ＋ convert）
**Tasks:** T2.1, T2.2（lane A ∥ lane B 平行）
**Verdict:** DONE
**Test result:** vitest 6 檔 67/67（composite 真值表 ×7、convert 相關 ×42 新增）；`npm run typecheck`、`npm run build` exit 0；coordinator 複跑全數確認
**Files touched:** tools/apng-to-gif/composite.ts（新）, composite.test.ts（新）, convert.ts（新）, convert.test.ts（擴充）
**Decisions made by developer:**
- composite API：`composite(canvasState, frame, opts) → { displayed, next }`（皆獨立 clone，測試斷言無 aliasing）；`isFirstFrame` 選項由 composite 內部處理 PREVIOUS→BACKGROUND 降級；輸入畫布斷言不被突變（純函式）；OVER 混合期望值以獨立 node 計算驗算後寫死
- convert：型別為刻意的本地結構相容副本（平行 lane 無跨檔依賴），檔內註解標明 T3.3 統一——**T3.3 需回收此重複**
- 選項正規化採 clamp 不 reject：alphaThreshold [0,255]、matteColor 任一 channel 非有限值即整組回預設、maxColors [2,256]（下限 2 保證保留透明槽位算法不破）；delay 非有限值或 <20ms 一律收斂為 20ms（單一規則）；loop 負值/NaN 視為 0（無限）
- GCE disposal 全幀統一 2（restore to background）：v1 幀皆全畫布快照，透明洞在 disposal 0/1 下會讓前幀穿透（ghosting）；已以 gif-reader 讀回斷言
- 空動畫（0 幀）throw：gifenc 首幀才寫 header，0 幀會產出只剩 trailer 的畸形檔
- repeat 僅於首幀 writeFrame 傳入（gifenc 原始碼證實僅首幀讀取）
**Out-of-scope observations to follow up:**
- T3.3 統一 RGBAFrame/DecodedAnimation 型別來源（convert.ts 檔內已標注）

## 2026-07-03 — M3 工具頁端到端完成（decode ＋ UI ＋ worker）
**Tasks:** T3.1, T3.2（lane A ∥ lane B）, T3.3（接續單線）
**Verdict:** DONE
**Test result:** vitest 6 檔 75/75（decode ×9、onFrameEncoded callback ×1 新增）；typecheck/build exit 0；preview HTTP 實測 `/`、`/tools/apng-to-gif/` 與 4 個 assets（含 worker chunk）皆 200；coordinator 複跑全數確認
**Files touched:** tools/apng-to-gif/decode.ts（新）, decode.test.ts（擴充）, index.html（新）, style.css（新）, main.ts（新）, encode.worker.ts（新）, convert.ts（擴充）, convert.test.ts（擴充）
**Decisions made by developer:**
- decode 三段切分：純函式（magic bytes／IHDR 直讀／metadata 映射）node 直測 fixture；OffscreenCanvas 抽 RGBA（無 document 依賴、保留未來移入 worker 的可能）；`isNotAPNG` 分類非動畫 fallback、其他 Error 防禦性 rethrow（有測試釘住）
- 工具頁骨架：`<label>` 包裹拖放區（原生點擊即開檔）、`#result-section` tabindex=-1 供完成焦點移轉、CSS 走 `_probe` 慣例（main.ts import 雙 CSS）；新色票對比驗算入檔頭（error ≈6.80:1、warning ≈6.36:1、主按鈕 ≈6.71:1、進度條 ≈5.42:1）
- worker 型別：不可同時載入 DOM＋webworker lib（實測衝突）→ 本地最小介面＋`self` 單點 cast，tsconfig 不動；TS 6 `ArrayBufferLike` 4 處窄化 cast，逐處以「本專案永不使用 SAB（無 COOP/COEP 硬約束）」註解正當化
- 型別統一回收：RGBAFrame 改 import 自 composite.ts；DecodedAnimation 經查僅存在於 convert.ts（M2 記錄的「重複」實際只涉及 RGBAFrame 一型）
- convertToGif 加選用 `onFrameEncoded(index,total)` callback（維持純函式），worker 據此轉發進度
- UI：轉換鈕閘控管線（選檔僅驗證＋預覽，選項可先調再轉換）；進度分母 frames×2 跨解碼/編碼兩階段、節流 ≥10%／500ms 單一閉包；大檔守門僅用 metadata 估算（1GiB 線，取消即不浪費解碼）；轉換期間停用輸入（v1 以 setBusy 取代取消機制）；單一全域播放/暫停鈕以 src↔poster 交換實現、涵蓋兩預覽、reduced-motion 預設暫停＋matchMedia live 監聽
- poster 為自家 frame0 合成輸出（非 GIF 回讀 byte-exact，視覺代表性足夠——v1 簡化，檔內已註記）
**Out-of-scope observations to follow up:**
- worker fallback 分支（Worker 建構失敗→主執行緒直呼）為 browser 膠水，無自動化觸發——已知未測，列入 T4.3 checklist 或明記
- vite preview 對源路徑（如 /tools/apng-to-gif/main.ts）有 SPA fallback 回 index.html，驗證資產時勿誤當證據（T3.3 已排除）

## 2026-07-03 — M4 available 翻轉、Spec deltas 落地與驗證收尾
**Tasks:** T4.1, T4.2（lane A ∥ lane B）；T4.3 partial（自動化部分與 checklist 交付完成，真人項待使用者）
**Verdict:** DONE（T4.3 使用者 gate 除外）
**Test result:** vitest 6 檔 77/77（真實資料整合測試 ×2 新增）；typecheck/build exit 0；`npm run verify:dist` 通過（並演示故意破壞時 exit 1）；deploy.yml 經 js-yaml 解析通過；coordinator 複跑四道閘門全數確認，並抽查 SPEC.md／TECHSTACK.md diff 與 PLAN Spec deltas 逐條吻合、無超出宣告之變更
**Files touched:** src/tools.ts, src/tools.test.ts, scripts/verify-dist.mjs（新）, package.json（+verify:dist script）, .github/workflows/deploy.yml（+Verify dist step）, SPEC.md, magi/TECHSTACK.md
**Decisions made by developer:**
- verify-dist 與整合測試的 `<a>` 斷言採容忍屬性順序的 regex／真實輸出字串（render.ts 實際產出含 class="tool-link"，任務描述的簡寫字面比對永遠匹配不到——實事求是修正）
- 整合測試連結數斷言用 `tools.filter(available).length` 而非寫死 1（未來工具上線不需改測試）
- verify:dist 步驟插在 CI Build 與 Upload artifact 之間（壞 dist 不上傳）
- SPEC Status 保留「首次部署待 Pages 前置設定與合併 main 驗證」句（sprint 01 T2.2 gate 尚未關閉）
**Out-of-scope observations to follow up:**
- **已知未測**：worker 建構失敗 fallback 分支（無自動化觸發手段；風險低——fallback 直呼同一 convertToGif 純函式）
- T4.3 真人 checklist 已交付使用者（見 sprint hand-off），完成後由 coordinator 記錄結果並勾銷 T4.3

## 2026-07-03 — MAGI code review（5 視角面板）＋ Post-review fixes（必修 6 項）
**Tasks:** /magi:review-code 多方位審議 → 使用者核准「修復後再 commit」→ 修復批次（lane A composite/fixture ∥ lane B a11y）
**Verdict:** review APPROVE-WITH-NITS（CR1/CR3/CR4/CR5 AWN、CR2 RC）；產出 MAGI_CODE_REVIEW.md 與 DRIFT.md（A×3 皆 coordinator 親自查證屬實後記錄，均已修復）；修復批次 DONE
**Test result:** 修復後 vitest 6 檔 82/82（+5：越界邊界 ×3、真值表補格 ×2）；typecheck/build/verify:dist exit 0；coordinator 複跑四道閘門確認
**Files touched（修復批次）:** tools/apng-to-gif/composite.ts, composite.test.ts, fixtures/generate.ts, fixtures/sample-2frame.apng（重生，SHA 兩次一致）, decode.test.ts, main.ts, index.html, style.css
**修復內容：**
- 焦點可見：`.file-drop:focus-within .file-drop__label`（原選擇器掛在 sibling 上永不觸發）＋focus 時實線邊框
- 暫停/poster 時序（DRIFT A-1）：選檔成功即以「單幀 extractFrameRgba＋composite」產 poster、暫停鈕即刻可見；reduced-motion 首次渲染即 poster；非動畫 PNG 走同一泛用路徑天然得到原圖 poster；runConversion 不再重生 poster（frame 0 像素與轉換選項無關）；新增 resetForNewFile 防換檔時舊 poster 殘影
- live region 常駐（DRIFT A-3）：error/warning 容器移除 hidden 切換、以 is-empty class 收空間——選「消除競態類別」而非「調整時序」方案
- composite 越界防護：isWithinCanvas 短路套用於四個 rect 迴圈（水平越界原會「換行」滲入下一列——實為 flat array 定址仍落在合法範圍的真損毀；垂直越界原僅靠 typed array 靜默行為僥倖無害），3 個邊界測試釘住
- 真值表補滿 6/6（BACKGROUND×OVER、PREVIOUS×OVER，皆非零偏移；OVER 期望值獨立 node 驗算）
- fixture 鑑別力：幀 1 改 disposeOp=PREVIOUS(2)/blendOp=OVER(1)（封欄位互換變異）、幀 0 改 delayNum=15/delayDen=100（仍 150ms，驗到 num/den→ms 換算）；已確認幀 1 的 PREVIOUS 不受首幀降級影響（讀回 2）
**Decisions made by developer:**
- 越界處理採「靜默裁切」而非報錯（畸形檔盡力而為）；已在 DRIFT B 升為明示決策
**流程記錄：** lane A 驗證 fixture 時建立又自行刪除了一個用完即棄腳本——全域規則要求刪檔先經使用者確認，該檔為其自建暫存、無波及範圍，如實記錄此偏差
**Out-of-scope observations to follow up:**
- 選修 5 項未處理（review 少數意見）：transparentColorIndex 動態值斷言、暫停鈕 aria-pressed 二擇一、maxColors=2／全透明幀端到端案例、WORKS 已知未測補記（main.ts 純邏輯）＋apng-js delay 上游行為註解、預覽面板 section 化——待 /magi:commit C 項流程或 backlog
