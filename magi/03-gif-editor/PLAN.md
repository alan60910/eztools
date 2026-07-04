# GIF 編輯工具（頁數編輯、時間停留、循環次數）

> Sprint: magi/03-gif-editor/ • Type: feat / major • Revision: **r2.1**（2026-07-03，
> round 1 修訂＋round 2 七項 nits 折入；審議記錄見 MAGI_PLAN_REVIEW.md）
> Seed: BACKLOG「GIF 編輯功能（頁數編輯、時間停留等基礎功能）」促升

## Context

PRD Goals 的第二個工具。使用者需要對現有 GIF 做輕量編輯——刪掉不要的幀、
調整每幀停留時間、改播放次數——而不想安裝軟體或用充廣告的線上服務。
全部處理在瀏覽器端完成（純靜態、無後端）。

Sprint 02（apng-to-gif）沉澱了可重用資產：六語意合成純函式
`composite.ts`（真值表測試背書）、gifenc 編碼管線（量化＋Path A 透明保
留、byte 級讀回測試腳手架 `gif-reader.ts`）、module worker 模式、a11y
契約（已入 root SPEC Conventions）。本 sprint 的架構重心是**把整條可共
用的編碼管線（不只葉子函式）抽到 `src/lib/`**，讓兩個工具真正單一來源。

## Goals & Non-Goals

### Goals
- `tools/gif-editor/` 工具頁：載入 GIF → 幀清單（縮圖＋停留時間）→
  編輯 → 重新編碼 → 預覽＋下載
- v1 編輯範圍（使用者已確認）：**刪除／還原幀、逐幀 delay 編輯（含
  「全部套用同值」）、播放次數編輯（∞／N 次）**
- 解碼、編輯、編碼核心皆為純函式、node 可測；編碼結果以 byte 級讀回
  驗證（gif-reader.ts）
- 共用管線落位 `src/lib/`（composite、**完整 gif 編碼管線含
  orchestrator／選項正規化／DEFAULT 常數**、gif-reader），apng-to-gif
  改引用；搬遷以 `npm test`＋`npm run typecheck`＋`npm run build` 三閘
  驗證零回歸
- 遵守 root SPEC Conventions 全部互動工具 a11y 不變量，並針對本工具全
  新的「大量幀清單」互動面給出明文設計（見 §5）
- `src/tools.ts` 翻轉 gif-editor 為 `available`（tools.test.ts 的連結
  數預期值**需刻意同步更新**）；`verify-dist.mjs` 通用化且不引入第二
  事實來源

### Non-Goals（v1 明確不做）
- 幀重排序（上移／下移）——留 BACKLOG 候補
- 插入／複製幀、裁切／縮放、逐幀繪圖、文字貼圖
- 非 GIF 輸入（僅接受 `image/gif`；APNG 轉檔請用既有工具）
- 色盤層級無損編輯：v1 一律走「解碼全幀化 → 重新量化編碼」單一管線。
  只改 delay/loop 理論上可無損（僅改 GCE/NETSCAPE bytes），但刪幀因
  disposal 依賴必然要重合成；為了單一可測管線，v1 統一重編碼，無損
  fast-path 留 BACKLOG。後果：原 GIF 會被重新量化（≤256 色來源通常視
  覺無損，但不保證 palette byte 相同）——UI 以說明文字揭露
- 解碼移入 worker：gifuct 解碼為同步純 JS，大檔會凍結 UI；v1 以記憶體
  警示閘＋解碼前後播報（§5）減輕、凍結時長由 spike 量測（SP-9），
  decode-worker 化留 BACKLOG

## 已查證事實（round 1 審議沉澱；實作與測試可直接依賴）

### gifuct-js@2.1.2（coordinator 親驗原始碼）
- `parseGIF(arrayBuffer)` ＝ js-binary-schema-parser 的 GIF schema 解
  析；`decompressFrames(gif, buildPatch)` 只回傳**影像幀**，每幀
  `{pixels, dims:{top,left,width,height}, colorTable, delay,
  disposalType, transparentIndex?, patch?}`
- **不暴露 NETSCAPE loop**：application extension 在 schema 中只解析
  `id`（"NETSCAPE2.0"）＋原始 subBlocks bytes，無 loopCount 具名欄
  位，且 `decompressFrames` 過濾掉非影像幀——**loop 必須另行抽取**
  （本計畫解法見 §設計 4a）
- `delay = (gce.delay || 10) * 10`（單位 **ms**）：0cs 會被靜默改寫為
  100ms（與瀏覽器慣例一致；UI 揭露）；幀無 GCE 時
  delay/disposalType/transparentIndex 為 `undefined`（不拋錯）
- `disposalType` 為 GIF 3-bit 原值（0/1/2/3）；buildPatch 將
  transparentIndex 像素輸出 alpha=0、其餘 255（二值）；內建
  deinterlace；純 JS 無 DOM 依賴（node 可測成立）
- 自帶 `types: index.d.ts`；MIT；一顆 transitive dep
  `js-binary-schema-parser`（manifest 範圍 `^2.0.3`，解析版由 lockfile
  鎖定；MIT、零下游）

### gifenc@1.0.3（sprint 02 已驗＋round 1 複核）
- `delay` 收 ms（內部 round(/10)）；`repeat >= 0` 才寫 NETSCAPE 且原值
  寫入（-1＝省略＝播一次）；`writeFrame` 恆 full-frame、(0,0) 偏移——
  故非零偏移／異質 disposal 的 fixture 必須手寫（見 SP-4）

### 既有程式碼（grep 親驗）
- `./composite.js` 的消費者共 7 檔：composite.test.ts、convert.ts、
  convert.test.ts、decode.ts、decode.test.ts、**main.ts（值匯入
  `composite`/`createTransparentCanvas`）**、**encode.worker.ts（型別
  匯入）**——搬遷時全數改路徑
- APNG fixtures/generate.ts 的壓縮靠 `node:zlib deflateSync` 白拿；
  **GIF 影像資料用 LZW、node 無內建**——手寫 GIF builder 是實質新模組
- tsconfig `include:["src","tools"]` 單一 program：ambient d.ts 搬
  `src/lib/` 後 strict typecheck 仍生效

## Design options considered

### 1. GIF 解碼函式庫

| 選項 | 事實 | 評估 |
|------|------|------|
| **A. gifuct-js@2.1.2** | 見上方已查證事實 | ✅ 推薦。patch＋dims＋disposalType 與 composite 管線形狀吻合；loop 缺口以 §4a 補 |
| B. omggif@1.0.10 | MIT、零依賴、需 @types/omggif | API 低階、disposal 仍自管，膠水碼多 |
| C. WebCodecs `ImageDecoder` | 原生零依賴 | ❌ Firefox 不支援 |
| D. 自寫解碼器（延伸 gif-reader 補 LZW 解碼） | 零依賴 | ❌ 工時／風險高；gif-reader 的角色見 §4a |

選 A。注意：gifuct 自帶型別，**S2 的 fallback 不是 ambient 取代**（第
二個 `declare module 'gifuct-js'` 會 duplicate 衝突）；若 shipped 型別
在 strict 下不足，改用 module augmentation 或本地 wrapper `as` 收斂，
且 fallback 本身須先過 `npm run typecheck`（SP-6）。

### 2. 全幀合成（disposal 處理）

GIF disposal 語意與 APNG dispose 同構，**但數碼交錯**：GIF
`2`(background) 撞 composite 的 `DISPOSE_OP_PREVIOUS=2`（APNG 編號）、
GIF `3`(previous) 超出 composite 值域——**嚴禁直傳**。decode.ts 設具名
純函式：

```ts
gifDisposalToComposite(gifDisposal: number | undefined, isFirstFrame: boolean): DisposeOp
// 0 / 1 / undefined / 4-7（保留值）→ DISPOSE_OP_NONE
// 2 → DISPOSE_OP_BACKGROUND
// 3 → DISPOSE_OP_PREVIOUS（首幀 → DISPOSE_OP_BACKGROUND 降級，沿用 APNG 規則）
```

配 table 單元測試（不等 fixture 即先鎖語意）。語意註記：GIF89a 字面的
disposal 2 是「還原背景色」，主流瀏覽器實務一律清為透明——composite
的 BACKGROUND（清透明）**刻意採瀏覽器語意**，程式註解點明。透明像素
（patch alpha 0/255）即二值 alpha 的 OVER，composite 的 OVER 公式天然
涵蓋。

合成落位（沿 r1 結論）：抽 `composite.ts` 到 `src/lib/` 兩工具共用；
複製（雙源漂移）與跨工具 import（耦合）均否決。

### 3. 重新編碼——抽取邊界（round 1 修訂重點）

round 1 界定「只上移葉子函式」被兩鏡頭否決：`convertToGif` 的寫幀迴圈
（dispose=2 統一、repeat 只掛首幀、transparent 條件、finish/bytes）毫
無 APNG 專屬性，留在 convert.ts 會逼 gif-editor 重寫這段正確性敏感的
骨架——雙源漂移換位重生。**r2 邊界：整條編碼管線下沉。**

`src/lib/gif-encode.ts` 內容（自 convert.ts 抽出並泛化）：
- `encodeGif(input: GifEncodeInput, opts?: GifEncodeOptions): Uint8Array`
  ——即現 `convertToGif` 泛化更名，含 `onFrameEncoded?` 進度 callback
- `GifEncodeInput { frames: RGBAFrame[]; delaysMs: number[]; loop: number }`
  ——即現 `DecodedAnimation` 更名為中性型別；`loop` 採 numPlays 語意
  （0=無限、n=播 n 次），**兩工具統一此名此義**（消除 playCount/loop
  命名分裂）
- `normalizeConvertOptions`（更名 `normalizeGifEncodeOptions`）、
  `DEFAULT_ALPHA_THRESHOLD`／`DEFAULT_MATTE_COLOR`／`DEFAULT_MAX_COLORS`
  ／`MIN_DELAY_MS` 等 DEFAULT 常數群**一併下沉**
- `normalizeDelayMs`、`numPlaysToRepeat`、`blendWithMatte`、
  `quantizeFrameToIndexedBitmap`、`QuantizedFrame`

`tools/apng-to-gif/convert.ts` 退化為薄相容層，re-export 面**釘死**為
grep 親驗的實際消費集合——`convertToGif`（= `encodeGif`）、
`ConvertOptions`（= `GifEncodeOptions`）、`DecodedAnimation`（=
`GifEncodeInput`），不多不少。main.ts／encode.worker.ts 的 convert
匯入**維持 `./convert.js` 不變**（薄層的存在理由即此；只有 composite
匯入 repoint），lib 端更名不外溢到工具碼。薄層以一條 smoke 測試護住
（re-export 身分斷言 `convertToGif === encodeGif`，或單幀→
`convertToGif`→gif-reader 讀回），破裂由 `npm test` 而非僅 typecheck
抓到。`gifenc.d.ts`（ambient）搬 `src/lib/`。

測試遷移（非機械性，明列裁決）：convert.test.ts（424 行）**全部**
describe 區塊（含 gifenc-PoC library-contract 區塊——它測的是 lib 層
契約）遷入 `src/lib/gif-encode.test.ts`；共享 helper
（makeSolidRgba／makeRgbaFrame／makeSolidFrame）抽 `src/lib/`
測試工具模組；`gif-reader.ts` 隨遷 `src/lib/`（與唯一測試消費者同目
錄，並升級角色——見 §4a）。tools/apng-to-gif/ 端不留 convert 測試
（薄 re-export 無獨立邏輯）。

沿用 sprint 02 已驗證編碼決策：全幀輸出＋GCE disposal=2 統一（防透明
洞 ghosting）；Path A 透明（threshold+matte → `quantize(maxColors-1)`
保留槽位 → 遮罩像素直寫保留 index）。

### 4. 解碼與編輯模型

#### 4a. loop（播放次數）抽取——round 1 修訂重點

gifuct 不給 loop（已驗）。解法：**`gif-reader.ts` 從 test-only 升級為
生產模組**（隨遷 `src/lib/`、更新檔頭定位）——它已正確解析 NETSCAPE
loopCount 且有完整語意文件。decode.ts 對同一份 bytes 跑
`parseGif`（gif-reader，metadata 層、無 LZW 成本）取 loopCount，與
gifuct 的幀解碼並用。備選（走訪 gifuct `parseGIF().frames` 的
application ext subBlocks `[0x01, lo, hi]`——單一 parser、免引入第二
個錯誤模型，SP-3 優先評估）由 SP-3 驗證後擇一。**健壯性契約**：
gif-reader 原為 test-scoped、遇未知位元組即 throw，而 loop 只是次要
metadata——loop 抽取一律防禦式呼叫，**失敗即安全降級 `loop = 1`**、
不得拖垮整個 decode（列為必測分支）。

語意映射（哨兵邊界，SP-3 以 roundtrip 鎖死）：
- NETSCAPE loopCount `0` → `loop = 0`（無限）
- NETSCAPE loopCount `n>0` → `loop = n + 1`（播 n+1 次）
- **無 NETSCAPE 擴充 → `loop = 1`**（播一次；誤映為 0 會把單次播放變
  無限循環）
- 對稱性：`numPlaysToRepeat(1) = -1`（省略擴充）→ 解回 `loop = 1` ✔

#### 4b. 資料形狀與純函式

```ts
// tools/gif-editor/decode.ts
interface DecodedGif {
  width: number
  height: number
  frames: RGBAFrame[]      // 已全幀合成（gifDisposalToComposite → composite）
  delaysMs: number[]       // 取 gifuct 值（瀏覽器語意，含 0cs→100ms 正規化；UI 揭露）
  loop: number             // numPlays 語意（§4a）
}

// tools/gif-editor/edit.ts — 全部純函式、不可變更新
interface EditState {
  keep: boolean[]
  delaysMs: number[]
  loop: number
}
createInitialEditState(decoded): EditState        // 投影 delaysMs/loop、keep 全 true
setFrameKept(state, i, kept): EditState
setFrameDelay(state, i, ms): EditState            // 正規化沿用 normalizeDelayMs（floor 20ms）
setAllDelays(state, ms): EditState
setLoop(state, n): EditState                      // n=0 無限；負值/NaN → 拒收（回原 state 或 throw，實作定一致契約）
applyEdits(decoded, state): GifEncodeInput
// 前置條件（入口斷言）：keep.length === delaysMs.length === decoded.frames.length
// 至少一個 keep=true（全刪 → throw；UI 負責預先擋）
// 過濾 keep 時 frames 與 delaysMs 同步過濾（非連續 keep 的對齊為必測邊界）
```

刪幀語意：frames 已全幀合成，刪任一幀不破壞後續畫面（disposal 依賴已
在解碼期解掉）——「解碼期全幀化」路線的核心紅利。

### 5. UI 與 a11y（round 1 修訂重點：時序與大量幀）

- 檔案選擇：拖放＋原生 file input（tab order 內，sr-only clip 模式同
  sprint 02）；`GIF87a`/`GIF89a` magic bytes 守門
- **預覽掛載時序（不變量）**：原始動畫預覽在**全解碼完成、frame 0
  poster 備妥之前一律不掛載**。與 sprint 02 不同，gifuct 無便宜單幀路
  徑，poster 與昂貴同步解碼綁定，故以「延後掛載」而非「提早產 poster」
  滿足「暫停控制與 poster 於媒體開始播放當下即可用」。
  `prefers-reduced-motion` 首次渲染即顯示 poster。暫停＝動圖 `<img>`
  替換為 poster canvas（GIF `<img>` 無原生暫停）
- **解碼階段播報**：`decompressFrames` 為單一同步呼叫、凍結期 aria-live
  無從更新——解碼前播報一次「解碼中…」（role=status；先寫入文字並讓
  出一輪事件迴圈（double rAF／setTimeout 0），**best-effort** 讓播報
  與繪製落地後才呼叫同步解碼——SR 實際朗讀時機非頁面可保證，實效以
  真人 gate 判準），完成後播報結果。**進度節流（≥10%／500ms）僅適用編碼
  （worker）階段**
- **幀清單（大量幀設計）**：`<section>` region landmark＋清單前
  skip-link（跳至轉換控制區）；**分頁呈現（每頁 50 幀＋頁導覽）**，
  避免數百列 × 2–3 控件塞爆 tab order 與 DOM；編輯狀態存於
  EditState（分頁只是投影，「全部套用」跨頁生效）。**換頁契約**：頁
  導覽置於清單前（不需穿越整頁即可達），換頁後焦點移至新頁清單起點、
  並以常駐 role=status 播報「第 X 頁，共 Y 頁，顯示幀 a–b」。頁大小
  與體感由 SP-8 原型驗證後可調
- 每幀一列：canvas 縮圖（downscale 最長邊 ~96px、**裝飾化
  `aria-hidden`**——幀身分不靠縮圖傳達）＋「保留」checkbox（accessible
  name「保留幀 N」）＋delay `<input type=number>`（name「幀 N 停留時間
  （毫秒）」、min 20、step 10）。刪除為**非破壞性切換**：列不移除、焦
  點不遷移，未保留狀態由 checkbox 狀態承載＋列視覺弱化，delay input
  保持可操作（值保留供還原）
- **編輯動作播報**：批次與狀態切換動作透過常駐 role=status 播報
  （「已將全部 N 幀停留時間設為 X ms」「幀 3 已標記刪除／已還原」「播
  放次數已設為∞」）；逐幀 delay 鍵入不逐鍵播報（原生 input 值本身可
  讀，避免噪音）
- 全域控制：「全部套用 delay」輸入＋按鈕；播放次數（∞ checkbox＋
  number）；轉換按鈕閘控（同 sprint 02）
- 記憶體警示閘：解碼前以 `parseGIF` metadata（幀數×LSD 尺寸）估算
  `W×H×4×N` 位圖總量，超閾值先警告（沿 sprint 02 模式）；UI 揭露文
  字含「來源極低延遲（含 0 秒）的幀會被正規化」與重量化說明
- 其餘沿 SPEC Conventions：進度 aria-live、結果區 focus 管理
  （tabindex=-1）、錯誤 role=alert、live region 常駐（is-empty
  class）、結果預覽同樣的暫停／poster 契約＋下載＋前後大小對比。
  **結果 poster 獨立**：自 applyEdits 後輸出的**首個保留幀**產生（原
  始／結果各自一顆 poster）——刪除首幀時不得沿用來源 poster，否則暫
  停／reduced-motion 顯示的靜態畫面根本不在輸出裡

### 6. Worker

編碼走 module worker，完整複用 sprint 02 模式：`new Worker(new
URL('./encode.worker.ts', import.meta.url), {type:'module'})`、
Transferable ArrayBuffer、`{type:'progress'|'done'|'error'}` 協定、同步
建構失敗回退主執行緒（同一函式）。worker 是 lib `encodeGif` 的薄委派。

## Recommended approach

檔案落點：

```
src/lib/composite.ts            ← 搬自 tools/apng-to-gif/（內容不變）
src/lib/composite.test.ts       ← 隨遷
src/lib/gif-encode.ts           ← 完整編碼管線（§3：encodeGif/GifEncodeInput/正規化/DEFAULT 常數/量化）
src/lib/gif-encode.test.ts      ← convert.test.ts 全部 describe（含 gifenc-PoC）遷入＋泛化更名
src/lib/test-helpers.ts         ← makeSolidRgba 等共享測試 helper（test-only，檔頭註記）
src/lib/gif-reader.ts           ← 隨遷；升級為生產模組（loop 抽取，§4a），檔頭定位更新
src/lib/gifenc.d.ts             ← 搬遷（ambient，全 program 生效）
tools/gif-editor/index.html     工具頁骨架（SPEC Conventions 全套）
tools/gif-editor/style.css      區域樣式
tools/gif-editor/gifuct-typecheck.ts  SP-6 型別探針：gifuct-js shipped 型別 strict 相容驗證（見 WORKS T1.1）
tools/gif-editor/decode.ts      gifuct 包裝＋gifDisposalToComposite＋loop 抽取 → DecodedGif（node 可測）
tools/gif-editor/netscape-loop.ts  SP-3 定案：走訪 gifuct application extension 抽取 NETSCAPE loop count（見 WORKS T2.2）
tools/gif-editor/edit.ts        純編輯操作（§4b）
tools/gif-editor/encode.worker.ts
tools/gif-editor/main.ts        UI 流程（§5）
tools/gif-editor/fixtures/      fixture 產生器（gifenc 基本＋手寫 LZW builder 邊角，SP-4）＋sample .gif
```

既有檔案修改（grep 親驗的完整消費者清單）：
- `tools/apng-to-gif/convert.ts` — 薄相容 re-export 層（§3）
- `tools/apng-to-gif/{main.ts, encode.worker.ts, decode.ts,
  decode.test.ts}` — **僅 composite** import 改指 `src/lib/`；main.ts
  ／encode.worker.ts 的 convert 匯入經薄層維持 `./convert.js` 不變
  （re-export 面見 §3）
- `tools/apng-to-gif/{composite,convert,composite.test,convert.test}.ts`
  — 搬遷／遷併（§3 測試遷移裁決）
- `src/tools.ts` — gif-editor 翻 `available`；`src/tools.test.ts` 連結
  數預期值**刻意**同步 +1
- `scripts/verify-dist.mjs` — 通用化且不建第二事實來源：(1) 骨架
  （`<main>`／meta description／lang）檢查改掃 `dist/tools/*/index.html`
  全部已建置頁（與 available 無關、免清單）；(2) 入口 anchor 檢查顯式
  斷言 apng-to-gif 與 gif-editor 兩個 `./tools/<slug>/` anchor 存在
  （註解明載與 `src/tools.ts` available 集合的同步責任），並交叉驗證
  dist/index.html 每個 tools anchor 的目標頁確實存在
- `package.json` — `gifuct-js@2.1.2` exact pin

**搬遷 milestone 的完成三閘：`npm test`（82+ 綠）＋
`npm run typecheck`＋`npm run build`**——vitest 不做型別檢查，殘留
import 路徑只有 typecheck/build 抓得到。搬遷（機械）與測試遷併（有裁
決）分列不同 task；「orchestrator 下沉＋apng-to-gif 改呼叫」獨立成一
個機械 commit 級步驟先行驗證（SP-5）。

## Open questions（spike 候選；SP-1〜SP-9 對齊 MAGI_PLAN_REVIEW）

- **SP-4（阻斷級，decode.ts 前置）手寫 GIF fixture builder**：gifenc
  產不出非零偏移／異質 disposal；手寫 builder 需自帶 LZW 編碼（node 無
  內建；可用「無壓縮 LZW」變體——定寬碼＋定期 clear code，工時可控但
  非零）。timebox PoC：產 2 幀、frame 1 非零 (left,top)、
  disposalType=3 的 GIF → gifuct 解回斷言 dims/disposalType/pixels。
  不成 → 改簽入外部工具產的 sample.gif（手驗真值、接受非確定性）。
- **SP-3 loop 抽取 PoC**：gifenc 產 loop 0/1/n → gif-reader 與
  「走訪 application ext subBlocks」兩法比對，鎖 §4a 哨兵映射，沉澱為
  常駐 roundtrip 測試。選型判準納入健壯性：追加一組非 gifenc 來源的真
  實 GIF（不同編碼器、含 comment/plain-text/私有 application ext），
  確認抽取層不對合法檔 throw 或能安全降級 loop=1；gifuct-subBlocks 法
  （單一 parser 錯誤模型）優先評估。
- **SP-2 三方交叉 roundtrip 錨定**：同一份 gifenc bytes 上 gif-reader
  （wire cs、raw loopCount、frameCount、GCE disposal）× gifuct（delay
  ms、disposalType、patch alpha）交叉斷言，破「兩庫對稱誤解」假綠；
  fixture delay 一律用 cs≥2 避開 `||10` 分支，另設一測釘住 0cs→100ms
  改寫行為本身（旁註：1cs 照原值 10ms、瀏覽器對極低延遲另有箝制——
  非 bug）。
- **SP-6 gifuct shipped 型別 strict 相容**：最小 import 檔過
  `npm run typecheck`；不足時驗 augmentation／wrapper fallback 可編譯。
- **SP-7 lib 邊界正向驗證**：最小 gif-editor encode 路徑（單幀→bytes）
  只准 import `src/lib/`，gif-reader 讀回斷言——證明 §3 邊界對兩工具
  都足夠。
- **SP-5 orchestrator 下沉零回歸**：見 Recommended approach 三閘；一
  併釘死相容層裁決（convert 匯入不 repoint）與 convert.ts 確切
  re-export 面（§3）。
- **SP-8 大量幀清單可用性原型**：~500 幀量測 tab 穿越、DOM 節點數、SR
  導覽體感，驗證每頁 50 的分頁設計、必要時調整；追加換頁驗證（焦點落
  在新頁起點、role=status 頁位播報、頁導覽不穿越整頁即可達）。
- **SP-9 decompressFrames 凍結時長量測**：代表性大 GIF 實測，確認
  §5 播報時序設計足夠、或需收緊記憶體閘閾值（可併 SP-2/SP-3 同場）。
- （已由 round 1 查證關閉，不再是未知：gifuct delay 單位／0cs 行為／
  無 GCE 表徵／patch alpha／disposalType 值域／自帶型別／gifenc
  writeFrame 恆 (0,0)——見「已查證事實」）

## Spec deltas

### root `SPEC.md`
- **Section: Components** — modify
  Why: gif-editor 從「規劃中」變可用；新增共用模組層；apng-to-gif 條目的 composite 位置陳述隨搬遷變舊，需一併回收。
  New content: (1) GIF 編輯工具條目改為「gifuct-js 解碼＋gif-reader 抽 loop → 共用 composite 全幀化 → 純函式編輯 → 共用 gif-encode 重編碼（module worker）；位於 `tools/gif-editor/`」；(2) 新增「共用純邏輯模組 `src/lib/`（composite、gif-encode 編碼管線、gif-reader）」條目；(3) 既有 apng-to-gif 條目改述為「apng-js 解碼 → 共用 `src/lib/` 合成／編碼管線（module Web Worker）」，不再稱 composite 位於 `tools/apng-to-gif/`。
- **Section: Conventions** — modify
  Why: 確立跨工具共用純邏輯落位慣例；本 sprint 首度出現「可編輯大量項目清單」互動面，其 a11y 決策屬不變量級。
  New content: (1)「工具可含多模組切分」條目補「跨工具共用的純邏輯模組置於 `src/lib/`，同樣須 node 可測（不 import DOM runtime）」；(2) 互動工具 a11y 不變量補「可編輯項目清單：批次／狀態切換操作須經常駐 live region 播報；項目刪除採非破壞性切換（焦點不遷移）；裝飾性縮圖 aria-hidden、項目身分承載於控件 accessible name；大量項目須有 skip 機制與分頁（或等效導覽策略），換頁／視圖切換須管理焦點並播報」。
- **Section: Status** — modify
  Why: 狀態推進。
  New content: gif-editor 上線；規劃中剩影片格式轉換。

### root `CLAUDE.md`
(none)

### magi/`PRD.md`
(none)

### magi/`TECHSTACK.md`
- **Section: Framework / runtime** — modify
  Why: 新增 runtime 依賴使「皆 MIT、零 transitive 依賴」全稱句不再成立，必須改寫（非附加）以免落地後自相矛盾；ambient d.ts 位置搬遷。
  New content: runtime dependencies 條目改為分項敘述——apng-js／gifenc（exact pin、MIT、零 transitive 依賴）；`gifuct-js@2.1.2`（exact pin、MIT、一顆 transitive dep `js-binary-schema-parser@^2.0.3`（lockfile 鎖定解析版；MIT、零下游））；gifenc ambient 宣告位置更新為 `src/lib/gifenc.d.ts`。

## Verification

- 三閘全綠：`npm test`＋`npm run typecheck`＋`npm run build`（搬遷
  milestone 即要求，非僅最終）
- **decode**：
  - `gifDisposalToComposite` table 單元測試（0/1/2/3/undefined/保留值
    /首幀 3 降級）——不依賴 fixture
  - fixture（gifenc 基本組＋SP-4 手寫組：非零偏移、disposal 2/3、透
    明、無 NETSCAPE、loop 0/n）→ 斷言全幀 RGBA 像素、delaysMs、loop
  - 非 GIF magic bytes 拒收；損壞檔錯誤路徑
- **loop 抽取**：loop 0（∞）／缺擴充（→1）／n（→n+1）三分支＋
  **抽取失敗→安全降級 loop=1**＋decode→encode roundtrip 對稱性
  （SP-3 沉澱）
- **edit 純函式**：keep 切換／還原、**非連續 keep（[true,false,true]）
  的 frames×delaysMs 對齊**、單幀邊界、delay floor 20ms、
  setAllDelays、setLoop 邊界（0/1/n）與無效輸入契約、
  createInitialEditState 投影、全刪 throw、等長前置斷言、不可變性
- **encode byte 讀回**（gif-reader）：幀數＝保留數、每幀 GCE delay／
  disposal=2／transparent flag、NETSCAPE 對映（∞→0、1→省略、
  n→n−1）、trailer
- **roundtrip 三方交叉**（SP-2）：gif-reader byte 錨點×gifuct 解碼×
  寫入值，同一份 bytes 三方斷言；transparentIndex→alpha0 由 gifenc
  full-frame 透明幀覆蓋
- **端到端（node）**：decode fixture → 刪一幀＋改 delay＋改 loop →
  encode → gif-reader 斷言輸出與編輯意圖一致
- **搬遷回歸**：apng-to-gif 既有測試遷併後全數綠（總數不減）；
  convert.ts 薄相容層 smoke（§3）；tools.test.ts 連結數刻意更新後綠
- `npm run verify:dist` 綠（通用化後：dist/tools/* 全頁骨架＋兩工具入
  口 anchor＋anchor 目標存在性交叉）
- 真人 checklist（最終 task，使用者 gate）——除 sprint 02 既有項外，
  針對本工具新增四個具體 gate：**數百幀清單的鍵盤導覽（分頁＋
  skip-link 實走）**、**「全部套用」的 SR 播報**、**解碼凍結期前後的
  播報體感**、**「n+1 次播放」語意的瀏覽器實際播放次數**；另含暫停／
  poster／reduced-motion、worker 實走、入口連結
