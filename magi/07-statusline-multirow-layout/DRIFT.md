# Drift — Statusline Builder 多列輸出＋三欄版面＋排序語意（06b）
> Source: MAGI 面向分區 ×5 增量聚焦 review（MAGI_CODE_REVIEW.md，2026-07-12）  •  Generated: 2026-07-12T03:50+08:00  •  Status: DETECTED（A×1 待修；B/C 為記錄項待 commit 確認）
> 前輪（2026-07-11 全量 review）A×3 已全數修復並驗證——歷史存證見 MAGI_CODE_REVIEW-2026-07-11.md 與 WORKS.md，本檔為現況語意、不再列出。

## A. Contract violations
- [x] ~~select 跨列指派後無顯式 re-focus（blur 落 body）~~ — **已解（2026-07-12 review 修復，PLAN Rev 12）**：change handler 於 commitSegmentMove 後顯式回焦該 select；同輪一併收掉 I-2（確認態不跨 relayout 存活＋焦點保全）與 I-3（planSegmentMove 純函式＋10 組合矩陣測試）。CDP V1–V4 驗證＋1122/1122 全綠。

## B. Below-the-contract decisions
- [ ] ~~暫存列刪除為計數制（移除最高編號）~~ — **已被 Rev 11／T5.14 作廢**：升級位置制 slots、刪除鈕點哪刪哪（removeSlotAt 於被點 slot）
- [ ] 新增 `catalog.ts`／`row-groups.ts`／`row-select.ts`／**`row-slots.ts`**（第四個）超出 PLAN in-scope 檔清單（純函式接縫慣例，理由充分）；`normalizeRows` 作用於 segments 陣列而非整個 config
- [ ] 整列刪除確認採 inline 兩段式（焦點預設「取消」），非原生 confirm()（PLAN 授權型式自定；其 stale 態缺陷＝本輪 review I-2，修復後本記錄僅存型式決策）
- [ ] 停用段拖排為 no-op（停用段無 row）——T5.6 使用者裁定項沿用
- [ ] select `<option>` value 由渲染列序改為 **slot index 字串**；暫存列 option text 附「（新列）」字尾——Rev 11 位置制下位實作，PLAN 未逐字指定
- [ ] enable 0→1（全停用後首個啟用段）將新真實列**前置於 slot 0**，既有暫存空列全體編號 +1——契約沉默、實作自選（T5.6 驗收時過目 UX 是否符合直覺）
- [ ] `DropTarget` 型別置於 main.ts（TASKS.md 明文允許）；dropGap 節點跨手勢池化重用（clearDropGap 不歸零引用）；`reconcileRealSlots` 補位「最後一個 real 之後」為實作裁量
- [ ] Rev 7 僅翻可見標籤「顯示文字」，內部 `segment-row__icon` 命名保留 icon
- [ ] bash `groupByRow(resolved)` vs ps1 `groupSegmentsByRow(config)` 分組簽章漂移；ps1 `$n` 跨列共用 vs bash `n_N` 隔離（皆正確）

## C. Out-of-scope observations
- [ ] SPEC.md 敘述停在 Rev 4–8 三欄終態，建議補半句「列可暫存為 UI 空列（純顯示態、不入存檔）」（Rev 11 敘述完整性；非違反——SPEC 空列壓縮明確界定於 engine/config 層、仍為真）
- [ ] drop handler 對 `is-segment-dragging`／rAF 清理單點依賴 dragend（R2+R3 ×2）——「drop 發但 dragend 未發」歷史邊際案防禦加固，backlog
- [ ] `lastRenderedSlots` 別名快照依賴「變異點皆回傳新陣列」隱形前提（改淺拷貝一行加固）；`reconcileRealSlots` 靜默安全網建議 dev warn 可觀測化；`seg.row` 直當 render-index 的正規化耦合補註解
- [ ] 有中間空列時重啟用段 clamp 落點的顯示編號可能與凍結 row 值直覺不符（與契約一致非回歸；使用者若回報「跑錯列」此為根因）
- [ ] pending 空列非 region 地標（標題導覽可達；若要 rotor 可達補 role="group"）；renderPendingRowContainers 函式層無焦點保全（現無觸發路徑）
- [ ] Chromium 133+ `Element.moveBefore()` 可原生保焦點搬移——未來可整族解決「relayout 即失焦」（含現靠顯式回焦的路徑）
- [ ] `toAnsi([])` 零列不變量僅靠 resolve 恆 `[[]]` 維繫（文件性邊界測試可補）；多列 × `powerlineArrow=false` 無真執行案（低風險）
- [ ] `dragOrigin` 死狀態可移除；相同播報文案 SR 不重讀（live region 通用強化 backlog）
- [ ] 建議補 jsdom 測試覆蓋 `renderRuns`；CDP 驗證腳本（scratchpad cdp-slots.mjs S1–S9 等）建議收編為可重跑整合案
- [ ] jq fixture 為本機未追蹤檔（換機重放置）；emit-ps1 `[char]` 逐碼位跳脫可簡化（backlog）；SGR 支援與 Claude Code 版本相依（backlog 級）
- [x] ~~T5.6 手動驗證尚未完成~~ — **已完成（2026-07-12）**：原清單 A–F＋G 區複驗全過（`prefers-reduced-motion` 使用者裁決註記不測）；T5.7 SR 抽測使用者明示豁免（PLAN Rev 13）。驗收閘門全數結案
