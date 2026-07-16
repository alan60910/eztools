Write-Host "PSVersion: $($PSVersionTable.PSVersion.ToString())"

function Test-TryParse([string]$label, $val) {
    $parsed = 0L
    $ok = [long]::TryParse($val, [ref]$parsed)
    Write-Host "$label -> ok=$ok parsed=$parsed (input type=$($val.GetType().FullName))"
}

Test-TryParse "TryParse(null)" $null
Test-TryParse "TryParse('')" ''
Test-TryParse "TryParse('abc')" 'abc'
Test-TryParse "TryParse('1783497600')" '1783497600'
Test-TryParse "TryParse(' 123')" ' 123'
