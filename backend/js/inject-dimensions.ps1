<# 
    Parse dimensions research file and inject into console JSON data files.
    Run from project root.
#>

$root = "c:\Users\andre\OneDrive\Documentos\CNote"
$raw = Get-Content -Raw -Encoding UTF8 "$root\dimensions"

# Cut off at ADD-ONS section
$cutIdx = $raw.IndexOf('=' * 30)
if ($cutIdx -gt 0) { $raw = $raw.Substring(0, $cutIdx) }

# Build dimensions map
$dimMap = @{}

# Split into console blocks
$blocks = [regex]::Split($raw, '(?m)(?=^[a-z0-9][a-z0-9 -]*:\s*$)')

foreach ($block in $blocks) {
    if ($block.Trim() -eq '') { continue }
    
    # Extract slug from header line
    $headerMatch = [regex]::Match($block, '(?m)^([a-z0-9][a-z0-9 -]*):\s*$')
    if (-not $headerMatch.Success) { continue }
    
    $slug = $headerMatch.Groups[1].Value.Trim().ToLower() -replace '\s+', '-'
    $rest = $block.Substring($headerMatch.Length)
    
    $models = @()
    
    # Pattern 1: "Width x Height x Depth: NNN mm x NNN mm x NNN mm"  
    $mmPattern = '(?i)(?:^|\n)(.+?)(\d+(?:\.\d+)?)\s*mm\s*[x\xD7]\s*(\d+(?:\.\d+)?)\s*mm\s*[x\xD7]\s*(\d+(?:\.\d+)?)\s*mm'
    $mmMatches = [regex]::Matches($rest, $mmPattern)
    
    foreach ($m in $mmMatches) {
        $label = $m.Groups[1].Value.Trim() -replace '(?i)Width\s*[x\xD7]\s*Height\s*[x\xD7]\s*Depth\s*:\s*', '' -replace ':+\s*$', ''
        $label = $label.Trim()
        if ($label -eq '' -or $label -eq ':') { $label = $null }
        
        $models += @{
            label = $label
            width_mm = [double]$m.Groups[2].Value
            height_mm = [double]$m.Groups[3].Value
            depth_mm = [double]$m.Groups[4].Value
        }
    }
    
    # Pattern 2: "N cm x N cm x N cm" (magnavox-odyssey format)
    if ($models.Count -eq 0) {
        $cmMatch = [regex]::Match($rest, '(?i)(\d+(?:\.\d+)?)\s*cm\s*[x\xD7]\s*(\d+(?:\.\d+)?)\s*cm\s*[x\xD7]\s*(\d+(?:\.\d+)?)\s*cm')
        if ($cmMatch.Success) {
            # Format: H x W x D (from the file pattern "3 3/4 in x 16 1/2 in x 16 1/2 in; 9.525 cm x 41.91 cm x 41.91 cm")
            $models += @{
                label = $null
                width_mm = [Math]::Round([double]$cmMatch.Groups[2].Value * 10, 2)
                height_mm = [Math]::Round([double]$cmMatch.Groups[1].Value * 10, 2)
                depth_mm = [Math]::Round([double]$cmMatch.Groups[3].Value * 10, 2)
            }
        }
    }
    
    # Pattern 3: "N.NxN.NxN.N in" (coleco-telstar format)
    if ($models.Count -eq 0) {
        $inMatch = [regex]::Match($rest, '(?i)(\d+(?:\.\d+)?)\s*[x\xD7]\s*(\d+(?:\.\d+)?)\s*[x\xD7]\s*(\d+(?:\.\d+)?)\s*in')
        if ($inMatch.Success) {
            $toMm = { param($v) [Math]::Round([double]$v * 25.4, 2) }
            $models += @{
                label = $null
                width_mm = & $toMm $inMatch.Groups[1].Value
                height_mm = & $toMm $inMatch.Groups[2].Value
                depth_mm = & $toMm $inMatch.Groups[3].Value
            }
        }
    }
    
    # Pattern 4: "74 cm (Length), 79 cm (Width), 150 cm (Height)" (atari-home-pong format)
    if ($models.Count -eq 0) {
        $labelled = @{}
        $labelPattern = '(?i)(\d+(?:\.\d+)?)\s*cm\s*\((\w+)\)'
        $labelMatches = [regex]::Matches($rest, $labelPattern)
        foreach ($lm in $labelMatches) {
            $labelled[$lm.Groups[2].Value.ToLower()] = [Math]::Round([double]$lm.Groups[1].Value * 10, 2)
        }
        if ($labelled.ContainsKey('width') -and $labelled.ContainsKey('height')) {
            $depthVal = if ($labelled.ContainsKey('length')) { $labelled['length'] } elseif ($labelled.ContainsKey('depth')) { $labelled['depth'] } else { 0 }
            $models += @{
                label = $null
                width_mm = $labelled['width']
                height_mm = $labelled['height']
                depth_mm = $depthVal
            }
        }
    }
    
    if ($models.Count -gt 0) {
        $dimMap[$slug] = $models
    }
}

Write-Host "Parsed dimensions for $($dimMap.Count) consoles:"
foreach ($entry in $dimMap.GetEnumerator() | Sort-Object Key) {
    foreach ($m in $entry.Value) {
        $lbl = if ($m.label) { " [$($m.label)]" } else { "" }
        Write-Host "  $($entry.Key)$lbl : $($m.width_mm) x $($m.height_mm) x $($m.depth_mm) mm"
    }
}

# ── Inject into JSON files ──
$jsonFiles = @('consoles-en.json','consoles-ro.json','consoles-es.json','consoles-fr.json','consoles-de.json','consoles-it.json')
$totalUpdated = 0

foreach ($file in $jsonFiles) {
    $filePath = Join-Path $root "frontend\js\data\$file"
    if (-not (Test-Path $filePath)) {
        Write-Host "Skipping $file (not found)"
        continue
    }
    
    $jsonText = Get-Content -Raw -Encoding UTF8 $filePath
    $data = $jsonText | ConvertFrom-Json
    $updated = 0
    
    foreach ($console in $data) {
        $dims = $dimMap[$console.id]
        if ($dims) {
            if ($dims.Count -eq 1) {
                $d = $dims[0]
                $dimObj = [ordered]@{
                    width_mm = $d.width_mm
                    height_mm = $d.height_mm
                    depth_mm = $d.depth_mm
                }
                $console | Add-Member -NotePropertyName 'dimensions' -NotePropertyValue ([pscustomobject]$dimObj) -Force
            } else {
                $modelsArr = @()
                foreach ($d in $dims) {
                    $mObj = [ordered]@{}
                    if ($d.label) { $mObj['label'] = $d.label }
                    $mObj['width_mm'] = $d.width_mm
                    $mObj['height_mm'] = $d.height_mm
                    $mObj['depth_mm'] = $d.depth_mm
                    $modelsArr += [pscustomobject]$mObj
                }
                $dimObj = [ordered]@{ models = $modelsArr }
                $console | Add-Member -NotePropertyName 'dimensions' -NotePropertyValue ([pscustomobject]$dimObj) -Force
            }
            $updated++
        }
    }
    
    $outJson = $data | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($filePath, $outJson, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "$file : updated $updated consoles"
    $totalUpdated += $updated
}

Write-Host "`nDone! Total updates: $totalUpdated across $($jsonFiles.Count) files."
