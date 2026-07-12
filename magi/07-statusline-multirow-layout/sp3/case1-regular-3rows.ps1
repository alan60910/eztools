# Spike S3 case1: 2-3 常規列（含 ANSI SGR 前景/背景色，每列行尾 reset 在 LF
# 之前），無尾隨換行——模擬真實 statusline-builder 產出最接近的形狀。
#
# 驗什麼／預期觀察什麼：
# - Claude Code 是否忠實逐列渲染（3 列各自的顏色不串色、不互相污染）
# - 對照組見 case5-trailing-lf.ps1（內容逐位元組相同、唯 $out 尾端多接一個
#   `n）：兩者渲染結果應等價，若不等價則行尾契約（無尾隨換行）需重新裁決
#
# ⚠ 本檔必須以「UTF-8 含 BOM」儲存：Windows PowerShell 5.1 對無 BOM 檔一律以
# ANSI（本機 CP950）解析，中文註解的 UTF-8 位元組會被誤讀成 DBCS、其尾位元組
# 吞掉換行，導致下一行程式碼（$e 賦值）被併入註解而未執行——實測 ESC 全數
# 消失、色碼以字面滲出（2026-07-11 根因分析，見 REPORT.md §4-A）。
$e = [char]27

$row1 = "$e[1m$e[48;5;24m$e[38;5;231m model $e[0m $e[38;5;220mcwd:~/project$e[0m"
$row2 = "$e[38;5;114mgit:main$e[0m $e[48;5;196m$e[38;5;231m ctx:92% $e[0m"
$row3 = "$e[38;5;213mcost:`$0.42$e[0m $e[38;5;51m12:34$e[0m"

$out = $row1 + "`n" + $row2 + "`n" + $row3
[Console]::Out.Write($out)
