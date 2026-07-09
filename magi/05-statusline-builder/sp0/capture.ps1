# SP-0 statusline stdin 擷取器（Claude Code 每次更新 statusline 時呼叫）
# 將 stdin JSON 壓成單行 append 至 %USERPROFILE%\statusline-dump.jsonl
$raw = [Console]::In.ReadToEnd()
try {
  $line = ($raw | ConvertFrom-Json | ConvertTo-Json -Compress -Depth 30)
} catch {
  $line = ($raw -replace "`r?`n", ' ')
}
$dump = Join-Path $env:USERPROFILE 'statusline-dump.jsonl'
Add-Content -Path $dump -Value $line -Encoding UTF8
$n = 0
try { $n = (Get-Content $dump -ErrorAction Stop | Measure-Object -Line).Lines } catch {}
Write-Output "SP-0 capturing... ($n)"
exit 0
