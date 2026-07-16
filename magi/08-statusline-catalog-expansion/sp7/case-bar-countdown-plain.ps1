# Spike S7（magi/08-statusline-catalog-expansion/PLAN.md §2 S7；沿
# magi/07-statusline-multirow-layout/sp3/ harness 慣例延伸）——
# bar／countdown 兩段最小 case，plain 變體，PS1「UTF-8 字面直嵌」形
# （PLAN §3 ps1 非 ASCII 值字面跳脫條款的對照組 A）：`█`／`░`／`↺` 三
# 字元直接以 UTF-8 字面寫入原始碼，本檔**必須以 UTF-8 含 BOM 儲存**
# （PS 5.1 對無 BOM 檔一律以系統 ANSI 誤讀，見 sp3/REPORT.md §4-A 根因
# 分析）。檔頭三行 Input/OutputEncoding 設定沿生產 emit-ps1.ts 契約
# （emit-ps1.ts:676-678）。
#
# 對照 escaped 形見 case-bar-countdown-plain.escaped.ps1（[char]0xHEX
# 碼位跳脫、純 ASCII 原始碼）——兩形 stdout bytes 應等價（REPORT.md 證）。
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$e = [char]27

$fill = "████████████"
$empty = "░░░░░░░░"

$row1 = "bar:$e[38;5;46m$fill$e[0m$e[38;5;240m$empty$e[0m $e[38;5;220m60%$e[0m"
$row2 = "$e[38;5;51m↺ 2h (14:30)$e[0m"

$out = $row1 + "`n" + $row2
[Console]::Out.Write($out)
