# Spike S3 case5: 與 case1-regular-3rows.ps1 內容逐位元組相同，唯一差異是
# $out 尾端多接一個 `n（換行），而非在 case1 保持無尾隨換行。
#
# 驗什麼／預期觀察什麼：同 case5.sh——與 case1 對照，觀察 Claude Code 對
# 「無尾隨換行」vs「有尾隨換行」statusline 輸出的渲染是否等價（約束行尾契約）。
#
# ⚠ 本檔必須以「UTF-8 含 BOM」儲存（PS 5.1 無 BOM 會誤解析中文註解、吞掉
# 下一行程式碼，詳見 case1 檔頭與 REPORT.md §4-A）。
$e = [char]27

$row1 = "$e[1m$e[48;5;24m$e[38;5;231m model $e[0m $e[38;5;220mcwd:~/project$e[0m"
$row2 = "$e[38;5;114mgit:main$e[0m $e[48;5;196m$e[38;5;231m ctx:92% $e[0m"
$row3 = "$e[38;5;213mcost:`$0.42$e[0m $e[38;5;51m12:34$e[0m"

$out = $row1 + "`n" + $row2 + "`n" + $row3 + "`n"
[Console]::Out.Write($out)
