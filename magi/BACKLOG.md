# Backlog

Items here are candidates for future sprints, typically promoted from
sprint DRIFT.md by `/magi:commit`. Use `/magi:plan` (no args) to promote
one into a new sprint.

## Pending
<!-- /magi:commit appends C-class drift items here -->
- [ ] 決定 `_probe` 的長期去留（保留為活範本，或於掃描時排除底線資料夾，避免探針頁長期公開於正式站）
  > from `magi/01-entry-page-skeleton/DRIFT.md` (2026-07-02)
- [ ] 引入 lint/format 工具（eslint/prettier）與對應 CI 檢查
  > from `magi/01-entry-page-skeleton/DRIFT.md` (2026-07-02)
- [ ] README 的 License 段落補齊（目前為佔位符）
  > from `magi/01-entry-page-skeleton/DRIFT.md` (2026-07-02)
- [ ] footer 與 header 標語文案去重微調
  > from `magi/01-entry-page-skeleton/DRIFT.md` (2026-07-02)
- [ ] sprint 02 review 選修改進彙總：~~convert 端到端補 transparentColorIndex 動態值斷言~~（已由 sprint 03 interop 三方交叉在精神上緩解，2026-07-04）、暫停鈕 aria-pressed 語意二擇一、maxColors=2／全透明幀端到端案例、main.ts 純邏輯（hexToRgb／進度節流／大檔估算）抽離補測（大檔估算已於 sprint 03 對 gif-editor 側抽測，apng 側仍待）、預覽面板 section 化
  > from `magi/02-apng-to-gif/DRIFT.md` (2026-07-03)
- [ ] apng-js 上游將 delay ≤10ms 改寫為 100ms——補註解與文件對齊（含首幀 PREVIOUS 降級冗餘註明、無效 c8 註解清理）
  > from `magi/02-apng-to-gif/DRIFT.md` (2026-07-03)
- [ ] 「轉換完成」status 播報與結果區 focus 移轉的播報順序競態打磨
  > from `magi/02-apng-to-gif/DRIFT.md` (2026-07-03)
- [ ] worker fallback 邊界強化（執行期失敗回退主執行緒、損壞實例重建）＋ fixtures/generate.ts 歸入 node tsconfig
  > from `magi/02-apng-to-gif/DRIFT.md` (2026-07-03)
- [ ] gifuct 上游 bug 緩解：js-binary-schema-parser 的 GIF schema Plain Text Extension 分支欄位誤植（`parent.text.blockSize` 應為 `parent.blockSize`），含 0x21 0x01 擴充的合法 GIF 使整條解碼管線 throw——decode 前預掃剝除該區塊，或向上游回報 patch
  > from `magi/03-gif-editor/DRIFT.md` (2026-07-04)
- [ ] apng-to-gif 的 #progress-section backport gif-editor 常駐模式（live region 永掛、僅 progress 元素 hidden），補齊「live region 常駐」既有不變量
  > from `magi/03-gif-editor/DRIFT.md` (2026-07-04)
- [ ] 全域暫停鈕對「轉換後預覽」region 的可發現性打磨（region 導覽先入結果區時找不到控制鈕）
  > from `magi/03-gif-editor/DRIFT.md` (2026-07-04)
- [ ] error 態焦點跨工具統一：三工具失敗時焦點皆落 body，統一補 focus 至重試/重新開始鈕
  > from `magi/04-video-converter/DRIFT.md` (2026-07-06)
- [ ] yuvj420p（full-range 8-bit 4:2:0）納入 video copy 白名單評估（現保守轉碼：非必要轉碼＋輕微色彩位移風險 vs 容器 full-range flag 保留驗證）
  > from `magi/04-video-converter/DRIFT.md` (2026-07-06)
- [ ] video-converter main.ts 純函式（strategyText/formatDurationSec/conversionFailureMessage）下沉 limits/convert-plan 補全分支測試
  > from `magi/04-video-converter/DRIFT.md` (2026-07-06)

## Promoted to sprints
<!-- /magi:plan moves consumed items here -->
- ~~APNG → GIF 轉換功能~~ → `magi/02-apng-to-gif/` (2026-07-03)
- ~~GIF 編輯功能（頁數編輯、時間停留等基礎功能）~~ → `magi/03-gif-editor/` (2026-07-03)
- ~~影片格式轉換功能（如 MKV → MP4）~~ → `magi/04-video-converter/` (2026-07-04)
