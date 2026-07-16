# Drift — 08 statusline 目錄擴充（06c）＋M6 真機回饋

> Source: 多方位審議（7 角度 magi:reviewer ＋ 協調者親驗）  •  Generated: 2026-07-15  •  Status: DETECTED
> **M7 收尾（2026-07-15）：全部 A 類（5）＋衛生 B 項＋可修 C 項已修畢並標 [x]；殘留 [ ] 為進 BACKLOG 之項。Status 維持 DETECTED 因 C 類尚有殘留供 /magi:commit 收攏。**
> **/magi:commit 收攏（2026-07-17）：C 類殘留 12 條已升級 `magi/BACKLOG.md`；cache-hit 一條對帳為 M7-T7.5 已修（補標 [x]）；dragOrigin 一條已在 `BACKLOG.md` 不重複升級。**

## A. Contract violations（M7 全數已修）

- [x] **（M7-T7.1 已修）1MB jq Windows 二進位即將入庫，違反 05 面板「不入 repo」裁定** — files: `magi/05-statusline-builder/sp5/tools/jq-windows-amd64.exe`
  契約：`05/WORKS.md:364`＋`05/DRIFT.md:33` 明文「便攜 jq 面板建議不入 repo」。程式現況：檔案未被 gitignore（`git check-ignore` 回空），處於「一個 `git add -A` 就違約」狀態。測試對它是 `existsSync` 軟閘，排除不弄壞 CI。
  Proposed 更新：commit 明確排除此檔，並把「便攜 jq 不入庫」固化進 `.gitignore`（`magi/**/tools/*.exe`）。

- [x] **（M7-T7.2 已修）README auto 配色敘述與程式碼實態直接矛盾** — files: `README.md:73-76`
  契約 vs 程式：README 寫「06c 尚未出貨、目前程式碼中無 `{kind:'auto'}`」，但 06c 即本 sprint、`{kind:'auto'}` 已實作（`main.ts:595`／`resolve.ts:351`）。T5.5 的文件同步宣告範圍（SPEC/CLAUDE/PRD/TECHSTACK 四份）未含 README，故被漏。
  Proposed 更新：更新 README 該段為「06c 已交付」，刪除被推翻的斷言。

- [x] **（M7-T7.2 已修）`--passWithNoTests` 文件與 package.json 不符** — files: `CLAUDE.md:14`、`magi/TECHSTACK.md:60`
  契約 vs 程式：兩份文件寫 `npm test = vitest run --passWithNoTests`，`package.json` 實為 `vitest run`（該旗標從未存在）。T5.5 動了 TECHSTACK 該段卻未修這句。
  Proposed 更新：兩處刪 `--passWithNoTests` 與 package.json 對齊。

- [x] **（M7-T7.2＋T7.5 已修）程式內文件漂移三類**（註解即本 repo 主要契約載體，密度高故列 A）— files: `segments.ts:23,66,685,910`、`index.html:242`、`main.ts:986`、`emit-ps1.ts:850-851`
  (a)「25 段」計數與現役 30 段矛盾（`segments.ts:23` 同檔頭自相矛盾、`index.html:242` 舊分佈）；(b)「暫 stub」註解但 T4.3/T4.4 shell emitter 已落地；(c) file:line 互引漂移 × 3（指向無關程式碼）。
  Proposed 更新：計數統一 30、移除「暫 stub」字樣、file:line 改符號引用。

- [x] **（M7 已記錄對帳）C6 契約文字誤植（實作正確，僅文件需更正）** — files: `TASKS.md`（Milestone 6 C6）
  契約 vs 程式：C6 指示「`needsRefreshInterval` 補 percent-reset 條件」，暗示尚未涵蓋；實際 `hasResetsCountdown()`（`emit-settings.ts:94`）早於 T4.5 就以 `variant==='percent-reset'` 判定，契約 intent 已滿足、零生產碼變更。協調者已於 WORKS.md 2026-07-15 承認 brief 有誤。
  Proposed 更新：註記 TASKS.md C6，記錄「已涵蓋、無需新增條件」，防未來重複加冗餘條件。

## B. Below-the-contract decisions

- [x] **（M7-T7.1 已修）** `.xreview-prompt.md` × 2 暫存檔未被 gitignore——已固化 `.gitignore` `**/.xreview-prompt.md`，兩檔離開待提交集。
- [ ] `resetsAtSuffix` 自 segments.ts 遷入 resolve.ts（避 import 循環；契約沉默於函式歸屬）。
- [ ] effort auto 用 `-ceq`（精確）而非 model 的 `-clike`（前綴）——resolve.ts effort 本為精確 switch，正確的姊妹選擇。
- [ ] `Format-ResetsAt` 死 helper 移除（C3 後無人 useHelper；連帶 `plain-full.ps1` 的 InvariantCulture 白名單行消失）。
- [ ] 30 段完整案落為新 golden `full-30-plain` 而非升級 `plain-full`（避免撞壞兩個 25 段舊測試）。
- [ ] `jqResetSuffix*`（後綴、死值 `""`）與 `jqResetCountdown*`（整段、死值 `empty`）分家命名與死值語意——developer 檔頭已具體說明。
- [ ] reset 段前綴 `r5h:`/`r7d:` 與百分比段 `5h:`/`7d:` 刻意成對（`prefix-table.md` 06c 增列，比照 `wt:`↔`wtbr:` 先例）。
- [ ] 停用段保留 `seg.bar` 且 `syncFgOverrideDisabled` 不看 `enabled`——契約沉默處選擇，但**產生 a11y bug I4**（見 MAGI_CODE_REVIEW，建議 commit 前修）。
- [ ] 跨後端等價案以 `(BASH.ok && PS1.ok)` 共存條件 gate——合理，但在 CI 拓撲下恆假（N14）。

## C. Out-of-scope observations（→ 評估進 BACKLOG）

- [ ] `(n/a)`（百分比段）與 `--`（token 段）兩種無資料標記並存——使用者拍板，長期可能困惑；建議留背景註解或未來統一。
- [x] **（M7-T7.5 已修）**cache-hit `=== null` 對缺席 `current_usage` 崩潰（oracle/mirror 分岔，一字修 `== null`）——已修 `segments.ts` 並補 jq/ps1 鏡射回歸案。
- [ ] 非整數 `STATUSLINE_NOW_EPOCH`／`resets_at` 的三後端分岔（不可達，真資料恆整數）——可補固定案鎖為「一致」或「文件化 backend-defined」。
- [ ] bar 百分比路徑缺 `type=="number"` 閘（字串型主值三向分歧，不可達）。
- [ ] CI 跨後端 byte-exact 全靜默跳過 ＋ meta 斷言查不到共存缺失（N14）——補守衛或 PLAN CI gate 矩陣文件化。
- [ ] git shell-out 段執行期輸出在 CI 零有效真執行覆蓋（既有盲區，本 sprint fixtures 未補反引入耦合 I3）。
- [ ] 倒數階梯邏輯 3 後端 × 2 視窗手抄 6+ 份，建議抽 `jqResetLadder(...)`／ps1 同理參數化（技術債）。
- [ ] `toAriaLabel` 機械 enforcement 只覆蓋 PUA、不覆蓋 `█`/`░`（健壯性缺口）。
- [ ] 預覽固定 mock `now` vs 產出真時鐘，對倒數/重置段誤導性高——建議加常駐說明。
- [ ] `MOTW_HINT`/`CHMOD_HINT`/`GPO` 提示常數有測試卻未接進 UI（既有 S5 缺口）。
- [ ] bash 取值 jq 未抑 stderr，畸形 stdin 噴多行 parse error（既有架構）。
- [ ] `announceGlobal` 先於 `commitConfig` 的組句順序脆弱；`handleModeChange` 焦點落點 `.segment-lists` 無可及名稱；powerline 關 bar 無對稱恢復播報（三個 a11y 健壯性 note）。
- [ ] golden 由同一 emitter 重生、`golden:update` 後把關力受限（設計取捨，建議貢獻指南註明）；e2e 未覆蓋新輸出能力（合理分工）。
- [ ] `dragOrigin` write-only 死狀態（已在 `BACKLOG.md:28`）。
