# Spike S7 (same as case-bar-countdown-plain.escaped.ps1) -- powerline
# variant, PS1 "[char]0xHEX codepoint escape" form, ASCII-only comments
# on purpose (see plain.escaped.ps1 header for rationale). Bg-block
# style: compare against the plain variant (fg-only) to confirm the
# same three characters render correctly under both color contexts.
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$e = [char]27

$block = [char]0x2588   # U+2588 (block element, FULL BLOCK)
$light = [char]0x2591   # U+2591 (light shade)
$refresh = [char]0x21BA # U+21BA (anticlockwise open circle arrow)

$fill = [string]$block * 12
$empty = [string]$light * 8

$row1 = "$e[48;5;22m$e[38;5;46m bar $e[0m$e[48;5;22m$e[38;5;46m$fill$e[0m$e[48;5;238m$e[38;5;250m$empty$e[0m$e[48;5;220m$e[38;5;16m 60% $e[0m"
$row2 = "$e[48;5;24m$e[38;5;231m $refresh 2h (14:30) $e[0m"

$out = $row1 + "`n" + $row2
[Console]::Out.Write($out)
