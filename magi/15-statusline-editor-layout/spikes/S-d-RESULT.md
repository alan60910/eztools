# S-d-RESULT — e2e harness 逐案 viewport（MS0 前置 spike，T0.1／T0.2）

> Source: `scripts/e2e-statusline.mjs`
> Sprint: `magi/15-statusline-editor-layout/`　對照設計契約：`PLAN.md` §S-d
> 環境：Windows 11；Microsoft Edge（`C:\Program Files (x86)\Microsoft\Edge\
> Application\msedge.exe`）；CDP headless=new（`npm run test:e2e` 預設）。

## 改造摘要

改造前 `scripts/e2e-statusline.mjs` 雙處硬編 `1400×1000`、10 案共用：

- `launchBrowser(...)`（headed 分支）：`--window-size=1400,1000` 字面。
- `runCase(...)`：`Emulation.setDeviceMetricsOverride({ width: 1400, height:
  1000, deviceScaleFactor: 1, mobile: false })` 字面。

改造後：

1. 新增單一事實來源常數 `DEFAULT_VIEWPORT = { width: 1400, height: 1000 }`
   （置於「幾何輔助」段落之前）。
2. `runCase` 內新增單一決策點：`const viewport = testCase.viewport ??
   DEFAULT_VIEWPORT`，往下同時餵給：
   - `launchBrowser(...)` 新增 `viewport` 參數，headed 分支改用
     `` `--window-size=${viewport.width},${viewport.height}` ``（
     `--window-position` 不變）；
   - `Emulation.setDeviceMetricsOverride({ ...viewport, deviceScaleFactor: 1,
     mobile: false })`。
3. **既有 10 案不逐案添加 `viewport` 欄位**——`testCase.viewport` 為
   `undefined`，一律落回 `DEFAULT_VIEWPORT`，效果與改造前的硬編
   `1400×1000` 完全相同（＝「帶原值」跑一輪），把 diff 面積壓到最小。
4. 新增第 11 案 `viewport-probe-1280x800`（`viewport: { width: 1280,
   height: 800 }`），見下方「空殼案」節。

## 既有 10 案零迴歸證據

`npm run test:e2e`（headless=new 預設），全 11 案批次輸出（`=== SUMMARY
===` 起完整尾段，未截斷）：

```
=== SUMMARY ===
  PASS  same-row-swap                  5286ms  同列交換拖曳（基本盤）
  PASS  s1-cross-row-drain             4986ms  S1：跨列拖 drain（來源列保留為空占位列）
  PASS  s4-select-into-middle-pending   3521ms  S4：select 排空後再 select 指派進中間 pending
  PASS  s9-delete-pending-renumber     3652ms  S9：刪除 pending 後真實列編號重排
  PASS  s7-drag-drain-reload           5585ms  S7：drag drain 後 reload（pending 不入存檔、真實列緊湊重編）
  PASS  catalog-drag-into-row          4808ms  T6.1：目錄拖入指定列（真拖曳觸發 enable-into-target）
  PASS  output-dialog-esc-focus-return   3629ms  T6.1：產出 dialog 開→複製→Esc 關→焦點還原產出鈕
  PASS  color-variant-override-survives-drag   5067ms  T3.1：非 inherit 覆寫（色＋variant）× 真 DnD 跨列拖曳存活
  PASS  tutorial-band-does-not-block-drag   4695ms  T4.2：教學帶不擋拖曳（無條件回歸，教學帶保持可見）
  PASS  mode-switch-scroll-position-stable   3467ms  T4.2：mode 切換前後捲動位置不變（回歸 T3.1 焦點竊取）
  PASS  viewport-probe-1280x800        2593ms  S-d：1280×800 viewport 探針（座標系／elementFromPoint 常駐迴歸哨兵）

11/11 passed — total 54464ms
```

既有 10 案（`same-row-swap` … `mode-switch-scroll-position-stable`）全數
`PASS`，耗時分佈與 sprint 14 前次跑批（`E2E_HEADED` 無關）量級相符，無
逾時或座標偏移症狀——**零迴歸**。出口碼 0（`process.exitCode = passCount
=== results.length ? 0 : 1`，11 === 11）。

## 空殼案（`viewport-probe-1280x800`）三斷言結果

不做拖曳，僅驗 harness 座標系本身（`testCase.viewport: { width: 1280,
height: 800 }` 是否真的傳到 CDP metrics override，而非默默落回
`DEFAULT_VIEWPORT`）：

| 斷言 | 判準 | 結果 |
|---|---|---|
| (a) viewport 尺寸 | `window.innerWidth === 1280 && window.innerHeight === 800` | 通過（實測回傳 `{width:1280,height:800}`，與硬編預設 1400×1000 不同，證明逐案取值確實生效） |
| (b) 已知元素 rect 合理 | `#preview-section`（中欄 sticky 預覽框，內容有界）`getBoundingClientRect()`：`rect.width > 0` 且 `rect.right <= 1280` | 通過 |
| (c) `elementFromPoint` 命中 | 先 `scrollIntoView({block:'start', behavior:'instant'})`，取 rect 中心點 `(cx, cy)`，`document.elementFromPoint(cx, cy)` 命中 `#preview-section` 本身或其後代 | 通過 |

選用 `#preview-section`（而非 brief 另一個候選 `.segment-lists`）：
`.segment-lists` 為左／右欄目錄清單，段數多時整體高度可能遠超任何固定
viewport（見檔頭「幾何輔助」段落既有文件），其自身 rect 中心點未必落在
scrollIntoView 後的可視範圍內；`#preview-section` 是中欄 sticky 預覽框，
內容有界（h2＋控件＋40dvh 上限的終端框），更適合作為「座標系本身是否正確」
的探針目標，不與「多列版面可能很高」這個既知現象糾纏。

該案完整批次輸出（見上表）：`PASS (2593ms)`，三項斷言（若任一失敗，
`run()` 會回傳對應 `symptom` 訊息並使該案 FAIL）皆隱含通過於此 PASS 結果
中——本檔逐項列出斷言判準與各自對應的程式碼邏輯，供獨立覆核。

## 常駐決定

`viewport-probe-1280x800` **永久保留**於 `CASES`（非驗完即刪的一次性
案），作為「逐案 viewport」機制本身的常駐迴歸哨兵——sprint 15 後續里程碑
（MS2 G2 案、MS4 G4/G8 案）將引入 1280×800／390×844 等更多 viewport，若
`testCase.viewport` 傳遞鏈路（`runCase` → `launchBrowser`／CDP metrics
override）未來被意外破壞，本案會先於功能案發現。

## 單元測試零影響確認

`npm test`（vitest run）：本任務僅改動 `scripts/e2e-statusline.mjs`（plain
JS harness，不在 vitest 掃描範圍內），跑一輪確認零影響——1934 passed / 1
pre-existing flake（`catalog-sample-values.dom.test.ts` 全跑批下 5000ms
timeout，與本任務改動的檔案無關；該檔獨立重跑 `npx vitest run
tools/statusline-builder/catalog-sample-values.dom.test.ts` 9/9 全過，
確認為既有環境負載型 flake，非本次改動引入）。

## 結論

**產出＝harness 可逐案 viewport 且既有案零迴歸。**
