#!/usr/bin/env bash
# Spike S7（同上，powerline 變體）——bg 色塊版：bar 段 filled／empty
# 各自一個 bg 色塊、百分比另一色塊；倒數段整段一個 bg 色塊。三字元
# （█／░／↺）與 plain 變體逐位元組相同字面，僅上色語法（fg-only →
# bg+fg 色塊）不同，供對照「同字元在兩種色彩語境是否皆正常渲染」。
ESC=$'\033'

FILL="████████████"
EMPTY="░░░░░░░░"

row1="${ESC}[48;5;22m${ESC}[38;5;46m bar ${ESC}[0m${ESC}[48;5;22m${ESC}[38;5;46m${FILL}${ESC}[0m${ESC}[48;5;238m${ESC}[38;5;250m${EMPTY}${ESC}[0m${ESC}[48;5;220m${ESC}[38;5;16m 60% ${ESC}[0m"
row2="${ESC}[48;5;24m${ESC}[38;5;231m ↺ 2h (14:30) ${ESC}[0m"

out="${row1}"$'\n'"${row2}"
printf '%s' "$out"
