# Spike S1: emoji rendering test - pure ASCII source, codepoints built at runtime
# via [char]::ConvertFromUtf32(...). This file contains NO non-ASCII bytes,
# so its behaviour must not depend on file-encoding / BOM detection at all.
# Candidates: keyboard(VS16) / laptop / tree / seedling / herb / robot

$pairs = [ordered]@{}
$pairs['Keyboard(VS16)|U+2328,FE0F'] = ([char]::ConvertFromUtf32(0x2328)) + ([char]::ConvertFromUtf32(0xFE0F))
$pairs['Laptop|U+1F4BB']             = [char]::ConvertFromUtf32(0x1F4BB)
$pairs['Tree|U+1F333']               = [char]::ConvertFromUtf32(0x1F333)
$pairs['Seedling|U+1F331']           = [char]::ConvertFromUtf32(0x1F331)
$pairs['Herb|U+1F33F']               = [char]::ConvertFromUtf32(0x1F33F)
$pairs['Robot|U+1F916']              = [char]::ConvertFromUtf32(0x1F916)

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
