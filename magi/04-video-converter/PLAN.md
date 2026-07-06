# 影片格式轉換工具（video-converter）

> Sprint: magi/04-video-converter/  •  Type: feat / major  •  Drafted: 2026-07-04
> Revision: **r2.1**（2026-07-04）— round 2 nits 折入：URL 構法改頁面相對上溯
> （BASE_URL 字面 `"./"` 實證不可用）、ETA 改進度率式、映射表補 preview-failure
> ／blind-transcode／loading-core 第三分支、rotation 常設測試、SP-1/SP-6 驗收收緊
> r2 — round 1 審查修訂：3 Critical＋16 Important 全折入，
> 少數項擇要折入（hevc 預覽降級、gate/OOM、完成競態、beforeunload、deltas 補遺）
> 來源：BACKLOG「影片格式轉換功能（如 MKV → MP4）」promote

## Context

PRD 三大工具目標的最後一項。使用者要在瀏覽器端把 MKV/MOV/AVI/WebM 等容器
轉成 MP4，免安裝軟體、免上傳第三方服務。與前兩工具不同：影片轉檔無純 JS
方案可用，必須引入 ffmpeg.wasm（重量級 wasm 依賴、GPL 授權、載入策略與
記憶體上限都是新問題）；且任務時長從「秒級」變成「分鐘至數十分鐘級」、
媒體呈現從 `<img>` 變成 `<video>`——兩處結構性差異都有對應契約（見 §UI）。

**規劃前已與使用者定案四項**（2026-07-04）：
1. artifact = PLAN.md（探索期，spike 項多）
2. MVP 範圍 = remux 優先＋轉碼後備，輸出一律 MP4
3. core 資產 = self-host（同源載入，不依賴 CDN）
4. 執行緒 = 單執行緒 core（core-mt + coi-serviceworker 留 backlog）

## 已查證事實（2026-07-04；r1 條目經 round 1 雙鏡頭逐源覆核零錯誤，r2 增補 10–14）

npm metadata（`npm view`；size 為 SI 十進位，64.7 MB＝61.7 MiB）：

| 套件 | 版本 | License | unpacked |
|------|------|---------|----------|
| `@ffmpeg/ffmpeg` | 0.12.15 | MIT | 72 KB（dep：`@ffmpeg/types@^0.12.4`，types-only transitive） |
| `@ffmpeg/util` | 0.12.2 | MIT | 20 KB（零依賴） |
| `@ffmpeg/core` | 0.12.10 | **GPL-2.0-or-later** | 64.7 MB（esm＋umd 各一份；esm＝ffmpeg-core.js 112 KB＋ffmpeg-core.wasm 32.2 MB） |
| `@ffmpeg/core-mt` | 0.12.10 | GPL-2.0-or-later | 65.7 MB（需 SAB，本 sprint 不採） |

`@ffmpeg/ffmpeg` dist/esm 逐檔讀源結論：

1. **`FFmpeg` 類自帶內部 module Web Worker**（classes.js `load()`：
   `new Worker(new URL("./worker.js", import.meta.url), { type: "module" })`，
   可用 `classWorkerURL` 覆寫）。CPU 密集運算天然離主執行緒——本工具
   **不需要自寫 encode.worker.ts**（SPEC Conventions 將補「worker 可由
   vendored 依賴提供」澄清句，見 Spec deltas）。
2. **core 載入走 ESM 動態 import**：worker.js 先試 `importScripts(coreURL)`
   （module worker 內必 throw）→ catch 後
   `await import(/* @vite-ignore */ coreURL)` 取 default export
   `createFFmpegCore` → **必須 vendor `@ffmpeg/core/dist/esm/` 版**。
3. **不傳 coreURL 會靜默 fallback 到 unpkg CDN**（const.js：
   `CORE_URL = https://unpkg.com/@ffmpeg/core@0.12.9/dist/umd/ffmpeg-core.js`）
   → 必須顯式傳 coreURL 與 wasmURL。注意：該 CDN URL 字串無條件存在於
   const.js 且無法 tree-shake——**「dist 內 grep 無 unpkg」不可作為防迴歸
   斷言**（必假陽性），自足性守衛改在呼叫端（見 §Vite）。
4. wasmURL 未給時由 `coreURL.replace(/.js$/, ".wasm")` 推導；blob URL 無法
   推導 → 一律兩者顯式傳。
5. API 面（classes.js / worker.js 證實）：`exec(args, timeout?)`（自動前置
   `-nostdin -y`；回傳 ret，0=成功）；**`ffprobe(args)` worker 協定原生支援**
   （輸出用 `-o 檔案` 再 readFile 取回；core 0.12.10 是否編入 ffprobe 待
   SP-2 實測）；`writeFile`（buffer Transferable 轉移——呼叫端留用須先
   `.slice()`）；`readFile`（回程 Transferable 零複製）；
   `mount(FFFSType.WORKERFS, { files: [File] }, mountPoint)` / `unmount`
   （免整檔複製進 MEMFS）；`on('log')`／`on('progress')`
   （`{progress∈[0,1], time µs}`，防禦性 clamp）；`terminate()`（殺 worker、
   `loaded=false`，須重 `load()`）。
6. **exec/ffprobe 在 ffmpeg worker 內是同步呼叫**：一實例一次一工作；
   AbortSignal 只 reject Promise 不停 wasm——真取消 = `terminate()`＋重建。
7. `@ffmpeg/util`：`fetchFile`、`toBlobURL(url, mime, progress?, cb?)`、
   `downloadWithProgress`（依 Content-Length 報進度）。
8. GitHub Pages 無 COOP/COEP → SAB 不可用；單執行緒 core 不受影響。
9. **GPL**：`@ffmpeg/core` 為 GPL-2.0-or-later（含 x264 等 GPL 元件）；
   self-host 部署 = 我們散布 GPL 二進位 → 授權聲明落地為 Status 翻
   「上線」的前置（見 Spec deltas 與 Open questions）。
10. **`downloadWithProgress` 的真實失敗樣態**（util index.js L106-107、L126；
    round 1 雙鏡頭源證＋coordinator 親讀）：`total=-1`（無 Content-Length）
    是**安全路徑**（走不定型進度）；致命的是「Content-Length 存在但為壓縮
    長度 ≠ 解壓後 received」→ throw `ERROR_INCOMPLETED_DOWNLOAD`，catch 內
    `resp.arrayBuffer()` 因 body 已被 reader 耗盡而二次失敗——**不可自救、
    core 載入直接失敗**。GH Pages/Fastly 對 .js 慣常 gzip，esm loader 比
    wasm 更易命中。
11. **worker.js 非自足檔**：靜態 `import "./const.js"`、`"./errors.js"`
    （worker.js L4-5）——`classWorkerURL` 備援若啟用，vendor 需三檔
    co-located（見 §Vite）。
12. **node exports 條件指向 empty.mjs，其 `FFmpeg` 建構子直接 throw**
    （"ffmpeg.wasm does not support nodejs"）——node 下連 `new FFmpeg()`
    都不可，不只 `load()`；typecheck 走 `types` 條件不受影響（自帶型別，
    毋需 @types/*）。
13. **wrapper 0.12.15 內建預設 core 為 0.12.9（官方出貨測試搭配）**；
    本 sprint pin core 0.12.10 為非預設組合，同 0.12.x 線預期相容，
    SP-1/SP-2 首次真載時確認配對（尤其 ffprobe）。
14. **ESM 動態 import 的相對 specifier 以 worker chunk 自身 URL 為解析
    基準；Vite `public/` 資產不受 `base:'./'` 改寫**——coreURL 裸相對路徑
    直傳**不可行**（round 1 論證、coordinator 認可），必須絕對 URL 或
    blob URL。另（round 2 以 Vite 8.1.3 隔離 build 實證）：`base:'./'` 下
    `import.meta.env.BASE_URL` 編譯為**字面 `"./"`、不編頁面深度**——
    不可用它構 URL（兩層深工具頁會 404，且 dev 過、build 過、僅
    preview/production 才炸）；正解為頁面相對上溯（見 §Vite）。

專案內既有掛鉤（已確認）：
- `src/tools.ts` 已有 `video-converter` planned 條目（slug 沿用）；
  `src/tools.test.ts` 連結數 tripwire `toBe(2)` 屆時翻 3。
- `scripts/verify-dist.mjs` `ENTRY_ANCHOR_SLUGS` 需加 `'video-converter'`。
- vite.config available↔entry guard：翻 available 前 index.html 必須已存在
  （時序三閘見 Verification）。

## Goals & Non-Goals

### Goals
- `tools/video-converter/` 工具頁：選檔（拖放＋file input）→ 探測 →
  轉換 → `<video controls>` 預覽＋下載（`原檔名.mp4`）。
- 輸入：MKV/MOV/AVI/WebM 等常見容器（副檔名＋MIME 寬鬆接受）。輸出一律
  MP4。**格式覆蓋以 core build 實際編入者為準（SP-2 盤點），未支援者
  優雅報錯**——不宣稱「全格式」。
- **探測與降級鏈（統一語意，r2 修正 r1 自相矛盾）**：
  ffprobe 探測成功 → 決策矩陣；**探測失敗（含 core 未編入 ffprobe）→
  告知「無法預判格式，將完整轉碼（較慢）」→ blind 全轉碼**；
  `-c copy` 執行失敗（ret≠0）→ fallback 全轉碼；
  全轉碼亦失敗（ret≠0，含非媒體/損壞檔）→ 錯誤態（role=alert）。
- 核心載入進度（32 MB wasm 首載，含 bytes 心跳）、轉檔進度（cadence＋
  ETA 契約，見 §UI）、可取消（三態語意，見 §ffmpeg-client）。
- 記憶體 gate：warn-continue 模式（門檻 SP-3 定值）。
- a11y：SPEC「互動工具不變量」全套＋本工具追加契約（§UI 狀態機）。
- `src/tools.ts` 翻 `available`；verify-dist 擴充斷言（§Vite）。

### Non-Goals
- core-mt／coi-serviceworker 加速（留 backlog）。
- 批次多檔、剪輯／裁切、畫質參數面板（轉碼用固定預設，SP-5 後定值）。
- 輸出格式選擇（僅 MP4）。
- 字幕軌轉換（**定案**：`-sn` 丟棄＋ready 播報告知，見決策矩陣）。
- 多視訊/音訊軌保留（各型別僅取第一軌＋告知，見決策矩陣）。

## Design options considered

**引擎**（已定案，列供審計）：
- (a) ✅ ffmpeg.wasm 單執行緒 self-host——零 hack、覆蓋 core build 編入
  之格式；代價：32 MB 首載、轉碼慢（remux 不受影響）。
- (b) core-mt＋coi-serviceworker——快 2–4×，但需 service worker 補 header
  ＋首次 reload；留 backlog。
- (c) WebCodecs＋手寫 demux/mux——最輕量，但 MKV demux 需自寫 EBML 解析、
  覆蓋窄、工程量大；不採。
- (d) CDN 載入 core——與純自足原則衝突；使用者已否決。

**remux／轉碼判定**：
- (a) ✅ ffprobe 前置探測 → 決策矩陣（可事前告知策略與 caveat）＋
  (b) copy 失敗仍 fallback 全轉碼（雙保險）＋ (c) 探測失敗降級 blind
  全轉碼（r2 補：ffprobe 缺席時的 Plan B，SP-2 驗證替代偵測可行性）。

**core 資產供應**（self-host 前提下）：
- (a) 32 MB wasm 提交進 git——repo 永久膨脹。
- (b) ✅ `@ffmpeg/core` npm 依賴（exact pin）＋建置期自 node_modules 複製
  到 `public/vendor/ffmpeg/`（`.gitignore` 排除）——lockfile 鎖版、repo 輕、
  與 pin 同步由複製腳本斷言（§Vite）。

**大檔輸入路徑**：
- (a) `writeFile` 整檔複製進 MEMFS（fallback）。
- (b) ✅ WORKERFS `mount` 掛 File（SP-3 驗證，失敗退 (a)）。

## Recommended approach

### 模組切分（`tools/video-converter/`）
| 檔案 | 職責 | node 可測 |
|------|------|-----------|
| `index.html` / `style.css` | 骨架（`_probe` 範本慣例）＋區域樣式 | — |
| `probe.ts` | ffprobe JSON → `StreamInfo`（純解析＋防禦；**以 SP-2 簽入之真實樣本為測試基準**） | ✅ |
| `convert-plan.ts` | 決策矩陣純函式：`StreamInfo` → `ConversionPlan`（args builder＋notices） | ✅ |
| `limits.ts` | 記憶體 gate、進度 clamp/cadence/ETA 純函式、輸出檔名推導 | ✅ |
| `ffmpeg-client.ts` | `FFmpeg` 生命週期包裝（見下）；**`new FFmpeg()` 與 `load()` 皆須延後到瀏覽器執行期**（node stub 建構子即 throw，已查證 12） | import ✅／執行 ✗ |
| `main.ts` | UI 狀態機與 a11y 契約 | — |

### 型別契約（r2 補強）
```ts
interface StreamInfo {
  video: Array<{ index: number; codecName: string; profile?: string;
    pixFmt?: string; bitsPerRawSample?: number; width?: number;
    height?: number; rotation?: number /* side_data display matrix */ }>
  audio: Array<{ index: number; codecName: string }>
  subtitleCount: number
  durationSec?: number   // 供 ETA 與進度推算
  formatName?: string
}
interface ConversionPlan {
  mode: 'remux' | 'transcode-video' | 'transcode-audio' | 'full-transcode'
       | 'audio-only' | 'blind-transcode'
  args: string[]                 // 完整 ffmpeg 參數（測試以陣列鎖定）
  notices: NoticeKey[]           // 條件式告知：字幕丟棄/hevc 相容/多軌取一/…
}
```

### 決策矩陣（r2 定稿版；SP-2 盤點與 SP-6 可播性實測後微調數值）
- **video copy 白名單**（超出白名單一律轉碼——防「copy 成功但瀏覽器播
  不出」的靜默破檔，ret==0 安全網抓不到此類失敗）：
  - `h264` 且 `pix_fmt==yuv420p`（8-bit 4:2:0）且 profile ∈
    {Constrained Baseline, Baseline, Main, High} → copy。
  - `hevc` 且 `pix_fmt==yuv420p`（Main, 8-bit）→ copy＋`-tag:v hvc1`＋
    notice「部分瀏覽器無法播放 HEVC」（done 態預覽失敗子態接手，見 §UI）。
  - 其餘（10-bit／4:2:2／4:4:4／High 10／Main10／vp8/vp9/av1/mpeg4／
    欄位缺失或未知）→ `libx264` 轉碼＋`-pix_fmt yuv420p`。
- **audio**：`aac`/`mp3` → copy；其餘（opus/vorbis/ac3/eac3/flac/pcm_*…）
  → `aac` 轉碼。
- **串流映射**：`-map 0:v:0? -map 0:a:0?`（各型別取第一軌；輸入含多軌時
  notice「僅保留第一視訊/音訊軌」）。分支：無音軌純影片 → 照常；
  無影軌純音訊 → 產出 audio-only MP4＋notice；影音皆無 → 錯誤態。
- **字幕**：`-sn` 丟棄＋notice「字幕軌將被丟棄」（定案）。
- **rotation side_data**：copy 保留、轉碼 autorotate 燒入——兩路徑一致性
  SP-2 驗證，防「轉出躺平影片」。
- 一律 `-movflags +faststart`（moov 前置；MEMFS 內二次寫檔的瞬時記憶體
  峰值 SP-3 量測並計入 gate）。

### ffmpeg-client 生命週期契約（r2 補強）
- 顯式傳**絕對** coreURL＋wasmURL（已查證 14；構法見 §Vite）。
- 單實例、一次一工作（`isProcessingFile` 併發防護沿用 gif-editor）。
- **job 間清理**：readFile 取回輸出後 `deleteFile` 輸出檔；`unmount`＋
  清除輸入掛載點——防連續轉檔累積吃滿 wasm heap。
- **取消三態語意**：loading-core 期＝中止載入（terminate＋丟棄 load
  Promise）；probing／converting 期＝`terminate()`＋重建實例。取消後
  保留已下載的 core bytes／blob URL 快取，避免 cancel→retry 重付 32 MB
  下載＋重編譯（重載成本 SP-7 量測後定快取策略）。
- 轉碼執行期 runtime 失敗（含 wasm OOM abort）一律收斂至錯誤態
  （role=alert）。

### UI 狀態機（r2 補強：狀態→播報映射為契約）
idle → gate（warn-continue：「仍要繼續」鈕＋focus 移轉＋role=status，
沿用前工具模式）→ loading-core（首次）→ probing → ready → converting →
done／error／cancelled。

**狀態 → 常駐 live region 播報映射表（契約）**：

| 狀態 | 播報 |
|------|------|
| loading-core | 有可信 total → 百分比；有 byte 事件但 total 不可信 → **bytes 心跳**「核心元件下載中，已下載 X MB」（每 ~2s 或每 4MB 擇低頻）；**無 byte 事件（URL 方案 (a) 直傳）→ 時間驅動心跳**「核心元件下載中（首次載入約 32 MB，請稍候）」——SP-1 擇定方案時定稿本列文案 |
| probing | 「分析檔案中…」單則 |
| ready | 策略告知（「可直接快速 remux」／「需轉碼，預估較慢」／**blind-transcode 變體**「無法預判格式，將完整轉碼（較慢）」）＋**全部條件式 notices（字幕丟棄／hevc 相容性／多軌取一）一併播報**——不得只做視覺文字 |
| converting | 「已完成 N%，預估剩餘約 M 分」——**cadence 每 5–10% 或每 15–30s 擇低頻**（SP-5 定值；不得沿用前工具 500ms 節流）；progress clamp [0,1]；停滯 >60s 補「仍在處理中」心跳 |
| done | 「轉換完成」→ focus 移至**結果容器**（tabindex=-1，非 video 本身）；播報與 focus 順序須處理競態（承接 BACKLOG sprint 02 條目） |
| preview-failure（done 子態） | video `onerror` 觸發：於「轉換完成」**之後**播、同節點覆寫——「此格式無法在本瀏覽器預覽，檔案仍可下載」 |
| error | role=alert（**core 下載失敗（含 gzip Content-Length 硬失敗）**／探測／copy／轉碼／OOM 全收斂於此） |
| cancelled | 「已取消」＋focus 回「開始轉換」鈕 |

- ETA 公式（**進度率式**——probe 與 blind-transcode 兩路徑統一，不依賴
  durationSec）：`elapsed×(1−progress)/progress`；progress 無效、為 0 或
  停滯 → 無 ETA、退心跳（沿用 >60s 條款）；limits.ts 純函式＋測試（含
  progress=0 無 ETA 分支與 clamp 邊界）。
- **取消鈕**：位於進度 region 內（region 導覽可直達——承接 BACKLOG
  sprint 03 暫停鈕教訓，不靜默複製）；轉碼啟動時 focus 移至取消鈕。
- **結果 `<video>`**：`controls preload="metadata"`、不 autoplay（因此
  autoplay／2.2.2／reduced-motion 面滿足、不設暫停鈕與 poster——但
  **等效文字面仍須明作**）：`aria-label="轉換後影片預覽：<輸出檔名>"`
  （**audio-only 分支改音訊語意**「轉換後音訊預覽：<輸出檔名>」）。
  `onerror` → **預覽失敗子態**（播報見映射表）：隱藏 video、保留下載
  （hevc copy 於 Chrome/Firefox 必命中）。
- 下載連結：href/download **原子設定後才 unhide**；文字「下載 <輸出檔名>」。
- beforeunload（loading-core/converting 期攔關頁）→ Open questions。

### Vite／建置整合（SP-1 阻斷級；r2 依審查改寫）
- `optimizeDeps.exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']`（dev 預打包
  破壞內部 worker `import.meta.url`——SP-1 實證）。
- **coreURL/wasmURL 一律絕對 URL**，唯二候選（裸相對路徑已證不可行，
  除名不實測）：
  - (a) `new URL('../../vendor/ffmpeg/ffmpeg-core.js', location.href).href`
    直傳（**頁面相對上溯兩層**——工具頁固定 `tools/<slug>/` 深度為 SPEC
    慣例，程式碼須註記此深度依賴；不可用 `import.meta.env.BASE_URL` 構，
    已查證 14）——下載交給 worker 內 import／Emscripten，無 byte 事件
    （loading-core 走時間驅動心跳）。
  - (b) `toBlobURL(…, progress)`——可觀測下載進度，但有已查證 10 的
    「Content-Length≠received 硬失敗」風險；SP-1 於**部署後**實測 GH Pages
    對 .js/.wasm 的 Content-Encoding/Length，命中則退 (a) 或自寫容錯
    downloader。
- **classWorkerURL 備援**：僅當 SP-1 主路徑（Rollup 對依賴內
  `new Worker(new URL(...))` 的 chunk emit）失敗才啟用；啟用時 vendor
  **一併複製 `@ffmpeg/ffmpeg/dist/esm/{worker.js, const.js, errors.js}`
  三檔 co-located**（worker.js 非自足，已查證 11）；且 verify-dist 一併
  斷言該三檔存在於 `dist/vendor/ffmpeg/`（驗證責任隨備援決策成立即生效）。
- `scripts/vendor-ffmpeg.mjs`：複製 `@ffmpeg/core/dist/esm/
  {ffmpeg-core.js, ffmpeg-core.wasm}` → `public/vendor/ffmpeg/`；
  **複製前斷言 `node_modules/@ffmpeg/core/package.json` version ===
  '0.12.10'（pin 同步守衛），不符即 fail**。
- npm hooks：**`predev`＋`prebuild`（`pretest` 不掛**——node 測試消費
  node_modules 非 public/vendor，掛了徒增 32 MB I/O）。
  `.gitignore` 加 `public/vendor/`。
- `verify-dist.mjs`：斷言 `dist/vendor/ffmpeg/ffmpeg-core.js` **存在**＋
  `ffmpeg-core.wasm` 存在且 >20 MB＋`ENTRY_ANCHOR_SLUGS` 加
  `'video-converter'`。
- **自足性守衛（呼叫端）**：單元測試斷言 ffmpeg-client 對 `load()` 的
  參數同時含非空 coreURL 與 wasmURL（防漏傳→靜默 CDN fallback）；
  dist-grep unpkg 不可行（已查證 3），不採。
- **CI**：不需改 deploy.yml——鏈條自洽：`npm ci` 裝 core →
  `npm run build` 觸發 `prebuild` 複製 → `verify:dist` 斷言 dist/vendor。
  顯性成本註記：npm ci 於 cache-miss 時多拉 ~64 MB；SP-4 整合測試若入
  預設套件會落在 CI 的 test step（build 前）——傾向獨立慢測 project。
- 依賴 exact pin：`@ffmpeg/[email protected]`、`@ffmpeg/[email protected]`、
  `@ffmpeg/[email protected]`（dependencies；transitive
  `@ffmpeg/types@^0.12.4` types-only，lockfile 鎖定，比照 gifuct-js 慣例）。

### 測試策略（r2 依審查補強）
- **時序 gate（防假綠）**：SP-2 先以真實環境擷取多組 ffprobe JSON
  （H.264+AAC MKV／VP9+Opus WebM／HEVC／無音軌／多軌／損壞檔）簽入
  byte-stable fixtures，**之後**才寫 probe.ts 與矩陣測試；至少一組
  「非本專案產生」的真實檔交叉。
- 純函式 node 測：probe 解析（含畸形輸入）、決策矩陣全分支（白名單邊界
  ／多軌／無音軌／純音訊／notices）、args builder（陣列鎖定，**含
  rotation 案：copy 路徑保留 side_data／transcode 路徑 autorotate**——
  rotation 屬 ret==0 靜默破檔類，須常設回歸而非僅一次性 spike）、gate、
  進度 clamp/cadence/ETA（含 progress=0 無 ETA 分支）、檔名推導。
- SP-4（重界定）：core ESM node 直跑——**墊片清單（`self`/`btoa`/
  `locateFile`/`ENVIRONMENT` 旗標）逐項驗證**＋「載入＋轉 <1s testsrc」
  最小 PoC 耗時量測 → 定 vitest `testTimeout` 與整合測試是否移出預設
  `npm test`（獨立 project/tag、CI 選擇性）。成則 node 真轉檔整合測試＋
  fixture 自舉（自舉可產格式受 SP-2 encoder 盤點約束）；敗則記已知限制，
  真轉檔僅人工 E2E。
- 人工 E2E checklist（使用者 gate）**附樣本產生 recipe**（見 Verification）。

## SP spikes（r2 依審查擴充/重界定）

- **SP-1（阻斷級）**：Vite×ffmpeg.wasm——**三段驗收**：
  (1) dev：`ffmpeg.load()` 成功＋跑一次 `-f lavfi -i testsrc` 極小轉檔
  （**dev 綠燈對 URL 構法無背書力**——dev 與 build 的 BASE_URL 語意不同）；
  (2) `vite build`：確認內部 worker chunk 被 emit，**且其動態 import／
  `import.meta.url` 接線可用（存在≠可用）**；
  (3) **`vite preview` 靜態服 dist：明訂從 `tools/video-converter/` 子頁
  載入**（root 頁煙測會假綠遮蔽深度問題），真載＋真轉，**斷言 core/wasm
  network 請求 200** 且 `createFFmpegCore` 取得。
  另定案：URL 兩案（頁面相對上溯絕對 URL vs toBlobURL）擇一並**同時定稿
  loading-core 播報文案**；下載完整性（Content-Length≠received）於部署後
  補實測；hook 子集確認；**wrapper 0.12.15×core 0.12.10 配對確認**
  （官方預設搭 0.12.9）。
- **SP-2**：core 0.12.10 能力盤點——`-decoders`/`-encoders`/`-muxers`
  枚舉（libx264、aac、libvpx、dav1d…），結果回饋決策矩陣定稿與「覆蓋」
  文案；ffprobe 可用性＋`-of json -o` 實測＋**真實 ffprobe JSON fixture
  擷取簽入**；**ffprobe 缺席時的降級 PoC**（`ffmpeg -i` stderr 解析 vs
  blind-transcode 體感）；rotation copy/transcode 一致性；`-c copy` 失敗
  樣態（ret／log 特徵）。盤點清單另可支撐 convert-plan 事前
  unsupported-codec 提示（實作選配，否則維持反應式收斂）。
- **SP-3**：WORKERFS mount File 可行性；記憶體上限量測（漸增至失敗點）
  ＋**faststart 二次寫檔瞬時峰值**→ gate 門檻定值與警語文案。
- **SP-4**：core ESM node 直跑（重界定，見測試策略）。
- **SP-5**：單執行緒轉碼效能基準（1080p/30s 全轉碼）→ **播報 cadence
  定值＋ETA 公式**（明確產出，非僅文案）＋預期管理文案＋exec timeout
  上限決策。
- **SP-6（新增）**：copy 可播性樣本實測——產製 10-bit H.264／High 4:4:4／
  HEVC Main10 樣本 copy→MP4，於真實 Chrome/Firefox/Safari `<video>`
  實播 → 白名單邊界定稿＋評估是否需 H.264/HEVC **level 上限** gate
  （實測有 level-exceeded 破檔才補）。
- **SP-7（新增）**：terminate→re-load 重載成本——第二次 load 時間
  （直傳 URL vs blob 兩案；HTTP cache／wasm code cache 命中情形）→
  cancel→retry 體感與 core bytes 快取策略。

## Open questions

- **GPL 聲明落點**：README License 段（本就是 backlog 佔位項）之聲明文字
  ＋是否加工具頁 footer 註記——需使用者決策；**Status 翻「上線」以此
  落地為前置**（已綁入 Spec deltas）。
- 轉碼預設參數（crf／preset／是否限制解析度）——SP-5 數據後定。
- **beforeunload**：loading-core／converting 期是否攔截關頁（分鐘級任務
  的正當保護 vs 干擾）；背景分頁期間 polite 播報遭 SR 略過屬已知限制、
  不特別處理。

## Spec deltas

### root `SPEC.md`
- **Section: Components** — modify
  Why: 影片格式轉換由「規劃中」轉為實作描述。
  New content: 「影片格式轉換工具 — ffmpeg.wasm（單執行緒 core，self-host vendor）ffprobe 探測 → 白名單 remux 優先／轉碼後備／blind-transcode 降級 → MP4；位於 `tools/video-converter/`」。
- **Section: Conventions** — add（vendor 慣例）
  Why: 首次引入「大型第三方 wasm 資產」供應慣例。
  New content: 「大型第三方 runtime 資產以 npm exact pin 為源，建置期（predev/prebuild hook）自 node_modules 複製至 `public/vendor/<name>/`（不進 git），複製腳本斷言版本與 pin 同步、verify-dist 斷言產物存在；載入一律顯式同源**絕對** URL，禁止依賴套件內建 CDN fallback」。
- **Section: Conventions** — modify（worker 慣例澄清）
  Why: 本工具的 module worker 由依賴內建提供而非自寫，既有慣例措辭需涵蓋。
  New content: 於「工具頁 CPU 密集…採 module Web Worker」句補「（worker 可由 vendored 依賴內建提供，不限自寫 `*.worker.ts`）」。
- **Section: Status** — modify
  Why: 三工具全數上線。
  New content: 「apng-to-gif、gif-editor、video-converter 皆已可用；PRD 三大工具目標完成」——**以 GPL 授權聲明落地（README License 段）為前置**。

### root `CLAUDE.md`
(none)（What this is 一句已含「影片格式轉換」）

### magi/`PRD.md`
(none)

### magi/`TECHSTACK.md`
- **Section: Framework / runtime** — modify
  Why: 新增 runtime 依賴與 vendor 機制。
  New content: runtime dependencies 增列 `@ffmpeg/[email protected]`／`@ffmpeg/[email protected]`（MIT）＋`@ffmpeg/[email protected]`（**GPL-2.0-or-later**，僅建置期複製至 `public/vendor/ffmpeg/`、不進 bundle）；transitive `@ffmpeg/types@^0.12.4`（types-only，lockfile 鎖定，比照 gifuct-js 註記）；內部 module worker 由 `@ffmpeg/ffmpeg` 自帶。
- **Section: Deployment** — modify
  Why: 建置管線多一個 prebuild 步驟，敘述須完整。
  New content: 補「build 前由 npm `prebuild` hook 執行 `scripts/vendor-ffmpeg.mjs`，自 node_modules 複製 `@ffmpeg/core` esm 資產至 `public/vendor/ffmpeg/`（dev 由 `predev` 同理）；npm ci 因 core 進 dependencies 於 cache-miss 多拉 ~64 MB」。
- **Section: Constraints** — modify
  Why: SAB 條目已定案。
  New content: 改為「已定案採單執行緒 core（無 SAB 需求）；core-mt＋coi-serviceworker 升級留 backlog，動工前仍需 spike」。

### 其他 root 文件（非 deltas 契約面，commit 時走 root-sync）
- `README.md` License 段：GPL 二進位散布聲明落地（文字待使用者決策；
  Status 翻「上線」前置）。

## Verification

- `npm test` 全綠（新增純函式測試；SP-4 成立則含 node 整合測試——若耗時
  超標則獨立慢測 project、不入預設套件）。
- **時序三閘（同一 commit 內完成，防 sprint 03 的 guard 卡測試重演）**：
  (1) `tools/video-converter/index.html` 就位 → (2) `tools.ts` 翻
  available → (3) `tools.test.ts` tripwire 2→3＋verify-dist anchor 同步。
- `npm run typecheck`／`build`／`verify:dist`（含 vendor 雙檔＋pin 同步
  ＋三 anchor 斷言）；自足性單元斷言（load 雙 URL）。
- 人工 E2E checklist（使用者 gate）——**附樣本產生 recipe**（桌面 ffmpeg
  CLI 指令清單，涵蓋：H.264+AAC MKV、VP9 WebM、HEVC MP4、10-bit H.264、
  無音軌、含字幕 MKV、多音軌、**含 rotation metadata 之直拍來源**）：
  remux 秒級完成；VP9 觸發轉碼 fallback（以 SP-2 盤點結果為準）；HEVC
  copy 提示＋預覽失敗子態＋檔案仍可下載；取消（三態各試）→ 再轉
  （重載成本體感）；**連續轉兩檔**（MEMFS 清理／實例重用）；0-byte 與
  偽副檔名非影片檔 → 優雅錯誤；大檔 gate warn-continue；32 MB 首載
  進度／心跳播報；鍵盤全程（含取消鈕 focus 移轉）；SR 播報（ready
  caveat 含字幕丟棄告知／converting cadence＋ETA／完成播報與 focus
  順序）；旋轉來源輸出目視直立；下載檔於本機播放器可播。
