Write-Host "PSVersion: $($PSVersionTable.PSVersion.ToString())"

Write-Host "--- [long]\$null ---"
try {
    $r = [long]$null
    Write-Host "OK value=$r type=$($r.GetType().FullName)"
} catch {
    Write-Host "THREW: $($_.Exception.GetType().FullName): $($_.Exception.Message)"
}

Write-Host "--- [long]'' ---"
try {
    $r = [long]''
    Write-Host "OK value=$r"
} catch {
    Write-Host "THREW: $($_.Exception.GetType().FullName): $($_.Exception.Message)"
}

Write-Host "--- [long]'abc' ---"
try {
    $r = [long]'abc'
    Write-Host "OK value=$r"
} catch {
    Write-Host "THREW: $($_.Exception.GetType().FullName): $($_.Exception.Message)"
}
