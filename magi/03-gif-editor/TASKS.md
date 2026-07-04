# Tasks — GIF 編輯工具（頁數編輯、時間停留、循環次數）

> Source: PLAN.md（r2.1）   •   Sprint: magi/03-gif-editor/
> 審議：MAGI_PLAN_REVIEW.md round 2 = APPROVE-WITH-NITS（nits 已折入 r2.1）

## Milestone 1: 依賴安裝＋src/lib 共用層抽取（零回歸搬遷）
**Goal:** gifuct-js 就位；composite／完整編碼管線／gif-reader 下沉 `src/lib/`，apng-to-gif 改引用，零回歸。
**Acceptance:** 三閘全綠（`npm test`＋`npm run typecheck`＋`npm run build`）；apng-to-gif 測試總數不減；convert.ts 薄層 smoke 通過。

- [x] 🔀 [A] T1.1 — 安裝 `gifuct-js@2.1.2`（exact pin，package.json＋lockfile）＋ SP-6 型別 spike：最小檔實際 `import { parseGIF, decompressFrames }` 過 `npm run typecheck`；shipped 型別不足時驗 module augmentation／wrapper `as` fallback 可編譯（嚴禁第二個 `declare module 'gifuct-js'`）。結論記入 WORKS。
- [x] 🔀 [B] T1.2 — 機械搬遷：`composite.ts`＋`composite.test.ts`＋`gif-reader.ts`＋`gifenc.d.ts` 移入 `src/lib/`；grep 親驗的 composite 消費者（main.ts／encode.worker.ts／decode.ts／decode.test.ts／convert.ts／convert.test.ts）**僅 composite** import repoint 至 `src/lib/`（convert 匯入不動）；三閘綠。
- [x] T1.3 — 編碼管線下沉（SP-5，依 T1.2）：自 convert.ts 抽 `src/lib/gif-encode.ts`（`encodeGif`＝convertToGif 泛化更名、`GifEncodeInput`（loop 採 numPlays 語意）、`normalizeGifEncodeOptions`＋全套 DEFAULT 常數、normalizeDelayMs／numPlaysToRepeat／blendWithMatte／quantizeFrameToIndexedBitmap／QuantizedFrame）；convert.ts 退薄相容層（re-export 面**釘死** `{convertToGif, ConvertOptions, DecodedAnimation}`，main.ts／worker 匯入不變）＋smoke 測試（`convertToGif === encodeGif` 身分斷言或單幀讀回）；測試遷併（convert.test.ts 全部 describe 含 gifenc-PoC → `src/lib/gif-encode.test.ts`；共享 helper → `src/lib/test-helpers.ts`）；三閘綠、測試總數不減。

## Milestone 2: 解碼事實 spikes＋GIF fixture 腳手架
**Goal:** decode 端全部待驗事實以可執行測試釘死；手寫 GIF fixture 能力拍板。
**Acceptance:** SP-4 PoC 通過（或 fallback 拍板並記錄）；roundtrip 三方交叉＋loop 抽取測試綠；決策記入 WORKS。

- [x] 🔀 [A] T2.1 — **SP-4（阻斷級，decode.ts 前置）**手寫 GIF fixture builder：`tools/gif-editor/fixtures/generate.ts`——自帶無壓縮 LZW 變體（定寬碼＋定期 clear code），timebox PoC：產 2 幀、frame 1 非零 (left,top)、disposalType=3 的 GIF → gifuct 解回斷言 dims／disposalType／pixels。不成 → 改簽入外部工具產 sample.gif（手驗真值）並記錄。產出含透明、disposal 2/3、非零偏移、無 NETSCAPE、loop 0/n 的 fixture 集＋sample .gif 簽入。
- [x] 🔀 [B] T2.2 — SP-2＋SP-3 spike 沉澱為常駐測試：同一份 gifenc bytes 三方交叉（gif-reader wire cs／raw loopCount／frameCount／GCE disposal × gifuct delay ms／disposalType／patch alpha × 寫入值）；fixture 一律 cs≥2、另設一測釘 0cs→100ms（旁註 1cs 行為）；loop 抽取兩法比對（gif-reader vs 走訪 gifuct application ext subBlocks，後者優先評估）＋健壯性判準（非 gifenc 來源真實 GIF 一組不 throw／安全降級）→ 擇一並記錄；transparentIndex→alpha0 以 gifenc full-frame 透明幀覆蓋。

## Milestone 3: 純函式核心（decode／edit／端到端）
**Goal:** bytes → DecodedGif → EditState → GifEncodeInput → bytes 全鏈 node 可測且綠。
**Acceptance:** 端到端 node 管線測試綠；SP-7 lib 邊界驗證通過（gif-editor 只 import `src/lib/`）。

- [x] 🔀 [A] T3.1 — `tools/gif-editor/decode.ts`：`gifDisposalToComposite` 具名純函式＋table 測試先行（0/1/2/3/undefined/保留值/首幀3降級——不依賴 fixture）；gifuct 包裝 → 全幀合成 → `DecodedGif {width,height,frames,delaysMs,loop}`；loop 抽取（T2.2 擇定法）＋**失敗→安全降級 loop=1（必測）**；`GIF87a`/`GIF89a` magic bytes 守門＋損壞檔錯誤路徑；以 T2.1 fixture 斷言全幀 RGBA／delaysMs／loop。
- [x] 🔀 [B] T3.2 — `tools/gif-editor/edit.ts`：EditState 純函式全套（createInitialEditState／setFrameKept／setFrameDelay／setAllDelays／setLoop／applyEdits→GifEncodeInput）；測試：非連續 keep（[true,false,true]）frames×delaysMs 對齊、單幀邊界、投影正確性、setter 無效輸入契約、delay floor 20ms、loop 0/1/n、全刪 throw、等長前置斷言、不可變性。
- [x] T3.3 — 端到端 node 管線測試（依 T3.1＋T3.2）：decode fixture → 刪一幀＋改 delay＋改 loop → `encodeGif` → gif-reader 斷言（幀數＝保留數、GCE delay／disposal=2／transparent flag、NETSCAPE 對映 ∞→0／1→省略／n→n−1、trailer）；SP-7 驗證：此測試檔只准 import `src/lib/`＋gif-editor 自身模組。

## Milestone 4: UI＋整合＋Spec deltas＋真人 gate
**Goal:** 工具頁上線（available）、CI 守門通用化、living docs 對齊契約。
**Acceptance:** 三閘＋`npm run verify:dist` 綠；入口頁出現 gif-editor 連結；真人 checklist 交付。

- [x] 🔀 [A] T4.1 — `tools/gif-editor/index.html`＋`style.css`：SPEC Conventions 骨架全套（lang zh-Hant、返回連結、單一 h1、meta description）；幀清單（region landmark＋skip-link＋分頁容器＋頁導覽**置清單前**）、雙預覽區、常駐 live regions（is-empty 模式）、控制區佈局。
- [x] 🔀 [B] T4.2 — `src/tools.ts` 翻 gif-editor `available`＋`src/tools.test.ts` 連結數**刻意**+1；`scripts/verify-dist.mjs` 通用化：骨架檢查掃 `dist/tools/*/index.html` 全頁（免清單）＋入口 anchor 顯式斷言兩工具（註解明載與 tools.ts 同步責任）＋anchor 目標頁存在性交叉；build＋verify:dist 綠。
- [x] T4.3 — `tools/gif-editor/main.ts`＋`encode.worker.ts`（依 T4.1、T3.x）：UI 全流程與 a11y 契約——預覽**延後掛載**不變量（全解碼完成＋poster 備妥前不掛載）、解碼前 best-effort 播報＋讓出事件迴圈、分頁換頁契約（焦點移新頁起點＋role=status 頁位播報）、編輯動作播報（批次／切換；逐鍵不播）、縮圖 aria-hidden＋控件 accessible name 含幀號、非破壞性刪除（焦點不遷移、值保留）、**原始／結果各自一顆 poster**（結果取輸出首個保留幀）、記憶體警示閘（parseGIF metadata 估算）＋揭露文字（極低延遲正規化＋重量化）、worker 委派（Transferable＋progress 節流限編碼段＋同步建構失敗回退）、下載＋前後大小對比。開發期順帶量測 SP-8（~500 幀 tab／DOM／換頁）與 SP-9（凍結時長）記入 WORKS。
- [x] T4.4 — Spec deltas 落地：root SPEC.md（Components 三處：gif-editor 條目＋新增 src/lib 條目＋apng-to-gif 條目回收；Conventions 兩處：src/lib 慣例＋可編輯清單 a11y 不變量含換頁；Status）；magi/TECHSTACK.md（runtime deps **改寫為分項**、gifenc d.ts 位置更新）。
- [ ] T4.5 — 手動 E2E＋a11y checklist（coordinator 交付清單、使用者執行 gate）
  ＜checklist 已交付（2026-07-04），待使用者執行回報後記入 WORKS 勾銷＞：真實 GIF 編輯全流程、鍵盤全程（分頁＋skip-link 實走）、SR 播報（「全部套用」／換頁／解碼凍結前後體感）、「n+1 次播放」瀏覽器實際播放次數、暫停／poster／reduced-motion（原始＋結果）、worker devtools 實走、入口連結。
