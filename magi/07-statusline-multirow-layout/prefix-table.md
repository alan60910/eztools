# 段圖示 emoji → 英文前綴 對照表（T1.5.1）

> **狀態：✅ 已核可（2026-07-11 使用者照案核可，25 段全收、含
> diff:/dirty: 與 ctx 群組現案）。本表為 T1.5.2 實作的權威對照來源。**

## 背景

2026-07-11 使用者真機實測回報：Claude Code statusline **完全不能接受
表情符號**，並裁決 25 段 `icon.glyph` 全數改為**英文短 token＋冒號**
前綴（風格錨點：`cwd:`、`git:`，同 S3 spike case1 使用者實測過的
呈現）。此裁決**推翻 06a「emoji 對照表 25 段全覆蓋」定案**。裁決全文
與影響面見 `sp3/REPORT.md` §4-B；本表為比照 06a emoji 對照表流程的
「先擬表、後核可、再動工」文件產出（TASKS.md Milestone 1.5／T1.5.1）。

段落來源：`tools/statusline-builder/segments.ts`
`SEGMENT_DESCRIPTOR_LIST`（25 段，行約 430–776），逐段 `icon.glyph` 與
`id` 一一對應如下。

## 選字通則

- 全部小寫、純 ASCII、以冒號 `:` 收尾（比照 `cwd:`／`git:` 風格錨點）。
- 儘量對齊既有 `id` 或 `label` 的語意根，讓前綴可望文生義。
- 同類段（context 三段、rate-limit 兩段、worktree 兩段、git 相關兩段）
  彼此前綴需可用視覺區分，即使不共享同一詞根。
- 長度以 3–6 個字元（不含冒號）為目標，貼近 `cwd:`／`git:`／`cost:`／
  `time:` 的長度量級，避免多段同列時前綴本身就先佔滿版面寬度。
- 25 個前綴需彼此唯一（見下方「唯一性檢查」）。

## 對照表

| 段 key | 現行 emoji | 建議前綴 | 選字理由 | 備註（衝突／易混淆檢查） |
|---|---|---|---|---|
| `model` | 🤖 | `model:` | 直取 `id`／`label`（模型），語意最直白，無需縮寫 | 無衝突 |
| `cwd` | 📁 | `cwd:` | 風格錨點原詞，沿用終端慣用縮寫（current working directory） | 與 `proj:` 同屬路徑類，語意不同（cwd＝當前目錄）需並列比對段值判讀 |
| `project-dir` | 📂 | `proj:` | 縮寫自 `project`，與 `cwd:` 區分「專案根目錄」vs「當前目錄」 | 與 `cwd:` 同為路徑類，兩段皆啟用時建議段序相鄰以利閱讀（不影響契約） |
| `output-style` | 🎨 | `style:` | 直取 `label`「輸出風格」尾字 | 無衝突 |
| `version` | 🔖 | `ver:` | 常見縮寫（version），比 `version:` 短 | 無衝突 |
| `cost` | 💰 | `cost:` | 風格錨點原詞，直取 `id` | 無衝突 |
| `duration` | ⌛ | `dur:` | 縮寫自 `duration`（工作時長） | 與 `time:`（clock）皆屬時間語意，但 `dur:` 為經過時長、`time:` 為即時鐘面，段值格式不同（如 `1h23m` vs `14:05`）足以區分 |
| `lines-changed` | 📝 | `diff:` | 段值為「行數增減」（如 `+120/-30`），`diff` 為業界對此類統計的通稱（近似 `git diff --stat`） | 與 `dirty:`（git-dirty）字首形近（di-），但完整字串不同、語意不同（diff＝行數增減統計，dirty＝有無未提交變更的 `*` 標記），予以保留並在此註記供 T1.5.2 覆核 |
| `context-size` | 🧠 | `ctx:` | 「上下文大小」為此群組（`ctx:`／`used:`／`left:`）中的絕對量值（token 數），取最短根詞 | 與 `used:`／`left:` 同屬 context 群組，三段常同時啟用、彼此並列即可建立語意；獨立使用時 `ctx:` 已足夠明確（下方兩段見各自備註） |
| `thinking` | 💭 | `think:` | 直取 `id` 縮寫 | 無衝突 |
| `context-used` | 📊 | `used:` | 段值為百分比（「上下文已用」），與 `ctx:`（絕對值）、`left:`（剩餘）並列時語意清楚 | 若僅單獨啟用 `context-used`（無 `ctx:`／`left:` 同列），`used:` 脫離群組獨立解讀時語意稍弱（僅知「已用 X%」缺「何物」主詞）；T1.5.2 若使用者仍希望脫離群組也自明，可考慮改 `ctxu:`，本提案先以短前綴＋群組並列假設送審 |
| `context-remaining` | 🔋 | `left:` | 段值為百分比（「上下文剩餘」），與 `used:` 互補、`left` 為常見「剩餘」慣用詞 | 同上「脫離群組獨立解讀」考量；亦與 `rate-5h`／`rate-7d` 的 `resetsAt` 剩餘時間語意不同（`left:` 僅用於 context 剩餘百分比，不會與限額重置時間混淆，因限額兩段自身不掛 `left` 前綴） |
| `rate-5h` | ⏳ | `5h:` | 直取限額窗口名稱（Claude 官方用語「5 小時限額」），比任何縮寫更明確 | 與 `7d:` 成對，數字開頭前綴（非字母）視覺上與其餘段落區分度高，不致混淆 |
| `rate-7d` | 📅 | `7d:` | 同上，直取「7 日限額」窗口名稱 | 與 `5h:` 成對，見上 |
| `session-name` | 💬 | `sess:` | 縮寫自 `session`（工作階段名稱） | 無衝突 |
| `effort` | ⚡ | `eff:` | 縮寫自 `effort`（推理強度，對應 API 欄位 `effort.level`） | 無衝突 |
| `vim-mode` | ⌨️ | `vim:` | 直取 `id` 詞根（Vim 模式，如 `NORMAL`／`INSERT`） | 無衝突 |
| `agent-name` | 🎭 | `agent:` | 直取 `id` 詞根（代理名稱） | 無衝突 |
| `pr` | 🔀 | `pr:` | 直取 `id`，GitHub 生態圈通用縮寫（Pull Request），段值本身已含 `#數字` | 無衝突；與 `repo:` 同屬 GitHub 類但字串完全不同 |
| `repo` | 📦 | `repo:` | 直取 `id`（儲存庫），段值為 `owner/name` | 無衝突 |
| `worktree` | 🌳 | `wt:` | 縮寫自 `worktree`（Git 工作樹名稱） | 與 `wtbr:` 成對（同詞根＋後綴），刻意用字首前綴＋延伸後綴的方式區分同組兩段 |
| `worktree-branch` | 🌱 | `wtbr:` | `wt` 詞根＋`br`（branch）後綴，明確標示「工作樹分支」而非工作樹本身 | 與 `wt:` 成對，見上；亦與 `git:`（git-branch，主 repo 分支）語意不同——`wtbr:` 專指 worktree 內分支 |
| `git-branch` | 🌿 | `git:` | 風格錨點原詞，取 `git-branch` 詞根首段（分支為 git 資訊中最常見主值） | 與 `git-dirty` 的 `dirty:`、`worktree-branch` 的 `wtbr:` 皆為 git 系但字串互斥；`git:` 專指主要分支名 |
| `git-dirty` | 🚧 | `dirty:` | 直取「未提交變更」語意慣用詞（dirty working tree），段值恆為 `*` 標記 | 與 `git:`（git-branch）同組但字串不同；與 `diff:`（lines-changed）字首形近，見該行備註 |
| `clock` | 🕐 | `time:` | 風格錨點原詞，段值為即時 `HH:mm` 鐘面 | 與 `dur:`（duration）皆屬時間類但語意不同，見該行備註 |

## 唯一性檢查

25 個建議前綴（不含冒號）：`model`、`cwd`、`proj`、`style`、`ver`、
`cost`、`dur`、`diff`、`ctx`、`think`、`used`、`left`、`5h`、`7d`、
`sess`、`eff`、`vim`、`agent`、`pr`、`repo`、`wt`、`wtbr`、`git`、
`dirty`、`time` —— **25 個字串彼此完全不同，無重複**。

易混淆但刻意保留（字首相近、完整字串不同，判斷理由已於對照表各列
「備註」欄列出）：
- `diff:`（lines-changed）vs `dirty:`（git-dirty）—— 字首皆為 `di`，
  完整字串與語意不同，予以保留；若使用者於核可階段認為仍需加大區隔，
  可請 T1.5.2 前改列候補（如 `dirty` → `unclean:`，或 `lines-changed`
  → `chg:`）。
- `ctx:`／`used:`／`left:`（context 三段）—— 依賴三段常同時啟用時的
  並列語境；若使用者偏好每段前綴皆自帶「ctx」根詞以求脫離語境也自明
  （如 `ctx:`／`ctxu:`／`ctxr:`），本提案亦可依裁決調整（詳見表格對應
  列備註）。
- `dur:`（duration）vs `time:`（clock）—— 皆屬時間語意但指涉不同（經過
  時長 vs 即時鐘面），段值格式差異大，判讀時不易誤認。

## 實作注意事項（供 T1.5.2 動工前提醒；本文件不落地）

- `icon.glyph` 欄位**型別不變**（仍為 `string`）；僅欄位值由 emoji
  字面改為 ASCII 前綴字串（如 `'cwd:'`），`icon.ariaText` **不動**
  （aria 播報語意維持中文段名，與前綴樣式無關，見 `render-preview.ts`
  逐列 aria 呼叫路徑）。
- `emit-ps1.ts` 的 `iconGlyphExpr`（逐 codepoint `[char]0xHEX` /
  `[char]::ConvertFromUtf32` 跳脫，見 `emit-ps1.ts:44-50, 118-131`）
  原為應對 emoji 多 codepoint／astral 平面設計；改為純 ASCII 前綴後
  每個 codepoint 皆 ≤ `0x7F`，理論上可直接以 ASCII 字面內嵌、**不再
  需要**逐 codepoint `[char]` 跳脫機制——是否簡化（或維持既有機制以
  降低改動面）留待 T1.5.2 依實作情境裁決，本文件僅先記錄此觀察。
- `emit-bash.ts` 對應的 icon 輸出路徑（若有類似跳脫機制）同步覆核。
- **golden 全量變動屬預期**：25 段圖示全面替換必然造成三後端
  （bash／ps1／emit-ansi oracle）與預覽的既有 golden bytes 全部改變，
  T1.5.2 驗收比照 TASKS.md M1.5 Acceptance——「golden 重生 diff 僅
  『圖示→前綴』一種變因」，逐檔審 diff 把關，非本文件範圍。
- 06a 既有 emoji 對照表（`magi/06-statusline-ui-refresh/` 相關文件）
  於此裁決後視為**歷史記錄**，不追溯修改；本表為新裁決之權威來源。

## 06c 新 5 段增列（sprint 08 T3.1，2026-07-12 使用者照案核可）

> 選字通則沿用上表；核可後 30 個前綴字串彼此唯一。

| 段 key | 前綴 | ariaText | 選字理由 | 備註（衝突／易混淆檢查） |
|---|---|---|---|---|
| `token-in` | `in:` | Tokens 輸入 | 與 `out:` 成對，段值自帶 token 數（k 縮寫） | 無碰撞 |
| `token-out` | `out:` | Tokens 輸出 | 同上成對 | 無碰撞 |
| `cache-hit` | `cache:` | Cache 命中率 | 望文生義（`hit:` 太泛） | 無碰撞 |
| `reset-5h` | `r5h:` | 5 小時限額重置倒數 | r＝reset，與 `5h:`（rate-5h 百分比）成對區分 | 與 `5h:` 同族刻意成對（比照 `wt:`↔`wtbr:` 先例）；值形迥異（`63%` vs `↺2h (14:30)`）不致誤認 |
| `reset-7d` | `r7d:` | 7 日限額重置倒數 | 同上 | 與 `7d:` 同族成對，見上 |
