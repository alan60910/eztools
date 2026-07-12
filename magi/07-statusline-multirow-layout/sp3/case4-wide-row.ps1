# Spike S3 case4: 超寬列（單列 320 字元，10 字元一格標尺：
# 0---------1---------2---------…），第 2 列為短標記列作對照，無尾隨換行。
#
# 驗什麼／預期觀察什麼：同 case4.sh——終端對超寬 statusline 列的處理（自動
# 換行／橫向截斷／橫向捲動），換行點落在標尺第幾格，以及超寬列是否吃掉了
# 原本屬於第 2 列的渲染位置。
#
# 原始碼純 ASCII。
$e = [char]27

$ruler = ''
for ($i = 0; $i -le 31; $i++) {
    $d = $i % 10
    $ruler += "$d---------"
}
# ruler 現長 320 字元（32 格 x 10 字元）

$row1 = "$e[38;5;45m$ruler$e[0m"
$row2 = 'END-OF-WIDE-ROW marker-row-2'

$out = $row1 + "`n" + $row2
[Console]::Out.Write($out)
