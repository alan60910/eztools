# EZTools

純靜態網頁工具合集入口頁面，所有處理皆在瀏覽器端完成，由 GitHub Pages 直接託管。

## Tools

| 工具 | 狀態 |
|------|------|
| APNG → GIF 轉換（`tools/apng-to-gif/`） | ✅ 可用 |
| GIF 編輯：刪幀、停留時間、播放次數（`tools/gif-editor/`） | ✅ 可用 |
| 影片格式轉換：MKV/MOV/AVI/WebM → MP4（`tools/video-converter/`） | ✅ 可用 |

## Installation
需求：Node.js >= 22。

```bash
npm install
```

## Usage
```bash
# 啟動開發伺服器
npm run dev

# 建置正式版（輸出至 dist/）
npm run build

# 本機預覽 build 結果
npm run preview

# 執行測試（vitest 一次性執行）
npm test

# 驗證 build 產物（入口頁零 JS、工具頁骨架等不變量；需先 npm run build）
npm run verify:dist
```

## Documentation
- [SPEC.md](SPEC.md) — architecture and feature spec
- `magi/` — PRD, TECHSTACK, BACKLOG, sprint folders

## License

本專案自身之授權：<license name>（待定）。

### 第三方元件

影片格式轉換工具以 self-host 方式散布 ffmpeg.wasm 的 `@ffmpeg/core`
wasm 二進位（版本 0.12.10，未經修改），其授權為 **GPL-2.0-or-later**
（內含 x264 等 GPL 元件）。原始碼與完整授權條款見
[ffmpeg.wasm 專案](https://github.com/ffmpegwasm/ffmpeg.wasm)與
[FFmpeg 官方](https://ffmpeg.org/legal.html)。
