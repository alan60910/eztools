# Spike T2.2 (S2) - now injection idiom, ps1 half.
# Pinned idiom: explicit IsNullOrEmpty branch (mirrors jq `//` absent semantics),
# else branch uses [long]::TryParse (no-throw) so non-numeric input silently
# falls back to real clock instead of aborting the script.
$e = $env:STATUSLINE_NOW_EPOCH
if ([string]::IsNullOrEmpty($e)) {
    $n = [DateTimeOffset]::Now.ToUnixTimeSeconds()
    $branch = 'absent-fallback'
} else {
    $parsed = 0L
    if ([long]::TryParse($e, [ref]$parsed)) {
        $n = $parsed
        $branch = 'legit-parsed'
    } else {
        $n = [DateTimeOffset]::Now.ToUnixTimeSeconds()
        $branch = 'nonnumeric-fallback'
    }
}
$oracle = [DateTimeOffset]::Now.ToUnixTimeSeconds()
Write-Host "PSVersion=$($PSVersionTable.PSVersion.ToString()) STATUSLINE_NOW_EPOCH=[$e] branch=$branch n=$n oracle_now=$oracle diff=$([math]::Abs($oracle - $n))"
exit 0
