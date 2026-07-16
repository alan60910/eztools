# Spike S7 (magi/08-statusline-catalog-expansion/PLAN.md section 2, S7).
# bar/countdown minimal case, plain variant, PS1 "[char]0xHEX codepoint
# escape" form (PLAN section 3 "ps1 non-ASCII value literal escaping"
# contract, comparison group B; mirrors emit-ps1.ts iconGlyphExpr /
# $ARROW idiom -- a BMP single codepoint uses [char]0xHEX; see
# emit-ps1.ts:125-133,681).
#
# IMPORTANT (deliberate test condition): this file is written with
# ASCII-only comments on purpose (not the usual zh-TW comment
# convention) so that the ENTIRE source, not just the value literals,
# is pure ASCII bytes with no BOM required -- isolating whether the
# codepoint-escape technique alone (independent of BOM/system codepage)
# is sufficient for correct PS 5.1 parsing and correct stdout bytes for
# U+2588 / U+2591 / U+21BA. Compare against the UTF-8-literal-embed form
# in case-bar-countdown-plain.ps1 (which DOES need a BOM, and DOES use
# zh-TW comments per project convention) -- stdout bytes of both forms
# should be identical (see REPORT.md).
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$e = [char]27

$block = [char]0x2588   # U+2588 (block element, FULL BLOCK)
$light = [char]0x2591   # U+2591 (light shade)
$refresh = [char]0x21BA # U+21BA (anticlockwise open circle arrow)

$fill = [string]$block * 12
$empty = [string]$light * 8

$row1 = "bar:$e[38;5;46m$fill$e[0m$e[38;5;240m$empty$e[0m $e[38;5;220m60%$e[0m"
$row2 = "$e[38;5;51m$refresh 2h (14:30)$e[0m"

$out = $row1 + "`n" + $row2
[Console]::Out.Write($out)
