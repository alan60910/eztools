# EZTools

純靜態網頁工具合集入口頁面，所有處理皆在瀏覽器端完成，由 GitHub Pages 直接託管。

## Tools

| 工具 | 狀態 |
|------|------|
| APNG → GIF 轉換（`tools/apng-to-gif/`） | ✅ 可用 |
| GIF 編輯：刪幀、停留時間、播放次數（`tools/gif-editor/`） | ✅ 可用 |
| 影片格式轉換（如 MKV → MP4） | 規劃中 |

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
<license name>
