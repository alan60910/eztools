# 🧠 MAGI Code Review R2 — DEV @ f95f27d（working tree，未 commit）【增量聚焦】

**Diff scope:** unstaged＋untracked（intent-to-add）vs HEAD，限 `tools/` 與 `scripts/`——41 檔、+5991/−465（diff 8,354 行）。
**聚焦範圍：** 2026-07-11 首輪 review（存證 `MAGI_CODE_REVIEW-2026-07-11.md`）之後的增量——上輪 5 Important 修復落地、T5.6 回饋修復四波（✕模態焦點＋checkbox 同步、最後列拖曳 rAF 延遲、縫隙幾何解析、pointer-events 死區）、**T5.14／Rev 11 位置制 slots 重構**（row-slots.ts 新模組＋row-select 改版＋main.ts 統一移動入口）。已審定且未再變動的部分不重複裁決。
**審議模式：** 面向分區 ×5（使用者指定 MAGI review；本機無 gemini/codex，五位 claude reviewer 分面向承審；R2 面向以 Fable 承審）

## Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES（輕量——2 行為修＋1 補強後可過）│
├──────────────────────────────────────────────────────────┤
│  Mode: 面向分區 ×5（等權重）   ok_weight: 5 / 5          │
│  Degraded: 否（五票全數成功回票）                        │
├──────────────────────────────────────────────────────────┤
│  ✅ R1 純函式層     ✅ R2 main.ts slots 接線             │
│  ✅ R3 拖曳機制     ✅ R4 結構樣式a11y   ✅ R5 測試漂移  │
│  票型：4× APPROVE-WITH-NITS ＋ 1× REQUEST-CHANGES（R2） │
├──────────────────────────────────────────────────────────┤
│  🔴 Critical: 0     🟡 Important（採納）: 3              │
│  🟢 Minority／Note: 15                                   │
└──────────────────────────────────────────────────────────┘
```

## Verdict
**REQUEST-CHANGES**——T5.14 位置制核心算術（本輪最高風險面）經 R2 逐條組合矩陣 trace 全數正確、五面向皆確認工程品質高；但 R2 抓到兩個直接命中 PLAN 驗收紅線的行為 bug（select 鍵盤路徑焦點落 body、整列刪除確認 UI 錯位殘留），另有一項跨票佐證的可測性補強。三項修法皆為小改動，修完即可 commit。

## 🟡 Important（採納）

### I-1. select 跨列指派後鍵盤焦點落 body（契約違反，A 類）
**票源：** R2（面向獨家；協調者查證機制成立）
**Where:** `main.ts` rowSelect change handler（~890）＋ `assignSegmentsToContainers`（~1937）
select 是 PLAN 明訂的鍵盤跨列路徑（Rev 5）。change → commitSegmentMove → relayout 以 appendChild 重定位該段 `<li>`——搬移聚焦中元素使 select blur 落 body，且此路徑無任何 re-focus（moveSegment／setSegmentEnabled／performRowDeletion 皆有顯式回焦，唯獨 select 沒有）。S7 已實證 Windows 閉合 select 方向鍵逐按即提交：鍵盤使用者按一下 ↓ 就失焦、無法續航。可能自 T5.10 既存，但 select 分流本輪重寫且牴觸「焦點不落 body」契約與 T5.7 SR 驗收 blocker。
**Fix:** change handler 於 commitSegmentMove 後顯式回焦該 select（比照 moveSegment 慣例；必要時依模態 preventScroll）。

### I-2. 整列刪除確認後，倖存容器殘留指向別列的破壞性確認 UI
**票源：** R2（面向獨家）
**Where:** `main.ts` wireRowDeleteButton 確認態（~1851）＋ performRowDeletion（~1507）
inline 確認態存在容器 DOM 上，但容器與列內容錯位復用：刪除第 i 列（非最後容器）時 shrink 只銷毀最後一個 section，使用者按過確認的容器 i 倖存、內容換成原第 i+1 列，其確認鈕對仍展開＋label 被刷成新列號——畫面殘留一個使用者從未發起、指向另一列的活體「確認刪除」鈕，一鍵誤刪。確認態開啟期間任何分組重排（拖曳／select）同理。屬 T5.11 期行為（上輪未挑出），本輪 performRowDeletion／編號刷新有改動，一併處置。
**Fix:** `layoutSegmentContainers` 對全部容器復位確認態（confirmGroup hidden、trigger 復顯）——純 DOM 態重設，不違節點重用鐵律，順帶消除「確認框開啟期間他處操作」整族 stale-UI。

### I-3. 中間空列插入的 bump／drain 決策邏輯困在無測試環境的 main.ts（可測性遷移缺口）
**票源：** R5（Important）＋R2（Note）——跨票佐證 ×2；兩票皆註明不阻擋 commit，惟成本低、正是 nextPendingRowCount 測試刪除後語意覆蓋的遷移落點，採納併修。
**Where:** `main.ts` commitSegmentMove 步驟 1–4（~1236-1273，含 bump 迴圈 ~1255-1260）
sourceRow／srcDrains 判定、bump 迴圈、slots 變換序本身零 DOM 依賴，是本輪組合空間最大的邏輯，卻只能靠人工 trace＋CDP 代表路徑把關。
**Fix:** 抽純函式（如 `planSegmentMove(slots, segments, movedId, target) → { targetRow, nextSlots, bumpIds }`）落 row-slots.ts＋單元測試（組合矩陣：pending×耗盡三向、real×耗盡、同列 guard、多中間 pending）；main.ts 只消費。

## 🟢 Minority／Note（不阻擋，擇要）

- **R2+R3（×2）**：四個 drop handler 對 `is-segment-dragging`／`dragClassRafId` 清理單點依賴 dragend——「drop 發但 dragend 未發」的歷史邊際案會卡死放寬態；建議抽 `endDragCleanup()` 共用（冪等）。
- **R2**：`lastRenderedSlots = rowSlots` 別名快照僅靠「變異點皆回傳新陣列」隱形前提維繫——改 `[...rowSlots]` 一行把承諾變事實。enable 0→1 將真實列插 slot 0，既有暫存列全體編號 +1（契約沉默、邏輯無誤，驗收時過目 UX）。
- **R3**：`clearDropGap` 不 null 掉 `dropGapEl`（跨手勢池化重用為隱性契約，補註解或歸零擇一）；gap 已定位時 `insertBefore(gap, gap)` 無害冗餘；pointer-events 修法與 dragstart guard 互動已驗正確（代價僅 not-allowed 游標，已在註解揭露）。
- **R4**：`.icon-button[disabled]` 的 `cursor: not-allowed` 因 pointer-events:none 成死宣告（建議移除）；pending 空列非 region 地標（標題導覽可達、rotor 不列——模板註解已載明取捨）；renderPendingRowContainers 無函式層焦點保全（現行無觸發路徑，日後加控件需補）；createRowGroupContainer 初始標題用 real-index（同步流程內隨即被 refreshRowNumbering 覆寫，使用者不可見；建議留空消除唯一直用點）。
- **R1**：computeRowSelectOptionOps「翻 kind＋裁尾／append」複合順序未有測試釘死（分支正交、結構上不會錯）；row-slots 防禦路徑（越界 no-op、同 kind no-op、空陣列補 real）無測試；`slotIndexOfRealRow` 越界 past-the-end 語意靠 reconcile 安全網兜底（announce 前已收斂，正確）。
- **R5**：reconcileRealSlots 靜默安全網可能把「數量對位置錯」收斂成不轉紅（建議 dev warn）；`seg.row` 直當 render-index 依賴「config 恆正規化」隱性耦合（補註解）。
- **R1（C 類觀察）**：有中間空列時，重啟用段的 clamp 落點顯示編號可能與凍結 row 值直覺不符（與契約一致、非回歸；使用者若回報「跑錯列」此為根因，backlog）。

## Untested paths（R5 彙整＋R2/R3 補充）
- `commitSegmentMove` 全分支組合（bump×consume×convert；中間 pending 上下皆有真實列；多中間 pending 擇一）——I-3 修復時以純函式測試收攏
- `setSegmentEnabled` slots 維護（耗盡 removeSlotAt、0→1 插 slot 0）；`performRowDeletion` displayRow＋slot 移除；`renderPendingRowContainers` 插入演算法；`refreshRowNumbering`；播報顯示編號映射——browser-only（協調者 CDP S1–S9 已驗代表路徑）
- select 制移入 pending 且來源耗盡（與拖曳共用 commitSegmentMove，change 分支未被拖曳情境涵蓋）
- 拖曳 DnD 接線族（rAF class toggling、gap 跨容器重建）——建議沉澱 CDP 腳本為可重跑整合案（scratchpad 已有 cdp-slots.mjs S1–S9 可收編）

## 五面向皆確認正確的關鍵項（信心背書摘錄）
T5.14 slots 算術組合矩陣全數成立（R2 逐條 trace：srcSlot 先算、bump 排除 moved／停用段、S4 抵銷必被 slotsEqual 捕捉——consume 與 convert 作用於必然不同的兩個位置）；slot 代數互逆與「翻 kind 不移位」不變量（R1，105 純函式測試全綠複跑）；rAF 競態全譜無 class 殘留窗（R3）；三層 stopPropagation 拓撲無重複處理（R3）；插入位置演算法四類佈局正確＋顯示編號稽核全過＋id/aria 鏈完好（R4）；PLAN Rev 11 逐句落地、I-2 golden 單一來源屬實、gates 複跑全綠（R5）。
