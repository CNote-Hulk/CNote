<#
    Fix bad dimension labels from the initial parse.
#>

$root = "c:\Users\andre\OneDrive\Documentos\CNote"
$jsonFiles = @('consoles-en.json','consoles-ro.json','consoles-es.json','consoles-fr.json','consoles-de.json','consoles-it.json')

foreach ($file in $jsonFiles) {
    $filePath = Join-Path $root "frontend\js\data\$file"
    $jsonText = Get-Content -Raw -Encoding UTF8 $filePath
    $data = $jsonText | ConvertFrom-Json
    
    foreach ($console in $data) {
        if (-not $console.dimensions) { continue }
        
        # Nintendo Switch: remove the "(with Joy-Con attached; without" sub-note model
        if ($console.id -eq 'nintendo-switch' -and $console.dimensions.models) {
            $console.dimensions.models = @($console.dimensions.models | Where-Object { 
                $_.label -notmatch 'Joy-Con attached' 
            })
        }
        
        # PS5: fix second model label
        if ($console.id -eq 'playstation-5' -and $console.dimensions.models) {
            foreach ($m in $console.dimensions.models) {
                if ($m.label -match 'tallest home consoles') {
                    $m.label = 'PS5 Slim (CFI-2000, 2023)'
                }
            }
        }
        
        # Clean up any labels that start with "(" 
        if ($console.dimensions.models) {
            foreach ($m in $console.dimensions.models) {
                if ($m.label -and $m.label.StartsWith('(')) {
                    $m.label = $m.label.TrimStart('(').TrimEnd(')')
                }
            }
        }
    }
    
    $outJson = $data | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($filePath, $outJson, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "Fixed $file"
}

Write-Host "Done!"
