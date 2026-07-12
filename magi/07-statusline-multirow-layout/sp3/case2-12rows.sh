#!/usr/bin/env bash
# Spike S3 case2: 12 列（每列標號 row 01..row 12，供肉眼數列），無尾隨換行。
#
# 驗什麼／預期觀察什麼：
# - Claude Code 對多列 statusline 是否有列數上限（12 列是否全數渲染出來）
# - 若有上限：超過上限的列是被截頭（砍前面）、截尾（砍後面）、還是整段 statusline
#   完全不顯示？記錄實際看到「第幾列」到「第幾列」
ESC=$'\033'
colors=(196 208 220 46 51 21 129 201 227 118 39 205)

out=""
for i in $(seq 1 12); do
  n=$(printf '%02d' "$i")
  color="${colors[$((i - 1))]}"
  row="${ESC}[38;5;${color}m row ${n} - marker-${n} ${ESC}[0m"
  if [ "$i" -eq 1 ]; then
    out="$row"
  else
    out+=$'\n'"$row"
  fi
done

printf '%s' "$out"
