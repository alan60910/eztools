#!/usr/bin/env bash
# Spike S3 case3: 列首帶空白（第 2 列開頭 4 個空格、第 3 列開頭 1 個 tab、
# 第 4 列開頭 8 個空格；第 1 列無縮排作對照基準），無尾隨換行。
#
# 驗什麼／預期觀察什麼：
# - Claude Code 是否 trim 掉列首空白（約束 padding 契約：若 trim 掉，
#   statusline-builder 未來的「列首縮排」設計就不可行／需改用其他字元）
# - 觀察法：比較各列 "[" 起始字元與第 1 列（無縮排基準列）的水平對齊位置——
#   若對齊在同一欄＝空白被 trim；若第 2/3/4 列明顯右移＝空白被保留
ESC=$'\033'

row1="[0sp]baseline"
row2="    [4sp]indent-4"
row3=$'\t'"[tab]indent-tab"
row4="        [8sp]indent-8"

out="${row1}"$'\n'"${row2}"$'\n'"${row3}"$'\n'"${row4}"
printf '%s' "$out"
