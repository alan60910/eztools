# Tasks — Statusline Builder 多列輸出＋雙欄版面＋排序語意（06b）

> Source: PLAN.md（Rev 2）   •   Sprint: magi/07-statusline-multirow-layout/
> 契約上游：`magi/06-statusline-ui-refresh/PLAN.md`（Rev 3）06b 章節。
> Review 狀態：plan review Round 1（面向分區 ×5）完成，13 Important 全數
> 回填 Rev 2；使用者裁決不再整輪再審。

## Milestone 1: S3 spike — Claude Code 多列渲染真機矩陣（06b 前置 gate）
**Goal:** 用實測釘死 Claude Code 對多列 statusline 的渲染行為，消除行尾契約的最後不確定性。
**Acceptance:** 矩陣記錄存於 `magi/07-statusline-multirow-layout/sp3/`；行尾契約（尾隨換行與否）有明確裁決並記回 PLAN；若需變更契約先回報使用者。

- [x] T1.1 — 手寫 spike 腳本（多列 `.sh`＋`.ps1` 樣本：12 列、列首空白、超寬列、2–3 列常規案例），真機接 Claude Code statusline（Windows Terminal＋VS Code 終端）實測並記錄：列首 trim 行為（約束 padding 契約）、無尾隨換行渲染等價性（約束行尾契約）、列數上限與截斷行為。結論寫 `sp3/REPORT.md`。（手動實測任務；無自動測試）
- [x] T1.2 — 依 T1.1 結論裁決行尾契約分支並記回 PLAN 引擎契約節：維持「無尾隨換行」或三處（bash／ps1／oracle）同步加單一 LF——只改參數不改結構；其他發現（列數上限等）如影響契約，先回報使用者再更新。

## Milestone 1.5: 段圖示 emoji→英文前綴（2026-07-11 使用者裁決插入，推翻 06a emoji 定案；詳 sp3/REPORT.md §4-B）
**Goal:** 25 段 `icon.glyph` 全部由 emoji 改為英文短 token＋冒號前綴（`cwd:`、`git:` 樣式）；三後端與預覽同步；golden 全量重生。
**Acceptance:** 對照表經使用者核可後才動工；`npm test` 全綠＋`npm run typecheck` 0；golden 重生 diff 僅「圖示→前綴」一種變因（進 M2 前基線乾淨）。

- [x] T1.5.1 — 擬 25 段「emoji→英文前綴」對照表（比照 06a emoji 對照表流程；含每段 token 選字理由與衝突檢查），存 `magi/07-statusline-multirow-layout/prefix-table.md`，交使用者核可。（文件任務，不動產品碼）
- [x] T1.5.2 — 依核可後對照表替換 `segments.ts` 25 段 `icon.glyph`＋三後端輸出與預覽／aria 必要適配＋golden 全量重生與逐檔審 diff（僅前綴變因）。（依賴 T1.5.1 使用者核可）

## Milestone 2: 多列引擎 node 層（config row＋簽章翻轉＋多列語意）
**Goal:** `resolve()` 全面改回傳 `StyledRun[][]`，row 資料形狀與清洗落地，node 層測試全綠。
**Acceptance:** `npm test` 全綠、`npm run typecheck` 0；本 milestone 結束時 golden bytes **不變**（多列 case 於 M3 才引入）；每個 task 結束時全綠（簽章翻轉原子化）。

- [x] T2.1 — `config.ts`：`SegmentConfig.row?: number` 選填欄＋清洗（非整數／負值／缺→0；clamp ≤ catalog 段數−1，以現役段數計）＋純函式 `normalizeRows`（僅啟用段、row 重寫 0..N−1、停用段凍結；供 main.ts commitConfig 於 M5 接線）。CONFIG_VERSION 維持 2。測試：清洗邊界（float／負值／缺欄／`row:999999999` clamp）、亂序輸入→渲染列序、停用段 row 凍結、冪等。
- [x] T2.2 — 簽章原子翻轉（保綠，行為不變）：`resolve()` 改回傳 `[runs]`（單列包裹，語意暫不變）；`emit-ansi.toAnsi(rows: StyledRun[][])`＝`rows.map(joinRow).join('\n')`＋檔頭不變量註解改 `[[]]`；`toAriaLabel` 簽章**不變**（`StyledRun[]→string`）、呼叫端逐列；`resolve.test.ts`／`emit-ansi.test.ts` 扁平形狀斷言機械改寫（`toAnsi([[…]])`）；`pipeline.integration.test.ts`、兩個 golden harness（`scripts/golden-statusline*.mjs`）、`render-preview.ts`＋`main.ts` 最小適配（逐列 a11y 重構留 M4）。驗證：全測試綠＋golden bytes 逐檔不變。（依賴 T2.1）
- [x] T2.3 — 多列語意落地：`resolve.ts` 依 `seg.row ?? 0` 分組、升冪壓縮＝渲染列序、空列剔除、零存活列回 `[[]]`＋「回傳長度恆 ≥1（永不 `[]`）」斷言、`lastArrowCap` 逐列（僅 `powerlineArrow===true`；false 時每段右 padding 語意不變）。測試：亂序 row（5,2,9）、中間列全滅壓縮、全滅 `[[]]`（toAnsi 單一 reset 不變量保留）、default config（無 row）與清洗後 config 列分佈一致、cap×gating×多列組合、多列 aria（逐列 toAriaLabel）。（依賴 T2.2）

## Milestone 3: 三後端執行期展開＋golden 重生
**Goal:** bash／ps1 產出腳本落地四步執行期展開，與 oracle byte-exact；golden 進入多列時代。
**Acceptance:** `npm test` 全綠含多列真執行 hex 場景；golden 重生 diff **僅多列 join 一種變因**、既有單列 case bytes 不變（逐檔審 diff，code review 把關項）。

- [x] 🔀 [A] T3.1 — `emit-bash.ts`：四步執行期展開（依 emit 期 row 分組之**逐列緩衝**→runtime 空列過濾（全 null 列不吐空行）→存活列 LF 串接（LF 數＝存活列−1，reset 在 LF 前）→零存活退單一 SGR reset）；列內箭頭／分隔符與逐列 cap 只作用於該列緩衝；維持 `printf '%s' "$out"`。單元測試：展開結構斷言＋no-CR。
- [x] 🔀 [B] T3.2 — `emit-ps1.ts`：同構四步展開（`$out` 內含 `` `n ``、維持 `[Console]::Out.Write($out)`，不用 `WriteLine`）；icon／分隔符 `[char]` 跳脫機制不變。單元測試：展開結構斷言＋no-CR 斷言沿用。
- [x] T3.3 — `pipeline.integration.test.ts` 多列 combo＋**多列真執行場景**：三列 config 其中一條**非末列**的段 runtime 全滅——emitBash／emitPs1 真跑 stdout 對 `toAnsi(resolve(...))` hex 比對（無空行、LF 數正確），含全列全滅退單一 reset 一案；兩個 golden harness 補多列代表 case；`npm run golden:update` 全量重生＋逐行審 diff（僅多列 join 變因；既有單列 case bytes 不變）。（依賴 T3.1、T3.2）

## Milestone 4: 預覽逐列 a11y＋C 項收整（僅依賴 M2）
**Goal:** 預覽框完成 img→group 雙層重構、逐列可導覽；兩項 06a DRIFT C 類收整落地。
**Acceptance:** `render-preview.test.ts` 全綠；外層 `role="group"`＋固定 aria-label、逐列 `role="img"`；三小件 C 項完成。

- [x] T4.1 — `render-preview.ts`＋`index.html`：外層 role 由 06a 現況 `role="img"` **改為** `role="group"`＋固定 `aria-label="狀態列預覽"`（index.html:322 靜態＋renderRuns 動態兩處同步）；內部每列一個 `role="img"` 子容器、`aria-label="第 N 列：〈該列 toAriaLabel 結果〉"`（N＝渲染列序，前綴由 render-preview 自加）；`[[]]` 時外層 group 保留、單一子容器承載 `EMPTY_PREVIEW_LABEL`；powerline 箭頭 CSS 三角形機制沿用。單元測試：逐列容器結構、aria-label 前綴、`[[]]` 兜底。
- [x] T4.2 — C 項收整三小件（Goals #5）：`style.css:784` 箭頭 fallback `var(--arrow-fg, transparent)` → `var(--arrow-fg, currentColor)`；`applyPreviewFontFamily` 死重移除（讓 style.css:736 字族棧生效）；`index.html:224`「24 段」註解改 25。測試：既有 render-preview 測試不回歸；箭頭 fallback 若有測試面則補斷言。（依賴 T4.1——同檔避免衝突）

## Milestone 5: UI 面（雙欄＋雙區清單＋排序）＋整合驗收
**Goal:** 雙欄版面、依渲染列分組的雙區清單、排序／列指派 UX 全數落地；PLAN Verification §2–§4 全過。
**Acceptance:** 手動清單全過（含瀏覽器矩陣）、真機 smoke（重用 sp3）通過、SR 抽測（**驗收 blocker**）通過。

- [x] T5.1 — S7 spike：`<option>` 原地更新的焦點／選取保存最小 repro（多個 `<select>`，一個持續增改 option、另一個聚焦操作），Chrome／Edge／Firefox 一輪；結論寫回 PLAN D2。（手動 spike；UI 任務前置）
- [x] T5.2 — 雙欄版面（D3）：`index.html` 加兩個 wrapper（DOM 順序不動）＋`#error-message` 顯式 `grid-column: 1 / -1`＋skip-nav 併左欄；`style.css` grid 兩欄（<1100px 退單欄）＋本頁 `main`（header／footer 同步）max-width 於 ≥1100px 放寬至 ~1360px＋右欄 `sticky; top:0; align-self:start; max-height:100dvh; overflow-y:auto`＋`role="region"`＋`tabindex="0"`＋`aria-label="預覽與產出"`＋預覽終端框 `overflow-x:auto`＋`tabindex="0"`。驗證：手動——斷點兩側、sticky 生效、雙欄下展開閾值編輯器 buckets 可用性、tab 序僅新增兩個停點。
- [x] T5.3 — 雙區清單重構：列群組容器生命週期（template／建立／銷毀／重編號／容器移除前 `<li>` 先搬離；每列群組 `<section aria-labelledby>`＋「第 N 列」標題——與現行四類區等價地標）；啟用段依渲染列分組、未啟用段維持四類區；啟停 checkbox 切換＝跨容器搬移既有 `<li>`（**節點重用＋insertBefore/appendChild，絕不銷毀重建**）；`main.ts` commitConfig 接線 `normalizeRows`（T2.1）＋**分組實際變動才**觸發 row 相關 UI 同步。驗證：手動——連續啟停 N 次焦點／checked 不受影響、逐列群組標題可跳達。（依賴 T5.2 落定的 DOM 結構）
- [x] T5.4 — 「顯示於第 N 列」select：枚舉使用中渲染列＋「新增一列」；選項刷新更新既有 `<option>`（依 S7 結論），不重建 select 節點；重啟用帶舊 row 值段之落點（保留值、超界 clamp 至末列、不自動新增列）。驗證：手動——從空白建 7 列流程、重啟用落點兩案（在範圍內回原列／超界 clamp）。（依賴 T5.3）【S7 裁決修訂 2026-07-11：「新增一列」移出 select、改每段獨立按鈕——select 僅枚舉使用中列，詳 PLAN D2】
- [x] T5.5 — 排序 UX：上／下移鈕移至 `.segment-row__enable-field` 尾端（`margin-left:auto`、僅啟用列顯示）；同列交換（`config.segments` 同 row 子序列索引運算＋節點重定位＋顯式 re-focus）；列首／末停用（`disabled` 維持可見）；播報「〈段名〉移至第 N 列第 M 位（共 K）」；拖曳限同列、跨列 drop 改 accept-then-revert-and-announce。驗證：手動——交換／停用態／播報文案。（依賴 T5.4）
## Milestone 5.5: 三欄滿版改版（2026-07-11 T5.6 驗收回饋，使用者三項裁決插入；詳 PLAN D3-R4）
**Goal:** 左目錄（灰化留位零跳動）／中已選擇（列群組）／右預覽產出的三欄滿版 transfer-list 改版；「新增一列」改中欄頂部單一按鈕＋UI 暫存空列。
**Acceptance:** 四項 gate 全綠；一路連續勾選左欄零重排；停用段控件列收隱藏池不銷毀；config 空列壓縮契約不動；T5.6／T5.7 於本 milestone 後執行。

- [x] T5.8 — 三欄滿版版面重構：DOM 調整為 目錄區／已選擇區／預覽產出區 三 wrapper；本頁滿版 override（~1800px 上限）；斷點 3→2→1（~1400／~1100px）；右欄沿用 sticky＋region＋兩捲動停點 a11y 契約；#error-message 跨欄與 skip-nav 歸屬沿用。
- [x] T5.9 — transfer-list 互動改造：左欄 25 段輕量常駐目錄（四類分組、勾選＝啟用＋原位灰化「已加入」、再點取消）；啟用段完整控件列住中欄列群組；停用收隱藏池（不銷毀、監聽器不重綁）；「新增一列」改中欄頂部單一按鈕＋UI 暫存空列（select 枚舉含暫存列；T5.4 每段按鈕移除）；排序／列指派在新結構整合重驗。（依賴 T5.8）

- [x] T5.10 — 跨列拖曳解禁（2026-07-11 使用者裁決，Rev 5；推翻 Non-Goal「不做拖曳跨列」）：跨列 drop＝實際移動（拖至他列段上＝插入其前並改 row；拖至列容器空白處含暫存空列＝落列尾）；陣列自原位移除＋插入目標位；播報沿用「移至第 N 列第 M 位（共 K）」；同列拖放維持交換語意；鍵盤路徑仍為 select。（依賴 T5.9）

- [x] T5.11 — 中欄「移除」鈕＋拖曳插入制與挪空間特效＋整列刪除（2026-07-11 使用者裁決，Rev 6）：每段控件列加移除鈕（與左欄取消同路徑、焦點策略明確＋播報）；同列拖放由交換改插入（與跨列一致，上/下移鈕維持交換）；dragover 插入點 placeholder gap＋過渡動畫（純 UI 態）；每列「刪除此列」鈕（全段停用回目錄；僅剩最後一真實列時 disabled 維持可見；按下須確認；暫存空列刪除鈕免確認）。（依賴 T5.10）

- [x] T5.12 — 「顯示圖示」→「顯示文字」措辭修正＋預設改開啟（2026-07-11 使用者裁決，Rev 7）：UI 標籤與相關說明文字更名；defaultSegmentConfig 的 icon 顯示預設翻轉為 true；既有存檔／golden 不受影響驗證（hash）。（依賴 T5.11）

- [x] T5.13 — 拖曳把手（2026-07-11 使用者裁決，Rev 8）：段列 enable-field 首位加 ⠿ grip 把手（aria-hidden 裝飾、拖曳仍屬滑鼠增強）；頂部條 user-select:none 消除選字干擾；除按鈕外整條頂部可穩定起拖；控件 guard 不變。（依賴 T5.12）

- [x] T5.14 — 列耗盡保留＋暫存列位置制（2026-07-12 使用者裁決，Rev 11）：跨列移動（拖曳＋select 同語意）把來源列搬空時，該列**原地保留為空列**（暫存列樣式、編號不變，不再被空列壓縮立即吃掉）；暫存列由計數制升級**位置制 slots**（空列可在中間；新純函式模組 row-slots.ts＋row-select.ts 枚舉改依 slots）；「第 N 列」一律顯示位置編號（列標題／刪除鈕／select 選項／播報同步）；指派段入中間空列＝於該位置插入真實列（其下真實列 row +1）；空列為純 UI 態（指派成真／免確認刪除／重整消失）；✕移除／取消勾選／整列刪除維持現行壓縮／刪除語意；連帶修正暫存列刪除鈕「計數制移除最高編號」怪癖（改刪所點的那列）。（依賴 T5.13）

- [x] T5.15 — 排序操作說明文字（2026-07-12 T5.6 驗收回饋）：中欄「已選擇」區補一段簡短操作說明——滑鼠拖曳（⠿ 把手、可跨列）、鍵盤 ↑/↓ 鈕同列相鄰交換、「顯示於第 N 列」select（閉合狀態按方向鍵即直接換列）跨列移動——減少資訊不對稱；純靜態說明文字、不進 tab 序、不動互動邏輯。
- [x] T5.6 — 整合手動驗證＋真機 smoke（**2026-07-12 完成**：原清單 A–F＋G 區複驗 11 項全過；`prefers-reduced-motion` 使用者裁決註記不測；B 區「重啟用落點」X 項經修復後於 G-1 翻綠）（**於 M5.5 完成後執行**，checklist 需增補三欄／transfer-list 項）：PLAN Verification §2 全清單（含瀏覽器矩陣 Chrome／Edge／Firefox 的 sticky＋100dvh；Safari best-effort 註記）＋§3 真機 smoke（**重用 `sp3/` 同一組設定**接真 Claude Code，逐列渲染、無多餘空列、列首 padding 未被 trim）。（手動任務）
- [x] T5.7 — ~~SR 抽測（06b 驗收 blocker）~~ **使用者明示豁免（2026-07-12「朗讀跳過 不需要該功能」，PLAN Rev 13）**：不執行 SR 實測；a11y 結構維持已實作現狀。原項目內容存查：NVDA——兩個捲動停點名稱朗讀、逐列預覽導覽、逐列群組標題跳轉、排序播報、`output-block__code` 方向鍵捲動落點。

---

**依賴鏈**：M1（S3 gate）→ M1.5（emoji→前綴，2026-07-11 插入；T1.5.1 核可 → T1.5.2）→ M2（T2.1→T2.2→T2.3 嚴格順序，簽章翻轉原子化）→ M3（T3.1‖T3.2 → T3.3）；M4 **僅依賴 M2**（與 M3 檔案不相交，可於 M3 前後任一時點執行）；M5 依賴 M2（config row）＋M4（預覽逐列，供 T5.6 驗收）＋M3（T5.6 smoke 需真腳本），T5.1 為 T5.4 前置、T5.2→T5.3→T5.4→T5.5 同檔序列。
**Lane 平行**：僅 T3.1‖T3.2（emit-bash.ts vs emit-ps1.ts，檔案不相交）。M5 各 task 共享 main.ts／index.html／style.css，一律序列。
**手動任務**：T1.1、T5.1、T5.6、T5.7（開發者可備妥腳本／清單，實測由使用者或協調者執行）。
