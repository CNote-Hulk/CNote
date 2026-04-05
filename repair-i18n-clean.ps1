$path = "c:\Users\andre\OneDrive\Documentos\CNote\frontend\js\modules\i18n.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 1) Remove broken partial language blocks before first real en block
$startMarker = "const MESSAGES = {"
$start = $content.IndexOf($startMarker)
if ($start -ge 0) {
    $enMatch = [regex]::Match($content, '^\s*en:\s*\{', [System.Text.RegularExpressions.RegexOptions]::Multiline)
    if ($enMatch.Success -and $enMatch.Index -gt $start) {
        $prefix = $content.Substring(0, $start)
        $rest = $content.Substring($enMatch.Index)
        $content = $prefix + $startMarker + "`n" + $rest
    }
}

# 2) Fix accidental duplicate fr block if present
$content = [regex]::Replace($content, '(\n\s*fr:\s*\{\s*\n)\s*fr:\s*\{', '$1')

# 3) Decode all UTF-8 mojibake clusters interpreted as cp1252
$regex = [regex]::new('[\u00C2-\u00F4][\u0080-\u00BF]+')
$total = 0
for ($pass = 1; $pass -le 6; $pass++) {
    $changed = 0
    $content = $regex.Replace($content, {
        param($m)
        $s = $m.Value
        try {
            $bytes = [System.Text.Encoding]::GetEncoding(1252).GetBytes($s)
            $decoded = [System.Text.Encoding]::UTF8.GetString($bytes)
            if ($decoded -ne $s) {
                $script:changed++
                return $decoded
            }
            return $s
        } catch {
            return $s
        }
    })
    $total += $changed
    if ($changed -eq 0) { break }
}

# 4) Persist UTF-8 (no BOM)
[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))

# 5) Report health
$c1 = [regex]::Matches($content, '[\u0080-\u009F]').Count
$replacement = [regex]::Matches($content, [char]0xFFFD).Count
$langs = [regex]::Matches($content, '^\s{4}(en|ro|es|fr|it|de):\s*\{', [System.Text.RegularExpressions.RegexOptions]::Multiline).Count

Write-Host "Decoded clusters: $total"
Write-Host "Remaining C1 controls: $c1"
Write-Host "Replacement chars (U+FFFD): $replacement"
Write-Host "Language blocks found: $langs"