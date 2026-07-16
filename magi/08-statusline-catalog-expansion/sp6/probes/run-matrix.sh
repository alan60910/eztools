#!/usr/bin/env bash
# S6-T2.5 spike：三後端（PS 5.1／pwsh 7／jq／Node）同 epoch %m/%d %H:%M 對拍。
# 用法：./run-matrix.sh <label> <output-file>
# 前提：呼叫端已自行處理 tzutil 切換／還原；本腳本只讀當下系統時區跑對拍、
# 不動 tzutil。
set -u
LABEL="${1:?usage: run-matrix.sh <label> <output-file>}"
OUT="${2:?usage: run-matrix.sh <label> <output-file>}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JQ="E:/program/git/eztools/magi/05-statusline-builder/sp5/tools/jq-windows-amd64.exe"

declare -A EPOCHS=(
  [general]=1784118896       # 2026-07-15T12:34:56Z
  [monthBoundary]=1769902200 # 2026-01-31T23:30:00Z
  [yearBoundary]=1767223800  # 2025-12-31T23:30:00Z
  [dstNear]=1772955000       # 2026-03-08T07:30:00Z（US Eastern DST 跳點 07:00 UTC 後）
)

{
  echo "=== label=${LABEL} ==="
  echo "system tzutil=$(MSYS_NO_PATHCONV=1 tzutil /g)"
  echo "date=$(date -u)"
  echo ""
  for name in general monthBoundary yearBoundary dstNear; do
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
    else
      echo "[pwsh 7] (not found on PATH, skip)"
    fi
    echo ""
  done
} | tee "${OUT}"
