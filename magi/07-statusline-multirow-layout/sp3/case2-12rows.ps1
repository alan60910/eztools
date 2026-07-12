# Spike S3 case2: 12 列（每列標號 row 01..row 12，供肉眼數列），無尾隨換行。
#
# 驗什麼／預期觀察什麼：同 case2.sh——Claude Code 對多列 statusline 是否有
# 列數上限（12 列是否全數渲染）、超過上限時的截斷行為（截頭／截尾／整段消失）。
#
# 原始碼純 ASCII。
$e = [char]27
$colors = @(196, 208, 220, 46, 51, 21, 129, 201, 227, 118, 39, 205)

$rows = @()
for ($i = 1; $i -le 12; $i++) {
    $n = '{0:D2}' -f $i
    $color = $colors[$i - 1]
    $rows += "$e[38;5;${color}m row $n - marker-$n $e[0m"
}

$out = [string]::Join("`n", $rows)
[Console]::Out.Write($out)
