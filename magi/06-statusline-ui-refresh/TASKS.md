# Tasks — Statusline Builder UI Refresh（06a：字型移除＋箭頭條件化＋全站主題＋Footer＋License）

> Source: PLAN.md（Rev 3）   •   Sprint: magi/06-statusline-ui-refresh/
> 範圍：僅 **06a**。06b（多列＋雙欄＋排序）、06c（目錄擴充）屆時各開
> `magi/07-*`／`magi/08-*`，契約引用 PLAN 對應章節。
> Review 狀態：Round 1＋Round 2 MAGI review 完成，發現全數裁定入 Rev 3。

## Milestone 1: S1 spike — emoji 真機渲染矩陣（06a 前置 gate）
**Goal:** 用實測釘死 emoji 在目標終端的編碼與寬度行為，消除 06a 最大不確定性。
**Acceptance:** 矩陣記錄存於 `magi/06-statusline-ui-refresh/sp1/`；ps1 編碼策略有明確裁決；emoji 表變更（若有）經使用者核可。

- [x] T1.1 — 手寫 spike 腳本（5–6 個候選 emoji 的 `.sh`＋`.ps1`，各出「有 BOM／無 BOM」變體），於 {PS 5.1+conhost, PS 5.1+Windows Terminal, pwsh 7+WT, bash+VS Code 終端} 實測並記錄：亂碼與否、⌨️(VS16) 寬度、🌳🌱🌿 小字級辨識度、雙寬對齊。結論寫 `sp1/REPORT.md`。（手動實測任務；無自動測試）
- [x] T1.2 — 依 T1.1 結論裁決並記回 PLAN：(a) ps1 emitter 的 icon 編碼策略（依賴 BOM vs `[char]::ConvertFromUtf32()` 碼位跳脫、原始碼純 ASCII）；(b) emoji 表是否需調整——**若需調整，先回報使用者核可**（PLAN 治理句），核可後更新 PLAN 對照表。

## Milestone 2: 引擎面 — emoji 化＋powerline 箭頭條件化（CONFIG_VERSION 2）
**Goal:** 產出腳本與 resolve 管線完全去 Nerd Font 依賴：圖示 emoji、箭頭 opt-in。
**Acceptance:** `npm test` 全綠（含遷移／gating／aria 斷言新測試）；golden diff 僅 glyph＋箭頭兩變因、逐行可審；未裝 Nerd Font 的終端跑 powerline 預設配置產出腳本零豆腐字。

- [x] 🔀 [A] T2.1 — `config.ts`：`BuilderConfig.powerlineArrow: boolean`（預設 false）＋`CONFIG_VERSION` bump 2＋`migrateConfig` v1→v2（`mode==='powerline'`→`powerlineArrow:true`；`'plain'`／缺 `mode`→false；其他版本維持重置）。測試：三種遷移 case＋損壞存檔＋冪等清洗。
- [x] 🔀 [B] T2.2 — `segments.ts`：25 段 `icon.glyph` PUA→emoji（已核可對照表＋T1.2 結論），`ariaText` 不變；`segments.test.ts` 目錄級斷言（`icon.glyph` 非空 ⇒ `icon.ariaText` 非空）；`resolve.test.ts` 補「emoji 前綴放行、`PUA_RE` 行為未變」負向測試（對照 PLAN D1——**不得**動 `PUA_RE`／`validate.ts` 拒收集）。
- [x] T2.3 — `resolve.ts`＋`emit-bash.ts`＋`emit-ps1.ts`：D1 gating 條件表落地——`powerlineArrow=false` ⇒ 無段間箭頭、無 cap（`lastArrowCap` 無效）、每段 value 後補右側一空格；`true` ⇒ 完整 v1 語意（箭頭＋cap＋無 padding）。ps1 icon 依 T1.2 編碼策略。單元測試覆蓋 false/true × lastArrowCap 四組合。（依賴 T2.1、T2.2）
- [x] T2.5（追加 2026-07-11，使用者核可）— UI：「Powerline 箭頭」checkbox（預設未勾＋「需字型支援」警語；false 時停用 `last-arrow-cap` 控件；D1「全段預設色＋powerline＋無箭頭」無色塊邊界提示）——補 PLAN D1 gating 表 UI 欄與 06b 前提，T5.3 對帳發現之拆解縫隙
- [x] T2.4 — `__golden__/*` 全量重生＋逐行審 diff（僅 glyph 替換與箭頭翻轉兩變因）；`pipeline.integration.test.ts` 同步；真機驗證：未裝 Nerd Font 終端（Windows Terminal＋VS Code）跑 powerline 預設產出 `.sh`／`.ps1`，零豆腐。（依賴 T2.3）

## Milestone 3: 字型資產拆除＋預覽退化＋建置管線
**Goal:** repo 內不再有任何 Nerd Font 資產與其建置工序；預覽以系統字族＋CSS 三角形忠實模擬。
**Acceptance:** `npm run build && npm run verify:dist` 通過；`dist/` 與 `package.json` 全域 grep 無 `nerd`／`woff2`／`subset-font`／`fontkit`。

- [x] 🔀 [A] T3.1 — 刪除 `tools/statusline-builder/fonts/`（含 LICENSE-nerd-fonts.md／README.md）、`preview-font.css`、`scripts/subset-statusline-font.mjs`；`npm uninstall subset-font fontkit`（淨刪兩個 devDependency）。測試：build 後 grep 斷言。
- [x] 🔀 [B] T3.2 — `index.html`：移除 `nerd-font-banner` 區塊與 header 第二段敘述；`main.ts` 拆除 banner 接線（aria-describedby 切換邏輯）；`render-preview.ts` 拆字型 import／`PREVIEW_FONT_FAMILY_NAME`，預覽退 `ui-monospace`；powerline 箭頭預覽視覺改 CSS `clip-path` 三角形（`style.css`＋render-preview，aria 由既有 ariaText 承載）。測試：render-preview 單元測試更新。
- [x] T3.3 — `scripts/verify-dist.mjs` 兩處修訂（同檔集中一個 task）：(1) 字型 guard **:124-165 分段刪除**——刪 :124-130 註解、:135-144 CSS inline 斷言、:149-165 來源 woff2 斷言含 else fail，**保留** `assetsDir` 存在性與 CSS chunk 存在性斷言；檔頭 :20-26 route-A 說明修訂。(2) :76-80 入口頁 `<script` 硬斷言改**白名單比對**（僅允許固定主題 inline script，其他 `<script>` 仍 fail）——服務 M4，先落地。測試：本地 `npm run build && npm run verify:dist` 綠（M4 前以暫時無 script 的入口頁驗證白名單不誤殺）。

## Milestone 4: 全站深／淺主題
**Goal:** 五頁（入口＋四工具）統一三態主題：系統跟隨＋手動切換＋記憶＋不閃白。
**Acceptance:** PLAN §Verification 06a-3 手動清單全過：深色 OS 手選淺色**必須生效**、重整不閃白、localStorage 記憶、原生控件跟色、頁面間導航主題一致。

- [x] T4.1 — `src/style.css` token 化：色彩抽 custom properties；深色調色盤**單一來源**（`--dark-*` 定義一次，`@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]) }` 與 `:root[data-theme="dark"]` 兩情境只做 `--bg: var(--dark-bg)` 式引用）；`color-scheme: light`／`dark` 對應設定；盤點四工具頁自有 `style.css` 硬編碼色遷移 token（statusline-builder 預覽終端框底色**除外**——模擬終端、與站台主題無關）。
- [x] T4.2 — `src/theme.ts` 新增（讀寫 `eztools-theme`、toggle 取反、`aria-pressed` 同步）；五頁 `<head>` 加 PLAN D4 釘死的 inline script；五頁 header 加 toggle 鈕（入口頁監聽併入 inline script，維持零框架 JS）；工具頁 main.ts 於任何渲染前 import theme。測試：theme.ts 單元測試（優先次序：localStorage＞系統＞淺色）。（依賴 T4.1；T3.3 白名單已就位）
- [x] T4.3 — 手動驗證回歸：執行 PLAN §Verification 06a-3 全清單（含 {入口→工具→入口→另一工具} 導航一致性）並修正發現的問題。（手動任務）

## Milestone 5: Footer＋License＋living docs 落地
**Goal:** 五頁統一 footer 與授權註記；Spec deltas 的 06a 相關部分寫回四份 living docs。
**Acceptance:** 五頁 footer 連結正確可點；README 四處修訂完成；living docs 與 06a 實際 diff 對帳一致（供 `/magi:commit` Level 1 驗證）。

- [x] 🔀 [A] T5.1 — 五頁 footer 統一 markup（PLAN 06a-2 定案文：隱私句＋`© 2026 alan60910 · GitHub · MIT License` 連結）；video-converter 頁 footer 另補 ffmpeg.wasm core（GPL-2.0-or-later）引擎行；`tools/_probe/` 範本同步 footer＋主題 inline script＋toggle（新工具自帶）。
- [x] 🔀 [B] T5.2 — `README.md` 四處：刪「第三方元件」Nerd Font 段、`本專案自身之授權：<license name>（待定）` 佔位填 MIT、保留 ffmpeg GPL 段、補 howar31/claude-statusline 配色來源一筆（僅取用配色構想、未複製程式碼）。
- [x] T5.3 — living docs 落地（**僅 06a 相關 delta**；多列／30 段等留給 06b/06c 各自交付時）：root `SPEC.md`（Components statusline 條目的字型／箭頭／CONFIG_VERSION 2 部分＋新增 `src/theme.ts` 條目＋Conventions 四處＋Architecture overview 確切措辭＋Status）；`magi/TECHSTACK.md`（statusline-builder 條目、inject-tool-list 條目、Deployment devDep 註記）；`magi/PRD.md`（Goals 補主題一條＋statusline 敘述的通用 glyph 部分）。

---

**依賴鏈**：M1 → M2（T2.2/T2.3 需 S1 結論）→ M3（T3.2 的預覽箭頭依 M2 gating 語意）；M4→M5 與 M2/M3 大致獨立，但 T3.3(2) 是 T4.2 的前置。
**Lane 平行**：T2.1‖T2.2、T3.1‖T3.2、T5.1‖T5.2（各觸碰不相交檔案集）。
