#!/usr/bin/env bash
# S6-T2.5 bonus 探針：pin 一個「有 DST」的系統時區（US Eastern），對
# 2026-03-08 春季調快瞬間前後兩 epoch 求 %m/%d %H:%M，特徵化「若不選無 DST
# 區釘樁」的實際風險（供報告佐證選 UTC/Asia-Taipei 的理由）。
set -u
LABEL="${1:?usage: run-dst-check.sh <label> <output-file>}"
OUT="${2:?usage: run-dst-check.sh <label> <output-file>}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JQ="E:/program/git/eztools/magi/05-statusline-builder/sp5/tools/jq-windows-amd64.exe"

declare -A EPOCHS=(
  [beforeJump]=1772951400 # 2026-03-08T06:30:00Z = 01:30 EST（跳點前）
  [afterJump]=1772955000  # 2026-03-08T07:30:00Z = 03:30 EDT（跳點後，02:xx 不存在）
)

{
  echo "=== label=${LABEL} ==="
  echo "system tzutil=$(MSYS_NO_PATHCONV=1 tzutil /g)"
  for name in beforeJump afterJump; do
    epoch="${EPOCHS[$name]}"
    echo "--- epoch case=${name} value=${epoch} (utc=$(node -e "console.log(new Date(${epoch}*1000).toISOString())")) ---"
    echo "[node]"
    node "${HERE}/probe-node.mjs" "${epoch}"
    echo "[jq strflocaltime]"
    echo "{\"epoch\":${epoch}}" | "${JQ}" -r '.epoch | strflocaltime("%m/%d %H:%M")'
    echo "[powershell 5.1]"
    powershell.exe -NoProfile -File "${HERE}/probe-ps.ps1" -Epoch "${epoch}"
    if command -v pwsh >/dev/null 2>&1; then
      echo "[pwsh 7]"
      pwsh -NoProfile -File "${HERE}/probe-ps.ps1" -Epoch "${epoch}"
    fi
    echo ""
  done
} | tee "${OUT}"
