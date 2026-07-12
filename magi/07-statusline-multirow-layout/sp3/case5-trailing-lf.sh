#!/usr/bin/env bash
# Spike S3 case5: 與 case1-regular-3rows.sh 內容逐位元組相同，唯一差異是
# 尾端多一個 LF（printf '%s\n' 而非 printf '%s'）。
#
# 驗什麼／預期觀察什麼：
# - 與 case1 對照，觀察 Claude Code 對「無尾隨換行」vs「有尾隨換行」statusline
#   輸出的渲染是否等價（約束行尾契約：若不等價，三處 emitter/oracle 需同步
#   決定是否統一補一個尾隨 LF）
ESC=$'\033'

row1="${ESC}[1m${ESC}[48;5;24m${ESC}[38;5;231m model ${ESC}[0m ${ESC}[38;5;220mcwd:~/project${ESC}[0m"
row2="${ESC}[38;5;114mgit:main${ESC}[0m ${ESC}[48;5;196m${ESC}[38;5;231m ctx:92% ${ESC}[0m"
row3="${ESC}[38;5;213mcost:\$0.42${ESC}[0m ${ESC}[38;5;51m12:34${ESC}[0m"

out="${row1}"$'\n'"${row2}"$'\n'"${row3}"
printf '%s\n' "$out"
