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

# 3) Safely decode mojibake only when it forms valid UTF-8 byte sequence lengths
function Decode-MojibakePattern {
    param(
        [string]$Input,
        [string]$Pattern,
        [ref]$Count
    )

    $regex = [regex]::new($Pattern)
    return $regex.Replace($Input, {
        param($m)
        $s = $m.Value
        try {
            $bytes = [System.Text.Encoding]::GetEncoding(1252).GetBytes($s)
            $decoded = [System.Text.Encoding]::UTF8.GetString($bytes)
            if ($decoded -ne $s) {
                $Count.Value++
                return $decoded
            }
            return $s
        } catch {
            return $s
        }
    })
}

$total = 0
for ($pass = 1; $pass -le 6; $pass++) {
    $changed = 0

    # 4-byte UTF-8 sequences (emoji and symbols)
    $content = Decode-MojibakePattern -Input $content -Pattern '[\u00F0-\u00F4][\u0080-\u00BF]{3}' -Count ([ref]$changed)
    # 3-byte UTF-8 sequences (dashes, bullets, ellipsis, arrows, many symbols)
    $content = Decode-MojibakePattern -Input $content -Pattern '[\u00E0-\u00EF][\u0080-\u00BF]{2}' -Count ([ref]$changed)
    # 2-byte UTF-8 sequences (most accented letters incl. Romanian diacritics)
    $content = Decode-MojibakePattern -Input $content -Pattern '[\u00C2-\u00DF][\u0080-\u00BF]' -Count ([ref]$changed)

    $total += $changed
    if ($changed -eq 0) { break }
}

# 4) Persist UTF-8 (no BOM)
[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))

# 5) Report health
$c1 = [regex]::Matches($content, '[\u0080-\u009F]').Count
$replacement = [regex]::Matches($content, [char]0xFFFD).Count
$langs = [regex]::Matches($content, '^\s{4}(en|ro|es|fr|it|de):\s*\{', [System.Text.RegularExpressions.RegexOptions]::Multiline).Count

Write-Host "Decoded tokens: $total"
Write-Host "Remaining C1 controls: $c1"
Write-Host "Replacement chars (U+FFFD): $replacement"
Write-Host "Language blocks found: $langs"