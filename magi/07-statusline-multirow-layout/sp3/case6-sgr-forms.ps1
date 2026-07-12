# Spike S3 case6（追加診斷）: SGR 形式支援矩陣——一列一種 ANSI 形式，
# 一次真機 session 判定 Claude Code statusline 解析器支援哪些色碼。
#
# 背景：官方文件與 issues（#16790、#6466）指 statusline 僅支援基本 16 色 SGR，
# 256 色（38;5;n／48;5;n）與 truecolor（38;2;r;g;b）會以字面文字滲出；且
# 「合併碼鏈」（\e[42;30m）可用、「分開碼鏈」（\e[42m\e[30m）可能失效。
# 本案逐列驗證上述每一條，作為產品色彩管線（現行 ColorSpec＝ansi256／
# truecolor 兩軌）衝擊評估的真機證據。
#
# 每列預期觀察：該列標籤文字是否上色？或色碼以 [xx m 字面滲出？
#   row1 對照組（無色碼）；row2/3 基本 16 色（現役 statusline 已證可用）；
#   row4 合併 vs 分開碼鏈對比（同列左右兩段）；row5 粗體；
#   row6 256 色前景/背景（預期滲碼）；row7 truecolor（預期滲碼）。
#
# ⚠ 本檔必須以「UTF-8 含 BOM」儲存（PS 5.1 無 BOM 會誤解析中文註解、吞掉
# 下一行程式碼，詳見 case1 檔頭與 REPORT.md §4-A）。
$e = [char]27

$rows = @(
    "row1 plain control (no ANSI)",
    "row2 16fg: $e[31mred$e[0m $e[32mgreen$e[0m $e[34mblue$e[0m $e[36mcyan$e[0m",
    "row3 bright: $e[92mbright-green$e[0m $e[93mbright-yellow$e[0m $e[90mgray$e[0m",
    "row4 combined:$e[42;30m[42;30m-ok?$e[0m separate:$e[42m$e[30m[42m+[30m-ok?$e[0m",
    "row5 bold: $e[1mbold-text$e[0m then-normal",
    "row6 256: $e[38;5;196mfg-196-red$e[0m $e[48;5;24mbg-24-blue$e[0m",
    "row7 truecolor: $e[38;2;255;128;0mrgb-orange$e[0m"
)

[Console]::Out.Write($rows -join "`n")
