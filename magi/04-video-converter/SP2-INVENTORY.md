# SP-2 能力盤點與 fixtures 實錄（@ffmpeg/core 0.12.10）

> 產生方式：node v24.14.0 直跑 core（SP-4 墊片模式，見
> `scripts/spike-node-core.mjs`），`exec('-decoders')`/`-encoders`/`-muxers`
> 枚舉＋逐項真跑驗證。日期：2026-07-04。
> 本檔為 sprint 參考文件——probe.ts 與 convert-plan 測試以本檔與
> `tools/video-converter/fixtures/probe/*.json` 為事實依據。
> ffmpeg 5.1.4（banner configure 與 PLAN 已知事實一致）。

## 0. 四個關鍵答案（先講結論）

| 問題 | 答案 | 證據 |
|---|---|---|
| aac encoder（native）有無 | **有**，且實跑正常 | `-encoders` 列 `aac`；樣本 a/g 以 `-c:a aac` 產出 ret=0，ffprobe 讀回 `audio:aac (LC)` |
| AV1 decoder 有無 | **名義有、實質無** | `-decoders` 列 `av1`（native，hwaccel-only）；真跑外部 AV1 檔 ret=1：`Failed to get pixel format`／`Function not implemented`。無 dav1d/libaom。**乾淨失敗、不 crash** |
| hevc decoder 有無 | **有**，實跑正常 | `-decoders` 列 `hevc`；解碼外部 HEVC 檔 5 frames ret=0 |
| ac3 decoder 有無 | **有**（含 eac3） | `-decoders` 列 `ac3`、`ac3_fixed`、`eac3`（未真跑；無樣本源，非白名單路徑——一律轉碼） |

## 1. 決策矩陣相關子集全列

總數：decoders 479／encoders 184／muxers 172（全量 dump 未簽入，重跑
`exec('-decoders')` 即得）。

### video

| codec | decoder | encoder | 運行時驗證 |
|---|---|---|---|
| h264 | `h264` | `libx264`、`libx264rgb` | 編碼 ✅（樣本 a/e/g/h/i），**10-bit 也支援**（樣本 d，`yuv420p10le` → High 10）；解碼 ✅ |
| hevc | `hevc` | `libx265` | 解碼 ✅（外部檔 5 frames ret=0）；**編碼 ❌ hang**（見 §7） |
| vp8 | `vp8`（native）＋libvpx | `libvpx` | 編碼 ✅（樣本 b）；解碼 ✅（flower.webm probe） |
| vp9 | `vp9`（native）＋libvpx-vp9 | `libvpx-vp9` | 解碼 ✅（外部檔 5 frames ret=0）；**編碼 ❌ wasm crash**（見 §7） |
| av1 | `av1`（hwaccel-only） | 無（`wmav1` 是 Windows Media **Audio**，字串誤中） | 解碼 ❌（ret=1 乾淨失敗）；probe 本身 ✅（讀 header 得 codec_name/profile/寬高，**無 pix_fmt 欄位**） |
| mpeg4 | `mpeg4`、`msmpeg4v1/v2`、`msmpeg4` | `mpeg4`、`msmpeg4v2`、`msmpeg4` | 編碼 ✅（debug 腳本實跑 ret=0） |
| mjpeg | `mjpeg`、`mjpegb` | `mjpeg` | 未真跑 |
| theora | `theora` | `libtheora` | 未真跑 |

### audio

| codec | decoder | encoder | 運行時驗證 |
|---|---|---|---|
| aac | `aac`、`aac_fixed`、`aac_latm` | `aac`（native） | 編碼 ✅（樣本 a/g） |
| mp3 | `mp3`、`mp3float` 等 6 種 | `libmp3lame` | 編碼 ✅（樣本 f） |
| opus | `opus`（native）＋`libopus` | `opus`（native）＋`libopus` | libopus 編碼 ✅（樣本 k） |
| vorbis | `vorbis`（native）＋`libvorbis` | `vorbis`（native）＋`libvorbis` | libvorbis 編碼 ✅（樣本 b） |
| ac3 | `ac3`、`ac3_fixed` | `ac3`、`ac3_fixed` | 未真跑 |
| eac3 | `eac3` | `eac3` | 未真跑 |
| flac | `flac` | `flac` | 未真跑 |
| pcm_s16le | `pcm_s16le`（＋planar） | `pcm_s16le`（＋planar） | 未真跑 |

### muxer（皆在列）

`mp4`、`matroska`、`webm`、`ipod`（另 `mp3`、`ogg` 亦在，供 audio-only 參考）。

## 2. ffprobe 可用性：**可用，但 ret 完全不可信**

- `core.ffprobe` 為 wasm 內建函式（glue `Module["ffprobe"]` → wasm export
  `Module["_ffprobe"]`），rest params 同 exec。
- `ffprobe('-v','error','-show_streams','-show_format','-of','json','-o','out.json', f)`
  實測 ✅：out.json 為合法 JSON，含 streams/format 全欄位。
- **地雷（實測定案）**：0.12.10 的 ffprobe wrapper **從不設定 `Module["ret"]`**
  ——成功、檔案不存在、檔案損壞一律回 **-1**（`reset()` 哨值）。且失敗時
  `-o` 仍寫出**空物件 `{}`**。
- **成敗判定契約（probe.ts 必須遵守）**：解析 JSON、以 `streams` 非空為成功；
  **不得看 ret**。空物件/缺 streams＝探測失敗（fixtures `j-corrupted-mkv.json`
  即此形狀）。

## 3. fixtures 清單（`tools/video-converter/fixtures/`）

產生器：`fixtures/generate-fixtures.mjs`（重生指令
`node tools/video-converter/fixtures/generate-fixtures.mjs`）。全樣本
`-bitexact -fflags +bitexact`；**連續兩輪重跑全部 probe JSON 與 a/b 媒體
hash 完全一致（byte-stable ✅）**。

| 檔 | 內容 | 關鍵欄位（白名單判定用） |
|---|---|---|
| `probe/a-h264-aac-mkv.json`＋`media/a-h264-aac.mkv`（9,746 B） | 主場景 | h264 **Constrained Baseline**／yuv420p＋aac LC |
| `probe/b-vp8-vorbis-webm.json`＋`media/b-vp8-vorbis.webm`（6,911 B） | 全轉碼觸發（**原規劃 vp9+opus，因 vp9 編碼 crash 改 vp8+vorbis**，同屬雙白名單外） | vp8＋vorbis |
| `probe/k-opus-audio-webm.json` | opus→aac 轉碼分支證據 | opus |
| `probe/d-h264-10bit-mp4.json` | 白名單排除分支 | h264 **High 10**／**yuv420p10le** |
| `probe/e-video-only-mkv.json` | 無音軌 | 單 video stream |
| `probe/f-audio-only-mp3.json` | audio-only 分支 | 單 mp3 stream |
| `probe/g-multi-audio-mkv.json` | 多軌取一 notice | video＋aac×2 |
| `probe/h-subtitles-mkv.json` | 字幕丟棄 notice | video＋**subrip** |
| `probe/i-rotation-mp4.json` | rotation（tkhd patch，見 §5） | side_data Display Matrix，**rotation: -90**，64x32 |
| `probe/j-corrupted-mkv.json` | 損壞檔失敗形狀 | **空物件 `{}`**（5 bytes） |
| `probe/external-*.json`×4 | 外部真實檔交叉（見 §4） | vp9／vp8+vorbis／av1／hevc |

media 僅簽 a/b 兩顆；sha256（兩輪一致）：
`a-h264-aac.mkv` = `b066216613e1d5ca0a4047d2223342401f051d5feddfb8cb67bb343bcb07d073`、
`b-vp8-vorbis.webm` = `87333941254ab907c18fcda5c8082b404f650e662198a454c9070321759a1670`。

## 4. 外部真實檔交叉（一次性擷取，產生器不重生）

以同一 core ffprobe 對下列公開測試片源擷取（2026-07-04；媒體本體不簽入）：

| fixture | 來源 | 內容 |
|---|---|---|
| `external-bbb-vp9-webm.json` | test-videos.co.uk `Big_Buck_Bunny_360_10s_1MB.webm`（vp9） | vp9 Profile 0／yuv420p／640x360，**無音軌** |
| `external-flower-webm.json` | MDN `cc0-videos/flower.webm` | **vp8＋vorbis**（與樣本 b 同組合的真實檔交叉） |
| `external-bbb-h265-mp4.json` | test-videos.co.uk 同系列 h265 mp4 | hevc **Main**／yuv420p（白名單 hevc-copy 分支的真實檔證據） |
| `external-bbb-av1-mp4.json` | test-videos.co.uk 同系列 av1 mp4 | av1 Main／**無 pix_fmt 欄位**（解碼器不可用→僅 header 探測） |

真實 vp9+**opus**（含音軌）與手機直拍 rotation 檔未取得——留待 T4.3
使用者提供真實檔補交叉。

## 5. rotation copy/transcode 一致性（實測 ✅ 一致）

**5.1.4 無法從 CLI 寫 rotation metadata**（如實記錄）：
`-metadata:s:v:0 rotate=90` 被靜默丟棄（輸出無該 tag 也無 display matrix）；
`-display_rotation` 是後續版本的選項（實測 `Unrecognized option`）。
**可行替代（fixtures 採用）**：直接 patch MP4 `tkhd` 的 36-byte matrix
（2x2 取 {0, 65536, -65536, 0}）→ ffprobe 顯現
`side_data: Display Matrix, rotation: -90`，與手機直拍（rotate=90）表徵一致。

以 64x32（非正方形）patched 源實測：

| 路徑 | ret | 結果 |
|---|---|---|
| `-c copy` | 0 | **Display Matrix 完整保留**（rotation -90、尺寸 64x32 不變） |
| `libx264` 轉碼 | 0 | **autorotate 燒入**：尺寸交換 **32x64**、side_data 消失 |

兩路徑對播放器呈現一致（一個帶 metadata、一個實體旋轉）——無「轉出躺平
影片」風險。決策矩陣「copy 保留／轉碼 autorotate 燒入」成立，可寫常設回歸
（fixture `i-rotation-mp4.json` 為 copy 側基準）。

## 6. `-c copy` 失敗樣態（供 fallback 偵測）

**必炸案：vp8 → mp4 copy**（實測）：ret=**1**、輸出檔 **0 bytes**，特徵行：

```
[mp4 @ ...] Could not find tag for codec vp8 in stream #0, codec not currently supported in container
Could not write header for output file #0 (incorrect codec parameters ?): Invalid argument
Error initializing output stream 0:0 --
```

偵測建議：`ret !== 0` 為主訊號；log 特徵 `Could not write header`／
`codec not currently supported in container` 可輔助歸因（fallback → 轉碼）。

**反直覺實錄：vorbis → mp4 copy 竟成功**（ret=0、5,077 bytes、ffprobe 讀回
`audio:vorbis` in mp4，5.1.4 不需 `-strict`）——「mux 成功但瀏覽器播不出」
的實例，ret==0 安全網抓不到。**佐證 audio 白名單（aac/mp3 之外一律轉碼）
必要性：不能靠 copy 失敗來擋 vorbis。**

## 7. 運行時地雷（列在 `-encoders` ≠ 跑得動）

| 元件 | 樣態 | 細節 |
|---|---|---|
| `libvpx-vp9` 編碼 | **wasm crash**（`RuntimeError: memory access out of bounds`） | fresh instance／64x64 與 320x240／各種參數（realtime、lag0、threads 1…）皆於 frame 1 後重現。**解碼正常**。產品面：本工具永不編 vp9，無影響；fixtures/SP-6 樣本不能自產 vp9 |
| `libx265` 編碼 | **無限迴圈 hang**（CPU 空轉不返回、殺進程才停） | 64x64 與 128x128 皆重現（ultrafast、3 frames 卻 500+ CPU-s）；**`core.setTimeout(30000)` 攔不住**（不 abort）。解碼正常。產品面：本工具永不編 hevc，無影響；**SP-6 的 HEVC Main10 樣本不能自產**，需外部檔 |
| `core.setTimeout` | 對 hang 的編碼器**無效** | UI 取消／看門狗只能靠 worker `terminate()`（PLAN 已定），不能指望 in-band timeout |
| loglevel 殘留 | `-v error` 等 loglevel 是 process-global，**跨 exec/ffprobe 呼叫殘留**，`reset()` 不還原 | ffmpeg-client **每次 exec 應顯式帶 `-v`**（尤其依賴 stderr 解析的呼叫），否則前一呼叫的 loglevel 會吃掉輸出 |
| exec 正常結尾 | 成功時 stderr 常以 `Aborted()` 收尾（proc_exit 被 glue 捕捉） | 「Aborted()」字樣**不是**失敗訊號；以 ret 為準（exec 的 ret 可靠，ffprobe 的不可靠見 §2） |

## 8. ffprobe 缺席降級判定（Plan B charter）

**判定：降級走 stderr 解析（可行），不必 blind-transcode。**
證據：`exec('-v','info','-i', f)`（無輸出檔，ret=1 必然）之 stderr 含穩定
可抽取的行：

```
Duration: 00:00:00.62, start: 0.000000, bitrate: 125 kb/s
Stream #0:0: Video: h264 (Constrained Baseline), yuv420p(tv, progressive), 64x64 [SAR 1:1 DAR 1:1], 5 fps, ...
Stream #0:1: Audio: aac (LC), 44100 Hz, mono, fltp
```

正則 `/Stream #\d+:\d+[^:]*: (Video|Audio|Subtitle): ([\w-]+)/` 與
`/Duration: (\d{2}:\d{2}:\d{2}\.\d{2})/` 實測抽取成功（codec、型別、
duration；連 profile/pix_fmt 都在行內可加抽）。前提：**顯式 `-v info`**
（見 §7 loglevel 殘留）。但本 build ffprobe 實測可用（§2），Plan B 僅為
斷路備援，不建議實作於首版——維持 PLAN 決策：探測失敗 → blind-transcode
收斂，stderr 解析留作後備選項不佔工。

## 9. 對決策矩陣定稿的回饋

- 白名單判定所需欄位（`codec_name`/`profile`/`pix_fmt`/`width`/`height`/
  side_data rotation）在全部簽入 JSON 中**齊備**；唯 av1（不可解碼）缺
  `pix_fmt` ——「欄位缺失 → 轉碼」規則會正確接住，且後續轉碼會以乾淨
  ret=1 失敗收斂至錯誤態（不會 crash UI）。
- 「覆蓋」文案可宣告：輸入解碼 h264/hevc/vp8/vp9/mpeg4/mjpeg/theora＋
  aac/mp3/opus/vorbis/ac3/eac3/flac/pcm 皆可；**av1 不支援**（明確告知）。
  輸出僅 h264(＋10bit 亦可但矩陣不需要)/aac（＋copy）。
- vorbis-in-mp4 可 mux 成功（§6）——audio 白名單不可放寬。
