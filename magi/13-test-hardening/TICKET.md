# Ticket — 09 測試網加固批（＋08 CI gate 同族合帳）
> Type: test  •  Scale: minor  •  Created: 2026-07-19

## Context

sprint 09 review 留下的測試網缺口批，加上 sprint 08 DRIFT 同族的
「CI 跨後端 gate 靜默跳過」條目合帳，一次收乾。全部為測試層改動，
production 程式僅在盲點修復確有必要時微動（預期零動）。sprint 12
已部分交付其中 clipboard spy 一項，本批對帳收斂殘餘。

## Approach（六工作面）

1. **i18n-meta-scan 屬性巡檢**（09 review Important #2）：現行掃描只
   驗元素文字面；補通用屬性巡檢——`aria-label`／`placeholder`／
   `title`／`alt` 含 CJK 但未掛 `data-i18n-attr` 即紅（全 DOM 巡檢，
   非單點）。紅綠雙證：fixture 注入違規屬性 → 紅。
   Files: `tools/statusline-builder/i18n-meta-scan.dom.test.ts`。

2. **`stripNonRuntime` 窄盲點修復**：字串字面量內含 `//` 會被誤剝、
   與程式同行的 `throw`（`if (x) throw new Error('中文')`）漏剝——
   修 strip 邏輯並補兩盲點回歸案（先寫紅案再修）。
   Files: 同上（`stripNonRuntime` :54 一帶）。

3. **CI 跨後端 gate meta 守門**（08 DRIFT 同族合帳）：跨後端
   byte-exact 等價案以 `BASH.ok && PS1.ok` 為門，在 CI 拓撲（ubuntu
   無綁定 jq？windows 無 bundled jq）恆假 → 全靜默跳過且 meta 斷言
   查不到。比照 pipeline.integration 的 skipIf-meta 慣例補守門：各
   leg 環境自述明列 gate 真值表＋「windows leg 上 PS1 案不得靜默
   跳過」之 meta 不變量；實作前先實測兩 leg 現況真值表再定斷言
   （不得寫成恆真）。
   Files: `fixtures.test.ts`／`pipeline.integration.test.ts`（meta 案
   區）＋必要時 `emit-bash.test.ts`。

4. **clipboard spy 對帳收斂**（sprint 12 已交付大宗）：已有三通道無
   BOM＋ps1 全文全等＋reject 分支；殘餘＝bash／settings 兩鈕**內容
   全等**斷言（payload === 對應產出全文）。補齊即結案。
   Files: `tools/statusline-builder/output-dialog.dom.test.ts`。

5. **真 DnD × 非 inherit 覆寫值 e2e 組合**：既有 CDP e2e（`npm run
   test:e2e`，本機限定不進 CI）補一組合案——真拖曳移列 × 段帶非
   inherit 覆寫值（色／variant），斷言拖後覆寫值存活＋產出腳本一致。
   Files: e2e 套件（實作時定位既有 CDP 案落點比照擴充）。

6. **i18n-dom flake 根因**（sprint 12 遞延）：sprint 12 已對單案 20s
   timeout 緩解；本批處理根因——量測該檔 boot 熱點後擇一：boot 減重
   （共用 boot／減少重複 import 解析）或檔級 `testTimeout` 體制化＋
   WORKS 記載量測數據。不得只再加大 timeout 了事（須附量測）。
   Files: `tools/statusline-builder/i18n-dom.dom.test.ts`。

## Verification

- `npm test` 全綠＋`npm run typecheck` 三鏈綠。
- 工作面 1／2：紅綠雙證（違規 fixture／盲點案先紅、修後綠）。
- 工作面 3：兩 leg gate 真值表落 WORKS；meta 斷言在本機 win32 全綠，
  且推 DEV 後 CI 雙 leg 綠為終驗。
- 工作面 4：三鈕內容全等斷言齊備。
- 工作面 5：`npm run test:e2e` 本機綠（含新組合案）。
- 工作面 6：量測數據落 WORKS；全套四輪連跑該檔零 flake。
- production 程式零行為改動（若盲點修復需動 main.ts 掃描目標本體，
  須在 WORKS 記載理由）。
