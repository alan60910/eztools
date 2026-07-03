# EZTools

純靜態網頁工具合集入口頁面，所有處理皆在瀏覽器端完成，由 GitHub Pages 直接託管。目前規劃的功能：

1. 圖片格式轉換（如 APNG → GIF）
2. GIF 編輯（頁數編輯、時間停留等基礎功能）
3. 影片格式轉換（如 MKV → MP4）

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
```

## Documentation
- [SPEC.md](SPEC.md) — architecture and feature spec
- `magi/` — PRD, TECHSTACK, BACKLOG, sprint folders

## License
<license name>
