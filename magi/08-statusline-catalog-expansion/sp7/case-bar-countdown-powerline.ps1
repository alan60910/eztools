# Spike S7（同上）——bar／countdown powerline 變體，PS1「UTF-8 字面
# 直嵌」形（BOM 儲存，對照組 A）。bg 色塊版：對照 plain 變體（fg-only）
# 驗證同三字元在兩種色彩語境是否皆正常渲染。
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$e = [char]27

$fill = "████████████"
$empty = "░░░░░░░░"

$row1 = "$e[48;5;22m$e[38;5;46m bar $e[0m$e[48;5;22m$e[38;5;46m$fill$e[0m$e[48;5;238m$e[38;5;250m$empty$e[0m$e[48;5;220m$e[38;5;16m 60% $e[0m"
$row2 = "$e[48;5;24m$e[38;5;231m ↺ 2h (14:30) $e[0m"

$out = $row1 + "`n" + $row2
[Console]::Out.Write($out)
