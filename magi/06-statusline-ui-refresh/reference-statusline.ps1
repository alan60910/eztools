# 使用者現役 Claude Code statusline（2026-07-10 提供）——多列輸出可行性實證
# 8 列：branch|model|session / Context bar / Lim 5H / Lim 7D / Tokens / cwd / thinking|vim|datetime
# 關鍵實證：多列以 LF join 後單次 WriteLine，Claude Code 逐列渲染正常。
#Requires -Version 5.1
$ErrorActionPreference = 'SilentlyContinue'

[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$inputData = [Console]::In.ReadToEnd()
$json = $inputData | ConvertFrom-Json

$cwd          = if ($json.workspace.current_dir) { $json.workspace.current_dir } elseif ($json.cwd) { $json.cwd } else { "" }
$model        = if ($json.model.display_name)    { $json.model.display_name }    else { "" }
$usedPct      = $json.context_window.used_percentage
$rate5h       = $json.rate_limits.five_hour.used_percentage
$rate7d       = $json.rate_limits.seven_day.used_percentage
$sessionName  = if ($json.session_name)          { $json.session_name }          else { "" }
$thinking     = $json.thinking.enabled
$vimMode      = if ($json.vim.mode)              { $json.vim.mode }              else { "" }
$effortLevel  = if ($json.effort.level)          { $json.effort.level }          else { "" }
$tokenIn     = [long]($json.context_window.current_usage.input_tokens)
$tokenOut    = [long]($json.context_window.current_usage.output_tokens)
$tokenCacheR = [long]($json.context_window.current_usage.cache_read_input_tokens)
$tokenCacheC = [long]($json.context_window.current_usage.cache_creation_input_tokens)

$gitBranch = ""
if ($cwd) {
    $raw = (& git -C "$cwd" symbolic-ref --short HEAD 2>&1)
    $gitBranch = ($raw | Where-Object { $_ -is [string] } | Select-Object -First 1)
    if (-not $gitBranch) {
        $raw = (& git -C "$cwd" rev-parse --short HEAD 2>&1)
        $gitBranch = ($raw | Where-Object { $_ -is [string] } | Select-Object -First 1)
    }
    if ($gitBranch) { $gitBranch = $gitBranch.Trim() }
}

$datetime = Get-Date -Format "yyyy-MM-dd HH:mm"

$ESC   = [char]27
$reset = "$ESC[0m"

# ── Helper: format token counts as compact strings (e.g. 1234 → 1.2k) ────────
function Format-Tok {
    param([long]$n)
    if ($n -ge 1000) { return "$([math]::Round($n / 1000.0, 1))k" }
    return "$n"
}

# ── Helper: build a 20-char progress bar coloured by remaining% ──────────────
function Get-RateBar {
    param([double]$usedPct, [string]$ESC, [string]$reset)
    $barLen  = 20
    $filled  = [math]::Round($usedPct / 100 * $barLen)
    $empty   = $barLen - $filled
    $remainPct = 100 - $usedPct
    # colour by remaining amount: plenty=green, mid=yellow, low=red
    if     ($remainPct -gt 50) { $color = "$ESC[32m" }
    elseif ($remainPct -gt 25) { $color = "$ESC[33m" }
    else                       { $color = "$ESC[31m" }
    $filledBar = $color + ([string][char]0x2588) * $filled + $reset
    $emptyBar  = [string][char]0x2591 * $empty
    return $filledBar + $emptyBar
}

# ── Line 1: cwd | model  effort | [session] ─────────────────────────────────
$mid = if ($json.model.id) { $json.model.id } else { "" }
if     ($mid -match 'haiku')  { $mc = "$ESC[32m" }
elseif ($mid -match 'sonnet') { $mc = "$ESC[33m" }
elseif ($mid -match 'opus')   { $mc = "$ESC[31m" }
else                          { $mc = "" }
$modelStr = "$mc$model$reset"
if ($effortLevel) {
    # colour effort by official API speed↔intelligence spectrum
    # low = speed end (green), medium = balanced (yellow), high = intelligence end (red)
    $effortLower = $effortLevel.ToLower()
    if     ($effortLower -eq 'low')    { $ec = "$ESC[32m" }
    elseif ($effortLower -eq 'medium') { $ec = "$ESC[33m" }
    else                               { $ec = "$ESC[31m" }   # high
    $modelStr += "  $ec$effortLevel$reset"
}

$line1Parts = [System.Collections.Generic.List[string]]::new()
if ($gitBranch)   { $line1Parts.Add($gitBranch) }
if ($model)       { $line1Parts.Add($modelStr) }
if ($sessionName) { $line1Parts.Add("[$sessionName]") }
$line1 = $line1Parts -join " | "

# ── Line 2: Context bar (prefix 8 chars, bar 20 wide, aligns with Limits) ────
$line2 = ""
if ($null -ne $usedPct -and "$usedPct" -ne '') {
    $pct    = [math]::Round([double]$usedPct)
    $barLen = 20
    $filled = [math]::Round($pct / 100 * $barLen)
    $empty  = $barLen - $filled
    if ($pct -le 50)     { $color = "$ESC[32m" }
    elseif ($pct -le 75) { $color = "$ESC[33m" }
    else                 { $color = "$ESC[31m" }
    $filledBar = $color + ([string][char]0x2588) * $filled + $reset
    $emptyBar  = [string][char]0x2591 * $empty
    $line2 = "Context " + $filledBar + $emptyBar + " ${pct}%"
} else {
    $line2 = "Context " + ([string][char]0x2591) * 20 + " (n/a)"
}

# ── Lines 3-4: Limits block ───────────────────────────────────────────────────
$nowUnix     = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$recycleChar = [char]0x21BA
$limRowList  = [System.Collections.Generic.List[string]]::new()

if ($null -ne $rate5h -and "$rate5h" -ne '') {
    $p5   = [math]::Round([double]$rate5h)
    $rem5 = 100 - $p5
    if     ($rem5 -gt 50) { $c5 = "$ESC[32m" }
    elseif ($rem5 -gt 25) { $c5 = "$ESC[33m" }
    else                  { $c5 = "$ESC[31m" }
    $bar5 = Get-RateBar -usedPct $p5 -ESC $ESC -reset $reset
    $r5   = $json.rate_limits.five_hour.resets_at
    $cd5  = ""
    if ($r5) {
        $diff = [long]$r5 - $nowUnix
        if ($diff -gt 0) {
            $hh = [math]::Floor($diff / 3600)
            $mm = [math]::Floor(($diff % 3600) / 60)
            $resetTime = (Get-Date).AddSeconds($diff).ToString("HH:mm")
            $cd5 = if ($hh -gt 0) { " ${hh}h (${resetTime})" } else { " ${mm}m (${resetTime})" }
        }
    }
    # "Lim 5H  " = 8 chars, starts with non-space so renderer won't trim it
    $limRowList.Add("Lim 5H  $bar5 $c5$($p5.ToString().PadLeft(3))%$reset $recycleChar$cd5")
} else {
    $limRowList.Add("Lim 5H  " + ([string][char]0x2591) * 20 + " (n/a)")
}

if ($null -ne $rate7d -and "$rate7d" -ne '') {
    $p7   = [math]::Round([double]$rate7d)
    $rem7 = 100 - $p7
    if     ($rem7 -gt 50) { $c7 = "$ESC[32m" }
    elseif ($rem7 -gt 25) { $c7 = "$ESC[33m" }
    else                  { $c7 = "$ESC[31m" }
    $bar7 = Get-RateBar -usedPct $p7 -ESC $ESC -reset $reset
    $r7   = $json.rate_limits.seven_day.resets_at
    $cd7  = ""
    if ($r7) {
        $diff = [long]$r7 - $nowUnix
        if ($diff -gt 0) {
            $dd = [math]::Floor($diff / 86400)
            $hh = [math]::Floor(($diff % 86400) / 3600)
            $mm = [math]::Floor(($diff % 3600) / 60)
            $resetTime = (Get-Date).AddSeconds($diff).ToString("MM/dd HH:mm")
            $cd7 = if ($dd -gt 0) { " ${dd}d (${resetTime})" } else { " ${hh}h${mm}m (${resetTime})" }
        }
    }
    # "Lim 7D  " = 8 chars, starts with non-space — bars always align with 5H row
    $limRowList.Add("Lim 7D  $bar7 $c7$($p7.ToString().PadLeft(3))%$reset $recycleChar$cd7")
} else {
    $limRowList.Add("Lim 7D  " + ([string][char]0x2591) * 20 + " (n/a)")
}

# ── Tokens line ──────────────────────────────────────────────────────────────
$tokenLine = ""
    $totalTok = $tokenIn + $tokenCacheC + $tokenCacheR
    $cachePct = if ($totalTok -gt 0) { [math]::Round($tokenCacheR * 100.0 / $totalTok) } else { 0 }
    $midDot   = [char]0x00B7
    $tokenLine = "Tokens  In $(Format-Tok $tokenIn) $midDot Out $(Format-Tok $tokenOut) $midDot Cache ${cachePct}%"

# ── Last line: thinking | vim | datetime ──────────────────────────────────────
$lastParts = [System.Collections.Generic.List[string]]::new()
if ($thinking -eq $true) { $lastParts.Add(" thinking:on") }
if ($vimMode)             { $lastParts.Add("vim:$vimMode") }
$lastParts.Add(" $datetime ")
$lastLine = $lastParts -join " | "

# ── Assemble output ───────────────────────────────────────────────────────────
$output = [System.Collections.Generic.List[string]]::new()
if ($line1)     { $output.Add($line1) }
if ($line2)     { $output.Add($line2) }
foreach ($row in $limRowList) { $output.Add($row) }
if ($tokenLine) { $output.Add($tokenLine) }
if ($cwd)       { $output.Add($cwd) }
$output.Add($lastLine)

[Console]::WriteLine($output -join "`n")
