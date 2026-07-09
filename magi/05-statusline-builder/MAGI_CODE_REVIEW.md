# 🧠 MAGI Code Review — statusline-builder（DEV，uncommitted sprint 05）

**Diff scope:** 整個 sprint 05 change set（tools/statusline-builder/ ~3,490 LOC
＋13 測試＋UI＋9 黃金＋scripts＋11 檔 tracked 編輯）
> Panel：5 鏡頭 Claude subagent（CR1 契約/DRIFT／CR2 架構+三後端／
> CR3 UI+a11y／CR4 測試/驗證／CR5 安全+供應鏈+deltas）。原始報告
> `.cr1~5-report.md`。

## Dashboard

```
┌──────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES（4 AWN＋1 RC；皆小型局部修） │
├──────────────────────────────────────────────────────┤
│  Mode: supermajority   Threshold: 3.34               │
│  OK weight: 5 / 5      Degraded: no                  │
├──────────────────────────────────────────────────────┤
│  ✅CR1  ✅CR2  ✅CR3  ✅CR4  ✅CR5                    │
├──────────────────────────────────────────────────────┤
│  🔴 Critical: 0    🟡 Important: 4                   │
│  🟢 Note: 10       Drift: DETECTED（A2 / B9 / C8）   │
└──────────────────────────────────────────────────────┘
```

## Verdict
**REQUEST-CHANGES**——**無 Critical、無架構返工**，成熟度高（三後端 join/
null 三態/格式化/閾值/箭頭/exit-0 絕大多數逐段核對真同構；a11y 契約四檔
逐條落地；escaping 注入面堵死；供應鏈/五份 delta 忠實）。但有 **2 個 A 類
契約違反**（皆真、皆小修）＋**4 個 Important**——其中兩個是真 bug（持久化
PUA 致頁面崩潰、emit-ps1 byte 分岔靜默違反 sprint 核心「byte-exact 三後端
一致」不變量）。皆為 1–5 行局部修＋補測，非重新設計。建議修這 4 項後
commit（下方逐項給修法）。

## 🟡 Important（採納，4）

1. **[CR5，A 類] PUA 防線落錯層 → 持久化 config 致 init 崩潰**
   Where: `validate.ts:62-68`（不含 PUA）、`config.ts:160`（sanitizeSegment
   用 validateCustomText 清洗 prefix）、`resolve.ts:253-274`（toAriaLabel 擲
   TypeError）、`main.ts:896`（init→createPreview，**不在 try/catch 內**）
   契約 §6＋WORKS T2.2 裁定要 PUA 落「UI＋validate.ts」，實際只在
   resolve.ts＋main.ts live 路徑。一份 localStorage 帶 PUA 前綴（手改/舊版/
   他分頁）通過清洗 → init render → toAriaLabel 擲例外 → 整頁不可用；且違反
   「重整不丟/絕不整份拒收」。
   **修**：PUA 併入 `validateCustomText`（新 reason `pua`）——config.ts＋
   main.ts 自動同時受惠；補 property/roundtrip 測試鎖「PUA 前綴不達 resolve」。
2. **[CR2，A 類] emit-ps1 plain＋閾值＋bare head＋數值 多一個 `ESC[0m` → byte 分岔**
   Where: `emit-ps1.ts:419-432`（尤 428）vs oracle `resolve.ts:175-178`＋bash
   `emit-bash.ts:274-278`
   head 空（icon:false 無 prefix）時 oracle＋bash 出單 run 單 reset、ps1 多一
   reset（`\x1b[0m\x1b[0m…`）。零視覺實害但靜默違反 SP-5「oracle 語意＝
   byte-exact」不變量。測不到因無情境同時 plain＋閾值＋bare head＋數值。
   **修**：head 空時別補第二 reset（把 L428 `$s+="$e[0m"` 收進 `head!==''`
   分支）＋補一格 plain/bare-head/數值 三後端 byte-exact e2e 鎖回歸。
3. **[CR4] emit-bash 缺對稱「全段」真執行案 → 6 stdin 段零 bash 執行覆蓋**
   Where: `emit-bash.test.ts:224-331` vs `emit-ps1.test.ts:355-371`
   （fullBehaviorCases）
   project-dir/output-style/effort/vim-mode/agent-name/**worktree**（唯一手寫
   jq fallback `.workspace.git_worktree // .worktree.name`，最易錯）不在任何
   bash 黃金/byte-exact 組合，jqPath 正確性只靠人審黃金＋oracle（走 tsPath）。
   同 emit-ps1 shell-out bug 類覆蓋盲區。D1 多樣性已保證可觀測、補測無障礙。
   **修**：加對稱 full-config 真執行案（21 非 shell-out 段 ×{full,windows-cjk,
   early-null}）比對 toAnsi(resolve())；至少含 worktree 兩 fallback 路徑。
4. **[CR3＋CR1＋CR4＋CR5，4 鏡頭一致] `[hidden]` 根治（跨 4 工具）**
   Where: `src/style.css`（reset 無 `[hidden]`）、`main.ts:146-156`（setHidden
   workaround）
   author `display:flex` 蓋過 UA `[hidden]{display:none}`（origin 優先）。本工具
   setHidden（hidden 屬性＋inline display）補得住但脆（#separator-custom-field
   pre-JS 閃現、threshold panel 初始態僥倖正確）。**CR3 跨工具追查**：其餘三
   工具的 `.button-like` 按鈕 `.hidden` 切換**其實沒隱藏**（inline-block 蓋過），
   memory-warning continue/reselect 疑真實可見洩漏（三工具人工 gate 未跑故未
   目視捕捉）。
   **修**：`src/style.css` reset 補 `[hidden]{display:none!important}`（標準
   reset 做法、僅對持有 hidden 屬性者作用、跨工具安全）；本工具 setHidden 可
   退化為只切 hidden 屬性；落地後跑各工具冒煙。**4 鏡頭一致主張本 sprint 落地。**

## 🟢 Note（採納，10）
- [CR5] settings 路徑輸入未走驗證/無 shell 逸出（quoteIfNeeded 不逸出 `"`/`;`/`&`）——單使用者自傷面、低危；建議至少擋控制字元。
- [CR5] 複製路徑 .ps1 無 BOM（僅下載 Blob 帶）——貼存無 BOM 致 CJK/glyph 毀損；建議複製亦前置 BOM 或 README 明示。
- [CR5＋CR4，2票] 便攜 jq（1MB win exe）**建議不入 repo**——CI 由 ubuntu 系統 jq 承擔、win leg 可選、缺 exe 優雅 skip；入庫即永存 git 歷史。commit 期裁定。
- [CR1] `npm run golden:update` 未在 package.json 登記，5+ 處引用如既存——補別名或改註解為 `node scripts/…`。
- [CR1] settings 無簽入 `.json` 黃金（PLAN glob 含 .json）——roundtrip 測已替代，可補或註記。
- [CR1＋CR4，2票] ps1 黃金 config 雙源＋硬編碼 threshold 字面——抽入共用 .ts（如 bash 單源）。
- [CR2＋CR4，2票] clock ps1 `Get-Date` 分支零真執行＋恆存活無守衛（vs bash `[ -n ]`）——補 smoke/守衛對齊。
- [CR4] verify-dist 字型路 A inline 斷言對 subset 成長於 (4096B,100KB) 脆弱——放寬為「CSS data URI 或 dist/assets/*.woff2 <100KB」雙可。
- [CR3] containsPua 的 PUA_RE 以字面不可見字元寫入源碼——與 T1.4「raw R 改 \uXXXX」裁定相衝、易被誤刪致 a11y enforcement 靜默失效；改 `\u{E000}-\u{F8FF}`。
- [CR3] truecolor color input 命名死 span（段身分僅靠 legend）＋移位鈕邊界靜默 no-op；[CR1] INSTRUCTIONS §4「25 描述子」應 24。

## Untested paths
- `main.ts`（UI 狀態機）、`render-preview.ts` DOM 面——browser-only 零 node 測，歸 T4.4 SP-3 使用者 gate（延後）
- emit-bash 6 個 stdin 段（見 Important 3）
- ps1 clock Get-Date 分支
- pwsh 7 全後端（本機 19 skip，交 CI windows leg）
- CI 實際綠（本機無法跑 GHA，首次 push 確認）

## ⚠️ 根本限制（非缺陷、已認、SP-0 對帳前）
**三後端 byte-exact 一致 ≠ 對真實 Claude Code stdin 正確**（C3）：全部斷言證
三方互相同構，三方卻消費同一份轉述 schema 派生的 mock；schema 若錯三方會
一致地錯而測試仍綠。緩解＝tri-path 單源＋D1 多樣性＋黃金可重生＋SP-0 對帳
七步（延後，待使用者本機）。這是測試可信度的最大保留，WORKS 已認。
