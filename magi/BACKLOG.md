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
- GIF 編輯功能（頁數編輯、時間停留等基礎功能）
- 影片格式轉換功能（如 MKV → MP4）
- [ ] sprint 02 review 選修改進彙總：convert 端到端補 transparentColorIndex 動態值斷言、暫停鈕 aria-pressed 語意二擇一、maxColors=2／全透明幀端到端案例、main.ts 純邏輯（hexToRgb／進度節流／大檔估算）抽離補測、預覽面板 section 化
  > from `magi/02-apng-to-gif/DRIFT.md` (2026-07-03)
- [ ] apng-js 上游將 delay ≤10ms 改寫為 100ms——補註解與文件對齊（含首幀 PREVIOUS 降級冗餘註明、無效 c8 註解清理）
  > from `magi/02-apng-to-gif/DRIFT.md` (2026-07-03)
- [ ] 「轉換完成」status 播報與結果區 focus 移轉的播報順序競態打磨
  > from `magi/02-apng-to-gif/DRIFT.md` (2026-07-03)
- [ ] worker fallback 邊界強化（執行期失敗回退主執行緒、損壞實例重建）＋ fixtures/generate.ts 歸入 node tsconfig
  > from `magi/02-apng-to-gif/DRIFT.md` (2026-07-03)

## Promoted to sprints
<!-- /magi:plan moves consumed items here -->
- ~~APNG → GIF 轉換功能~~ → `magi/02-apng-to-gif/` (2026-07-03)
