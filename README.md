# EZTools

純靜態網頁工具合集入口頁面，所有處理皆在瀏覽器端完成，由 GitHub Pages 直接託管。

## Tools

| 工具 | 狀態 |
|------|------|
| APNG → GIF 轉換（`tools/apng-to-gif/`） | ✅ 可用 |
| GIF 編輯：刪幀、停留時間、播放次數（`tools/gif-editor/`） | ✅ 可用 |
| 影片格式轉換：MKV/MOV/AVI/WebM → MP4（`tools/video-converter/`） | ✅ 可用 |
| Claude Code statusline 產生器（`tools/statusline-builder/`） | ✅ 可用 |

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

## statusline-builder 注意事項

statusline-builder 於瀏覽器端產生 Claude Code 自訂 statusline 的設定腳本
（`.sh`／`.ps1`）與 `settings.json` 片段，所有處理皆在前端完成。

- **Segment schema 基準版**：segment 目錄依 Claude Code stdin JSON schema
  **v2.1.196**（官方文件宣稱版本）建立；changelog 實際複核至 **v2.1.169**，
  兩者間的 patch 差異未逐一複核。**Claude Code 大版更新時，請人工重核
  segment 目錄**（欄位增刪、nullability 時序、enum 集、如 v2.1.132 token
  欄位語意 breaking change 之語意變更）——schema 追版未自動化。
- **Windows 執行下載腳本（Mark-of-the-Web）**：由瀏覽器下載的 `.ps1` 會帶
  Zone.Identifier（MOTW），在預設 ExecutionPolicy（Restricted／
  RemoteSigned）下，未簽名的網際網路腳本會被拒絕執行，導致 statusline
  靜默空白。產出的 `settings.json` 片段預設採 `-ExecutionPolicy Bypass`
  wrapper 形規避；若仍被擋，可對下載的腳本執行 `Unblock-File <路徑>`
  解除封鎖。受管環境若以群組原則（GPO）強制 `AllSigned`，wrapper 亦無效，
  需另行簽署腳本（不在目前保證範圍內）。

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

statusline-builder 工具內含 **Symbols Nerd Font Mono** 的 28-glyph 子集
（`tools/statusline-builder/fonts/symbols-nerd-font-mono-subset.woff2`，
3,556 bytes），僅供工具內終端模擬預覽渲染 powerline 箭頭與 segment 圖示，
**不隨產出的腳本散布**（使用者終端需自行安裝 Nerd Font）。來源為
[ryanoasis/nerd-fonts](https://github.com/ryanoasis/nerd-fonts) **v3.4.0**
的 `NerdFontsSymbolsOnly` release 資產（版本釘死）；子集內字形輪廓全數
取自 MIT 授權之上游 glyph 集（Powerline Symbols、Octicons），本子集依較
嚴格之 **SIL Open Font License 1.1** 散布（nerd-fonts 未宣告 Reserved Font
Name，無改名義務）。完整授權全文、逐來源 MIT 署名與再生工序見
[tools/statusline-builder/fonts/LICENSE-nerd-fonts.md](tools/statusline-builder/fonts/LICENSE-nerd-fonts.md)
與 [tools/statusline-builder/fonts/README.md](tools/statusline-builder/fonts/README.md)。
