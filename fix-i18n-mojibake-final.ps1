$path = "c:\Users\andre\OneDrive\Documentos\CNote\frontend\js\modules\i18n.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# Decode only mojibake-like clusters (e.g. â, â, ð®, È, Ä, ï¸)
# We intentionally avoid touching normal unicode words.
$pattern = '[\u00C2-\u00F4][\u0080-\u00BF]+'
$regex = [regex]::new($pattern)

$converted = 0
$newContent = $content

for ($pass = 1; $pass -le 4; $pass++) {
    $passConverted = 0
    $newContent = $regex.Replace($newContent, {
        param($m)
        $s = $m.Value
        try {
            $bytes = [System.Text.Encoding]::GetEncoding(1252).GetBytes($s)
            $decoded = [System.Text.Encoding]::UTF8.GetString($bytes)
            if ($decoded -ne $s) {
                $script:passConverted++
                return $decoded
            }
            return $s
        } catch {
            return $s
        }
    })

    $converted += $passConverted
    if ($passConverted -eq 0) {
        break
    }
}

[System.IO.File]::WriteAllText($path, $newContent, (New-Object System.Text.UTF8Encoding($false)))

# Report remaining suspicious chars
$remainingC1 = [regex]::Matches($newContent, '[\u0080-\u009F]').Count
$remainingMojibake = [regex]::Matches($newContent, '[\u00C2\u00C3\u00E2\u00F0]').Count

Write-Host "Converted clusters: $converted"
Write-Host "Remaining C1 controls: $remainingC1"
Write-Host "Remaining marker chars: $remainingMojibake"
