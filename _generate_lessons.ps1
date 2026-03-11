$ErrorActionPreference = "Stop"

$root = Get-Location
$verifiedFiles = Get-ChildItem -Path "lectii/research" -Filter "lectia-*-verified.txt" | Sort-Object Name
$cursDir = Join-Path $root "src/html/pages/curs"

function HtmlEscape([string]$text) {
    if ($null -eq $text) { return "" }
    return [System.Net.WebUtility]::HtmlEncode($text)
}

function Parse-VerifiedFile([string]$path) {
    $raw = Get-Content -Path $path -Raw -Encoding UTF8
    $lessonMatch = [regex]::Match($raw, 'LESSON:\s*(.+)')
    $lessonTitle = if ($lessonMatch.Success) { $lessonMatch.Groups[1].Value.Trim() } else { "" }

    $conceptMatches = [regex]::Matches($raw, 'CONCEPT:\s*(.*?)\r?\n\r?\nVERIFIED INFORMATION:\r?\n(.*?)(?=\r?\n---\r?\n|\z)', 'Singleline')
    $concepts = @()
    foreach ($m in $conceptMatches) {
        $name = $m.Groups[1].Value.Trim()
        $info = $m.Groups[2].Value.Trim()
        if ($name -and $info) {
            $concepts += [pscustomobject]@{ Name = $name; Info = $info }
        }
    }

    return [pscustomobject]@{
        LessonTitle = $lessonTitle
        Concepts = $concepts
    }
}

function FirstSentence([string]$text) {
    if (-not $text) { return "" }
    $m = [regex]::Match($text, '^(.+?[\.!\?])\s')
    if ($m.Success) { return $m.Groups[1].Value.Trim() }
    return $text.Trim()
}

function Build-SectionContent($parsed, [string]$lessonKey) {
    $lessonEsc = HtmlEscape($parsed.LessonTitle)
    $conceptNames = @($parsed.Concepts | ForEach-Object { $_.Name })
    $conceptNamesEsc = ($conceptNames | ForEach-Object { HtmlEscape($_) }) -join ", "

    $introBody = @"
<section class="section" id="introducere">
    <div class="container">
        <h2 class="section-title">Introducere</h2>

        <div class="card" style="margin-bottom: 2rem;">
            <p><strong>$lessonEsc</strong></p>
            <p>Aceasta lectie foloseste exclusiv informatia verificata pentru conceptele: $conceptNamesEsc.</p>
        </div>
    </div>
</section>
"@

    $theoryCards = @()
    $i = 1
    foreach ($c in $parsed.Concepts) {
        $nameEsc = HtmlEscape($c.Name)
        $infoEsc = (HtmlEscape($c.Info) -replace "\r?\n", "<br>")
        $theoryCards += @"
        <div class="card" style="margin-bottom: 2rem;">
            <h3>$lessonKey.$i - $nameEsc</h3>
            <p>$infoEsc</p>
        </div>
"@
        $i++
    }

    $theoryBody = @"
<section class="section" id="teorie">
    <div class="container">
        <h2 class="section-title">Teorie Structurata</h2>
$($theoryCards -join "`n")
    </div>
</section>
"@

    $recapItems = @()
    foreach ($c in $parsed.Concepts) {
        $nameEsc = HtmlEscape($c.Name)
        $sentEsc = HtmlEscape((FirstSentence $c.Info))
        $recapItems += "                    <li><strong>${nameEsc}:</strong> $sentEsc</li>"
    }

    $recapBody = @"
<section class="section" id="recapitulare">
    <div class="container">
        <h2 class="section-title">Recapitulare</h2>

        <div class="card" style="margin-bottom: 2rem;">
            <ul class="specs-list">
$($recapItems -join "`n")
            </ul>
        </div>
    </div>
</section>
"@

    $quizBody = @"
<section class="section" id="quiz">
    <div class="container">
        <h2 class="section-title">Quiz</h2>
    </div>
</section>
"@

    $exBody = @"
<section class="section" id="exercitiu">
    <div class="container">
        <h2 class="section-title">Exercitiu</h2>
    </div>
</section>
"@

    return [pscustomobject]@{
        Introducere = $introBody
        Teorie = $theoryBody
        Recap = $recapBody
        Quiz = $quizBody
        Exercitiu = $exBody
    }
}

# Create missing lesson 4-5 page if needed, based on neighboring structure.
$lesson45Path = Join-Path $cursDir "lectia-4-5.html"
if (-not (Test-Path $lesson45Path)) {
    $base = Join-Path $cursDir "lectia-4-4.html"
    if (Test-Path $base) {
        Copy-Item $base $lesson45Path
        $h = Get-Content $lesson45Path -Raw -Encoding UTF8
        $h = $h -replace 'lectia-4-4\.html', 'lectia-4-5.html'
        $h = $h -replace 'Lecția 4\.4', 'Lecția 4.5'
        Set-Content -Path $lesson45Path -Value $h -Encoding UTF8
    }
}

$updated = @()
$missingHtml = @()

foreach ($vf in $verifiedFiles) {
    $name = [IO.Path]::GetFileNameWithoutExtension($vf.Name)
    $m = [regex]::Match($name, 'lectia-(\d+)\.(\d+)-verified')
    if (-not $m.Success) { continue }

    $x = $m.Groups[1].Value
    $y = $m.Groups[2].Value
    $lessonKey = "$x.$y"
    $htmlName = "lectia-$x-$y.html"
    $htmlPath = Join-Path $cursDir $htmlName

    if (-not (Test-Path $htmlPath)) {
        $missingHtml += $htmlName
        continue
    }

    $parsed = Parse-VerifiedFile $vf.FullName
    $blocks = Build-SectionContent $parsed $lessonKey

    $html = Get-Content -Path $htmlPath -Raw -Encoding UTF8

    # Update heading/title snippets from verified lesson title when available.
    if ($parsed.LessonTitle) {
        $shortEsc = HtmlEscape($parsed.LessonTitle)
        $displayTitle = 'Lecția ' + $shortEsc
        $html = [regex]::Replace($html, '(?s)<h1>.*?</h1>', "<h1>$displayTitle</h1>", 1)
        $metaPattern = '<meta name="description" content="[^"]*">'
        $metaReplacement = '<meta name="description" content="' + $displayTitle + '">'
        $html = [regex]::Replace($html, $metaPattern, $metaReplacement, 1)
        $html = [regex]::Replace($html, '(?s)<title>.*?</title>', "<title>$displayTitle - Console Notebook</title>", 1)

        $heroP = if ($parsed.Concepts.Count -gt 0) {
            "Concepte verificate: " + (($parsed.Concepts | ForEach-Object { $_.Name }) -join ", ") + "."
        } else {
            "Conținut generat exclusiv din informația verificată."
        }
        $heroPEsc = HtmlEscape($heroP)

        $heroSection = @"
    <section class="hero hero-cinematic hero-invata">
        <div class="hero-content">
            <h1>$displayTitle</h1>
            <p>$heroPEsc</p>
            <a href="#introducere" class="hero-button">Începe Lecția</a>
        </div>
    </section>
"@

        $html = [regex]::Replace(
            $html,
            '(?s)(</nav>\s*).*?(?=<section class="section" id="introducere">)',
            [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $m.Groups[1].Value + "`r`n" + $heroSection + "`r`n" },
            1
        )
    }

    $mainContent = ($blocks.Introducere + "`r`n" + $blocks.Teorie + "`r`n" + $blocks.Recap + "`r`n" + $blocks.Quiz + "`r`n" + $blocks.Exercitiu + "`r`n")
    $html = [regex]::Replace(
        $html,
        '(?s)<section class="section" id="introducere">.*?(?=<section class="section" id="navigare">)',
        [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $mainContent },
        1
    )

    Set-Content -Path $htmlPath -Value $html -Encoding UTF8
    $updated += $htmlName
}

"Updated: $($updated.Count) files"
$updated | Sort-Object
if ($missingHtml.Count -gt 0) {
    "Missing HTML files:"
    $missingHtml | Sort-Object
}
