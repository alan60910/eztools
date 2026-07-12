#!/usr/bin/env bash
# Spike S3 case1: 2-3 常規列（含 ANSI SGR 前景/背景色，每列行尾 reset 在 LF
# 之前），無尾隨換行——模擬真實 statusline-builder 產出最接近的形狀。
#
# 驗什麼／預期觀察什麼：
# - Claude Code 是否忠實逐列渲染（3 列各自的顏色不串色、不互相污染）
# - 對照組見 case5-trailing-lf.sh（內容逐位元組相同、唯尾端多一個 LF）：
#   兩者渲染結果應等價，若不等價則行尾契約（無尾隨換行）需重新裁決
ESC=$'\033'

row1="${ESC}[1m${ESC}[48;5;24m${ESC}[38;5;231m model ${ESC}[0m ${ESC}[38;5;220mcwd:~/project${ESC}[0m"
row2="${ESC}[38;5;114mgit:main${ESC}[0m ${ESC}[48;5;196m${ESC}[38;5;231m ctx:92% ${ESC}[0m"
row3="${ESC}[38;5;213mcost:\$0.42${ESC}[0m ${ESC}[38;5;51m12:34${ESC}[0m"

out="${row1}"$'\n'"${row2}"$'\n'"${row3}"
printf '%s' "$out"
