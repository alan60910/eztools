#!/usr/bin/env bash
# Spike T2.2 (S2) - now injection idiom, full matrix driver.
# Re-runnable: bash magi/08-statusline-catalog-expansion/sp2/run-all.sh
# Requires: jq exe at ../../05-statusline-builder/sp5/tools/jq-windows-amd64.exe
#           powershell.exe (PS 5.1) and pwsh (7.x) on PATH.
set -u
cd "$(dirname "$0")"

JQ="../../05-statusline-builder/sp5/tools/jq-windows-amd64.exe"
NAIVE_EXPR='((env.STATUSLINE_NOW_EPOCH // (now|floor))|tonumber)'
SAFE_EXPR='(env.STATUSLINE_NOW_EPOCH // empty | tonumber?) // (now|floor)'

echo "########## jq versions / PowerShell versions ##########"
"$JQ" --version
powershell.exe -NoProfile -Command '"PS5.1 " + $PSVersionTable.PSVersion.ToString()'
pwsh -NoProfile -Command '"pwsh7 " + $PSVersionTable.PSVersion.ToString()'

echo ""
echo "########## jq half: naive expr (proves non-numeric path errors) ##########"
echo "expr: $NAIVE_EXPR"
unset STATUSLINE_NOW_EPOCH
echo "-- (a) unset --"; echo '{}' | "$JQ" -n "$NAIVE_EXPR"; echo "exit: $?"
export STATUSLINE_NOW_EPOCH=1783497600
echo "-- (b) legit=1783497600 --"; echo '{}' | "$JQ" -n "$NAIVE_EXPR"; echo "exit: $?"
unset STATUSLINE_NOW_EPOCH
export STATUSLINE_NOW_EPOCH=abc
echo "-- (c) nonnumeric=abc --"; echo '{}' | "$JQ" -n "$NAIVE_EXPR"; echo "exit: $?"
unset STATUSLINE_NOW_EPOCH

echo ""
echo "########## jq half: safe idiom (probe.jq, -f) ##########"
echo "expr: $SAFE_EXPR"
unset STATUSLINE_NOW_EPOCH
echo "-- (a) unset --"; echo '{}' | "$JQ" -n -f probe.jq; echo "exit: $?"
export STATUSLINE_NOW_EPOCH=1783497600
echo "-- (b) legit=1783497600 --"; echo '{}' | "$JQ" -n -f probe.jq; echo "exit: $?"
unset STATUSLINE_NOW_EPOCH
export STATUSLINE_NOW_EPOCH=abc
echo "-- (c) nonnumeric=abc --"; echo '{}' | "$JQ" -n -f probe.jq; echo "exit: $?"
unset STATUSLINE_NOW_EPOCH
export STATUSLINE_NOW_EPOCH=""
echo "-- (d) explicit empty string (bonus edge case) --"; echo '{}' | "$JQ" -n -f probe.jq; echo "exit: $?"
unset STATUSLINE_NOW_EPOCH

echo ""
echo "########## ps1 half: cast trap check (trap-check.ps1) ##########"
echo "-- PS 5.1 --"
powershell.exe -NoProfile -File ./trap-check.ps1
echo "exit: $?"
echo "-- pwsh 7 --"
pwsh -NoProfile -File ./trap-check.ps1
echo "exit: $?"

echo ""
echo "########## ps1 half: TryParse no-throw check (tryparse-check.ps1) ##########"
echo "-- PS 5.1 --"
powershell.exe -NoProfile -File ./tryparse-check.ps1 2>&1 | grep -E "^TryParse"
echo "-- pwsh 7 --"
pwsh -NoProfile -File ./tryparse-check.ps1 2>&1 | grep -E "^TryParse"

echo ""
echo "########## ps1 half: final idiom (probe.ps1), 3 paths x {PS5.1, pwsh7} ##########"
for shellbin in powershell.exe pwsh; do
  echo "===== $shellbin ====="
  unset STATUSLINE_NOW_EPOCH
  echo "-- (a) unset --"; "$shellbin" -NoProfile -File ./probe.ps1; echo "exit: $?"
  export STATUSLINE_NOW_EPOCH=1783497600
  echo "-- (b) legit=1783497600 --"; "$shellbin" -NoProfile -File ./probe.ps1; echo "exit: $?"
  unset STATUSLINE_NOW_EPOCH
  export STATUSLINE_NOW_EPOCH=abc
  echo "-- (c) nonnumeric=abc --"; "$shellbin" -NoProfile -File ./probe.ps1; echo "exit: $?"
  unset STATUSLINE_NOW_EPOCH
  export STATUSLINE_NOW_EPOCH=""
  echo "-- (d) explicit empty string (bonus edge case) --"; "$shellbin" -NoProfile -File ./probe.ps1; echo "exit: $?"
  unset STATUSLINE_NOW_EPOCH
done

echo ""
echo "########## zero-shell-date grep check (executable lines only, comments stripped) ##########"
if grep -vE '^\s*#' probe.jq probe.ps1 2>/dev/null | grep -nE '(^|[^A-Za-z0-9_./\-])date([^A-Za-z0-9_./\-]|$)'; then
  echo "FOUND 'date' token in executable code -- contract violated"
else
  echo "no shell 'date' invocation found in probe.jq / probe.ps1 executable lines"
fi
