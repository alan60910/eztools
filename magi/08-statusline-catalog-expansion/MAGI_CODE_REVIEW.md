# 🧠 MAGI Code Review — DEV（多方位審議：依角度開票）

**Diff scope:** working tree vs HEAD（44 tracked ＋ 20 untracked；生產碼 +2436／測試 +2656／golden +63）
**審議模式:** 7 個互斥角度各派一名 reviewer（非模型湊票；票數依「角度背書 ＋ 協調者對抗性複驗」計）

## Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES                                      │
├──────────────────────────────────────────────────────────────┤
│  模式: 依角度開票（7 角度）   複驗: 協調者親驗每個 C/I 項     │
│  角度全數回報成功: 7/7        Degraded: 否                    │
├──────────────────────────────────────────────────────────────┤
│  L1 契約 ✅AWN   L2 三後端 ✅AWN   L3 正確性 ✅AWN            │
│  L4 測試 ❌RC    L5 安全   ✅AWN   L6 UI/a11y ✅AWN           │
│  L7 衛生 ❌RC                                                  │
├──────────────────────────────────────────────────────────────┤
│  🔴 Critical: 1    🟡 Important: 5    🟢 Note/BACKLOG: 16     │
└──────────────────────────────────────────────────────────────┘
AWN=APPROVE-WITH-NITS  RC=REQUEST-CHANGES
```

## Verdict
**REQUEST-CHANGES** — 程式邏輯本身健全（5 個角度 APPROVE-WITH-NITS，L2 以 280+ 案真執行差分證明三後端在可達輸入域 byte-exact，L3 證明 config 清洗擋住手改存檔攻擊，L5 證明注入面全封）。**卡點全在兩個橫切面**：commit 這一刻的倉庫衛生（一顆不可逆的 1MB 二進位）與測試在他人環境的真實性（byte-exact 綁死當前分支）。無一項需要重寫邏輯；六個卡點修法都小，但 Critical 那項一旦 commit 不可逆，必須先擋。

---

## 🔴 Critical（採納，協調者親驗）

### C1 — 1MB jq Windows 二進位即將入庫（面板已裁定不入）
**角度:** L7（倉庫衛生）＋ L4 從測試耦合獨立指到 **Where:** `magi/05-statusline-builder/sp5/tools/jq-windows-amd64.exe`
**親驗:** `ls` → 1,026,560 bytes、PE32+；`git check-ignore` → **未被 gitignore**（任何 `git add -A`／`git add magi/` 都會簽入）。`05/WORKS.md:364`＋`05/DRIFT.md:33` 白紙黑字「面板建議便攜 jq **不入 repo**」。測試對它是 `existsSync` 軟閘（不存在只 skip 不 fail），故排除它**不會**弄壞任何 gate。
**失效情境:** 一旦簽入，1MB 平台專屬二進位永久留在 packfile，移除需 rewrite history（不可逆）。
**修:** commit 明確排除此檔；`.gitignore` 補 `magi/**/tools/*.exe`（或全域 `*.exe`）。

---

## 🟡 Important（採納，協調者親驗）

### I1 — 兩支 `.xreview-prompt.md` 暫存檔會被掃入
**角度:** L7 **Where:** `magi/06-statusline-ui-refresh/.xreview-prompt.md`（35KB）、`magi/08-statusline-catalog-expansion/.xreview-prompt.md`（3.8KB）
**親驗:** `git ls-files | grep xreview` → **歷來 0 個被追蹤**（慣例即不簽入）；兩檔皆未被 gitignore。06 那支尤其突兀——屬**上一個** sprint 的資料夾卻在本次才冒出，會讓歷史誤導。
**修:** commit 排除；`.gitignore` 補 `**/.xreview-prompt.md`。

### I2 — README「auto 配色未出貨」本 sprint 起變假話
**角度:** L7 **Where:** `README.md:73-76`
**親驗:** README 寫「模型／effort 自動配色屬**後續 sprint（06c）規劃**，尚未出貨（**目前程式碼中無 `{kind:'auto'}`**）」。但 06c 就是本 sprint，`{kind:'auto'}` 已實作（`main.ts:595`、`resolve.ts:351`、`segments.ts` autoColor 掛載）。`git diff README.md` **為空**——T5.5 只同步了 CLAUDE/SPEC/PRD/TECHSTACK 四份，README 不在宣告範圍故被漏掉。
**失效情境:** 未來貢獻者讀 README 以為功能沒做，去重造或誤報缺失 bug。
**修:** 更新該段為「06c 已交付」，至少刪掉「目前程式碼中無 `{kind:'auto'}`」這句已被推翻的斷言。

### I3 — `fixtures.test.ts` byte-exact 綁死當前分支＝DEV（換分支／CI detached 即紅）
**角度:** L4 **Where:** `fixtures.test.ts:269,279`（`runBash`/`runPs1` 不傳 cwd）、`:311`（`maskClock` 只遮 `time:`）
**親驗:** 兩個 runner 都不傳 cwd → `spawnSync` 在 repo 根跑真 `git branch --show-current`；fixture row0 含 `git-branch` shell-out 段，oracle 卻用 mock `FULL.shell['git-branch']='DEV'`（`mock-data.ts:173`）。`maskClock` 只遮 `time: HH:MM`，docstring（:300-309）還自稱 clock 是「**唯一**非決定論欄位」——但 git-branch 同樣是。當前 `git branch --show-current`＝**DEV**，與 mock 恰好相同，故本機綠純屬巧合。
**失效情境:** 任何人在非 DEV 分支（clone 後預設 main）跑 `npm test`，或 CI detached-HEAD checkout（branch 空 → `nullPolicy:'hide'` 整段剔除），真執行輸出 ≠ oracle → byte-exact 失敗 → 轉紅。這是本 sprint **新增檔**引入的環境耦合。
**修:** 三選一——比照 `pipeline.integration.test.ts` 用受控 temp repo 並釘 cwd；或把 `git-branch` 一併納入 `maskClock` 遮罩；或 fixture 真執行版停用 `git-branch` 段（如 `emit-ps1.test.ts:1076` 對 shell-out 段既有作法）。

### I4 — `syncFgOverrideDisabled` 對「已停用（隱藏）的 bar 段」仍播報停用句
**角度:** L6（jsdom 實測重現）**Where:** `main.ts:998-1016`
**親驗:** 迴圈 `for (const seg of config.segments)`（:1001）**無 `enabled` 閘**，`shouldDisable = powerline && seg.bar === true`（:1004）。停用一段不會清 `seg.bar`，故「bar 開啟中但已停用」的段切 powerline 時仍被算進 `newlyDisabledLabels` → 對 SR 播報一個使用者已從清單移除的段。與同檔 `checkDuplicateResetHints` 已有的 `enabled` 閘不一致。
**修:** 迴圈內加 `seg.enabled`：`const shouldDisable = powerline && seg.enabled && seg.bar === true`。

### I5 — 重整後既有的「重複倒數」狀態，在首次「無關」編輯時才被誤當新出現而播報
**角度:** L6（jsdom 實測重現）**Where:** `main.ts:1917-1941`（`checkDuplicateResetHints`）＋ `init()` 不呼叫 `commitConfig`
**親驗:** `duplicateResetPairIds` 是模組層 Set，reload 後為空；`init()` 不判定（正確）。但之後**任何**一次 `commitConfig`（切某段顯示文字、改前綴、改色——與重複條件毫不相干）都會讓「rate-5h(percent-reset)＋reset-5h 同列」被視為「新出現」→ 播報整段長提示。
**失效情境:** 使用者只切了個 icon，卻聽到「重置時間重複」的長提示——播報與當下操作脫節。
**修:** 在 `init()` 末端（`refreshOutputs()` 之後）以靜默方式先跑一次判定 seed `duplicateResetPairIds`（不播報），使既有重複於載入時即記為「已知」，之後只有真正轉場才播報。

---

## 🟢 Note / BACKLOG（採納為觀察，不卡 commit）

**建議一併修（便宜且消除隱患）：**
- **N1 cache-hit `=== null` oracle/mirror 分岔**（L3＋L2）：`segments.ts:499` 用嚴格 `=== null`，但 jq(:512)/ps1(:520) 鏡像用 `== null`／`$null -eq` 把「缺席 `current_usage`」也當 null 回 `(n/a)`；TS oracle 卻 fall through 解構 `undefined` → `TypeError` 崩預覽。目前 `CurrentUsage` 型別必填 + 固定 mock 擋著故不可達，但 SP-0 自陳真 stdin 會缺此 key。**一字修**：`=== null` → `== null`，同時消除一個三後端分岔。

**文件對帳（低風險，可隨手修）：**
- **N6** `--passWithNoTests`（L7＋L1）：`CLAUDE.md:14`、`TECHSTACK.md:60` 寫 `vitest run --passWithNoTests`，`package.json` 實為 `vitest run`（該旗標從未存在）。T5.5 動了 TECHSTACK 該段卻沒修這句。
- **N7** file:line 引用漂移 × 3（L7）：`main.ts:986`、`emit-ps1.ts:850-851` 引用的行號已指向無關程式碼。建議改符號引用。
- **N8** 「25 段」計數矛盾（L7）：`segments.ts:23`（同檔頭與 :52「25→30」自相矛盾）、`index.html:242`（舊分佈 10/4/8/3，新為 12/5/10/3）。
- **N9** 「暫 stub」註解過期（L7）：`segments.ts:66/685/910` 稱 shell emitter「暫 stub」，但 T4.3/T4.4 已落地。

**純 BACKLOG（多為不可達／既有取捨／技術債）：**
- **N2**（L2）非整數 `STATUSLINE_NOW_EPOCH`（bash `tonumber?` 收 float／ps1 `TryParse` 只收整數）與非整數 `resets_at`（ps1 `[long]` 四捨五入／jq truncate）→ 後端分岔，真資料恆整數故不可達。
- **N3**（L5）bar 百分比路徑缺 `type=="number"` 閘（非 bar 路徑有）；字串型主值三後端三向分歧，恆 number|null 故不可達。
- **N4**（L5）bash 取值 jq 未抑 stderr，畸形 stdin 噴多行 parse error（既有架構、exit 仍 0）。
- **N5**（L5）`MOTW_HINT`/`CHMOD_HINT`/`GPO` 提示常數有測試卻未接進 UI（既有 S5 缺口）。
- **N10**（L7）倒數階梯邏輯 3 後端 × 2 視窗手抄 6+ 份（`jqResetSuffix/Countdown` 四聯體＋ps1＋TS）；改格式要同步 6 處，漏一即破 byte-exact（現有 golden 網著）。建議抽 `jqResetLadder(...)` 參數化。
- **N11**（L1＋L7）`(n/a)`（百分比段）與 `--`（token 段）兩種無資料標記並存——使用者 2026-07-14 拍板，建議留背景註解。
- **N12**（L6）預覽用固定 mock `now`、產出腳本用真時鐘——倒數/重置段的固定預覽值誤導性高於靜態 mock 欄位。建議加常駐說明。
- **N13**（L6）`toAriaLabel` 機械 enforcement 只對 PUA 拋錯，不覆蓋 `█`(U+2588)/`░`(U+2591)；現靠人工紀律設 `ariaText:''`，漏一條 bar 組裝路徑即 SR 逐格朗讀方塊。
- **N14**（L4）跨後端 byte-exact 套件在 CI 兩條 leg 全靜默跳過（需 bash+ps1 同機共存；同機 oracle 體制下屬 sp6 既定取捨），且 meta 斷言查不到此「共存缺失」。建議補守衛或於 PLAN 的 CI gate 矩陣文件化「哪些語意靠 per-backend 傳遞驗、哪些僅本機跨後端驗」。
- **N15**（L4）golden 由同一 emitter 重生，`golden:update` 後把關力受限（快照層；語意由 real-exec oracle 案把關）——建議貢獻指南註明「golden 綠 ≠ 語意對」。
- **N16**（L4）e2e 5 案只涵蓋拖曳/多列，本 sprint 新能力零 e2e（性質上更適合單元＋real-exec，屬合理分工）。
- **N17**（L6）powerline 關 bar 靜默恢復 fgOverride、無對稱播報（與停用不對稱；程式碼註解已言明刻意）。
- **N18**（L6）`announceGlobal` 先於 `commitConfig`（其尾端亦可能播報）的組句順序脆弱（目前安全靠「兩事碰巧不相干」）。
- **N19**（L6）`handleModeChange` 焦點落點 `.segment-lists` 無可及名稱、與長 live 訊息競態。
- **N20**（L7）`dragOrigin` write-only 死狀態（已在 `BACKLOG.md:28`）。

---

## Untested paths（CI 上無有效斷言覆蓋）
- `git-branch`/`git-dirty` shell-out 段的**執行期輸出**：pipeline 等價案 AND-gated 兩 leg 全跳、per-backend real-exec 顯式濾除 git、fixtures 條件耦合會轉紅（見 I3）——三處覆蓋皆失效。
- **bash-vs-ps1 跨後端 byte-exact**（含本 sprint M6 bar×null、percent-reset 倒數後綴、D1 gating、T4.6 auto×bar 整合）：只在開發者本機跑，CI 全 skip（N14）。
- `syncFgOverrideDisabled` 對 **disabled** bar 段（I4）、`checkDuplicateResetHints` 的 **reload＋同列既有重複**（I5）路徑無測試。

---

## 角度覆蓋備忘
| 角度 | 焦點 | Verdict | 主要產出 |
|---|---|---|---|
| L1 契約漂移 | PLAN/TASKS/M6 逐條對帳 | AWN | 零 A 類程式違約；C6 契約文字誤植（code 對） |
| L2 三後端同構 | 280+ 案真執行差分 harness | AWN | 可達域全 byte-exact；2 個不可達非整數分岔 |
| L3 正確性/邊界 | 手改存檔攻擊、falsy 陷阱 | AWN | 清洗全擋；cache-hit `===null`（N1） |
| L4 測試強度 | 假綠獵殺 | **RC** | I3 綁 DEV、N14 CI 跨後端全跳 |
| L5 安全/注入 | 敵意 payload 矩陣 | AWN | 注入面全封、exit-0 守住、ps1 零非 ASCII |
| L6 UI/a11y | jsdom 狀態機實測 | AWN | I4/I5 兩個播報 bug |
| L7 衛生/文件 | size sweep、文件對帳 | **RC** | C1 二進位、I1 xreview、I2 README |

複驗差分 harness 留在 `scratchpad/diff-harness.mjs`（L2 產，可重跑）。
