# Tasks — 09 測試網加固批（sprint 13）

> Source: TICKET.md   •   Sprint: magi/13-test-hardening/

## Milestone 1: jsdom 測試網三 lane 平行
**Goal:** 屬性巡檢＋strip 盲點＋clipboard 對帳＋flake 根因四件落地（lane A 承兩件同檔任務）。
**Acceptance:** 各 lane 目標檔全綠；巡檢與盲點案紅綠雙證留 log；flake 量測數據落 WORKS＋該檔四輪連跑零紅。

- [x] 🔀 [A] T1.1 — i18n-meta-scan 屬性巡檢：`aria-label`／`placeholder`
  ／`title`／`alt` 含 CJK 但未掛 `data-i18n-attr` 之元素全 DOM 巡檢即紅
  （比照既有「文案來源單一化」案形；`<head>` metadata 豁免區沿既有
  慣例）。紅綠雙證：暫插違規 fixture → 紅 → 移除 → 綠，log 留 WORKS。
  Files: `tools/statusline-builder/i18n-meta-scan.dom.test.ts`。
- [x] 🔀 [A] T1.2 — `stripNonRuntime` 盲點修復（同檔接續 T1.1）：
  (a) 字串字面量內含 `//` 被誤剝、(b) 同行 `throw`（如
  `if (x) throw new Error('中文')`）漏剝——**先寫兩個紅回歸案**再修
  strip 邏輯；修後既有掃描案零回歸。
- [x] 🔀 [B] T1.3 — clipboard spy 對帳收斂：補 `copy-bash`／
  `copy-settings` payload **內容全等**斷言（=== 對應產出全文；ps1 案
  sprint 12 已有），結案 09 遺留。
  Files: `tools/statusline-builder/output-dialog.dom.test.ts`。
- [x] 🔀 [C] T1.4 — i18n-dom flake 根因：量測該檔 boot 熱點（各 it 逐
  案耗時＋boot() 分段計時，數據落 WORKS）→ 依數據擇一治本：boot 減重
  （共用初始化／減少重複解析）或檔級 `testTimeout` 體制化（附理由）。
  **不得只加大單案 timeout 了事**；sprint 12 的單案 20s 緩解可視治本
  結果收斂或保留（記載決定）。驗證：全套連跑 4 輪該檔零紅。
  Files: `tools/statusline-builder/i18n-dom.dom.test.ts`。

## Milestone 2: CI 跨後端 gate meta 守門（08 同族合帳）
**Goal:** `BASH.ok && PS1.ok` 類 gate 的靜默跳過拓撲被 meta 斷言鎖死。
**Acceptance:** 兩 leg gate 真值表（本機實測＋workflow 定義推導）落
WORKS；meta 斷言本機 win32 全綠；**push 後 CI 雙 leg 綠＝終驗（列入
commit 交棒條件，本 milestone 不含 push）**。

- [x] T2.1 — gate 真值表盤點（read-only）：逐檔列出
  `fixtures.test.ts`／`pipeline.integration.test.ts`／`emit-bash.test.ts`
  所有 skipIf gate 與其在三環境（本機 win32／CI ubuntu／CI windows）
  的真值（本機親測＋讀 `.github/workflows/test.yml` 與各檔 detect 邏輯
  推導 CI 側）；標記「恆假全靜默」的案清單。產出真值表落 WORKS。
- [x] T2.2 — meta 守門實作：依 T2.1 真值表，比照 pipeline.integration
  既有 skipIf-meta 慣例補斷言——每 leg 的環境自述印 gate 真值表；
  「該 leg 依拓撲**必須跑**的組合若被跳過即紅」（如 windows leg 之
  PS1 案、ubuntu leg 之 bash 案）；跨後端等價案在兩 leg 皆恆跳過者，
  明文標記為「僅本機雙後端環境可跑」而非無聲消失。**斷言不得寫成
  恆真**（T2.1 真值表為準繩）。

## Milestone 3: 真 DnD × 覆寫值 e2e 組合
**Goal:** CDP e2e 補「真拖曳移列 × 段帶非 inherit 覆寫值」組合案。
**Acceptance:** `npm run test:e2e` 本機全綠（含新案）；新案斷言拖後
覆寫值存活＋三後端產出一致。

- [x] T3.1 — e2e 組合案：於 `scripts/e2e-statusline.mjs` 比照既有 CDP
  案形補一案——選一段設非 inherit 覆寫（色＋variant 至少一項）→ 真
  DnD 拖曳移至另一列 → 斷言 (a) 覆寫值於 UI 與 config 存活、(b) 產出
  腳本含該覆寫（與拖曳前僅列位差異）。本機限定（Edge/Chromium），
  不進 CI——照 CLAUDE.md 既有慣例。

## Milestone 4: 收口 gate
**Goal:** 全量迴歸＋TICKET Verification 對帳。
**Acceptance:** 對帳表落 WORKS。

- [x] T4.1 — 收口：`npm test` 全綠 ×2 輪（flake 驗證一併看）＋
  `npm run typecheck`＋`npm run test:e2e` 本機綠；TICKET Verification
  七條逐項對帳落 WORKS；production 程式零行為改動檢核
  （`git diff --stat` 應僅測試檔＋e2e 腳本）。
