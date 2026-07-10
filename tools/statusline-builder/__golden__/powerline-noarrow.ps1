# Claude Code statusline — 由 EZTools statusline-builder 產生
# PowerShell 5.1+ / 7；請以 UTF-8（含 BOM）儲存。
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$e = [char]27
$Th0Bg = @('5;46', '5;82', '5;118', '5;154', '5;190', '5;226', '5;220', '5;214', '5;208', '5;196')
$Th0Fg = @('38;5;16', '38;5;16', '38;5;16', '38;5;16', '38;5;16', '38;5;16', '38;5;16', '38;5;16', '38;5;16', '38;5;16')

$raw = [Console]::In.ReadToEnd()
$d = $null
try { $d = $raw | ConvertFrom-Json -ErrorAction Stop } catch { }

$Segs = @()
$BgT = @()

# model — always/empty
$v = $d.model.display_name
if ($null -ne $v -and $v -ne '') {
  $disp = [char]::ConvertFromUtf32(0x1F916) + ' ' + $v + ' '
  $Segs += "$e[0m$e[38;5;16m$e[48;5;226m" + $disp
  $BgT += '5;226'
}

# session-name — conditional/hide
$v = $d.session_name
if ($null -ne $v -and $v -ne '') {
  $disp = '[s]' + [char]::ConvertFromUtf32(0x1F4AC) + ' ' + $v + ' '
  $Segs += "$e[0m$e[38;5;16m$e[48;5;99m" + $disp
  $BgT += '5;99'
}

# context-used — percentage/dash＋threshold
$v = $d.context_window.used_percentage
if ($null -eq $v) {
  $disp = '--' + ' '
  $Segs += "$e[0m$e[38;5;231m$e[48;5;240m" + $disp
  $BgT += '5;240'
} else {
  $p = [double]$v
  $vt = ([string][long][math]::Floor($p)) + '%'
  $idx = [long][math]::Floor($p / 10)
  if ($idx -gt 9) { $idx = 9 }
  if ($idx -lt 0) { $idx = 0 }
  $fg = $Th0Fg[$idx]
  $bg = $Th0Bg[$idx]
  $s = "$e[0m"
  if ($fg -ne '') { $s += "$e[" + $fg + 'm' }
  if ($bg -ne '') { $s += "$e[48;" + $bg + 'm' }
  $s += $vt + ' '
  $Segs += $s
  $BgT += $bg
}

# rate-5h — percentage/dash
$v = $d.rate_limits.five_hour.used_percentage
if ($null -eq $v) {
  $vt = '--'
} else {
  $vt = ([string][long][math]::Floor([double]$v)) + '%'
}
$disp = $vt + ' '
$Segs += "$e[0m$e[38;5;16m$e[48;5;99m" + $disp
$BgT += '5;99'

# git-branch — shell-out/hide
$so = ''
try { $so = [string](& git branch --show-current 2>$null | Select-Object -First 1) } catch { }
if ($null -ne $so -and $so -ne '') {
  $disp = [char]::ConvertFromUtf32(0x1F33F) + ' ' + $so + ' '
  $Segs += "$e[0m$e[38;5;16m$e[48;5;46m" + $disp
  $BgT += '5;46'
}

$out = ''
$n = $Segs.Count
for ($i = 0; $i -lt $n; $i++) {
  $out += $Segs[$i]
}
$out += "$e[0m"

[Console]::Out.Write($out)
exit 0
