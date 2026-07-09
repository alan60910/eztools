# Claude Code statusline — 由 EZTools statusline-builder 產生
# PowerShell 5.1+ / 7；請以 UTF-8（含 BOM）儲存。
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$e = [char]27
$Th0Fg = @('38;5;46', '38;5;82', '38;5;118', '38;5;154', '38;5;190', '38;5;226', '38;5;220', '38;5;214', '38;5;208', '38;5;196')

function Format-Cost($c) {
  $s = [long][math]::Floor([double]$c * 10000)
  if ($s -lt 0) { $s = 0 }
  $w = [long][math]::Floor($s / 10000)
  $f = ([string]($s % 10000 + 10000)).Substring(1)
  return '$' + $w + '.' + $f
}

function Format-Duration($ms) {
  $x = [double]$ms
  $h = [long][math]::Floor($x / 3600000)
  $m = [long][math]::Floor($x / 60000) % 60
  $s = [long][math]::Floor($x / 1000) % 60
  if ($h -gt 0) { return [string]$h + 'h' + [string]$m + 'm' }
  if ($m -gt 0) { return [string]$m + 'm' + [string]$s + 's' }
  return [string]$s + 's'
}

function Format-ContextSize($node) {
  $n = [double]$node.total_input_tokens + [double]$node.total_output_tokens
  if ($n -ge 1000000) { return ([string][long][math]::Floor($n / 1000000)) + 'M' }
  return ([string][long][math]::Floor($n / 1000)) + 'k'
}

function Format-Lines($node) {
  return '+' + [string]$node.total_lines_added + '/-' + [string]$node.total_lines_removed
}

function Format-Pr($node) {
  return '#' + [string]$node.number
}

function Format-Repo($node) {
  return [string]$node.owner + '/' + [string]$node.name
}

function Format-ResetsAt($epoch) {
  if ($null -eq $epoch) { return '' }
  $t = [DateTimeOffset]::FromUnixTimeSeconds([long]$epoch).ToLocalTime()
  return ' (' + $t.ToString('HH:mm') + ')'
}

$raw = [Console]::In.ReadToEnd()
$d = $null
try { $d = $raw | ConvertFrom-Json -ErrorAction Stop } catch { }

$Segs = @()

# model — always/empty
$v = $d.model.display_name
if ($null -ne $v -and $v -ne '') {
  $disp = ' ' + $v
  $Segs += "$e[0m$e[38;5;75m" + $disp
}

# cwd — always/empty
$v = $d.cwd
if ($null -ne $v -and $v -ne '') {
  $hm = $env:USERPROFILE
  $pv = $v
  if ($hm -ne '') {
    if ($v -eq $hm) { $pv = '~' }
    elseif ($v.StartsWith($hm + '/') -or $v.StartsWith($hm + '\')) { $pv = '~' + $v.Substring($hm.Length) }
  }
  $disp = '@ ' + $pv
  $Segs += "$e[0m" + $disp
}

# project-dir — always/empty
$v = $d.workspace.project_dir
if ($null -ne $v -and $v -ne '') {
  $disp = ' ' + $v
  $Segs += "$e[0m" + $disp
}

# output-style — always/empty
$v = $d.output_style.name
if ($null -ne $v -and $v -ne '') {
  $disp = ' ' + $v
  $Segs += "$e[0m" + $disp
}

# version — always/empty
$v = $d.version
if ($null -ne $v -and $v -ne '') {
  $disp = 'v ' + $v
  $Segs += "$e[0m" + $disp
}

# cost — always/empty
$v = $d.cost.total_cost_usd
if ($null -ne $v) {
  $disp = ' ' + (Format-Cost $v)
  $Segs += "$e[0m$e[38;5;220m" + $disp
}

# duration — always/empty
$v = $d.cost.total_duration_ms
if ($null -ne $v) {
  $disp = ' ' + (Format-Duration $v)
  $Segs += "$e[0m" + $disp
}

# lines-changed — always/empty
$v = $d.cost
if ($null -ne $v) {
  $disp = ' ' + (Format-Lines $v)
  $Segs += "$e[0m" + $disp
}

# context-size — always/empty
$v = $d.context_window
if ($null -ne $v) {
  $disp = ' ' + (Format-ContextSize $v)
  $Segs += "$e[0m" + $disp
}

# thinking — always/empty
$v = $d.thinking.enabled
if ($v -eq $true) {
  $disp = ' ' + 'on'
  $Segs += "$e[0m" + $disp
}

# context-used — percentage/dash＋threshold
$v = $d.context_window.used_percentage
if ($null -eq $v) {
  $disp = 'it''s  ' + '--'
  $Segs += "$e[0m" + $disp
} else {
  $p = [double]$v
  $vt = ([string][long][math]::Floor($p)) + '%'
  $idx = [long][math]::Floor($p / 10)
  if ($idx -gt 9) { $idx = 9 }
  if ($idx -lt 0) { $idx = 0 }
  $fg = $Th0Fg[$idx]
  $s = "$e[0m" + 'it''s  '
  $s += "$e[0m"
  if ($fg -ne '') { $s += "$e[" + $fg + 'm' }
  $s += $vt
  $Segs += $s
}

# context-remaining — percentage/dash
$v = $d.context_window.remaining_percentage
if ($null -eq $v) {
  $vt = '--'
} else {
  $vt = ([string][long][math]::Floor([double]$v)) + '%'
}
$disp = ' ' + $vt
$Segs += "$e[0m" + $disp

# rate-5h — percentage/dash
$v = $d.rate_limits.five_hour.used_percentage
$sfx = (Format-ResetsAt $d.rate_limits.five_hour.resets_at)
if ($null -eq $v) {
  $vt = '--'
} else {
  $vt = ([string][long][math]::Floor([double]$v)) + '%'
}
$disp = ' ' + $vt + $sfx
$Segs += "$e[0m" + $disp

# rate-7d — percentage/dash
$v = $d.rate_limits.seven_day.used_percentage
$sfx = (Format-ResetsAt $d.rate_limits.seven_day.resets_at)
if ($null -eq $v) {
  $vt = '--'
} else {
  $vt = ([string][long][math]::Floor([double]$v)) + '%'
}
$disp = ' ' + $vt + $sfx
$Segs += "$e[0m" + $disp

# session-name — conditional/hide
$v = $d.session_name
if ($null -ne $v -and $v -ne '') {
  $disp = '$(x) ' + $v
  $Segs += "$e[0m" + $disp
}

# effort — conditional/hide
$v = $d.effort.level
if ($null -ne $v -and $v -ne '') {
  $disp = ' ' + $v
  $Segs += "$e[0m" + $disp
}

# vim-mode — conditional/hide
$v = $d.vim.mode
if ($null -ne $v -and $v -ne '') {
  $disp = ' ' + $v
  $Segs += "$e[0m" + $disp
}

# agent-name — conditional/hide
$v = $d.agent.name
if ($null -ne $v -and $v -ne '') {
  $disp = ' ' + $v
  $Segs += "$e[0m" + $disp
}

# pr — conditional/hide
$v = $d.pr
if ($null -ne $v) {
  $disp = ' ' + (Format-Pr $v)
  $Segs += "$e[0m" + $disp
}

# repo — conditional/hide
$v = $d.workspace.repo
if ($null -ne $v) {
  $disp = ' ' + (Format-Repo $v)
  $Segs += "$e[0m" + $disp
}

# worktree — conditional/hide
$v = $(if ($null -ne $d.workspace.git_worktree) { $d.workspace.git_worktree } else { $d.worktree.name })
if ($null -ne $v -and $v -ne '') {
  $disp = ' ' + $v
  $Segs += "$e[0m" + $disp
}

# worktree-branch — conditional/hide
$v = $d.worktree.branch
if ($null -ne $v -and $v -ne '') {
  $disp = ' ' + $v
  $Segs += "$e[0m" + $disp
}

# git-branch — shell-out/hide
$so = ''
try { $so = [string](& git branch --show-current 2>$null | Select-Object -First 1) } catch { }
if ($null -ne $so -and $so -ne '') {
  $disp = ' ' + $so
  $Segs += "$e[0m" + $disp
}

# git-dirty — shell-out/hide
$so = ''
try { $so = [string](& git status --porcelain 2>$null | Select-Object -First 1) } catch { }
if ($null -ne $so -and $so -ne '') {
  $disp = ' ' + '*'
  $Segs += "$e[0m" + $disp
}

# clock — shell-out/empty
$ck = (Get-Date -Format 'HH:mm')
$disp = ' ' + $ck
$Segs += "$e[0m" + $disp

$out = ''
$n = $Segs.Count
for ($i = 0; $i -lt $n; $i++) {
  if ($i -gt 0) { $out += "$e[0m" + '|' }
  $out += $Segs[$i]
}
$out += "$e[0m"

[Console]::Out.Write($out)
exit 0
