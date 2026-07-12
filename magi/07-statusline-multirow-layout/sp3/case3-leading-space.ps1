# Spike S3 case3: 列首帶空白（第 2 列開頭 4 個空格、第 3 列開頭 1 個 tab、
# 第 4 列開頭 8 個空格；第 1 列無縮排作對照基準），無尾隨換行。
#
# 驗什麼／預期觀察什麼：同 case3.sh——Claude Code 是否 trim 掉列首空白
# （約束 padding 契約）。觀察法：比較各列 "[" 起始字元與第 1 列的水平對齊
# 位置，判斷空白是否被保留。
#
# 原始碼純 ASCII。
$row1 = '[0sp]baseline'
$row2 = '    [4sp]indent-4'
$row3 = "`t[tab]indent-tab"
$row4 = '        [8sp]indent-8'

$out = $row1 + "`n" + $row2 + "`n" + $row3 + "`n" + $row4
[Console]::Out.Write($out)
