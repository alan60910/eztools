# S3 spike 實測步驟清單

任務：T1.1（見 `../TASKS.md` Milestone 1）。
本檔只列「怎麼測」與「測什麼」；**結果一律記錄到 `REPORT.md`，本檔不含任何實測數據**。

---

## 0. 背景／要驗證的三個契約點

1. **列首 trim 行為**（約束 padding 契約）：Claude Code 是否會 trim 掉 statusline
   輸出中每列開頭的空白／tab？若會，未來多列引擎就不能靠「列首空白」做縮排。
2. **無尾隨換行渲染等價性**（約束行尾契約）：目前 emitter 慣例是「多列以單一
   LF join、整個輸出不帶尾隨換行」（`printf '%s' "$out"` / `[Console]::Out.Write($out)`）。
   要驗證：Claude Code 對「無尾隨換行」與「有尾隨換行」兩種輸出是否渲染等價。
   若不等價，三處（`emit-bash.ts`／`emit-ps1.ts`／oracle）需同步改成一律補一個
   尾隨 LF（PLAN 已預留此分支，見 PLAN.md §行尾契約）。
3. **列數上限與截斷行為**：12 列是否全數渲染；若有上限，超過時如何截斷
   （截頭／截尾／整段消失）。

---

## 1. 接法：settings.json 範例

編輯 `C:\Users\alan6\.claude\settings.json`（**若已有 `statusLine` 區塊，先把
原內容備份到別處，測完記得還原**——見 §4）。

下列路徑請換成本機 `sp3/` 目錄的實際絕對路徑（forward-slash 或雙反斜線皆可）。

### bash 案例（`.sh`）

Windows 上沒有原生 shebang 關聯，需顯式呼叫 Git Bash 的 `bash.exe`：

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash E:/program/git/eztools/magi/07-statusline-multirow-layout/sp3/case1-regular-3rows.sh"
  }
}
```

若 `bash` 不在 PATH，改用完整路徑，例如：

```json
{
  "statusLine": {
    "type": "command",
    "command": "\"C:/Program Files/Git/bin/bash.exe\" E:/program/git/eztools/magi/07-statusline-multirow-layout/sp3/case1-regular-3rows.sh"
  }
}
```

### PowerShell 案例（`.ps1`）

> **⚠ PS 5.1 編碼陷阱（2026-07-11 根因分析）**：`powershell`（Windows
> PowerShell 5.1）對「UTF-8 無 BOM」的 `.ps1` 一律以 ANSI（CP950）解析，
> 中文註解會被誤讀並吞掉下一行程式碼（實測 `$e = [char]27` 未執行、ESC
> 全失、色碼字面滲出）。本目錄全部 `.ps1` 已改存「UTF-8 含 BOM」；若新增
> 或改存腳本，**務必保留 BOM**（或改用 `pwsh` 接線）。詳見 REPORT.md §4-A。

沿用 `tools/statusline-builder/emit-settings.ts` 的既定 wrapper 慣例
（`-NoProfile -ExecutionPolicy Bypass -File`，繞過 MOTW／預設 ExecutionPolicy）：

```json
{
  "statusLine": {
    "type": "command",
    "command": "powershell -NoProfile -ExecutionPolicy Bypass -File E:/program/git/eztools/magi/07-statusline-multirow-layout/sp3/case1-regular-3rows.ps1"
  }
}
```

每次只測一個案例：把 `command` 換成對應的 `sp3/caseN-*.sh` 或 `.ps1` 路徑，存檔後
開一個「新的」Claude Code session（statusline 於 session 啟動時讀取一次；若沒
刷新，開新 session 最保險）。

---

## 2. 實測矩陣（5 案 × 2 shell × 2 終端 = 20 組合）

逐一切換 `command` 指向下列 20 個組合，於對應終端開新 session 觀察並填入
`REPORT.md` 對應儲存格。

| # | 案例 | shell | 終端 |
|---|------|-------|------|
| 1 | case1-regular-3rows | .sh | Windows Terminal |
| 2 | case1-regular-3rows | .sh | VS Code 終端 |
| 3 | case1-regular-3rows | .ps1 | Windows Terminal |
| 4 | case1-regular-3rows | .ps1 | VS Code 終端 |
| 5 | case2-12rows | .sh | Windows Terminal |
| 6 | case2-12rows | .sh | VS Code 終端 |
| 7 | case2-12rows | .ps1 | Windows Terminal |
| 8 | case2-12rows | .ps1 | VS Code 終端 |
| 9 | case3-leading-space | .sh | Windows Terminal |
| 10 | case3-leading-space | .sh | VS Code 終端 |
| 11 | case3-leading-space | .ps1 | Windows Terminal |
| 12 | case3-leading-space | .ps1 | VS Code 終端 |
| 13 | case4-wide-row | .sh | Windows Terminal |
| 14 | case4-wide-row | .sh | VS Code 終端 |
| 15 | case4-wide-row | .ps1 | Windows Terminal |
| 16 | case4-wide-row | .ps1 | VS Code 終端 |
| 17 | case5-trailing-lf | .sh | Windows Terminal |
| 18 | case5-trailing-lf | .sh | VS Code 終端 |
| 19 | case5-trailing-lf | .ps1 | Windows Terminal |
| 20 | case5-trailing-lf | .ps1 | VS Code 終端 |

「Windows Terminal」＝獨立開啟 `wt` 執行 `claude`；「VS Code 終端」＝VS Code
內建整合終端機（bash 或 pwsh 皆可，依 shell 案例對應終端 profile；不要用 VS
Code 的其他外部終端）。

---

## 3. 每案要觀察並記錄的具體項目

### 通用（每組合都要記）
- statusline 是否有顯示內容？有無錯誤訊息／空白／崩潰？
- 實際渲染出幾列？（肉眼數）
- 是否有多餘空行（不屬於任何案例設計的空白列）？

### case1-regular-3rows（2-3 常規列＋顏色）
- 3 列的前景／背景色是否各自正確（無跨列污染、無顏色殘留到下一列開頭）？
- 3 列是否確實各自獨立一行（無被擠成一行或黏在一起）？

### case2-12rows（12 列，列首標號 row 01..row 12）
- 12 列是否全數可見？若否，實際看到「第幾列」到「第幾列」（例如只看到
  row 05..row 12，或只看到 row 01..row 08）？
- 若有截斷：截斷發生在畫面／終端視窗的哪個位置（頂部被砍／底部被砍／
  中間跳過）？是否有任何提示文字（如「...」或「N more lines」）？

### case3-leading-space（列首空白：4 空格／tab／8 空格）
- 用第 1 列（`[0sp]baseline`，無縮排）當基準列，比較第 2/3/4 列的 `[` 起始
  字元是否與基準列對齊在同一欄：
  - 若對齊在同一欄 → 空白／tab 被 trim 掉
  - 若第 2/3/4 列明顯右移 → 空白／tab 被保留（保留量是否符合設計：4 空格
    ≈ 4 欄、tab ≈ 終端 tab-stop 寬度、8 空格 ≈ 8 欄）

### case4-wide-row（單列 320 字元標尺＋短標記列）
- 超寬列如何處理：自動換行（wrap 到下一行）／橫向截斷（不換行，超出視窗
  寬度部分被砍掉，需捲動或縮小字級才看得到）／橫向捲動？
- 若自動換行：換行點落在標尺的第幾格（可讀標尺數字，例如「換行前最後
  可見數字是 7，格式為每格 10 字元」）？
- 第 2 列（`END-OF-WIDE-ROW marker-row-2`）是否仍正確顯示為獨立一列（第 1
  列超寬是否吃掉了第 2 列本該渲染的位置）？

### case5-trailing-lf（與 case1 內容相同，尾端多一個 LF）
- 與 case1 直接比較（同終端、同 shell）：畫面呈現是否**完全相同**？
- 若不同：具體差異是什麼（多一行空白列／statusline 高度變化／內容錯位／
  游標位置偏移／其他）？

### case6-sgr-forms（追加診斷，2026-07-11：SGR 形式支援矩陣，僅 `.ps1`）
一列一種 ANSI 形式，逐列記錄「有上色」或「色碼字面滲出」，結果填
REPORT.md §4-C：
- row1 無色碼對照組：應為純文字
- row2 基本 16 色／row3 亮色系（90–97）：預期上色（現役 statusline 已證可用）
- row4 同列左右對比：左＝合併碼鏈 `[42;30m`、右＝分開碼鏈 `[42m`+`[30m`
  ——依 issue #6466 預期左可用、右失效，記錄實際
- row5 粗體 `[1m`
- row6 256 色 fg（38;5;196）／bg（48;5;24）、row7 truecolor（38;2;…）：
  依官方文件預期滲碼，記錄實際

---

## 4. 收工／還原

1. 把 `C:\Users\alan6\.claude\settings.json` 的 `statusLine` 區塊改回（或移除）
   測試前的原始設定。
2. 若有存螢幕截圖，放在本目錄（`sp3/`）並在 `REPORT.md` 對應儲存格註記檔名。
3. 20 組合填完後，回填 `REPORT.md` 底部三個「結論」小節。
