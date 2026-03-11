# _generate_lessons.ps1
# Adapts material-brut research files into lesson HTML pages.
# Organizes content by section/concept (NOT by source).
# Replaces intro+teorie+recap+quiz+exercitiu in each HTML file.

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $root) { $root = Get-Location }

$materialDir = Join-Path $root "lectii\research"
$cursDir     = Join-Path $root "src\html\pages\curs"
$structPath  = Join-Path $root "lectii\structura-curs.txt"
$dash        = [char]0x2014   # em-dash

function Esc([string]$s) {
    if ([string]::IsNullOrEmpty($s)) { return '' }
    return [System.Net.WebUtility]::HtmlEncode($s)
}

# =====================================================================
# 1. Parse structura-curs.txt  ->  hashtable  key -> lesson info
# =====================================================================
function Parse-CourseStructure {
    $raw   = Get-Content $structPath -Raw -Encoding UTF8
    $lines = $raw -split "`r?`n"
    $map   = @{}
    $mNum  = 0; $mName = ''

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $ln = $lines[$i].Trim()

        if ($ln -match '^MODUL\s+(\d+)\s*\p{Pd}\s*(.+)') {
            $mNum  = [int]$Matches[1]
            $mName = $Matches[2].Trim()
        }

        if ($ln -match '^Lec.ia\s+(\d+)\.(\d+)\s*\p{Pd}\s*(.+)') {
            $key   = $Matches[1] + '.' + $Matches[2]
            $title = $Matches[3].Trim()
            $cpts  = @()

            for ($j = $i + 1; $j -lt $lines.Count; $j++) {
                $cl = $lines[$j].Trim()
                if ($cl -match '^[•]\s*(.+)') {
                    $cpts += $Matches[1].Trim()
                } elseif ($cl -match '^(---|MODUL|Lec.ia|FAZA)') {
                    break
                }
            }

            $map[$key] = [pscustomobject]@{
                ModNum   = $mNum
                ModName  = $mName
                Title    = $title
                Concepts = $cpts
            }
        }
    }
    return $map
}

# =====================================================================
# 2. Parse a material-brut.txt  ->  array of section objects
#    Each section: { Title, Items[], Types[] }
#    Items  = string lines (bullet text or paragraph text)
#    Types  = 'bullet' | 'text'  for each item
# =====================================================================
function Parse-MaterialBrut([string]$path) {
    $raw   = Get-Content $path -Raw -Encoding UTF8
    $lines = $raw -split "`r?`n"

    $sections = [System.Collections.ArrayList]::new()
    $curTitle = ''
    $curItems = [System.Collections.ArrayList]::new()
    $curTypes = [System.Collections.ArrayList]::new()
    $inContent = $false

    foreach ($rawLine in $lines) {
        $ln = $rawLine.Trim()

        # Stop at research notes
        if ($ln -match '^NOTE\s+CERCETARE') { break }

        # Skip structural / meta lines
        if ($ln -match '^[-=]{3,}$')                                        { continue }
        if ($ln -match '^(SOURCE|SURSA)[\s:]')                                { $inContent = $false; continue }
        if ($ln -match '^URL\s*:')                                          { continue }
        if ($ln -match '^https?://')                                        { continue }
        if ($ln -match '^(MATERIAL BRUT|CERCETARE|DATA ACCES|ACCESAT)')     { continue }
        if ($ln -match '^(LESSON|LEC.IA|LECTIA)\s*:?\s*\d+')               { continue }
        if ($ln -match '(EXTRACTED INFORMATION|INFORMATII EXTRASE|INFORMA.II EXTRASE)') {
            $inContent = $true; continue
        }
        if ($ln -match '^Informa.i[ea]\s+extras') { continue }

        if (-not $ln) { continue }

        # ── Detect section header BEFORE $inContent gate ──
        # (headers can enable $inContent themselves)
        $isHdr = $false; $hdrText = ''

        # A: SECȚIUNEA / SECTIUNEA  N  –/: Title
        if ($ln -match '^SEC.IUNEA\s+\d+\s*[\p{Pd}:]+\s*(.+)$') {
            $inContent = $true
            $isHdr = $true; $hdrText = $Matches[1].Trim().TrimEnd(':')
        }
        # B: N. TITLE  (numbered, short, mostly-uppercase OR ends with colon)
        elseif ($ln -match '^\d+\.\s+(.{3,})$' -and $ln.Length -lt 100) {
            $cand = $Matches[1].Trim().TrimEnd(':')
            $hasColon = ($ln.TrimEnd() -match ':\s*$')
            $uppers   = ($cand -creplace '[^A-Z]', '').Length
            $allUpper = ($uppers -gt ($cand.Length * 0.4))
            if ($cand.Length -lt 80 -and ($hasColon -or $allUpper)) {
                $isHdr = $true; $hdrText = $cand
            }
        }
        # C: Title:  (standalone line, starts uppercase, ends colon, not bullet)
        elseif ($ln -match '^(\p{Lu}.{2,}):\s*$' -and $ln.Length -lt 100 -and $ln -notmatch '^[-•*]') {
            $isHdr = $true; $hdrText = $Matches[1].Trim()
        }

        if ($isHdr -and $hdrText) {
            # flush previous section
            if ($curTitle -and $curItems.Count -gt 0) {
                [void]$sections.Add([pscustomobject]@{
                    Title = $curTitle
                    Items = [string[]]@($curItems)
                    Types = [string[]]@($curTypes)
                })
            }
            $curTitle = $hdrText
            $curItems = [System.Collections.ArrayList]::new()
            $curTypes = [System.Collections.ArrayList]::new()
            continue
        }

        # Gate: only process content lines when inside content area
        if (-not $inContent) { continue }

        # ── Content lines ──
        if ($ln -match '^[-•]\s+(.+)$') {
            [void]$curItems.Add($Matches[1].Trim())
            [void]$curTypes.Add('bullet')
        }
        elseif ($ln -match '^\*\s+(.+)$') {
            [void]$curItems.Add($Matches[1].Trim())
            [void]$curTypes.Add('bullet')
        }
        elseif ($ln -match '^[a-z]\)\s+(.+)$') {
            [void]$curItems.Add($Matches[1].Trim())
            [void]$curTypes.Add('bullet')
        }
        else {
            if (-not $curTitle) { $curTitle = 'Prezentare generala' }
            [void]$curItems.Add($ln)
            [void]$curTypes.Add('text')
        }
    }

    # flush last section
    if ($curTitle -and $curItems.Count -gt 0) {
        [void]$sections.Add([pscustomobject]@{
            Title = $curTitle
            Items = [string[]]@($curItems)
            Types = [string[]]@($curTypes)
        })
    }

    return ,@($sections)
}

# =====================================================================
# 3. Format one section's items into HTML (card body)
# =====================================================================
function Format-ItemHtml([string[]]$items, [string[]]$types) {
    $sb     = [System.Text.StringBuilder]::new()
    $inList = $false

    for ($i = 0; $i -lt $items.Count; $i++) {
        $raw  = $items[$i]
        $type = $types[$i]
        $esc  = Esc $raw

        if ($type -eq 'bullet') {
            if (-not $inList) {
                [void]$sb.AppendLine('                <ul class="specs-list">')
                $inList = $true
            }
            # Bold-term detection: "Term: rest" where term part is short
            if ($esc -match '^(.{1,60}?):\s+(.+)$') {
                $term = $Matches[1]; $rest = $Matches[2]
                [void]$sb.AppendLine('                    <li><strong>' + $term + ':</strong> ' + $rest + '</li>')
            } else {
                [void]$sb.AppendLine('                    <li>' + $esc + '</li>')
            }
        }
        else {
            if ($inList) {
                [void]$sb.AppendLine('                </ul>')
                $inList = $false
            }
            # Formula detection
            $isFormula = $false
            if ($esc.Length -lt 80 -and $esc -match '=') {
                if ($esc -match '[^=]=\s*[A-Z\d]' -and ($esc -match '[A-Z]\s*=' -or $esc -match '^\s*[A-Z].*=')) {
                    $isFormula = $true
                }
            }
            if ($isFormula) {
                [void]$sb.AppendLine('                <p style="text-align: center; font-size: 1.2rem; font-weight: 600; color: var(--accent-color); margin: 1rem 0;">')
                [void]$sb.AppendLine('                    ' + $esc)
                [void]$sb.AppendLine('                </p>')
            } else {
                [void]$sb.AppendLine('                <p>' + $esc + '</p>')
            }
        }
    }
    if ($inList) {
        [void]$sb.AppendLine('                </ul>')
    }
    return $sb.ToString()
}

# =====================================================================
# 4. Build full replacement HTML  (intro + teorie + recap + quiz + ex)
# =====================================================================
function Build-ContentHtml {
    param([object[]]$sections, $info, [string]$key)

    $sb = [System.Text.StringBuilder]::new()

    # ── INTRODUCERE ──────────────────────────────────────────────────
    $introP = ''
    if ($info -and $info.Concepts.Count -gt 0) {
        $cList = ($info.Concepts | ForEach-Object { Esc $_ }) -join ', '
        $introP = 'In aceasta lectie studiem: ' + $cList + '.'
    }
    $descP = ''
    if ($sections.Count -gt 0) {
        for ($k = 0; $k -lt $sections[0].Items.Count; $k++) {
            if ($sections[0].Types[$k] -eq 'text' -and $sections[0].Items[$k].Length -gt 30) {
                $descP = Esc $sections[0].Items[$k]
                break
            }
        }
    }

    [void]$sb.AppendLine('    <section class="section" id="introducere">')
    [void]$sb.AppendLine('        <div class="container">')
    [void]$sb.AppendLine('            <h2 class="section-title">Introducere</h2>')
    [void]$sb.AppendLine('            <div class="card" style="margin-bottom: 2rem;">')
    if ($introP) {
        [void]$sb.AppendLine('                <p>' + $introP + '</p>')
    }
    if ($descP) {
        [void]$sb.AppendLine('                <p>' + $descP + '</p>')
    }
    [void]$sb.AppendLine('            </div>')
    [void]$sb.AppendLine('        </div>')
    [void]$sb.AppendLine('    </section>')
    [void]$sb.AppendLine('')

    # ── TEORIE ────────────────────────────────────────────────────────
    [void]$sb.AppendLine('    <section class="section" id="teorie">')
    [void]$sb.AppendLine('        <div class="container">')
    [void]$sb.AppendLine('            <h2 class="section-title">Teorie Structurata</h2>')
    [void]$sb.AppendLine('')

    $cardNum = 1
    foreach ($sec in $sections) {
        $tEsc = Esc $sec.Title
        $body = Format-ItemHtml -items $sec.Items -types $sec.Types

        [void]$sb.AppendLine('            <div class="card" style="margin-bottom: 2rem;">')
        [void]$sb.AppendLine('                <h3>' + $cardNum.ToString() + ' ' + $dash + ' ' + $tEsc + '</h3>')
        [void]$sb.Append($body)
        [void]$sb.AppendLine('            </div>')
        [void]$sb.AppendLine('')
        $cardNum++
    }

    [void]$sb.AppendLine('        </div>')
    [void]$sb.AppendLine('    </section>')
    [void]$sb.AppendLine('')

    # ── RECAPITULARE ──────────────────────────────────────────────────
    [void]$sb.AppendLine('    <section class="section" id="recapitulare">')
    [void]$sb.AppendLine('        <div class="container">')
    [void]$sb.AppendLine('            <h2 class="section-title">Recapitulare</h2>')
    [void]$sb.AppendLine('            <div class="card" style="margin-bottom: 2rem;">')
    [void]$sb.AppendLine('                <ul class="specs-list">')

    foreach ($sec in $sections) {
        $tE = Esc $sec.Title
        $firstItem = ''
        foreach ($it in $sec.Items) {
            if ($it.Length -gt 10) { $firstItem = $it; break }
        }
        $fE = Esc $firstItem
        if ($fE.Length -gt 160) { $fE = $fE.Substring(0, 157) + '...' }
        [void]$sb.AppendLine('                    <li><strong>' + $tE + ':</strong> ' + $fE + '</li>')
    }

    [void]$sb.AppendLine('                </ul>')
    [void]$sb.AppendLine('            </div>')
    [void]$sb.AppendLine('        </div>')
    [void]$sb.AppendLine('    </section>')
    [void]$sb.AppendLine('')

    # ── QUIZ (placeholder) ────────────────────────────────────────────
    [void]$sb.AppendLine('    <section class="section" id="quiz">')
    [void]$sb.AppendLine('        <div class="container">')
    [void]$sb.AppendLine('            <h2 class="section-title">Quiz</h2>')
    [void]$sb.AppendLine('        </div>')
    [void]$sb.AppendLine('    </section>')
    [void]$sb.AppendLine('')

    # ── EXERCITIU (placeholder) ───────────────────────────────────────
    [void]$sb.AppendLine('    <section class="section" id="exercitiu">')
    [void]$sb.AppendLine('        <div class="container">')
    [void]$sb.AppendLine('            <h2 class="section-title">Exercitiu</h2>')
    [void]$sb.AppendLine('        </div>')
    [void]$sb.AppendLine('    </section>')
    [void]$sb.AppendLine('')

    return $sb.ToString()
}

# =====================================================================
# MAIN
# =====================================================================

Write-Host "Parsing course structure..."
$courseMap = Parse-CourseStructure
Write-Host "  Found $($courseMap.Count) lessons in structura-curs.txt"

$matFiles = Get-ChildItem $materialDir -Filter "lectia-*-material-brut.txt" | Sort-Object Name
Write-Host "  Found $($matFiles.Count) material-brut files"

# ── Create missing HTML pages ─────────────────────────────────────────
foreach ($mf in $matFiles) {
    if ($mf.Name -match 'lectia-(\d+)\.(\d+)') {
        $x = $Matches[1]; $y = $Matches[2]
        $htmlPath = Join-Path $cursDir "lectia-$x-$y.html"
        if (-not (Test-Path $htmlPath)) {
            $prevY = [int]$y - 1
            $prev  = Join-Path $cursDir "lectia-$x-$prevY.html"
            if (-not (Test-Path $prev)) {
                $nextY = [int]$y + 1
                $prev  = Join-Path $cursDir "lectia-$x-$nextY.html"
            }
            if (Test-Path $prev) {
                Copy-Item $prev $htmlPath
                Write-Host "  Created missing: lectia-$x-$y.html"
            } else {
                Write-Host "  WARNING: cannot create lectia-$x-$y.html (no neighbor)"
            }
        }
    }
}

# ── Process each lesson ───────────────────────────────────────────────
$updated = @()
$errors  = @()

foreach ($mf in $matFiles) {
    $m = [regex]::Match($mf.Name, 'lectia-(\d+)\.(\d+)')
    if (-not $m.Success) { continue }

    $x = $m.Groups[1].Value
    $y = $m.Groups[2].Value
    $key = "$x.$y"
    $htmlName = "lectia-$x-$y.html"
    $htmlPath = Join-Path $cursDir $htmlName

    if (-not (Test-Path $htmlPath)) {
        $errors += "Missing HTML: $htmlName"
        continue
    }

    # Parse material
    $sections = Parse-MaterialBrut $mf.FullName
    if ($sections.Count -eq 0) {
        $errors += "No sections: $($mf.Name)"
        continue
    }

    # Get course info
    $info = $courseMap[$key]

    # Build content HTML
    $content = Build-ContentHtml -sections $sections -info $info -key $key

    # Read existing HTML
    $html = Get-Content $htmlPath -Raw -Encoding UTF8

    # ── Update hero section ───────────────────────────────────────────
    if ($info) {
        $modSub   = Esc ('Modul ' + $info.ModNum.ToString() + ' ' + $dash + ' ' + $info.ModName)
        $titleFull = Esc ('Lec' + [char]0x021B + 'ia ' + $key + ' ' + $dash + ' ' + $info.Title)
        $descText = ''
        if ($info.Concepts.Count -gt 0) {
            $descText = Esc (($info.Concepts | Select-Object -First 4) -join ', ')
        }
        $heroInner  = '            <p style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 3px; color: rgba(237,233,227,0.5); margin-bottom: 0.5rem;">' + $modSub + '</p>'
        $heroInner += "`r`n" + '            <h1>' + $titleFull + '</h1>'
        $heroInner += "`r`n" + '            <p>' + $descText + '</p>'
        $heroInner += "`r`n" + '            <a href="#introducere" class="hero-button">' + 'Incepe Lec' + [char]0x021B + 'ia</a>'

        $html = [regex]::Replace(
            $html,
            '(?s)(<section[^>]*hero-invata[^>]*>\s*<div class="hero-content">)\s*.*?\s*(</div>\s*</section>)',
            [System.Text.RegularExpressions.MatchEvaluator]{
                param($match)
                $match.Groups[1].Value + "`r`n" + $heroInner + "`r`n        " + $match.Groups[2].Value
            }
        )

        # Update <title> and meta description
        $html = [regex]::Replace(
            $html,
            '<title>.*?</title>',
            [System.Text.RegularExpressions.MatchEvaluator]{
                param($m2) '<title>' + $titleFull + ' ' + $dash + ' Console Notebook</title>'
            }
        )
        $html = [regex]::Replace(
            $html,
            '<meta name="description" content="[^"]*">',
            [System.Text.RegularExpressions.MatchEvaluator]{
                param($m3) '<meta name="description" content="' + $titleFull + '">'
            }
        )
    }

    # ── Replace main content region ───────────────────────────────────
    $html = [regex]::Replace(
        $html,
        '(?s)<section class="section" id="introducere">.*?(?=\s*<!-- NAVIGARE)',
        [System.Text.RegularExpressions.MatchEvaluator]{ param($mc) $content }
    )

    Set-Content -Path $htmlPath -Value $html -Encoding UTF8
    $updated += $htmlName
    Write-Host "  OK: $htmlName  ($($sections.Count) sections)"
}

# ── Report ────────────────────────────────────────────────────────────
Write-Host ''
Write-Host "Updated: $($updated.Count) files"
if ($errors.Count -gt 0) {
    Write-Host "Errors: $($errors.Count)"
    $errors | ForEach-Object { Write-Host "  $_" }
}
