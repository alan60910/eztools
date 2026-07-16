#!/usr/bin/env bash
# Spike S7（magi/08-statusline-catalog-expansion/PLAN.md §2 S7；沿
# magi/07-statusline-multirow-layout/sp3/ harness 慣例延伸）——
# bar／countdown 兩段最小 case，plain 變體：驗 `█`(U+2588)／`░`(U+2591)／
# `↺`(U+21BA) 三字元在真機 Claude Code statusline 的渲染。07 M1.5 曾證
# statusline 完全不接受 emoji（見 07/prefix-table.md）；此三字元非
# emoji（Block Elements／Arrows、單一 BMP codepoint、無 VS16）但同為
# 非 ASCII、從未真機驗過，此 case 補測。
#
# 列 1 ＝ 模擬 bar 段（20 格：12 filled + 8 empty ＝ 60%，plain＝純文字
# fg 上色、無 bg 色塊）；列 2 ＝ 模擬倒數段 `↺ 2h (14:30)`（plain fg 上色）。
# 對照 powerline 變體見 case-bar-countdown-powerline.sh（bg 色塊版，同
# 三字元字面、同 4-run 形，僅上色語法不同）。無尾隨換行（沿 sp3 案
# case5 已證「無尾隨換行 vs 有尾隨換行」渲染等價，本 case 統一採現行
# 產生器慣例「無尾隨換行」）。
ESC=$'\033'

FILL="████████████"
EMPTY="░░░░░░░░"

row1="bar:${ESC}[38;5;46m${FILL}${ESC}[0m${ESC}[38;5;240m${EMPTY}${ESC}[0m ${ESC}[38;5;220m60%${ESC}[0m"
row2="${ESC}[38;5;51m↺ 2h (14:30)${ESC}[0m"

out="${row1}"$'\n'"${row2}"
printf '%s' "$out"
