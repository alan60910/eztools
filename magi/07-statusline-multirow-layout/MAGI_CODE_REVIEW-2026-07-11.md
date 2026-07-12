# 🧠 MAGI Code Review — DEV @ f95f27d（working tree，未 commit）

**Diff scope:** unstaged＋untracked（intent-to-add）vs HEAD，限 `tools/` 與 `scripts/`——38 檔、+5085/−448（diff 7,345 行）
**審議模式:** 面向分區 ×5（使用者指定「依照角度多方位審議且不限3票」；本機無 gemini/codex，五位 claude reviewer 分面向承審）

## Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES（輕量——4 項小修後即可 commit） │
├──────────────────────────────────────────────────────────┤
│  Mode: 面向分區 ×5（等權重）   ok_weight: 5 / 5          │
│  Degraded: 否（五票全數成功回票）                        │
├──────────────────────────────────────────────────────────┤
│  ✅ R1 引擎node層   ✅ R2 shell後端   ✅ R3 UI邏輯      │
│  ✅ R4 結構樣式a11y ✅ R5 測試與漂移                     │
│  票型：4× APPROVE-WITH-NITS ＋ 1× REQUEST-CHANGES（R3） │
├──────────────────────────────────────────────────────────┤
│  🔴 Critical: 0     🟡 Important（採納）: 5              │
│  🟢 Minority／Note: 14                                   │
└──────────────────────────────────────────────────────────┘
```

## Verdict
**REQUEST-CHANGES**——零 Critical、零架構性問題；但含 1 個真實行為 bug（焦點）＋2 個契約明文的交付閘門（文件）＋2 個低成本應補缺口。全部修完即可 `/magi:commit`。

## 🟡 Important（採納）

### I-1. 上/下移至列邊界時焦點落 body（唯一行為 bug）
**票源：** R3（面向獨家；協調者查證機制成立）
**Where:** `main.ts` `moveSegment`（~1166）＋`refreshMoveButtonStates`（~1185）
段被移成列首/列末時，`refreshMoveButtonStates` 把「正持有焦點的同方向鈕」設 `disabled` → 立即 blur 落 body；隨後對 disabled 鈕 `.focus()` 為 no-op。任何雙段列一步觸發。違反 PLAN「移動後顯式 re-focus 觸發鈕」與「焦點不跳失」。
**Fix:** 落邊界時改聚焦反方向鈕（邊界處必 enabled）；用已測的 `computeRowSwap` 回傳 `position`/`rowSize` 判斷，免查 DOM。

### I-2. 4 個 multirow golden 無常駐比對迴圈（靜默漂移缺口）
**票源：** R2＋R5（跨票佐證 ×2）
**Where:** `__golden__/multirow-*.{sh,ps1}`；`emit-bash.test.ts`／`emit-ps1.test.ts` 黃金迴圈未讀此 4 檔
純人審產物：emit 回歸不會轉紅（pipeline 真執行案用另一組 inline config，且帶 `skipIf`——無 bash+jq／powershell 的 leg 多列 byte 結構零保護）。R2 已實測 4 檔目前 byte-current（非現行 bug）。
**Fix:** 兩測試檔各加一個純 emit `it.each` 比對（約 5 行/檔；config 宜與 harness 收攏單一來源——見 Note）。

### I-3. PLAN「Spec deltas」承諾的 root SPEC.md＋magi/PRD.md 更新未落地（交付閘門）
**票源：** R5（客觀可驗：兩檔不在 diff；SPEC.md 仍寫「留待 06b 交付時再更新」）
**Fix:** commit 前補齊三處：SPEC.md Components（多列/三欄/列群組地標——依 Rev 4-8 終態撰寫）、SPEC.md Status（06b 交付敘述）、PRD.md Goals（多列無上限）。

### I-4. BACKLOG 兩行 C 項未依 Goals #5 承諾劃銷（交付閘門）
**票源：** R5
**Where:** `magi/BACKLOG.md:53-56`（程式面 T4.2 已完成）；⚠ 第三行（:57-58）明確不在本 sprint，勿誤劃。
**Fix:** commit 時劃銷該兩行並註記本 sprint。

### I-5. 中欄「已選擇」缺地標／標題／skip 目標（可導覽性不對稱）
**票源：** R4（面向獨家；SPEC「大量項目 skip 機制」不變量精神支持）
左欄有四類 section 地標、右欄有 region，中欄是裸 div——空列時 SR 落點零方位；鍵盤使用者勾選後要進中欄須穿越至多約 24 個 catalog 停點。非硬性 WCAG 失敗（PLAN D3-R4 留白），但修法極小。
**Fix:** `.builder-columns__selected` 加 `role="region"`＋`aria-label="已選擇（依列分組）"`＋skip-nav 增「跳至已選擇」一條。

## 🟢 Minority／Note（不阻擋，擇要）

- **R1**：`toAnsi([])` 零列退化無文件性測試（不變量唯一維繫點在 resolve，可補一條邊界測試或硬化）；`resolve.test.ts:635` emoji 措辭殘留、斷言退化為 ASCII 重言（可改 astral 字元恢復原覆蓋意圖）。
- **R2**：多列 × `powerlineArrow=false` 無真執行案（低風險，可補一列）；bash `groupByRow(resolved)` vs ps1 `groupSegmentsByRow(config)` 簽章漂移；ps1 `$n` 跨列共用 vs bash `n_N` 隔離（皆正確）。
- **R3**：`dragOrigin` 已成只寫不讀死狀態（可移除）；相同播報文案 SR 不重讀（尾端加零寬變異可解）；整列刪除確認開啟中被外部 relayout 打斷的焦點殘角。
- **R4**：`style.css:984/986` 註解仍描述 role="img" 與已刪的 inline 字族鎖；`index.html:218`「24 列」、`:295`舊播報格式註解過時；`segment-row__icon` 內部命名未隨 Rev 7 改；建議補 jsdom 測試覆蓋 `renderRuns` DOM 產出；aside 單軸 overflow 造成邊緣 focus-ring 可能裁 2px。
- **R5**：手動驗收依賴面大——**T5.6／T5.7（SR 驗收 blocker）尚未執行，通過前不可宣告驗收完成**；multirow config 在兩 harness 各自字面定義（divergence 風險，與 I-2 一併收攏）；emit-bash 多列結構斷言偏 white-box（可接受）；暫存列計數制與停用段拖排 no-op 已列 T5.6 裁定項。

## Untested paths（R5 彙整＋R3/R4 補充）
- `main.ts` browser-only 區（+1007 行）：拖放插入制＋gap 生命週期（**中高**）、列群組容器生命週期（**中高**）、transfer-list/隱藏池（中）、整列刪除確認流（中）、select 枚舉 DOM 施作（中）、commitConfig 分組閘門（中）——純函式接縫已測，DOM 施作依專案慣例（無 jsdom）靠 T5.6/T5.7 承擔
- `renderRuns` spec→DOM 套用（R4 建議 jsdom 低成本可補）
- multirow golden byte 比對（＝I-2）
- T5.6 §3 真機 smoke＋T5.7 SR 抽測——**未執行**；Firefox 腳已裁決註記略過

## 五面向皆確認正確的關鍵項（信心背書摘錄）
單列 golden byte-identity（R2 逐行 diff＋實測 4 新檔 byte-current）；四步展開 bash/ps1 同構與行尾契約（R2）；row 清洗/normalizeRows/25 段前綴逐字對齊（R1，實跑 202 測試）；物件身分一致性無 stale 參照（R3 逐條追）；template 多實例 id 唯一性/Label-in-Name/live region/斷點 grid/分包隔離/reduced-motion（R4）；PLAN §Verification 1 斷言逐條到位（R5）。
