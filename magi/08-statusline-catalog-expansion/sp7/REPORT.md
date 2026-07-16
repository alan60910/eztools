# S7 spike 報告——`↺`／`█`／`░` 真機渲染前置 gate

任務：T2.1（`../TASKS.md` 第 22 行；`../PLAN.md` §2 S7、§Open questions）。
日期：2026-07-12
執行者：magi-developer（probe 腳本備妥＋本機自動化驗證）→ **使用者（真機
Claude Code 目視確認，本報告尚未完成的最後一步，見 §5）**

> **範圍提醒**：本 gate 沿 `magi/07-statusline-multirow-layout/sp3/`
> harness 慣例（`sp3/TESTING.md` 工序、`sp3/REPORT.md` 骨架＋回填模式）
> 辦理，唯本案只有 1 個 case（bar＋countdown）× 2 變體（plain／
> powerline）× 2 shell（bash／ps1），範圍遠小於 sp3 的 20 組合矩陣，故
> 不另立 TESTING.md，工序與結果併入本檔。

---

## 0. 背景／要驗證的契約點

`magi/06-statusline-ui-refresh` PLAN 傘狀計畫追加範圍 8–9（進度條
`█░`、限額重置倒數 `↺`）之顯示字元從未真機驗證。07 的 S3 真機實測
（`sp3/REPORT.md` §4-B）曾證明「statusline 完全不接受表情符號」，強到
推翻整張 25 段 emoji 對照表。`↺`(U+21BA)／`█`(U+2588)／`░`(U+2591)
雖非 emoji（Block Elements／Arrows 區塊、單一 BMP codepoint、無
VS16／ZWJ），但同為非 ASCII 字元、從未在真機 Claude Code statusline
驗過——它們是 06c 兩大新功能（bar 正交欄、reset 倒數段）的核心顯示形，
失守則顯示形／4-run bytes／golden 全要重規劃（`PLAN.md` §2 S7）。

**要驗證的兩層契約**：
1. **產生器層（本機可自動驗證，已完成）**：PS1「UTF-8 字面直嵌
   （BOM 儲存）」與「`[char]0xHEX` 碼位跳脫（純 ASCII 原始碼）」兩種
   編碼形式，是否在 PS 5.1／pwsh 7 上皆能正確解析、產出與 bash 版
   逐位元組相同的 stdout（`PLAN.md` §3「ps1 非 ASCII 值字面跳脫」條款）。
2. **真機渲染層（待使用者，見 §5）**：Claude Code statusline 是否會
   如實顯示這三個字元（或如 emoji 一樣被剝除／替換／顯示為 tofu／
   寬度跑掉）。

---

## 1. Probe 腳本清單（本目錄 `sp7/`）

| 檔名 | shell | 變體 | 非 ASCII 編碼形式 | 檔案編碼 |
|---|---|---|---|---|
| `case-bar-countdown-plain.sh` | bash | plain（fg-only） | UTF-8 字面直嵌 | UTF-8 無 BOM |
| `case-bar-countdown-powerline.sh` | bash | powerline（bg 色塊） | UTF-8 字面直嵌 | UTF-8 無 BOM |
| `case-bar-countdown-plain.ps1` | ps1 | plain | UTF-8 字面直嵌（對照組 A） | **UTF-8 含 BOM** |
| `case-bar-countdown-powerline.ps1` | ps1 | powerline | UTF-8 字面直嵌（對照組 A） | **UTF-8 含 BOM** |
| `case-bar-countdown-plain.escaped.ps1` | ps1 | plain | `[char]0xHEX` 碼位跳脫（對照組 B） | **純 ASCII，無 BOM** |
| `case-bar-countdown-powerline.escaped.ps1` | ps1 | powerline | `[char]0xHEX` 碼位跳脫（對照組 B） | **純 ASCII，無 BOM** |

內容設計（沿 06c 傘狀規格暫定形）：
- **列 1（bar 段模擬）**：20 格＝12 格 `█` 填色（U+2588）＋8 格 `░`
  空格（U+2591）＝ 60%，後綴 ` 60%`。plain＝fg-only 上色（filled／
  empty 各一色）；powerline＝bg 色塊（`bar` 標籤、filled、empty、
  百分比各自一個 bg 色塊），驗證同三字元在兩種色彩語境是否皆正常
  渲染。
- **列 2（倒數段模擬）**：`↺ 2h (14:30)`（U+21BA），plain＝fg 上色；
  powerline＝整段一個 bg 色塊。
- 行尾：沿現行產生器慣例「無尾隨換行」（sp3 case5 已證等價，本案
  不重測）；兩列以單一 LF join。
- ps1 檔頭刻意比照生產 `emit-ps1.ts:674-678` 的
  `[Console]::InputEncoding`／`OutputEncoding = UTF8Encoding($false)`
  ＋`$e=[char]27` 三行（sp3 case1/5 當年只測 ANSI SGR，未含非 ASCII
  值字面，故無此設定；本案輸出含非 ASCII 值字面，此設定為避免
  confound 的必要條件，非隨意追加）。
- `*.escaped.ps1` 兩檔**刻意以英文 ASCII 註解**（非專案慣例 zh-TW），
  這是刻意的測試條件而非隨意破例：唯有整檔（含註解）皆為 ASCII 位元組
  才能單獨驗證「碼位跳脫技巧本身是否不依賴 BOM／系統 codepage 就能
  正確解析」，避免頭部 CJK 註解仍需要 BOM 而混淆對照組 A／B 的區隔
  （生產 `emit-ps1.ts` docstring 明言 CJK 註解通道另案 DRIFT backlog、
  不在「產出腳本值字面純 ASCII」不變量範圍內——本 probe 為求對照乾淨，
  刻意做最強版本：整檔 ASCII）。

---

## 2. 本機自動化驗證（程式層，非真機渲染）

### 2.1 執行環境
- Windows PowerShell 5.1.26100.8655（`powershell.exe`，系統內建）
- PowerShell 7.6.3（`pwsh.exe`）
- Git Bash（`bash`，隨 Git for Windows）

### 2.2 執行結果：全部 6 腳本 × 對應 shell 皆 exit 0、stderr 空
共執行 10 次（bash 2 次；`.ps1`／`.escaped.ps1` 各 2 檔 × PS5.1／pwsh7
= 8 次），全部 `exit 0`、stderr 位元組數 0，無解析錯誤、無例外。

### 2.3 byte 抽查證據

**UTF-8 序列出現次數比對**（`bash_plain.bin` 為例，`xxd -p` 後以位元組
序列計數）：

| 字元 | codepoint | UTF-8 bytes | 預期次數 | 實測次數（plain／powerline） |
|---|---|---|---|---|
| `█` FULL BLOCK | U+2588 | `E2 96 88` | 12 | 12／12 ✓ |
| `░` LIGHT SHADE | U+2591 | `E2 96 91` | 8 | 8／8 ✓ |
| `↺` ANTICLOCKWISE OPEN CIRCLE ARROW | U+21BA | `E2 86 BA` | 1 | 1／1 ✓ |

節錄 `case-bar-countdown-plain.sh` stdout hexdump（含 bar 填色段起點）：
```
00000000: 6261 723a 1b5b 3338 3b35 3b34 366d e296  bar:.[38;5;46m..
00000010: 88e2 9688 e296 88e2 9688 e296 88e2 9688  ................
                ↑ e2 96 88 = █ (U+2588) 連續 12 次
00000040: 6de2 9691 e296 91e2 9691 e296 91e2 9691  m...............
                ↑ e2 96 91 = ░ (U+2591) 連續 8 次
00000070: 0a1b 5b33 383b 353b 3531 6de2 86ba 2032  ..[38;5;51m... 2
                                    ↑ e2 86 ba = ↺ (U+21BA)
```

### 2.4 完整交叉比對矩陣（`cmp` 全過＝逐位元組相同）

以 bash 版輸出為基準（plain 141 bytes；powerline 211 bytes），與其餘
8 個 PS1 執行結果逐一 `cmp`：

| 來源 | plain vs bash plain | powerline vs bash powerline |
|---|---|---|
| PS5.1・literal（`.ps1`，BOM） | IDENTICAL | IDENTICAL |
| PS5.1・escaped（`.escaped.ps1`，ASCII） | IDENTICAL | IDENTICAL |
| pwsh7・literal（`.ps1`，BOM） | IDENTICAL | IDENTICAL |
| pwsh7・escaped（`.escaped.ps1`，ASCII） | IDENTICAL | IDENTICAL |

另外，同一 shell 內「literal vs escaped」直接互比（PS5.1 內、pwsh7
內）亦全部 `cmp` 通過（IDENTICAL）——確認兩種編碼形式在**同一
PowerShell 版本內**輸出也逐位元組相同，非僅個別碰巧與 bash 吻合。

**行尾檢查**：全部 10 份輸出捕獲皆無 CR（`0x0D`）位元組（PS1 `` `n ``
與 bash `$'\n'` 皆純 LF，無 CRLF 污染）；bash／PS1 皆無尾隨 LF（末位元組
為 `[0m` 的 `d`，非 `0a`），符合現行「無尾隨換行」產生器慣例。

### 2.5 邏輯長度檢查（非視覺寬度）
`[string][char]0x2588 * 12` 之 `.Length`（UTF-16 code unit 數）與
`StringInfo.LengthInTextElements`（grapheme 數）皆為 12（U+2588 在
BMP、非組合字元、非 surrogate pair），確認腳本邏輯層面 12／8 格數
正確、無編碼層面的計數失真。

### 2.6 視覺寬度自動化嘗試（結果：不可靠，需真機，見 §5）
依任務指示嘗試以 `$Host.UI.RawUI.CursorPosition` 量測輸出前後游標
X 座標差以推算實際欄寬：在本 dispatch 的 headless／pty 執行環境
（Bash 工具透過管線呼叫 `powershell.exe`，非真正附著的 Windows
console buffer）下，`CursorPosition` 讀值恆為 `(0,0)`、寫入後亦不變，
判定為**此量測手段在本環境不可靠**（推測 pty 轉接層未提供真實
console screen buffer，故 RawUI cursor API 無法運作）；另嘗試直接
Write 到該管線觀察到的字元亦顯示為亂碼（`\xef\xbf\xbd` replacement
char 反覆出現），此為**診斷環境本身**（Git-Bash pty 轉呼叫
`powershell.exe` 之終端非 Windows Terminal／VS Code、非 UTF-8
輸出 codepage）的已知限制，**與 §2.3／§2.4 的檔案捕獲位元組證據
無關**——後者是直接讀 stdout 已寫入的檔案位元組，不經過任何終端
渲染層，因此不受此問題影響、結論不變。

此嘗試印證了本任務設計本身的判斷：**視覺欄寬（U+2588／U+2591／
U+21BA 皆屬 Unicode East Asian Width = Ambiguous 類別，在不同終端／
字型下可能被當作 1 欄或 2 欄）與是否顯示為 tofu／被剝除，本質上是
終端渲染層行為，無法脫離真機終端以腳本自動判定**——此為 §5 使用者
步驟存在的根本原因，非驗證疏漏。

---

## 3. 兩種 ps1 編碼形式等價證明（結論）

**PS1「UTF-8 字面直嵌（BOM 儲存）」與「`[char]0xHEX` 碼位跳脫（純
ASCII 原始碼）」兩形，在 PS 5.1 與 pwsh 7 上皆能正確解析，且產出
stdout 與 bash 版逐位元組相同**（§2.4 矩陣全 `IDENTICAL`）。兩形
互為等價實作，選用哪一形不影響真機渲染結果的位元組輸入——真機渲染層
的通過／失守判定（§5）對兩形適用同一結論，**PLAN §3 契約可安全採用
`[char]0xHEX` 碼位跳脫形**（比照 `iconGlyphExpr`／`$ARROW` idiom）
作為 bar／countdown 值字面的產生器實作策略，不受 BOM／系統 codepage
風險影響（sp3/REPORT.md §4-A 根因分析的風險在此已排除）。

---

## 4. 若真機失守：ASCII 替代字面建議（僅供使用者核可參考，本 spike
   不預先裁決）

依 `PLAN.md` §2 S7／§Open questions 預想：
- `↺`（U+21BA）→ `~`
- `█`（U+2588）→ `#`
- `░`（U+2591）→ `-`

僅字面替換，4-run 粒度與 S4 bytes 形不變（§Open questions 已預先
註記，替代字面須經使用者核可方可定案，本報告不代為決定）。

---

## 5. 待使用者：真機 Claude Code 目視確認（本 gate 尚未完成的最後一步）

`§2` 只證明「三種產生器路徑（bash／PS1 兩形）輸出的位元組正確」，
**不能證明 Claude Code statusline 會如實渲染這些位元組**——07 M1.5
的教訓正是「位元組正確、產生器正確，但 Claude Code 渲染層整個剝除
emoji」。以下為最短操作指引。

### 5.1 操作步驟（沿 `sp3/TESTING.md` §1 接法）

1. 編輯 `C:\Users\alan6\.claude\settings.json`（若已有 `statusLine`
   區塊，先備份原內容，測完照 §5.3 還原）。
2. 依下表，每次把 `command` 換成對應路徑，存檔後**開一個新的
   Claude Code session**（statusline 於 session 啟動時讀取一次）。

| 組合 | command |
|---|---|
| bash × plain | `bash E:/program/git/eztools/magi/08-statusline-catalog-expansion/sp7/case-bar-countdown-plain.sh` |
| bash × powerline | `bash E:/program/git/eztools/magi/08-statusline-catalog-expansion/sp7/case-bar-countdown-powerline.sh` |
| PS1 × plain | `powershell -NoProfile -ExecutionPolicy Bypass -File E:/program/git/eztools/magi/08-statusline-catalog-expansion/sp7/case-bar-countdown-plain.escaped.ps1` |
| PS1 × powerline | `powershell -NoProfile -ExecutionPolicy Bypass -File E:/program/git/eztools/magi/08-statusline-catalog-expansion/sp7/case-bar-countdown-powerline.escaped.ps1` |

即任務要求的「`█░` 20 格＋`↺ 2h (14:30)` × {plain, powerline} ×
{PS 5.1, bash}」4 組合（`PLAN.md` §2 S7）。PS1 欄建議用
`.escaped.ps1`（純 ASCII 原始碼，不受複製貼上流程 BOM 遺失風險影響，
`§3` 已證與 `.ps1`（BOM 版）位元組等價，兩者渲染結果理應相同；若想
額外交叉確認 BOM 路徑本身，可補測對應的 `.ps1`——非必要）。

`command` 範例 JSON：
```json
{
  "statusLine": {
    "type": "command",
    "command": "bash E:/program/git/eztools/magi/08-statusline-catalog-expansion/sp7/case-bar-countdown-plain.sh"
  }
}
```

### 5.2 看什麼（判定準則，對照 07 M1.5 的失敗樣態）

每個組合觀察並記錄：
1. **三字元是否顯示**：`█`／`░`／`↺` 是否以正確字形出現？
   - **通過**：清楚顯示為色塊（`█`／`░`，深淺／填色對比明顯）與
     一個圓弧箭頭（`↺`）。
   - **失守樣態 A（比照 07 M1.5 emoji 全滅）**：三字元完全消失（整段
     文字被剝除，如 `bar:60%` 少了中間的色塊部分）。
   - **失守樣態 B（tofu／替代字）**：顯示為方框（tofu）、問號、或
     `�`（replacement char，即 U+FFFD）。
   - **失守樣態 C（字面滲出，比照 sp3 case1 舊 bug 樣態）**：顯示原始
     碼位文字（如 `█` 或 `[char]0x2588` 字樣），代表某層解析/
     渲染失敗而未真正轉成字元。
2. **寬度是否穩**：bar 列的 20 格（12 填色＋8 空格）視覺上是否為
   一致寬度的一整條（不應忽寬忽窄、不應被截斷成兩段、不應比其他 ASCII
   文字明顯寬一倍——East Asian Width Ambiguous 類別存在被當雙欄渲染
   的風險，見 §2.6）。同螢幕若能同時看到現行 statusline 其他 ASCII
   文字，可用其欄寬對比。
3. **plain vs powerline 是否有差異**：若 plain 正常但 powerline
   失守（或反之），代表問題與色彩語境（bg 色塊）交互相關，需額外
   記錄供 coordinator 判斷。
4. **bash vs PS1 是否有差異**：若其中一 shell 失守而另一正常，因
   §2.4 已證兩者 stdout 位元組相同，此落差會指向**渲染層依 statusline
   command 呼叫方式（shell wrapper）而異**，屬重大新發現，需額外記錄。

### 5.3 收工／還原
1. 4 組合測完，把 `statusLine` 區塊改回（或移除）測試前原始設定。
2. 若方便，建議附截圖到本目錄（`sp7/`）供 coordinator 核對（非必要，
   文字描述亦可）。
3. 把 §5.2 四項觀察結果（含截圖檔名如有）回報給 coordinator／使用者
   自行判定：**全數通過** → S7 gate 過、PLAN §2 S7／§3 顯示形定案
   （bar／countdown 值字面採 `[char]0xHEX` 碼位跳脫形）；**任一組合
   失守** → 依 §4 建議字面（或使用者另訂字面）核可後，回寫 PLAN
   （僅字面替換，4-run 形與 S4 bytes 形不變，`§Open questions` 收斂）。

---

## 6. 小結（本 dispatch 完成範圍）

- probe 腳本 6 個（bash×2、ps1 literal×2、ps1 escaped×2）已備妥、可
  重跑，皆位於本目錄。
- 本機自動化層（產生器正確性）**全部通過**：10 次執行 0 錯誤、UTF-8
  byte 序列數與位置精確符合預期、bash／PS5.1／pwsh7／兩種 ps1 編碼
  形式共 5 條路徑輸出**逐位元組相同**。
- 視覺寬度自動化量測**不可行**（環境限制，非驗證疏漏），已如實記錄
  於 §2.6，改列為 §5 使用者真機步驟的檢查項之一。
- **S7 gate 尚未關閉**：真機 Claude Code 目視渲染確認（§5）為必要的
  最後一步，需使用者執行後回報結果，coordinator 據此在 `PLAN.md`
  定案（通過或啟用 §4 fallback）。
