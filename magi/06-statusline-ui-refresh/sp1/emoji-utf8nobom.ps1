# Spike S1: emoji rendering test - literal emoji in UTF-8 source (NO BOM)
# Candidates: keyboard(VS16) / laptop / tree / seedling / herb / robot
# This file is saved as UTF-8 WITHOUT a byte-order-mark on purpose.

$pairs = [ordered]@{
    'Keyboard(VS16)|U+2328,FE0F' = "⌨️"
    'Laptop|U+1F4BB'             = "💻"
    'Tree|U+1F333'               = "🌳"
    'Seedling|U+1F331'           = "🌱"
    'Herb|U+1F33F'               = "🌿"
    'Robot|U+1F916'              = "🤖"
}

Write-Output "=== Width markers (emoji + ASCII marker) ==="
foreach ($k in $pairs.Keys) {
    Write-Output ("{0}|end  <- {1}" -f $pairs[$k], $k)
}

Write-Output ""
Write-Output "=== Alignment line (mixed emoji + ascii columns) ==="
Write-Output ("[AAA]{0}[BBB]{1}[CCC]{2}[DDD]" -f $pairs['Robot|U+1F916'], $pairs['Tree|U+1F333'], $pairs['Keyboard(VS16)|U+2328,FE0F'])

Write-Output ""
Write-Output "=== Parse-fidelity: hex code units (UTF-16 .NET chars) per candidate ==="
foreach ($k in $pairs.Keys) {
    $s = $pairs[$k]
    $hex = -join ($s.ToCharArray() | ForEach-Object { '{0:X4} ' -f [int]$_ })
    Write-Output ("{0} => {1}" -f $k, $hex.Trim())
}
