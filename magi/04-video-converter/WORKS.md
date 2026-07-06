# Works — 影片格式轉換工具（video-converter）

> Sprint: magi/04-video-converter/  •  append-only 工作日誌

## 2026-07-04 — T1.1：@ffmpeg 三件套＋vendor 複製鏈＋optimizeDeps
**Tasks:** S4-T1.1
**Verdict:** DONE
**Test result:** 180/180（vitest, exit 0）；typecheck exit 0；coordinator 複核 npm test 180 綠＋vendor 雙檔實在（js 111,804 B／wasm 32,232,419 B／.version marker）
**Files touched:** package.json、package-lock.json（+42 行，僅 4 個 @ffmpeg 節點）、.gitignore（+public/vendor/）、vite.config.ts（+optimizeDeps.exclude）、scripts/vendor-ffmpeg.mjs（新）
**Decisions made by developer:**
- npm install 以「`套件@版號`」CLI 參數形式在本環境失敗（字串被 shell 前置層誤當 email 改寫 → npm-package-arg 誤判 local path）；改走「直接編輯 package.json 精確版號＋無參數 `npm install` 同步 lockfile」。**環境教訓：本機組 `word@word.number` 形字串的指令都應避開 CLI 參數路徑。**
- vendor 腳本冪等快路徑以 `.version` marker 實作（首跑 copied、二跑 skipping，皆有 log 佐證）。
- pin 守衛負向測試實跑：假 pin '9.9.9' → exit 1＋雙向修正指引訊息；改回後恢復 skip 路徑。
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-04 — T1.2＋T1.3（lane 並行）：SP-4 node 直跑 PoC＋工具頁骨架/harness
**Tasks:** S4-T1.2（lane A）、S4-T1.3（lane B）
**Verdict:** DONE ×2
**Test result:** 187/187（180 既有＋7 新 asset-url；exit 0）；typecheck exit 0；coordinator 親跑 `node scripts/spike-node-core.mjs` → FEASIBLE、exit 0 復現
**Files touched:** scripts/spike-node-core.mjs（新）；tools/video-converter/{index.html, style.css, spike.ts, asset-url.ts, asset-url.test.ts}（新）；src/tools.ts 零 diff（時序第一閘：index.html 先行、planned 未翻）
**Decisions made by developer:**
- **SP-4 = FEASIBLE**（node v24.14.0）：t_import ≈4ms／t_instantiate ≈45ms（32.2MB wasm）／t_exec(0.5s testsrc→h264) ≈60ms，合計 ~108ms。
- 墊片實證（孤立測試逐項）：`self` NEEDED、`self.location.href` NEEDED（ENVIRONMENT_IS_WORKER 編譯期硬編 true、無旋鈕，但不主動拒 node）；`btoa` NOT NEEDED（glue 零 btoa 呼叫、node 24 原生有）；`locateFile` **NOT EFFECTIVE**（glue 無條件以內部 `_locateFile` 覆寫）——真正機制＝`wasmBinary` 直傳＋`mainScriptUrlOrBlob` 之 `<url>#<base64(JSON{wasmURL})>` 私有協定（缺 #fragment 會在 atob 炸 InvalidCharacterError）。
- `core.exec` 為 rest params——參數須展開傳，傳陣列會在 stringsToPtr 炸。node fetch 不支援 file:// → 一律 wasmBinary。
- timeout 決策：冒煙級（instantiate＋極小轉檔）免調 testTimeout（5000ms 綽綽有餘）、免隔離；**不外推**至 T3.3 真 fixture 轉檔——屆時另量測獨立決策。
- T1.3：vendorAssetUrl 純函式（`../../` 上溯＋防禦）7 測試；harness 五鈕（載入雙案切換／testsrc 轉檔／記憶體 ramp／效能基準／重載量測）＋runExclusive 防併發；spike 區塊明標「T3.2 將移除」。
**Coordinator 追加事實（親跑 PoC 之 stderr banner）：**
- **core 0.12.10 configure 全文入手**：`--enable-gpl --enable-libx264 --enable-libx265 --enable-libvpx --enable-libmp3lame --enable-libtheora --enable-libvorbis --enable-libopus --enable-zlib --enable-libwebp --enable-libfreetype --enable-libfribidi --enable-libass --enable-libzimg`；ffmpeg 5.1.4、單執行緒（--disable-pthreads）。
- 推論（SP-2 大半前答）：libx264/libx265/libvpx（VP8/VP9 編解）/mp3/vorbis/opus 在；**AV1 解碼器全缺（無 dav1d/libaom）→ AV1 輸入不可解，unsupported-codec 分支為真實場景**；aac 走 ffmpeg 原生 codec（未 disable）。T2.1 仍須以 `-decoders/-encoders` 枚舉正式定案（尤其 native decoder 集）。
- exec 尾端 `Aborted()` 為 Emscripten exit 既知行為（wrapper worker 以 reset() 處理），ret=0 且輸出可讀，非錯誤。
**Out-of-scope observations to follow up:**
- 環境教訓（T1.1 發現）延伸適用：CLI 組 `word@word.number` 字串會被改寫，各 lane 已知悉。

## 2026-07-04 — T1.4（自動化子集）：SP-1 build/preview 驗收——worker 接線成立
**Tasks:** S4-T1.4（自動化子集；人工 mini-gate 待使用者）
**Verdict:** DONE（自動化部分）
**Test result:** build exit 0；verify:dist exit 0；npm test 187/187 exit 0；preview HTTP 200×3
**Files touched:** （唯讀驗證 task；dist/ 為 build 覆寫）
**關鍵結論：**
- **worker chunk 正確 emit 且接線可用**：`dist/assets/worker-BzdDEeh7.js`（2.45kB，@ffmpeg/ffmpeg 的 worker.js＋const.js＋errors.js 被 Rollup 內聯成**自足 IIFE**、零跨 chunk import——classWorkerURL 備援與三檔 co-locate 條款**均不需啟用**）；`tool-video-converter-2G2RCn8c.js` 內 `new URL('worker-BzdDEeh7.js', import.meta.url)` 檔名與實檔精確對上。
- dist/vendor/ffmpeg 雙檔 bytes 精確（111,804／32,232,419）；prebuild hook 於 build 內自動生效（skip 快路徑 log 佐證）。
- worker chunk 內確認含 unpkg CDN 字面常數（PLAN 已查證 3 的預言成立——dist-grep 防迴歸不可行的實證）。
- preview headers 資料點：core .js `text/javascript`、.wasm `application/wasm`，皆無 Content-Encoding（preview 不壓縮；GH Pages 行為留部署後實測）。
- dev 自報一則工具教訓：PowerShell Invoke-WebRequest 對無 charset 回應以系統編碼解 `.Content` 會誤判中文比對，須以 RawContentStream＋UTF8 解碼。
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-04 — coordinator ruling：SP-1 人工 mini-gate 順延併入 T4.3
使用者目前以 remote 模式連線、無法操作本機瀏覽器。裁決：
- mini-gate（dev＋preview 真載真轉、五鈕收數）**併入 T4.3 總 checklist**一次執行。
- **URL 方案暫裁採 (a) 直傳絕對 URL**（`vendorAssetUrl` 上溯構法）：無 toBlobURL 之 Content-Length≠received 硬失敗路徑（round 2 源證），下載進度以映射表「時間驅動心跳」分支承載；方案 (b) 留部署後對 GH Pages 實測再議。T3.1/T3.2 依此實作；T4.3 gate 若實測推翻再修。
- 自動化證據已足以支撐續行：worker 接線／vendor 200／verify-dist 全綠（本頁上一條目）。

## 2026-07-04 — T2.1：SP-2 全套（盤點／ffprobe／fixtures／rotation／copy 失敗樣態／降級判定）
**Tasks:** S4-T2.1
**Verdict:** DONE（首派 dev 撞 Sonnet 上限陣亡，Fable 重生完成；首派僅遺 repo 根 5 顆 `.scratch-*` 中間產物——內容與重跑一致未採用，**待使用者確認後清除**）
**Test result:** 187/187 exit 0；typecheck exit 0（coordinator 複核同結果）；fixtures 產生器連跑兩輪全 sha256 一致（byte-stable）
**Files touched:** magi/04-video-converter/SP2-INVENTORY.md（新）；tools/video-converter/fixtures/{generate-fixtures.mjs, probe/×14 JSON, media/{a-h264-aac.mkv 9,746B, b-vp8-vorbis.webm 6,911B}}（新；probe 含外部真實檔 4 顆：bbb-vp9/flower-vp8vorbis/bbb-h265/bbb-av1）
**盤點四關鍵答案（SP2-INVENTORY.md 定案）：**
- aac encoder（native）：**有**（實跑 ret=0，aac LC）
- AV1 decoder：**名義有、實質無**（hwaccel-only；真跑 ret=1 乾淨失敗不 crash）→ AV1 輸入走 unsupported 路徑
- hevc decoder：**有**（外部檔 ret=0）；ac3/eac3 decoder：有
**運行時地雷（全部影響 T3.x 契約）：**
- **ffprobe ret 永遠 -1 不可信**（wrapper 不設 Module.ret；失敗時 -o 仍寫空物件 {}）→ probe 成敗契約＝**JSON streams 非空**，不得看 ret。exec 的 ret 可靠。
- **libvpx-vp9 編碼 = wasm crash**（memory access out of bounds，frame 1 後必現；vp9 解碼正常）；**libx265 編碼 = 無限 hang 且 core.setTimeout 攔不住**（只能 worker terminate()——與 PLAN 取消設計吻合）。產品面不受影響（永不編 vp9/x265）；SP-6 樣本不能自產 vp9/HEVC Main10，走外部檔。
- **loglevel process-global 且跨呼叫殘留**（reset() 不還原）→ ffmpeg-client 每次 exec/ffprobe 顯式帶 -v。
- exec 成功 stderr 常以 Aborted() 收尾＝非失敗訊號。
**rotation 實錄：** 5.1.4 CLI 無法寫 rotation（-metadata rotate 被靜默丟棄、-display_rotation 不存在）；fixtures 以 tkhd 36-byte matrix patch 替代（ffprobe 顯 Display Matrix rotation:-90）。64x32 非正方源實測：copy 完整保留 matrix（64x32 不變）；轉碼 autorotate 燒入（32x64、side_data 消失）——**兩路徑播放呈現一致，無躺平風險**。
**-c copy 失敗樣態：** vp8→mp4：ret=1＋0 byte 輸出；特徵行「Could not find tag for codec … not currently supported in container」「Could not write header」。**反直覺實證：vorbis→mp4 copy ret=0 成功**（mux 過但瀏覽器播不出）——音訊白名單（aac/mp3 外一律轉碼）不可放寬的直接證據。
**降級判定：** ffprobe 缺席降級走 stderr 解析**可行**（`-v info -i` 的 Duration/Stream 行正則實測可抽）；本 build ffprobe 可用，Plan B 僅記載不實作。
**規劃偏差（如實記錄）：** 樣本 b 由 vp9+opus 改 vp8+vorbis（vp9 編碼 crash 所迫；同觸發全轉碼路徑）；hevc 樣本不自產（x265 hang）改外部 JSON；真實 vp9+opus 與手機直拍 rotation 檔留 T4.3 使用者補交叉。
**Out-of-scope observations to follow up:**
- repo 根 `.scratch-{decoders,encoders,muxers,probe-a,rot-src}` ×5 待使用者確認清除（commit 前必須處置）。

## 2026-07-04 — T2.2＋T2.3（lane 並行）：probe.ts＋limits.ts
**Tasks:** S4-T2.2（lane A）、S4-T2.3（lane B）
**Verdict:** DONE ×2
**Test result:** 275/275（187→＋46 limits＋42 probe；exit 0，coordinator 複核同數）；typecheck exit 0 ×2
**Files touched:** tools/video-converter/{probe.ts, probe.test.ts, limits.ts, limits.test.ts}（皆新）
**Decisions made by developer:**
- probe：`ProbeResult = {ok:true,info} | {ok:false,reason:'invalid-json'|'no-streams'}`，永不 throw；j-corrupted 的 `{}` 落 'no-streams'（遵守「ret 不可信、看 streams」契約）。rotation 掃 side_data_list 取首個可解析 rotation。統一 toFiniteNumber 防禦（含 Number('')===0 陷阱）。codec_name 缺失以 'unknown' 佔位保留軌存在性（下游白名單落空→轉碼）。14 fixtures 逐顆過機＋28 畸形手工案。
- limits：gate 嚴格大於 512MB（±1 邊界釘住）；ETA 進度率式、progress≤0/≥1→null、elapsed=0→0；cadence Δ≥10% 或 Δt≥30s（常數抽出、註記 SP-5 回填）；檔名 `x.mp4`→`x.converted.mp4`（防同名並存）、隱藏檔式 `.mkv`→`.mkv.mp4`、空字串→`output.mp4`；formatEta 上界式（<60s「不到 1 分鐘」／60–90s「不到 2 分鐘」／>90s ceil「約 N 分鐘」）。
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-04 — T2.4：convert-plan.ts 決策矩陣＋args builder——M2 完成
**Tasks:** S4-T2.4
**Verdict:** DONE（M2 全數完成）
**Test result:** 308/308（275＋33；exit 0，coordinator 複核同數）；typecheck exit 0
**Files touched:** tools/video-converter/{convert-plan.ts, convert-plan.test.ts}（新）
**Decisions made by developer:**
- `-map` 擇「省略」制：probe 成功時按軌道組成裁剪（present 軌仍留 `?` 保險）；blind plan 因組成未知雙 `?` 全留＋影音一律轉碼。
- external-hevc fixture 實際 profile='Main'/yuv420p → 白名單 copy＋hvc1＋hevc-compat notice（全陣列鎖定）。
- **av1 強制 mode='full-transcode'**（授權偏差，檔內註記）：自然規則會因該檔無音軌判 transcode-video，但事前預期管理需要 full-transcode 語意；args 仍按白名單各自決定。
- notices 發射順序固定（codec→multi-video→multi-audio→subtitles→audio-only），測試鎖定。
- rotation 常設回歸：13 顆 ok fixture＋blind 掃 args 永不含 '-noautorotate'，並釘 '-v'/'-nostdin'/'-y' 不得混入 args（層責分工）。
- 測試三方交叉：13 fixture 全鏈（parseProbeJson→planConversion→args toEqual）＋合成邊界案。
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-05 — T3.1：ffmpeg-client.ts 生命週期契約
**Tasks:** S4-T3.1
**Verdict:** DONE
**Test result:** 332/332（308＋24；exit 0，coordinator 複核同數）；typecheck exit 0
**Files touched:** tools/video-converter/{ffmpeg-client.ts, ffmpeg-client.test.ts}（新）
**Decisions made by developer:**
- FFmpegLike 注入面（12 方法）＋預設 factory `() => new FFmpeg()` 零 cast 過 typecheck＝真實類漂移 tripwire；new 僅發生於方法內（import 安全有測試釘住）。
- fetchFile 第三注入點（node 測試以 blob.arrayBuffer() 替身；生產走真 fetchFile）。
- `FfmpegCancelledError`＋「取消訊號競速＋世代計數」雙保險——底層 Promise 永不 settle（x265 hang 類）也收斂；取消跳過清理（worker 已死 FS 隨滅）；重建以 factory 二呼證明。
- exec throw（OOM abort）→ ok:false＋哨兵 ret＋logTail（ring 50 行、每 job 清空）；mount fallback 前掃半成品目錄（防 EEXIST 永久掉 fallback）；保留名撞名前綴 in-；無名 Blob 走 WORKERFS blobs 補位。
- core bytes 快取按方案 (a) 語意交 HTTP/wasm code cache（SP-7 於 T4.3 量測）。
- 自足性守衛落地：load 雙 URL 非空＋vendor 路徑＋與 vendorAssetUrl 相等（round 2 I14 的呼叫端斷言）。
**Out-of-scope observations to follow up:**
- spike.ts 的移除（T3.2 原定）改為「index.html 換裝 main.ts 後留 orphan」，實體刪除與 .scratch-*／.t2x-report 一併留待使用者 commit 前確認（全域刪除規則）。

## 2026-07-05 — T3.2＋T3.3（lane 並行）：main.ts 全流程＋node 真轉檔整合測試——M3 完成
**Tasks:** S4-T3.2（lane A）、S4-T3.3（lane B）
**Verdict:** DONE ×2（M3 全數完成）
**Test result:** 336/336（332＋4 整合；exit 0）；typecheck exit 0；build exit 0（tool-video-converter chunk 19.61kB 已換裝 main.ts 產物、含 loading-core 心跳字串、spike 字串 0 命中；worker chunk 正常 emit）；verify:dist exit 0——coordinator 全項複核同結果
**Files touched:** tools/video-converter/{main.ts(新), index.html, style.css, pipeline.integration.test.ts(新)}；spike.ts 原封留 orphan
**T3.2 決策要點：**
- 播報映射表逐列落地（loading-core 10s 時間心跳／ready 三變體＋NOTICE_TEXT 六鍵一次播齊／converting cadence＋ETA、停滯 60s 心跳／done 先播再 rAF×2 focus 結果容器／preview-failure 同節點覆寫／error 常駐 role=alert 含 logTail details／cancelled 分態 focus）。
- copy 失敗 fallback 以 `plan.args.includes('copy')` 判定（涵蓋 audio-only 之 audio-copy 變體，較列舉 mode 誠實）→ blind 重試一次。
- 四個 live/alert 節點常駐（is-empty 模式）；取消鈕在進度 region 內（sprint 03 教訓明文註記）；下載連結原子設定；自主加固：exec 例外後 terminate 丟棄不可信 worker。
- beforeunload 未實作（照 PLAN open question 留議）。
**T3.3 決策要點：**
- 4 案例全鏈（A remux 含 faststart moov<mdat bytes 斷言＋回探 h264/aac；B 全轉碼斷言 codec 轉換；C blind 降級實證；D vp8→mp4 copy ret≠0 迴歸）；呼叫序列與 wrapper worker.js 逐字同形（exec→ret→reset）。
- 耗時：init 230ms＋四案 133ms＝檔案 364ms → **留預設套件免隔離**（全套 npm test 966ms）；timeout 15s 邊際；墊片 afterAll 拆除防 forks pool 殘餘。
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-05 — T4.1＋T4.2（lane 並行）：時序三閘＋Spec deltas 落地——M4 自動化部分完成
**Tasks:** S4-T4.1（lane A）、S4-T4.2（lane B）
**Verdict:** DONE ×2（sprint 實作面完成；剩 T4.3 使用者總 gate）
**Test result:** 336/336 exit 0；typecheck 0；build 0；verify:dist 0（coordinator 四道終驗同結果）
**Files touched:** src/tools.ts（planned→available）、src/tools.test.ts（tripwire 2→3）、scripts/verify-dist.mjs（anchor＋vendor 雙檔斷言，+26/−2）；SPEC.md（+13/−6）、magi/TECHSTACK.md（+14/−4）、README.md（+13/−2）
**T4.1 要點：**
- 負向驗證實跑：wasm 門檻暫改 40MB → verify:dist exit 1（訊息含實際 bytes）→ 改回復綠——斷言證實會咬人。
- 附帶調整（有據）：tools.test 的 stillPlanned sanity 斷言因 repo 已無 planned 工具而移除，負向迴圈保留（未來新增 planned 自動恢復）；planned 卡片機制由 render.test.ts 覆蓋。
- 入口頁對 video-converter 產生 `<a>` 連結（dist/index.html 實證）。classWorkerURL 備援三檔斷言未加（備援未啟用）。
**T4.2 要點：**
- deltas 九項＋root-sync 兩項（README Tools 列 ✅＋License GPL 草稿）全落地，自附 D3 對帳表；版本號與 repo 實態逐一核對；README GPL 草稿以註解標記「commit 前與使用者定稿」。
- 觀察（未動，deltas 未宣告）：TECHSTACK Constraints「可能需要 WebAssembly，如 ffmpeg.wasm」措辭已過時——留 coordinator 裁量（候補：併入 commit 時 root-sync 或 backlog）。
**Out-of-scope observations to follow up:**
- 待使用者確認的刪除清單（commit 前處置）：repo 根 `.scratch-*` ×5、`magi/04-video-converter/.t21-report.md`（冗餘備份）、`tools/video-converter/spike.ts`（orphan，已無引用）。

## 2026-07-06 — Post-review fixes（5 項 nits）＋MAGI code review 結果
**Tasks:** S4-Post-review fixes（review：MAGI_CODE_REVIEW.md／DRIFT.md）
**Verdict:** DONE（5/5）；code review 5/5 APPROVE-WITH-NITS、A 類 0（三 sprint 首見）
**Test result:** 340/340（336＋4 新：asset-url 無尾斜線 ×3＋busy 復用 ×1）；typecheck exit 0；coordinator 複核同數＋查重（測試名零重複、關鍵字串各單次出現）
**Files touched:** tools/video-converter/{main.ts, asset-url.ts, asset-url.test.ts, ffmpeg-client.test.ts, pipeline.integration.test.ts}
**修復內容：** strategyText audio-only copy 文案分流（2票）；asset-url 無尾斜線 pathname 正規化＋3 測試；busy 釋放後 probe→convert 復用測試；ETA percent<1 不播（低進度外插發散註記）；integration 註解措辭改「呼叫序同形＋setTimeout 略去之由」。
**流程透明記錄（協調事件）：** 原修復者（dev-fixes-2）8.5 小時無交卷且磁碟零寫入，coordinator 判定陣亡並重生 dev-fixes3；隨後原者於重生前一刻完成全部編輯並交卷（08:16:40-49 寫檔）。dev-fixes3 開工即核對發現全數已套用，依令停工、僅驗證取證（.fixes-report.md）。查重確認**無雙重套用**（340=336+4 精確、無重複測試名）。
**Out-of-scope observations to follow up:**
- （無新增）
