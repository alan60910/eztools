# S6-T2.5 spike probe：ps1 後端 idiom（鏡像 emit-ps1.ts Format-ResetsAt 的
# [DateTimeOffset]::FromUnixTimeSeconds($epoch).ToLocalTime()，本探針延伸
# MM/dd HH:mm 供對拍；同時印 plain（現行 Format-ResetsAt 未帶 CultureInfo
# 的形）與 InvariantCulture 兩組，供文化敏感性檢查（PLAN.md 已知風險項）。
# 用法：pwsh/powershell -NoProfile -File probe-ps.ps1 <epochSeconds>
param(
  [Parameter(Mandatory = $true)]
  [long]$Epoch
)
$t = [DateTimeOffset]::FromUnixTimeSeconds($Epoch).ToLocalTime()
$plain = $t.ToString('MM/dd HH:mm')
$invariant = $t.ToString('MM/dd HH:mm', [System.Globalization.CultureInfo]::InvariantCulture)
Write-Output "plain=$plain"
Write-Output "invariant=$invariant"
Write-Output "psversion=$($PSVersionTable.PSVersion.ToString())"
