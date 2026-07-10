# S1 spike 報告：emoji 真機渲染矩陣

任務：T1.1（見 `../TASKS.md` Milestone 1）
日期：2026-07-10
執行者：magi-developer（自動化 / 程式層部分）；人工實測欄位待使用者填寫

---

## 0. 候選 emoji（6 個，取自 PLAN §Spikes S1 已核可表）

| # | 字元 | 名稱 | 碼位 | 備註 |
|---|------|------|------|------|
| 1 | ⌨️ | Keyboard(VS16) | U+2328 + U+FE0F（variation selector） | 表中唯一帶 VS16 的字符，寬度穩定性是本次 spike 的核心問題 |
| 2 | 💻 | Laptop | U+1F4BB | ⌨️ 不穩時的替代方案 |
| 3 | 🌳 | Tree | U+1F333 | git 三段植物 emoji 之一，測小字級辨識度 |
| 4 | 🌱 | Seedling | U+1F331 | 同上 |
| 5 | 🌿 | Herb | U+1F33F | 同上 |
| 6 | 🤖 | Robot | U+1F916 | 一般雙寬控制組 |

---

## 1. 環境紀錄

- PowerShell 5.1：`5.1.26100.8655`（Desktop edition，`powershell.exe`）
- **pwsh 7：`7.6.3`（2026-07-10 隨後以 winget/MSIX 安裝完成，`pwsh` 指令在 PowerShell 與 Git Bash 皆可解析）** — 以 `pwsh -NoProfile -Command '$PSVersionTable.PSVersion.ToString()'` 驗證為 `7.6.3`；本報告 §3.5 已補上 pwsh 7 的程式化剖析保真測試，§5 的 {pwsh 7 + Windows Terminal} 欄位「本機未安裝」阻塞已解除、改為一般人工待填 ◻ 欄位
- Windows Terminal（`wt`）：本機已安裝，可用於人工測試
- VS Code 內建終端機：可用於人工測試（bash / Git Bash）
- **系統 ANSI 代碼頁（OEMCP/ACP）= Big5（zh-TW 地區設定，code page 950）**
  - 於本 session 內以 `powershell.exe -NoProfile -Command [System.Text.Encoding]::Default` 驗證：`WindowsCodePage: 950`、`EncodingName: 繁體中文 (Big5)`
  - 這代表 PS 5.1 讀取「無 BOM 的 .ps1」時，會用 **Big5** 而非 UTF-8 解碼原始碼——risk 敘述中的「Big5 風味亂碼」在本機屬實
  - 本次執行 spike 腳本的 Git Bash session 之 console codepage 為 65001（UTF-8），但這是本 session 專屬設定，**不代表使用者實際互動終端機（conhost / Windows Terminal / VS Code）的 codepage**；人工測試矩陣要求每格記錄當下 chcp 輸出即為此故
  - Git Bash（MSYS2）本身固定使用 LC_CTYPE=C.UTF-8，與 Windows ANSI 代碼頁無關——這是 .sh 腳本在本 session 顯示正常、而 .ps1 顯示異常的根本原因之一，詳見 §3 分析

---

## 2. Spike 腳本清單（皆位於本目錄）

| 檔名 | 說明 | 編碼 |
|------|------|------|
| emoji-utf8nobom.ps1 | emoji 字面量直接寫在原始碼中 | UTF-8，**無 BOM** |
| emoji-utf8bom.ps1 | 與上者內容逐位元組相同（僅開頭多 3 bytes BOM） | UTF-8，**有 BOM** |
| emoji-escape.ps1 | 原始碼純 ASCII，執行期用 [char]::ConvertFromUtf32(...) 組出 emoji | ASCII（BOM 與否無意義，未另外產生變體） |
| emoji-utf8nobom.sh | emoji 字面量直接寫在原始碼中 | UTF-8，無 BOM |
| emoji-utf8bom.sh | 與上者內容相同，但在 #!/usr/bin/env bash **之前**插入 UTF-8 BOM（3 bytes） | UTF-8，有 BOM（BOM 在 shebang 前） |

每支腳本輸出三段：
1. 「寬度標記行」——每個候選 emoji + ASCII 結尾標記（如 🤖|end），供人眼判斷寬度/裁切
2. 「對齊行」——emoji 與 ASCII 欄位混排一行，供人眼判斷雙寬對齊
3. 「剖析保真行」（parse-fidelity）——emoji 字串在腳本內部被重新轉成 hex 碼位並印出：
   - ps1：對每個字串的 ToCharArray() 逐字元以 {0:X4} 格式化再 join 起來（輸出 .NET UTF-16 code unit，含代理對 surrogate pair）
   - sh：對每個 emoji 用 printf 搭配 od -A n -t x1（輸出原始 UTF-8 bytes）

這一行的重點：**它證明的是「剖析層」是否忠實，與終端機「顯示層」是否亂碼是兩回事**——即使畫面顯示亂碼，只要這行印出正確碼位，就代表原始碼被正確解析、只是終端機渲染或主控台輸出編碼有問題（反之亦然）。

---

## 3. 程式化實測結果

### 3.1 檔案編碼 byte 驗證（BOM 是否存在）

命令：od -A x -t x1z <file> | head -3

```
== emoji-utf8bom.ps1 ==
000000 ef bb bf 23 20 53 70 69 6b 65 20 53 31 3a 20 65  >...# Spike S1: e<
                BOM (EF BB BF) 緊接在檔案最開頭，其後才是 "# Spike..."

== emoji-utf8nobom.ps1 ==
000000 23 20 53 70 69 6b 65 20 53 31 3a 20 65 6d 6f 6a  ># Spike S1: emoj<
                無 BOM，檔案第一個 byte 就是 "#"

== emoji-escape.ps1 ==
000000 23 20 53 70 69 6b 65 20 53 31 3a 20 65 6d 6f 6a  ># Spike S1: emoj<
                無 BOM，且經逐 byte 掃描（大於 0x7F 的 byte 計數為 0）確認整檔為純 ASCII

== emoji-utf8bom.sh ==
000000 ef bb bf 23 21 2f 75 73 72 2f 62 69 6e 2f 65 6e  >...#!/usr/bin/en<
                BOM 在 shebang「#!」之前

== emoji-utf8nobom.sh ==
000000 23 21 2f 75 73 72 2f 62 69 6e 2f 65 6e 76 20 62  >#!/usr/bin/env b<
                無 BOM，第一個 byte 就是 "#"
```

emoji 字面量本身的 UTF-8 byte 序列亦逐一核對正確（例如 emoji-utf8nobom.ps1 內 ⌨️ = e2 8c a8 ef b8 8f＝U+2328 + U+FE0F 的標準 UTF-8 編碼；💻 = f0 9f 92 bb＝U+1F4BB）。

結論：**5 個檔案的 BOM 存在與否，皆與設計意圖精確相符**（Write 工具預設不寫 BOM，BOM 變體以 printf 前綴 EF BB BF 三個 byte 後再以 od 驗證，未憑空假設）。

### 3.2 PS 5.1 剖析保真測試（powershell.exe -NoProfile -File ...，於 Git Bash 呼叫）

命令：對每個檔案執行 powershell.exe -NoProfile -File ./<file>.ps1

**emoji-utf8nobom.ps1（無 BOM）剖析保真行輸出：**
```
Keyboard(VS16)|U+2328,FE0F => 003F 5241 003F
Laptop|U+1F4BB             => 003F E5DE
Tree|U+1F333               => 003F F5C8
Seedling|U+1F331           => 003F F5C6
Herb|U+1F33F               => 003F F5D4
Robot|U+1F916              => 003F 003F
```
預期正確碼位應為 2328 FE0F / D83D DCBB（surrogate pair）等，見下方 3.3 對照表。實際輸出的 003F（即 ? 的碼位，PS 內建的解碼失敗替代字元）與一堆對不上的雜碼位（5241、E5DE、F5C8…）**證實原始碼被當成 Big5（ANSI 代碼頁 950）解碼**，UTF-8 多位元組的 emoji 序列被切成 Big5 雙位元組字元，產生完全不同、且無法回推的字元——**剖析層已經壞掉，不是顯示問題，是原始碼被錯誤解碼之後就已經產生別的字元了。**

**emoji-utf8bom.ps1（有 BOM）剖析保真行輸出：**
```
Keyboard(VS16)|U+2328,FE0F => 2328 FE0F
Laptop|U+1F4BB             => D83D DCBB
Tree|U+1F333               => D83C DF33
Seedling|U+1F331           => D83C DF31
Herb|U+1F33F               => D83C DF3F
Robot|U+1F916              => D83E DD16
```
與 3.3 節「預期碼位」表完全一致，**逐位元精確**。

**emoji-escape.ps1（純 ASCII + ConvertFromUtf32）剖析保真行輸出：**
```
Keyboard(VS16)|U+2328,FE0F => 2328 FE0F
Laptop|U+1F4BB             => D83D DCBB
Tree|U+1F333               => D83C DF33
Seedling|U+1F331           => D83C DF31
Herb|U+1F33F               => D83C DF3F
Robot|U+1F916              => D83E DD16
```
與 BOM 版**完全相同**、逐位元精確——如預期，因為此變體完全不依賴原始碼的位元組解碼，emoji 是執行期用 ConvertFromUtf32 從純 ASCII 碼位字面量組出來的。

**主控台可見輸出的重要旁見（顯示層 vs 剖析層是兩件事）：**
在本次自動化擷取（Git Bash 以非互動、管道重導向方式呼叫 powershell.exe）中，**三個 .ps1 檔案的「寬度標記行」與「對齊行」在畫面上全部顯示為亂碼（問號或殘缺符號）**，即使 BOM 版與 escape 版的剖析保真行已證明碼位完全正確。這代表：PowerShell 對「重導向輸出（stdout 被 pipe 接走）」使用的輸出編碼（多半又是系統 ANSI/OEM 代碼頁 Big5），與字串本身的正確 UTF-16 內容不符，導致**顯示層二次轉碼失真**——這與「剖析層是否忠實」是彼此獨立的兩個問題。也因此，**本自動化執行結果無法回答「這三個 emoji 在真正互動式主控台/終端機視窗中好不好看、寬度穩不穩」這個問題**——互動式 conhost / Windows Terminal 通常有自己的一套 UTF-8 渲染路徑，不必然重現這裡的重導向轉碼問題。這正是本報告 §5 人工實測矩陣存在的理由，兩者不可互相取代。

### 3.3 預期碼位對照表（.NET UTF-16 code unit，含代理對）

| emoji | 碼位 (Unicode) | 預期 hex code unit（PS ToCharArray()） |
|---|---|---|
| ⌨️ | U+2328 + U+FE0F | 2328 FE0F（皆在 BMP 內，非代理對） |
| 💻 | U+1F4BB | D83D DCBB（surrogate pair） |
| 🌳 | U+1F333 | D83C DF33（surrogate pair） |
| 🌱 | U+1F331 | D83C DF31（surrogate pair） |
| 🌿 | U+1F33F | D83C DF3F（surrogate pair） |
| 🤖 | U+1F916 | D83E DD16（surrogate pair） |

BOM 版與 escape 版實測輸出與此表逐行相符（見 3.2）。

### 3.4 bash 剖析保真測試

命令：bash ./emoji-utf8nobom.sh、bash ./emoji-utf8bom.sh

**emoji-utf8nobom.sh：**
- 「寬度標記行」「對齊行」在本 session（Git Bash，LC_CTYPE=C.UTF-8）**畫面顯示正確**，看得到 ⌨️💻🌳🌱🌿🤖 本尊
- 剖析保真行（UTF-8 bytes）：
  ```
  Keyboard(VS16)|U+2328,FE0F => e2 8c a8 ef b8 8f
  Laptop|U+1F4BB             => f0 9f 92 bb
  Tree|U+1F333               => f0 9f 8c b3
  Seedling|U+1F331           => f0 9f 8c b1
  Herb|U+1F33F               => f0 9f 8c bf
  Robot|U+1F916              => f0 9f a4 96
  ```
  對照 UTF-8 標準編碼（例如 U+1F4BB 的 UTF-8 為 F0 9F 92 BB）**逐 byte 正確**，無 BOM 完全不影響 bash 讀取 UTF-8 原始碼。

**emoji-utf8bom.sh（BOM 在 shebang 前）：**
- 執行時 stderr 印出一行錯誤（實際錯誤訊息開頭夾帶不可見的 BOM 位元組）：
  ```
  ./emoji-utf8bom.sh: line 1: #!/usr/bin/env: No such file or directory
  ```
  原因：bash 判斷「這一行是不是註解」的規則是「第一個非空白字元是否為 #」；BOM 的 3 個位元組排在 # 之前，導致第一行不再被視為註解，bash 嘗試把整行當成指令執行、失敗。**這條錯誤僅發生在第 1 行**，不影響後續行的剖析。
- 「寬度標記行」「對齊行」「剖析保真行」**其餘輸出與無 BOM 版完全相同、正確**（因為 bash 對後續每一行仍以 UTF-8 正常解碼；BOM 只讓「第一行」變成非法指令，不會讓整份檔案的字元編碼判讀跟著跑掉——這點與 PS 5.1「無 BOM 就整份用 ANSI 代碼頁解碼」的行為完全不同）。

### 3.5 pwsh 7 剖析保真測試（`pwsh -NoProfile -File ...`，於 Git Bash 呼叫，補測於 pwsh 7.6.3 安裝後）

命令：對每個檔案執行 `pwsh -NoProfile -File ./<file>.ps1`（`pwsh` 版本已以 `$PSVersionTable.PSVersion.ToString()` 驗證為 `7.6.3`）

**emoji-utf8nobom.ps1（無 BOM）剖析保真行輸出：**
```
Keyboard(VS16)|U+2328,FE0F => 2328 FE0F
Laptop|U+1F4BB             => D83D DCBB
Tree|U+1F333               => D83C DF33
Seedling|U+1F331           => D83C DF31
Herb|U+1F33F               => D83C DF3F
Robot|U+1F916              => D83E DD16
```
與 3.3 節「預期碼位」表完全一致、**逐位元精確**——**與 PS 5.1 的同一份無 BOM 檔案（§3.2）形成鮮明對比**：PS 5.1 讀這份檔案會腐蝕成 `003F 5241 003F` 之類的雜碼，pwsh 7 讀同一份檔案卻完全正確。這證實 **pwsh 7（PowerShell Core）對無 BOM 的 `.ps1` 原始碼預設以 UTF-8 解碼**（不像 PS 5.1 Desktop 用系統 ANSI 代碼頁），因此本機風險敘述中「無 BOM 必亂碼」的前提**只在 PS 5.1 成立，在 pwsh 7 不成立**。

**emoji-utf8bom.ps1（有 BOM）剖析保真行輸出：**
```
Keyboard(VS16)|U+2328,FE0F => 2328 FE0F
Laptop|U+1F4BB             => D83D DCBB
Tree|U+1F333               => D83C DF33
Seedling|U+1F331           => D83C DF31
Herb|U+1F33F               => D83C DF3F
Robot|U+1F916              => D83E DD16
```
與無 BOM 版完全相同、與 3.3 節預期碼位表完全一致——BOM 存在與否對 pwsh 7 的剖析結果沒有差異（兩者都已經是正確的 UTF-8 解碼）。

**emoji-escape.ps1（純 ASCII + `ConvertFromUtf32`）剖析保真行輸出：**
```
Keyboard(VS16)|U+2328,FE0F => 2328 FE0F
Laptop|U+1F4BB             => D83D DCBB
Tree|U+1F333               => D83C DF33
Seedling|U+1F331           => D83C DF31
Herb|U+1F33F               => D83C DF3F
Robot|U+1F916              => D83E DD16
```
同樣與預期碼位表完全一致——三個變體在 pwsh 7 下**剖析結果全部相同、全部正確**（BOM 有無、字面量或跳脫碼位，三者殊途同歸）。

**主控台可見輸出的旁見（與 §3.2 一致的現象）：**
在本次自動化擷取（Git Bash 管道重導向呼叫 `pwsh`）中，三個 `.ps1` 檔案的「寬度標記行」「對齊行」在畫面上同樣全部顯示為 `??` 之類的亂碼，即使三者的剖析保真行皆已證明碼位完全正確。這與 §3.2 對 PS 5.1 的觀察一致：**顯示層的重導向輸出轉碼問題與剖析層是否忠實無關**，pwsh 7 也不例外。此觀察不改變「pwsh 7 無 BOM 一樣能正確剖析」的結論，只再次確認自動化管道無法回答真實互動終端機的視覺呈現問題，必須交給 §5 人工實測。

---

## 4. 程式層結論（僅涵蓋剖析層，不含終端機顯示視覺判斷）

1. **PS 5.1（Desktop edition）讀取無 BOM 的 .ps1（原始碼含字面量 emoji）在本機（Big5 ANSI 代碼頁）已證實剖析層損毀**：所有候選 emoji 的碼位皆被腐蝕成無法回推的值，不是「畫面好不好看」的問題，是「PowerShell parser 從一開始就沒讀到正確字元」。PLAN 中的已知風險（S1 spike 敘述）**在 PS 5.1 上成立**。
2. **PS 5.1 讀有 BOM 的 .ps1（原始碼含字面量 emoji）剖析層完全正確**，六個候選 emoji 的 UTF-16 code unit（含代理對）逐位元組與預期相符。
3. **pwsh 7.6.3 讀無 BOM 的 .ps1（同一份原始碼、同一台機器）剖析層完全正確**（見 §3.5），與 PS 5.1 讀同一份檔案的結果（損毀）形成鮮明對比——**證實 PowerShell Core（pwsh 7）預設以 UTF-8 解碼無 BOM 的 `.ps1` 原始碼，PLAN 風險敘述中「無 BOM 必亂碼」的前提只在 PS 5.1（Desktop edition）成立，在 pwsh 7 不成立**。pwsh 7 讀有 BOM 版本同樣完全正確，BOM 有無對 pwsh 7 沒有影響。
4. **emoji-escape.ps1（純 ASCII 原始碼 + [char]::ConvertFromUtf32()）在 PS 5.1 與 pwsh 7 上剖析層皆完全正確，且與各自的 BOM 版逐位元組相同**——證實此策略對「原始碼編碼／有無 BOM／PowerShell 版本」完全免疫，是 PLAN 風險敘述中提到的 fallback 方案的可行解法，且是唯一一個在 PS 5.1 + Big5 代碼頁下也保證正確的變體。
5. **綜合 1–4 的剖析層裁決要點**：若 emitter 只需支援 pwsh 7（或更新版本），無 BOM 字面量原始碼即可安全；但只要仍需相容 PS 5.1（本機為 Big5 ANSI 代碼頁環境，具代表性），則「無 BOM 字面量」不安全，必須在「BOM 字面量」與「純 ASCII + `ConvertFromUtf32` 跳脫」兩者間擇一——後者額外具備「與 PowerShell 版本、系統代碼頁、複製貼上流程是否保留 BOM 皆無關」的優勢，此為 T1.2 裁決的程式層依據，本任務不代為裁決 emitter 最終選型。
6. **bash 對 .sh 檔案的 UTF-8 剖析不受 BOM 有無影響**：無 BOM 與有 BOM（BOM 置於 shebang 前）皆能正確剖析出所有候選 emoji 的 UTF-8 bytes；差別只在於 BOM 版會讓 shebang 那一行本身被誤判成一則失敗指令（印一行 stderr 錯誤），但不影響腳本其餘部分的執行與輸出正確性。
7. **本自動化擷取管道（Git Bash 以管道重導向呼叫 powershell.exe / pwsh）中，即便剖析層已證明碼位正確（PS 5.1 BOM 版／escape 版、pwsh 7 全部三版），畫面仍顯示亂碼**——這是 PowerShell（含 Core 版）對「重導向輸出」使用的輸出編碼問題，屬於顯示層、且發生在自動化管道特有的情境（stdout 被 pipe 走），**不能直接外推到互動式 conhost / Windows Terminal 是否也會亂碼**。這一題必須靠 §5 人工實測回答，本報告刻意不對此下結論。
8. **尚未回答（需人工判斷）**：⌨️(VS16) 在各終端機的寬度是否穩定（是否需換成 💻）、🌳🌱🌿 在 statusline 常見小字級下的視覺辨識度、以及各 emoji 與 ASCII 混排時的雙寬對齊表現。這些都是「顯示層 + 字型渲染」問題，無法用剖析保真行程式化驗證，必須真人眼看——**pwsh 7 現已安裝，{pwsh 7 + Windows Terminal} 欄位的安裝阻塞已解除**，可比照其他欄位正常人工填寫。

---

## 5. 人工實測矩陣（2026-07-10 使用者口頭回報，彙總填寫完成）

圖例：◻ = 待填寫（本輪已無 ◻，全部填妥）；「（彙總回報）」= 使用者以整體/跨變體方式一次性回報，非逐格追問所得，填寫時保留此標記以誠實反映精確度。

**填寫來源與精確度警語（provenance note，coordinator/developer 代填，非使用者本人編輯此檔）：**
以下儲存格內容並非使用者逐格填寫本檔，而是由 coordinator 轉述使用者 2026-07-10 的口頭彙總測試結果、由 developer 回填至矩陣。填寫時的已知精確度落差：
- **chcp 輸出**：使用者測試時未記錄，以下全部標記「未記錄」，之後若要精確重現代碼頁條件需重新測試並記錄。
- **PS 5.1 兩列（conhost／Windows Terminal）未區分**：使用者以「PS 5.1 環境」一體回報結果，並未分別確認 conhost 與 Windows Terminal 兩種宿主是否有差異；本表仍保留兩列以符合原矩陣設計，但兩列內容**逐格相同**，皆標記「（PS 5.1 環境彙總，未分 conhost/WT）」。
- **bash 欄以 MobaXterm 取代原計畫的 VS Code 終端機**：使用者測試時改用 **MobaXterm**，而非 §5.2 指引原先指定的 VS Code 整合終端機；下表「終端機」欄位已據實標註為 `bash + MobaXterm（原計畫 VS Code 終端替代）`。
- **⌨️ 寬度穩定？／🌳🌱🌿 小字級辨識度／雙寬對齊**三欄：使用者係以「在測試過的終端機中」的整體印象回報（例如「⌨️ 在測過的終端機裡寬度都穩定」「🌳🌱🌿 看得很清楚」），並未針對每一列（每個終端機 × 每個腳本變體）逐一確認，因此這三欄一律加註「（彙總回報）」，不聲稱有逐格精確度；雙寬對齊一項使用者未單獨提出異常，僅在回答 ⌨️ 寬度問題時附帶確認 `|end` 對齊未見問題，故记為「未回報異常（彙總回報）」而非「整齊」，以避免誇大成有主動逐格檢查對齊。
- **`emoji-utf8nobom.ps1` 在 PS 5.1 的列**：使用者回報「只有這個變體會亂碼」，但沒有逐一指出六個候選 emoji 個別是否全部亂碼或哪幾個亂碼、也沒有另外評論這一列的寬度/辨識度/對齊（該列本身已確認亂碼，寬度與辨識度判斷在亂碼狀態下沒有意義），故亂碼六欄一律填「亂碼（彙總回報，未逐字元／逐 emoji 區分）」，寬度/辨識度/對齊三欄填「不適用（已亂碼）」。

### 5.1 矩陣本體

| 終端機 | chcp 輸出 | 腳本變體 | ⌨️ 亂碼？ | 💻 亂碼？ | 🌳 亂碼？ | 🌱 亂碼？ | 🌿 亂碼？ | 🤖 亂碼？ | ⌨️ 寬度穩定？(VS16) | 🌳🌱🌿 小字級辨識度 | 雙寬對齊是否整齊 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PS 5.1 + conhost | 未記錄 | emoji-utf8nobom.ps1 | 亂碼（彙總回報，未逐 emoji 區分） | 亂碼（彙總回報，未逐 emoji 區分） | 亂碼（彙總回報，未逐 emoji 區分） | 亂碼（彙總回報，未逐 emoji 區分） | 亂碼（彙總回報，未逐 emoji 區分） | 亂碼（彙總回報，未逐 emoji 區分） | 不適用（已亂碼） | 不適用（已亂碼） | 不適用（已亂碼） |
| PS 5.1 + conhost | 未記錄 | emoji-utf8bom.ps1 | 正常（PS 5.1 環境彙總，未分 conhost/WT） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 穩定（彙總回報） | 清楚可辨（彙總回報） | 未回報異常（彙總回報） |
| PS 5.1 + conhost | 未記錄 | emoji-escape.ps1 | 正常（PS 5.1 環境彙總，未分 conhost/WT） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 穩定（彙總回報） | 清楚可辨（彙總回報） | 未回報異常（彙總回報） |
| PS 5.1 + Windows Terminal | 未記錄 | emoji-utf8nobom.ps1 | 亂碼（彙總回報，未逐 emoji 區分；與 conhost 列同一份使用者回報，未分別驗證） | 亂碼（同左） | 亂碼（同左） | 亂碼（同左） | 亂碼（同左） | 亂碼（同左） | 不適用（已亂碼） | 不適用（已亂碼） | 不適用（已亂碼） |
| PS 5.1 + Windows Terminal | 未記錄 | emoji-utf8bom.ps1 | 正常（PS 5.1 環境彙總，未分 conhost/WT） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 穩定（彙總回報） | 清楚可辨（彙總回報） | 未回報異常（彙總回報） |
| PS 5.1 + Windows Terminal | 未記錄 | emoji-escape.ps1 | 正常（PS 5.1 環境彙總，未分 conhost/WT） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 穩定（彙總回報） | 清楚可辨（彙總回報） | 未回報異常（彙總回報） |
| pwsh 7 + Windows Terminal | 未記錄 | emoji-utf8nobom.ps1 | 正常（彙總回報，使用者開啟後三個變體一起目視確認） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 穩定（彙總回報） | 清楚可辨（彙總回報） | 未回報異常（彙總回報） |
| pwsh 7 + Windows Terminal | 未記錄 | emoji-utf8bom.ps1 | 正常（彙總回報） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 穩定（彙總回報） | 清楚可辨（彙總回報） | 未回報異常（彙總回報） |
| pwsh 7 + Windows Terminal | 未記錄 | emoji-escape.ps1 | 正常（彙總回報） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 穩定（彙總回報） | 清楚可辨（彙總回報） | 未回報異常（彙總回報） |
| bash + MobaXterm（原計畫 VS Code 終端替代） | 未記錄 | emoji-utf8nobom.sh | 正常（彙總回報） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 穩定（彙總回報） | 清楚可辨（彙總回報） | 未回報異常（彙總回報） |
| bash + MobaXterm（原計畫 VS Code 終端替代） | 未記錄 | emoji-utf8bom.sh | 正常（彙總回報） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 正常（同左） | 穩定（彙總回報） | 清楚可辨（彙總回報） | 未回報異常（彙總回報） |

（emoji-escape.ps1 沒有 BOM/無 BOM 之分，因為原始碼純 ASCII；仍納入矩陣是為了在各終端機視覺比對「同樣正確的碼位，畫面渲染是否一致」。實測結果顯示 emoji-escape.ps1 在所有測過的終端機皆與 emoji-utf8bom.ps1 同樣顯示正常，與 §3 剖析層「兩者碼位逐位元組相同」的結論一致。）

### 5.2 逐步操作指引

對矩陣中每一列（終端機 × 腳本變體），依序執行：

1. 開啟對應終端機：
   - 「PS 5.1 + conhost」：開始功能表搜尋「Windows PowerShell」（非 Windows Terminal 版本），開啟後視窗標題應顯示傳統藍底視窗（非 WT 分頁樣式）
   - 「PS 5.1 + Windows Terminal」：開啟 Windows Terminal，於分頁下拉選單新增「Windows PowerShell」分頁
   - 「pwsh 7 + Windows Terminal」：pwsh 7.6.3 已透過 winget/MSIX 安裝完成，於 Windows Terminal 分頁下拉選單新增「PowerShell」分頁（pwsh 7 圖示為黑底，與「Windows PowerShell」的藍底圖示不同，開啟後可用 `$PSVersionTable.PSVersion` 確認版本為 7.x 以免誤開成 PS 5.1 分頁）
   - 「bash + VS Code 終端機」：於 VS Code 開啟本專案，開啟整合終端機快速鍵開啟終端機，於右上角下拉選單切換為 Git Bash（若預設非 Git Bash）
2. 記錄代碼頁：
   - PowerShell 系終端機：輸入 chcp 並 Enter，把輸出（例如「作用中的字碼頁: 950」）填進「chcp 輸出」欄
   - bash 終端機：輸入 chcp.com 亦可讀到 Windows 主控台代碼頁；另外可執行 locale 記錄 LC_CTYPE，一併寫進備註
3. 切換到本目錄：
   ```
   cd "E:\program\git\eztools\magi\06-statusline-ui-refresh\sp1"
   ```
4. 執行對應腳本：
   - PowerShell 系（含 conhost / WT / pwsh）：
     ```powershell
     powershell.exe -NoProfile -File .\emoji-utf8nobom.ps1
     powershell.exe -NoProfile -File .\emoji-utf8bom.ps1
     powershell.exe -NoProfile -File .\emoji-escape.ps1
     ```
     若在 pwsh 7 視窗內，把 powershell.exe 換成 pwsh，或直接執行 .\emoji-xxx.ps1（pwsh 預設執行原則需先設定 Set-ExecutionPolicy -Scope Process Bypass，或改用 pwsh -File 參數）
   - bash：
     ```bash
     bash ./emoji-utf8nobom.sh
     bash ./emoji-utf8bom.sh
     ```
5. 逐項判讀並填入矩陣（只看「寬度標記行」與「對齊行」的畫面呈現，不要看剖析保真行——那行本來就是給程式比對用的 hex，不代表視覺結果）：
   - 亂碼欄：該 emoji 是否顯示為問號、方框、亂碼符號、或完全空白？是則寫「亂碼」並貼 1-2 個實際看到的字元／符號樣本；否則寫「正常」
   - ⌨️ 寬度穩定？(VS16)：與同行其他 emoji（如 🤖）相比，⌨️ 佔用的欄寬是否一致（雙寬 vs 單寬 vs 忽寬忽窄）？若肉眼看起來比其他 emoji 窄，或後面的 |end 標記沒有對齊，記「不穩定」並簡述現象；若一致，記「穩定」
   - 🌳🌱🌿 小字級辨識度：把終端機字級調到平常慣用的 statusline 字級（一般偏小，例如 10-12pt），觀察三者是否能一眼分辨出「樹／幼苗／草」的形狀差異，或糊成一團看不出差別？記「清楚可辨」或「模糊難辨」＋簡述
   - 雙寬對齊是否整齊：看「對齊行」[AAA]🤖[BBB]🌳[CCC]⌨️[DDD] 這一整行，[BBB] [CCC] [DDD] 幾個方括號標記是否維持在畫面上同一種對齊節奏（不需要像等寬字型那樣完全對齊到同一欄，但方括號之間不應該因為某個 emoji 佔用了奇怪的寬度而明顯錯位）？記「整齊」或「錯位」＋簡述
6. 全部列填完後，回到本檔案 §6 補充「人工實測結論」小節（若使用者希望的話），並依 T1.2 的裁決流程（PLAN 治理句：spike 結論若需改 emoji 表，回報使用者再核可後才改 segments.ts）交由下一個任務處理後續裁決，本任務（T1.1）到矩陣填完為止即完成。

---

## 6. 人工實測結論（2026-07-10，T1.2）

### 6.1 使用者口頭回報摘要（2026-07-10，逐字轉述，未逐格追問）

- **PS 5.1 環境**（使用者未區分 conhost／Windows Terminal，兩種宿主以「PS 5.1 環境」一體回報）：**只有 `emoji-utf8nobom.ps1` 會亂碼**；`emoji-utf8bom.ps1` 與 `emoji-escape.ps1` 皆顯示正常。
- **pwsh 7 + Windows Terminal**：使用者開啟後目視檢查，**三個變體皆正常**。
- **bash**：使用者以 **MobaXterm** 取代原計畫的 VS Code 終端機進行測試，**兩個 `.sh` 變體皆完全正常**。
- **⌨️(VS16)**：在測試過的終端機中**寬度／顯示穩定** → 維持 ⌨️，不需換成 💻。
- **🌳🌱🌿**：在使用者平常慣用字級下**清楚可辨** → 維持現狀，不需替換。
- 未記錄 `chcp` 數值；亦未提供逐格精確度（多以彙總印象回報），§5.1 矩陣已就此如實標註（見矩陣上方「填寫來源與精確度警語」）。

### 6.2 與程式層結論（§4）的交叉驗證

使用者的人工回報與 §4 程式層剖析結論**完全吻合、互相印證**：
- PS 5.1 讀 `emoji-utf8nobom.ps1` 在剖析層已證實損毀（§3.2、§4.1）——使用者視覺上也確認唯獨這個變體亂碼，剖析層與顯示層在此案例上**結論一致**（不像 §3.2/§3.5 提到的「重導向輸出」情境會讓正確剖析的檔案在自動化管道下也顯示亂碼——使用者在真正互動式終端機測試中沒有出現這種假性亂碼，證實那確實是自動化管道特有的現象，不影響真實使用情境）。
- `emoji-utf8bom.ps1` 與 `emoji-escape.ps1` 在剖析層皆已證實碼位正確（§3.2、§3.5、§4.2–4.4）——使用者於 PS 5.1、pwsh 7 兩種宿主上皆目視確認顯示正常，與剖析層結論一致。
- bash 兩變體剖析層皆正確（§3.4）——使用者於 MobaXterm 上目視確認皆正常，一致。

### 6.3 T1.2 最終裁決（依 PLAN §Spikes S1 治理句與已裁決前提落地，非本任務新裁決）

**(a) ps1 emitter icon 編碼策略 → 採 `[char]::ConvertFromUtf32()` 碼位跳脫（原始碼純 ASCII，不依賴 BOM）。**
裁決鏈：PS 5.1 無 BOM 已在剖析層（§3.2）與使用者實測（§6.1）雙重證實會壞；複製貼上流程無法保證 BOM 存活（PLAN 原始風險敘述的既有疑慮）；escape 變體已證實在 PS 5.1（Big5 代碼頁）與 pwsh 7.6.3 上皆逐位元組正確、與 BOM 版輸出相同（§3.2、§3.5），且使用者實測亦確認 escape 版在兩種宿主上顯示正常；PLAN 原文預先承諾「若證實，ps1 emitter 改 `[char]::ConvertFromUtf32()` 碼位跳脫（原始碼純 ASCII）」——此條件現已確認成立，本任務落地此既定裁決，非重新決策。

**(b) emoji 對照表 → 不變。**
⌨️(VS16) 經使用者確認寬度／顯示穩定，維持 ⌨️；🌳🌱🌿 經使用者確認小字級下清楚可辨，維持不變。PLAN 治理句「spike 結論若需改 emoji 表，回報使用者再核可後才改 `segments.ts`」的觸發條件（需要改表）本次不成立，故無需另啟核可迴圈——使用者已在本輪測試中一併確認兩項可能觸發改表的疑慮（VS16 寬度、植物 emoji 辨識度）均無問題。

此二項裁決已同步記錄於 `../PLAN.md`「### 已裁決：其他」節與「## Spikes」S1 條目附註。
