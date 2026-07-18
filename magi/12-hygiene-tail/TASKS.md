# Tasks — 06 血緣衛生尾批

> Source: TICKET.md   •   Sprint: magi/12-hygiene-tail/

## Milestone 1: 程式面清理（雙 lane 平行）
**Goal:** BOM 通道與 $BgT 死資料兩件獨立程式修正落地。
**Acceptance:** `npm test` 全綠；ps1 copy payload 首字元斷言過；黃金檔重生 diff 僅 $BgT 相關行且 ps1 執行輸出 vs oracle byte-exact 不變。

- [x] 🔀 [A] T1.1 — Copy ps1 BOM 通道：`tools/statusline-builder/main.ts`
  copy handler 對 **ps1 通道**前置 U+FEFF（bash／其他通道不動），與下載
  Blob 的 BOM 行為對齊；clipboard spy 單元測試斷言 ps1 payload 首字元
  `﻿`、其他通道無 BOM。若實作中發現剪貼簿 BOM 相容性反例，回退
  UI 警語方案並記 WORKS（偏離須留證據）。
- [x] 🔀 [B] T1.2 — emit-ps1 `$BgT` 死資料清理：宣告（emit-ps1.ts:1121
  單列、:1163 多列）與各段累加改為同時看 `mode==='powerline' &&
  powerlineArrow`（`joinPowerline` 讀取面 :897-906 不動）；單列 `$BgT`
  與多列 `$BgT<k>` 路徑一致。`npm run golden:update` 重生受影響黃金檔
  ——diff 僅限 powerline＋noarrow 案的 $BgT 宣告／累加行；
  pipeline.integration ps1 執行 gate（vs emit-ansi oracle）byte-exact
  維持全綠；如有結構斷言引用 $BgT 一併跟進。

## Milestone 2: 引用與註解衛生
**Goal:** 失效引用歸零（動 main.ts，故排在 lane A 之後）。
**Acceptance:** `git grep` 驗證各失效引用歸零；typecheck 三鏈＋既有測試全綠。

- [x] T2.1 — 失效引用清理：`segment-defaults.ts:45` 指已刪
  VARIANT_LABELS 的註解改述；`main.ts:426`「既有」語意過時註解更新；
  `main.ts:14-15`＋`index.html:46` 對從未簽入的 `.t3X-report.md` 引用
  改寫或移除（不簽入該 dotfile）。純註解／文案變更，production 行為
  零改動。

## Milestone 3: 盤點與裁決件（_probe＋untracked）
**Goal:** 調查產出裁決選項 → 使用者拍板 → 依裁決執行。
**Acceptance:** 裁決後 dist 內容斷言符合定案；`npm run build`＋
`node scripts/verify-dist.mjs` 綠；untracked／ignore 狀態符合裁決。

- [x] T3.1 — 盤點（read-only，零改動）：(a) vite build 對 `tools/_probe/`
  的實際處理（是否進 dist、掃描機制、`verify-dist-checks.mjs` 是否
  觸及）；(b) `forailook/` 內容清單；(c) magi/05 遺留 untracked 清單
  （`git status`＋`--ignored` 盤點）。產出三案裁決選項摘要。
  **⛔ HALT：回報使用者裁決（_probe 姿態／forailook 刪或 ignore／
  untracked 處置）後才續 T3.2。**
- [x] T3.2 — 依裁決執行：`tools/_probe/style.css` stub 補件（三件套
  完整，無論姿態裁決為何）＋姿態實作（若排除出 dist：vite 設定＋
  `scripts/verify-dist-checks.mjs` 白名單同步——依 CLAUDE.md 規約
  verify-dist 邏輯改動須同步其測試）＋forailook/ 與 magi/05 untracked
  依裁決處置＋build 後 dist 內容斷言。

## Milestone 4: 收口 gate
**Goal:** 全量迴歸與 TICKET Verification 逐條對帳。
**Acceptance:** 四鏈全綠＋對帳表落 WORKS.md。

- [x] T4.1 — 收口：`npm test` 全綠＋`npm run typecheck`（三鏈）＋
  `npm run build`＋`node scripts/verify-dist.mjs` 綠；黃金檔最終 diff
  人眼審核（僅 $BgT 行）；TICKET.md Verification 五條逐項對帳記入
  WORKS.md。
