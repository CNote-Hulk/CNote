# _generate_lessons_v2.ps1
# Comprehensive lesson generator — produces ALL 12 sections
# following the lectia-1-1.html template structure.
# Content sourced exclusively from material-brut research files.

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $root) { $root = Get-Location }

$materialDir = Join-Path $root "lectii\research"
$cursDir     = Join-Path $root "src\html\pages\curs"
$structPath  = Join-Path $root "lectii\structura-curs.txt"
$dash        = [char]0x2014   # em-dash

# Lessons to skip (already have full hand-crafted content)
$skipLessons = @('1.1')

function Esc([string]$s) {
    if ([string]::IsNullOrEmpty($s)) { return '' }
    return [System.Net.WebUtility]::HtmlEncode($s)
}

# Convert raw formula text to LaTeX notation for KaTeX rendering
function Convert-FormulaToLatex([string]$s) {
    $f = $s.Trim()
    # Superscript Unicode → LaTeX
    $f = $f -replace ([char]0x2074).ToString(), '^{4}'
    $f = $f -replace ([char]0x00B3).ToString(), '^{3}'
    $f = $f -replace ([char]0x00B2).ToString(), '^{2}'
    $f = $f -replace ([char]0x00B9).ToString(), '^{1}'
    $f = $f -replace ([char]0x2070).ToString(), '^{0}'
    # Handle superscript minus sequences: ⁻¹⁹ etc
    $f = [regex]::Replace($f, '([⁻⁺])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)', {
        param($m)
        $sign = if ($m.Groups[1].Value -eq ([char]0x207B).ToString()) { '-' } else { '+' }
        $digits = $m.Groups[2].Value
        $digits = $digits -replace ([char]0x2070).ToString(), '0'
        $digits = $digits -replace ([char]0x00B9).ToString(), '1'
        $digits = $digits -replace ([char]0x00B2).ToString(), '2'
        $digits = $digits -replace ([char]0x00B3).ToString(), '3'
        $digits = $digits -replace ([char]0x2074).ToString(), '4'
        $digits = $digits -replace ([char]0x2075).ToString(), '5'
        $digits = $digits -replace ([char]0x2076).ToString(), '6'
        $digits = $digits -replace ([char]0x2077).ToString(), '7'
        $digits = $digits -replace ([char]0x2078).ToString(), '8'
        $digits = $digits -replace ([char]0x2079).ToString(), '9'
        "^{$sign$digits}"
    })
    # Subscript Unicode → LaTeX
    $f = $f -replace ([char]0x2080).ToString(), '_{0}'
    $f = $f -replace ([char]0x2081).ToString(), '_{1}'
    $f = $f -replace ([char]0x2082).ToString(), '_{2}'
    $f = $f -replace ([char]0x2083).ToString(), '_{3}'
    $f = $f -replace ([char]0x2084).ToString(), '_{4}'
    $f = $f -replace ([char]0x2085).ToString(), '_{5}'
    $f = $f -replace ([char]0x2086).ToString(), '_{6}'
    $f = $f -replace ([char]0x2087).ToString(), '_{7}'
    $f = $f -replace ([char]0x2088).ToString(), '_{8}'
    $f = $f -replace ([char]0x2089).ToString(), '_{9}'
    $f = $f -replace ([char]0x2099).ToString(), '_{n}'
    $f = $f -replace ([char]0x1D62).ToString(), '_{i}'
    # Merge adjacent subscripts: _{1}_{2} → _{12}
    $f = [regex]::Replace($f, '_\{(\d+)\}_\{(\d+)\}', '_{$1$2}')
    # Merge adjacent superscripts: ^{1}^{2} → ^{12}
    $f = [regex]::Replace($f, '\^\{(\d+)\}\^\{(\d+)\}', '^{$1$2}')
    # Variable_name patterns → LaTeX subscript: R_total → R_{\text{total}}
    $f = [regex]::Replace($f, '([A-Za-z])_([A-Za-z]{2,})', '$1_{\text{$2}}')
    # Single char subscript: R_1 → R_{1}  (only if not already braced)
    $f = [regex]::Replace($f, '([A-Za-z])_([A-Za-z0-9])(?!\{)', '$1_{$2}')
    # Greek letters
    $f = $f -replace ([char]0x03A3).ToString(), '\Sigma '
    $f = $f -replace ([char]0x03C1).ToString(), '\rho '
    $f = $f -replace ([char]0x03B8).ToString(), '\theta '
    $f = $f -replace ([char]0x03C0).ToString(), '\pi '
    $f = $f -replace ([char]0x03A9).ToString(), '\Omega '
    $f = $f -replace ([char]0x03BC).ToString(), '\mu '
    # Math symbols
    $f = $f -replace ([char]0x00D7).ToString(), '\times '
    $f = $f -replace ([char]0x00B7).ToString(), '\cdot '
    $f = $f -replace ([char]0x2219).ToString(), '\cdot '
    $f = $f -replace ([char]0x2248).ToString(), '\approx '
    $f = $f -replace ([char]0x2265).ToString(), '\geq '
    $f = $f -replace ([char]0x2264).ToString(), '\leq '
    $f = $f -replace ([char]0x2260).ToString(), '\neq '
    $f = $f -replace ([char]0x221E).ToString(), '\infty '
    $f = $f -replace ([char]0x222B).ToString(), '\int '
    $f = $f -replace ([char]0x2211).ToString(), '\sum '
    $f = $f -replace ([char]0x221A).ToString(), '\sqrt'
    $f = $f -replace ([char]0x00B1).ToString(), '\pm '
    $f = $f -replace ([char]0x2208).ToString(), '\in '
    $f = $f -replace ([char]0x2124).ToString(), '\mathbb{Z}'
    $f = $f -replace ([char]0x00B0).ToString(), '^{\circ}'
    $f = $f -replace ([char]0x2192).ToString(), '\rightarrow '
    $f = $f -replace ([char]0x20D7).ToString(), '' # combining vector arrow (remove, use \vec)
    # Vector notation: J⃗ → \vec{J}
    $f = [regex]::Replace($f, '([A-Za-z])\u20D7', '\vec{$1}')
    # <sub>text</sub> patterns (from hand-crafted HTML)
    $f = [regex]::Replace($f, '<sub>([^<]+)</sub>', '_{$1}')
    # Romanian text in formulas: "sau" → proper text
    $f = $f -replace '\bsau\b', '\text{ sau }'
    # Use \ldots for ...
    $f = $f -replace '\.\.\.', '\ldots'
    # Clean up double spaces
    $f = [regex]::Replace($f, '  +', ' ')
    return $f
}

# Test if a line is a real math formula (not a text definition)
function Test-IsFormula([string]$raw) {
    if ($raw.Length -ge 100) { return $false }
    if ($raw -notmatch '=') { return $false }
    # Must have variable = expression pattern
    if ($raw -notmatch '[^=]=\s*[A-Z\d]') { return $false }
    if ($raw -notmatch '[A-Z]\s*=' -and $raw -notmatch '^\s*[A-Z].*=') { return $false }
    # Get the part after the first "="
    $afterEq = ($raw -split '=', 2)[1].Trim()
    # If text after "=" starts with a lowercase word >= 4 chars, it's a definition
    if ($afterEq -match '^\p{Ll}\p{L}{3,}') { return $false }
    # Count long words (>=4 alphabetic chars) after "=" — formulas have few words
    $longWords = ([regex]::Matches($afterEq, '\p{L}{4,}')).Count
    if ($longWords -ge 2) { return $false }
    # Count total long words in the whole expression
    $allLongWords = ([regex]::Matches($raw, '\p{L}{4,}')).Count
    if ($allLongWords -ge 3) { return $false }
    # Reject if starts with common text patterns
    if ($raw -match '^\s*(Ex:|Exemplu|Nota|Obs|Derivare)') { return $false }
    return $true
}
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
                if ($cl -match '^\u2022\s*(.+)') {
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

        if ($ln -match '^NOTE\s+CERCETARE') { break }

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
        $isHdr = $false; $hdrText = ''

        if ($ln -match '^SEC.IUNEA\s+\d+\s*[\p{Pd}:]+\s*(.+)$') {
            $inContent = $true
            $isHdr = $true; $hdrText = $Matches[1].Trim().TrimEnd(':')
        }
        elseif ($ln -match '^\d+\.\s+(.{3,})$' -and $ln.Length -lt 100) {
            $cand = $Matches[1].Trim().TrimEnd(':')
            $hasColon = ($ln.TrimEnd() -match ':\s*$')
            $uppers   = ($cand -creplace '[^A-Z]', '').Length
            $allUpper = ($uppers -gt ($cand.Length * 0.4))
            if ($cand.Length -lt 80 -and ($hasColon -or $allUpper)) {
                $isHdr = $true; $hdrText = $cand
            }
        }
        elseif ($ln -match '^(\p{Lu}.{2,}):\s*$' -and $ln.Length -lt 100 -and $ln -notmatch '^[-•*]') {
            $isHdr = $true; $hdrText = $Matches[1].Trim()
        }

        if ($isHdr -and $hdrText) {
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

        if (-not $inContent) { continue }

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
# 3. Format items into HTML (card body)
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
            $isFormula = Test-IsFormula $raw
            if ($isFormula) {
                $latex = Convert-FormulaToLatex $raw
                [void]$sb.AppendLine('                <p style="text-align: center; font-size: 1.2rem; font-weight: 600; color: var(--accent-color); margin: 1rem 0;">')
                [void]$sb.AppendLine('                    $$' + $latex + '$$')
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
# 4. Keyword patterns for section classification
# =====================================================================
$KW_LEGATURA = 'legatur|fizic.*informatic|informatic.*fizic|\bbit\b|binar.*digital|\bdigital.*binar|semiconductor.*comut|comut.*logic|tranzistor.*logic|electron.*bit|material.*procesor|fizic.*hardware'
$KW_APLICARE = 'aplica[tț]i[ie]|utiliz[aă]r[ie]|consol[aăe]|PS[345]\b|PlayStation|Xbox|Nintendo|Switch|gaming|PCB.*consol|consol.*PCB|hardware.*real|practic|implementa'
$KW_EXEMPLU  = 'exemplu|studiu.*caz|compar|specific[aț]|component.*real|hardware.*specific|real.*hardware'
$KW_PROBLEME = 'problem[aăe]|defect|frecvent.*asociat|diagnostic|avarie|eroare|risc|pericol|e[sș]ec|deteriora|degradare|simptom'

# Item-level keyword patterns (broader, for scanning individual items)
$IKW_LEGATURA = '\bbit\b|\bbinar|\bdigital|\bprocesor|\bCPU\b|\bGPU\b|logic[aăe]\b|comut.*logic|tranzistor.*siliciu|semiconductor.*comut|comput|informatic|instruc[tț]iun'
$IKW_APLICARE = 'consol[aăe]|PS[345]\b|PlayStation|Xbox|Nintendo|PCB|plac[aă].*baz[aă]|circuit.*imprimat|alimentare.*consol|\bVRM\b|sursa.*alimentare|\bSMPS\b|\bPSU\b|\bSoC\b|\bAPU\b'
$IKW_EXEMPLU  = 'NVIDIA|AMD\s|Intel\s|Samsung|Micron|SK.Hynix|Delta|GDDR|DDR[345]|specificat|fabricat.*de|produs.*de|model\b.*serie|\bnm\b.*proce[s]|serie[as]?\s+[A-Z]'
$IKW_PROBLEME = 'defect|problem[aă]|avarie|degradare|supra[iî]nc[aă]lzire|scurtcircuit|diagnostic|simptom|cauza.*defect|eroare|deteriora|risc|pericol|ardere|suprasarcin|lipitur[aă].*rece|circuit.*deschis|defec[tț]iun'

function Classify-SectionByTitle([string]$title) {
    $t = $title.ToLower()
    if ($t -match $KW_APLICARE)  { return 'APLICARE' }
    if ($t -match $KW_PROBLEME)  { return 'PROBLEME' }
    if ($t -match $KW_EXEMPLU)   { return 'EXEMPLU' }
    if ($t -match $KW_LEGATURA)  { return 'LEGATURA' }
    return 'TEORIE'
}

function Classify-Item([string]$item) {
    if ($item -match $IKW_PROBLEME)  { return 'PROBLEME' }
    if ($item -match $IKW_APLICARE)  { return 'APLICARE' }
    if ($item -match $IKW_EXEMPLU)   { return 'EXEMPLU' }
    if ($item -match $IKW_LEGATURA)  { return 'LEGATURA' }
    return 'TEORIE'
}

# =====================================================================
# 5. Extract classified items from all sections
# =====================================================================
function Get-ClassifiedItems([object[]]$sections) {
    $result = @{
        LEGATURA = [System.Collections.ArrayList]::new()
        APLICARE = [System.Collections.ArrayList]::new()
        EXEMPLU  = [System.Collections.ArrayList]::new()
        PROBLEME = [System.Collections.ArrayList]::new()
    }

    foreach ($sec in $sections) {
        $secCat = Classify-SectionByTitle $sec.Title

        if ($secCat -ne 'TEORIE') {
            # Entire section matches a specialized category
            [void]$result[$secCat].Add([pscustomobject]@{
                Title = $sec.Title
                Items = $sec.Items
                Types = $sec.Types
            })
        } else {
            # Scan individual items
            $buckets = @{}
            for ($i = 0; $i -lt $sec.Items.Count; $i++) {
                $cat = Classify-Item $sec.Items[$i]
                if ($cat -ne 'TEORIE') {
                    if (-not $buckets[$cat]) { $buckets[$cat] = @{ Items = @(); Types = @() } }
                    $buckets[$cat].Items += $sec.Items[$i]
                    $buckets[$cat].Types += $sec.Types[$i]
                }
            }
            foreach ($cat in $buckets.Keys) {
                if ($buckets[$cat].Items.Count -gt 0) {
                    [void]$result[$cat].Add([pscustomobject]@{
                        Title = $sec.Title
                        Items = [string[]]$buckets[$cat].Items
                        Types = [string[]]$buckets[$cat].Types
                    })
                }
            }
        }
    }
    return $result
}

# =====================================================================
# 6. Extract quiz candidates (items with "Term: definition" pattern)
# =====================================================================
function Get-QuizCandidates([object[]]$sections) {
    $candidates = [System.Collections.ArrayList]::new()

    foreach ($sec in $sections) {
        for ($i = 0; $i -lt $sec.Items.Count; $i++) {
            $item = $sec.Items[$i]
            # Definition pattern: "Short Term: longer explanation"
            if ($item -match '^(.{3,55}):\s+(.{15,})$' -and $sec.Types[$i] -eq 'bullet') {
                [void]$candidates.Add([pscustomobject]@{
                    Term       = $Matches[1].Trim()
                    Definition = $Matches[2].Trim()
                    Section    = $sec.Title
                })
            }
            # Formula pattern
            elseif ($item -match '[A-Z]\s*=\s*[A-Z\d]' -and $item.Length -lt 80) {
                [void]$candidates.Add([pscustomobject]@{
                    Term       = $sec.Title
                    Definition = $item
                    Section    = $sec.Title
                })
            }
        }
    }
    return ,@($candidates)
}

# =====================================================================
# 7. Build full replacement HTML (all sections)
# =====================================================================
function Build-ContentHtml {
    param([object[]]$sections, $info, [string]$key)

    $sb = [System.Text.StringBuilder]::new()
    $classified = Get-ClassifiedItems $sections
    $quizCandidates = Get-QuizCandidates $sections

    # ──────────────────────────────────────────────────────────────────
    # INTRODUCERE
    # ──────────────────────────────────────────────────────────────────
    [void]$sb.AppendLine('    <section class="section" id="introducere">')
    [void]$sb.AppendLine('        <div class="container">')
    [void]$sb.AppendLine('            <h2 class="section-title">Introducere</h2>')
    [void]$sb.AppendLine('            <div class="card" style="margin-bottom: 2rem;">')

    # First real paragraph from research
    $firstPara = ''
    foreach ($sec in $sections) {
        for ($k = 0; $k -lt $sec.Items.Count; $k++) {
            if ($sec.Types[$k] -eq 'text' -and $sec.Items[$k].Length -gt 30 -and $sec.Items[$k] -notmatch '^\s*\|' -and $sec.Items[$k] -notmatch '^\s*[-=]{3,}') {
                $firstPara = $sec.Items[$k]
                break
            }
        }
        if ($firstPara) { break }
    }
    # Fallback: use first bullet if no paragraph found
    if (-not $firstPara -and $sections.Count -gt 0 -and $sections[0].Items.Count -gt 0) {
        $firstPara = $sections[0].Items[0]
    }

    if ($firstPara) {
        [void]$sb.AppendLine('                <p>' + (Esc $firstPara) + '</p>')
    }

    # Concept list from structura-curs.txt
    if ($info -and $info.Concepts.Count -gt 0) {
        $conceptBold = ($info.Concepts | ForEach-Object { '<strong>' + (Esc $_) + '</strong>' }) -join ', '
        $introText = 'Aceast' + [char]0x0103 + ' lec' + [char]0x021B + 'ie acoper' + [char]0x0103 + ': ' + $conceptBold + '.'
        [void]$sb.AppendLine('                <p>' + $introText + '</p>')
    }

    # Importance statement
    if ($info) {
        $topicEsc = Esc $info.Title
        $impText = 'Fiecare concept prezentat este esen' + [char]0x021B + 'ial pentru ' + [char]0x00EE + 'n' + [char]0x021B + 'elegerea modului ' + [char]0x00EE + 'n care func' + [char]0x021B + 'ioneaz' + [char]0x0103 + ' hardware-ul consolelor moderne.'
        [void]$sb.AppendLine('                <p>' + $impText + '</p>')
    }

    [void]$sb.AppendLine('            </div>')
    [void]$sb.AppendLine('        </div>')
    [void]$sb.AppendLine('    </section>')
    [void]$sb.AppendLine('')

    # ──────────────────────────────────────────────────────────────────
    # TEORIE STRUCTURATA
    # ──────────────────────────────────────────────────────────────────
    [void]$sb.AppendLine('    <section class="section" id="teorie">')
    [void]$sb.AppendLine('        <div class="container">')
    [void]$sb.AppendLine('            <h2 class="section-title">Teorie Structurat' + [char]0x0103 + '</h2>')
    [void]$sb.AppendLine('')

    $cardNum = 1
    foreach ($sec in $sections) {
        $tEsc = Esc $sec.Title
        $body = Format-ItemHtml -items $sec.Items -types $sec.Types
        $numLabel = $key + '.' + $cardNum.ToString()

        [void]$sb.AppendLine('            <div class="card" style="margin-bottom: 2rem;">')
        [void]$sb.AppendLine('                <h3>' + $numLabel + ' ' + $dash + ' ' + $tEsc + '</h3>')
        [void]$sb.Append($body)
        [void]$sb.AppendLine('            </div>')
        [void]$sb.AppendLine('')
        $cardNum++
    }

    [void]$sb.AppendLine('        </div>')
    [void]$sb.AppendLine('    </section>')
    [void]$sb.AppendLine('')

    # ──────────────────────────────────────────────────────────────────
    # LEGATURA FIZICA - INFORMATICA
    # ──────────────────────────────────────────────────────────────────
    [void]$sb.AppendLine('    <section class="section" id="legatura">')
    [void]$sb.AppendLine('        <div class="container">')
    [void]$sb.AppendLine('            <h2 class="section-title">Leg' + [char]0x0103 + 'tura Fizic' + [char]0x0103 + ' ' + $dash + ' Informatic' + [char]0x0103 + '</h2>')

    $legItems = $classified['LEGATURA']
    if ($legItems.Count -gt 0) {
        foreach ($grp in $legItems) {
            [void]$sb.AppendLine('')
            [void]$sb.AppendLine('            <div class="card" style="margin-bottom: 2rem;">')
            [void]$sb.AppendLine('                <h3>' + (Esc $grp.Title) + '</h3>')
            [void]$sb.Append((Format-ItemHtml -items $grp.Items -types $grp.Types))
            [void]$sb.AppendLine('            </div>')
        }
    } else {
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('            <div class="card" style="margin-bottom: 2rem;">')
        if ($info) {
            $bridgeText = 'Conceptele din aceast' + [char]0x0103 + ' lec' + [char]0x021B + 'ie ' + $dash + ' ' + (Esc $info.Title) + ' ' + $dash + ' reprezint' + [char]0x0103 + ' fundamentul fizic al tehnologiei digitale utilizate ' + [char]0x00EE + 'n consolele moderne.'
            [void]$sb.AppendLine('                <p>' + $bridgeText + '</p>')
        }
        [void]$sb.AppendLine('            </div>')
    }

    [void]$sb.AppendLine('        </div>')
    [void]$sb.AppendLine('    </section>')
    [void]$sb.AppendLine('')

    # ──────────────────────────────────────────────────────────────────
    # APLICARE DIRECTA IN CONSOLE
    # ──────────────────────────────────────────────────────────────────
    [void]$sb.AppendLine('    <section class="section" id="aplicare">')
    [void]$sb.AppendLine('        <div class="container">')
    [void]$sb.AppendLine('            <h2 class="section-title">Aplicare Direct' + [char]0x0103 + ' ' + [char]0x00EE + 'n Console</h2>')

    $aplItems = $classified['APLICARE']
    if ($aplItems.Count -gt 0) {
        foreach ($grp in $aplItems) {
            [void]$sb.AppendLine('')
            [void]$sb.AppendLine('            <div class="card" style="margin-bottom: 2rem;">')
            [void]$sb.AppendLine('                <h3>' + (Esc $grp.Title) + '</h3>')
            [void]$sb.Append((Format-ItemHtml -items $grp.Items -types $grp.Types))
            [void]$sb.AppendLine('            </div>')
        }
    } else {
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('            <div class="card" style="margin-bottom: 2rem;">')
        if ($info) {
            $aplText = [char]0x00CE + 'n contextul consolelor de jocuri, ' + (Esc $info.Title).ToLower() + ' joac' + [char]0x0103 + ' un rol esen' + [char]0x021B + 'ial ' + [char]0x00EE + 'n func' + [char]0x021B + 'ionarea hardware-ului.'
            [void]$sb.AppendLine('                <p>' + $aplText + '</p>')
        }
        [void]$sb.AppendLine('            </div>')
    }

    [void]$sb.AppendLine('        </div>')
    [void]$sb.AppendLine('    </section>')
    [void]$sb.AppendLine('')

    # ──────────────────────────────────────────────────────────────────
    # EXEMPLU REAL DE HARDWARE
    # ──────────────────────────────────────────────────────────────────
    [void]$sb.AppendLine('    <section class="section" id="exemplu">')
    [void]$sb.AppendLine('        <div class="container">')
    [void]$sb.AppendLine('            <h2 class="section-title">Exemplu Real de Hardware</h2>')

    $exItems = $classified['EXEMPLU']
    if ($exItems.Count -gt 0) {
        foreach ($grp in $exItems) {
            [void]$sb.AppendLine('')
            [void]$sb.AppendLine('            <div class="card" style="margin-bottom: 2rem;">')
            [void]$sb.AppendLine('                <h3>' + (Esc $grp.Title) + '</h3>')
            [void]$sb.Append((Format-ItemHtml -items $grp.Items -types $grp.Types))
            [void]$sb.AppendLine('            </div>')
        }
    } else {
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('            <div class="card" style="margin-bottom: 2rem;">')
        if ($info -and $info.Concepts.Count -gt 0) {
            $exText = 'Componentele reale care utilizeaz' + [char]0x0103 + ' ' + (Esc ($info.Concepts[0])) + ' se reg' + [char]0x0103 + 'sesc ' + [char]0x00EE + 'n toate consolele moderne.'
            [void]$sb.AppendLine('                <p>' + $exText + '</p>')
        }
        [void]$sb.AppendLine('            </div>')
    }

    [void]$sb.AppendLine('        </div>')
    [void]$sb.AppendLine('    </section>')
    [void]$sb.AppendLine('')

    # ──────────────────────────────────────────────────────────────────
    # PROBLEME FRECVENTE ASOCIATE
    # ──────────────────────────────────────────────────────────────────
    [void]$sb.AppendLine('    <section class="section" id="probleme">')
    [void]$sb.AppendLine('        <div class="container">')
    [void]$sb.AppendLine('            <h2 class="section-title">Probleme Frecvente Asociate</h2>')

    $prItems = $classified['PROBLEME']
    if ($prItems.Count -gt 0) {
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('            <div class="cards-grid">')
        foreach ($grp in $prItems) {
            [void]$sb.AppendLine('                <div class="card">')
            [void]$sb.AppendLine('                    <h3>' + [char]0x26A0 + [char]0xFE0F + ' ' + (Esc $grp.Title) + '</h3>')
            foreach ($it in $grp.Items) {
                [void]$sb.AppendLine('                    <p>' + (Esc $it) + '</p>')
            }
            [void]$sb.AppendLine('                </div>')
        }
        [void]$sb.AppendLine('            </div>')
    } else {
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('            <div class="cards-grid">')
        [void]$sb.AppendLine('                <div class="card">')
        if ($info) {
            [void]$sb.AppendLine('                    <h3>' + [char]0x26A0 + [char]0xFE0F + ' Probleme asociate cu ' + (Esc $info.Title) + '</h3>')
            [void]$sb.AppendLine('                    <p>Problemele frecvente asociate cu aceast' + [char]0x0103 + ' tem' + [char]0x0103 + ' vor fi detaliate pe m' + [char]0x0103 + 'sur' + [char]0x0103 + ' ce cursul avanseaz' + [char]0x0103 + '.</p>')
        }
        [void]$sb.AppendLine('                </div>')
        [void]$sb.AppendLine('            </div>')
    }

    [void]$sb.AppendLine('        </div>')
    [void]$sb.AppendLine('    </section>')
    [void]$sb.AppendLine('')

    # ──────────────────────────────────────────────────────────────────
    # RECAPITULARE
    # ──────────────────────────────────────────────────────────────────
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
        if ($fE.Length -gt 200) { $fE = $fE.Substring(0, 197) + '...' }
        [void]$sb.AppendLine('                    <li><strong>' + $tE + ':</strong> ' + $fE + '</li>')
    }

    [void]$sb.AppendLine('                </ul>')
    [void]$sb.AppendLine('            </div>')
    [void]$sb.AppendLine('        </div>')
    [void]$sb.AppendLine('    </section>')
    [void]$sb.AppendLine('')

    # ──────────────────────────────────────────────────────────────────
    # QUIZ — 5 INTREBARI
    # ──────────────────────────────────────────────────────────────────
    [void]$sb.AppendLine('    <section class="section" id="quiz">')
    [void]$sb.AppendLine('        <div class="container">')
    [void]$sb.AppendLine('            <h2 class="section-title">Quiz ' + $dash + ' 5 ' + [char]0x00CE + 'ntreb' + [char]0x0103 + 'ri</h2>')

    # Build quiz from candidates
    $qCount = [Math]::Min(5, $quizCandidates.Count)

    if ($qCount -ge 2) {
        # Ensure diversity: pick from different sections
        $used = @{}
        $selected = [System.Collections.ArrayList]::new()
        foreach ($c in $quizCandidates) {
            if ($selected.Count -ge 5) { break }
            if (-not $used[$c.Section]) {
                [void]$selected.Add($c)
                $used[$c.Section] = $true
            }
        }
        # Fill remaining from any section
        if ($selected.Count -lt 5) {
            foreach ($c in $quizCandidates) {
                if ($selected.Count -ge 5) { break }
                if ($selected -notcontains $c) {
                    [void]$selected.Add($c)
                }
            }
        }

        $qNum = 0
        foreach ($q in $selected) {
            $qNum++
            $qTermEsc = Esc $q.Term
            $qDefEsc  = Esc $q.Definition

            # Collect wrong answers (definitions from other candidates)
            $wrongs = @()
            foreach ($other in $quizCandidates) {
                if ($other -ne $q -and $wrongs.Count -lt 3) {
                    $wrongs += (Esc $other.Definition)
                }
            }
            # Pad with generic wrongs if needed
            while ($wrongs.Count -lt 3) {
                $wrongs += 'Aceast' + [char]0x0103 + ' proprietate nu este relevant' + [char]0x0103 + ' pentru acest concept'
            }

            # Shuffle options
            $options = @($qDefEsc) + $wrongs[0..2]
            $correctIdx = 0
            # Fisher-Yates shuffle
            $rnd = [System.Random]::new($qNum * 37 + $key.GetHashCode())
            for ($i = $options.Count - 1; $i -gt 0; $i--) {
                $j = $rnd.Next($i + 1)
                $tmp = $options[$i]
                $options[$i] = $options[$j]
                $options[$j] = $tmp
                if ($correctIdx -eq $i) { $correctIdx = $j }
                elseif ($correctIdx -eq $j) { $correctIdx = $i }
            }

            $letters = @('a', 'b', 'c', 'd')
            $correctLetter = $letters[$correctIdx]

            [void]$sb.AppendLine('')
            [void]$sb.AppendLine('            <div class="card" style="margin-bottom: 1.5rem;">')
            [void]$sb.AppendLine('                <h3>' + [char]0x00CE + 'ntrebarea ' + $qNum.ToString() + '</h3>')
            [void]$sb.AppendLine('                <p><strong>Care afirma' + [char]0x021B + 'ie este corect' + [char]0x0103 + ' despre: ' + $qTermEsc + '?</strong></p>')
            [void]$sb.AppendLine('                <ul class="specs-list">')
            for ($oi = 0; $oi -lt $options.Count; $oi++) {
                $optText = $options[$oi]
                if ($optText.Length -gt 150) { $optText = $optText.Substring(0, 147) + '...' }
                [void]$sb.AppendLine('                    <li>' + $letters[$oi] + ') ' + $optText + '</li>')
            }
            [void]$sb.AppendLine('                </ul>')
            [void]$sb.AppendLine('                <details style="margin-top: 1rem;">')
            [void]$sb.AppendLine('                    <summary style="cursor: pointer; color: var(--accent-color); font-weight: 600;">Arat' + [char]0x0103 + ' r' + [char]0x0103 + 'spunsul</summary>')
            $answerText = $correctLetter + ') ' + $dash + ' ' + $qDefEsc
            if ($answerText.Length -gt 200) { $answerText = $answerText.Substring(0, 197) + '...' }
            [void]$sb.AppendLine('                    <p style="margin-top: 0.5rem;"><strong>' + $answerText + '</strong></p>')
            [void]$sb.AppendLine('                </details>')
            [void]$sb.AppendLine('            </div>')
        }
    } else {
        [void]$sb.AppendLine('            <!-- Quiz: insufficient definition data for auto-generation -->')
    }

    [void]$sb.AppendLine('        </div>')
    [void]$sb.AppendLine('    </section>')
    [void]$sb.AppendLine('')

    # ──────────────────────────────────────────────────────────────────
    # EXERCITIU APLICAT DE GANDIRE
    # ──────────────────────────────────────────────────────────────────
    [void]$sb.AppendLine('    <section class="section" id="exercitiu">')
    [void]$sb.AppendLine('        <div class="container">')
    [void]$sb.AppendLine('            <h2 class="section-title">Exerci' + [char]0x021B + 'iu Aplicat de G' + [char]0x00E2 + 'ndire</h2>')
    [void]$sb.AppendLine('')

    $titleEsc = ''
    if ($info) { $titleEsc = Esc $info.Title }
    $brainEmoji = [char]::ConvertFromUtf32(0x1F9E0)
    $exTitle = $brainEmoji + ' Exerci' + [char]0x021B + 'iu: ' + $titleEsc

    [void]$sb.AppendLine('            <div class="card" style="margin-bottom: 2rem;">')
    [void]$sb.AppendLine('                <h3>' + $exTitle + '</h3>')

    # Build exercise scenario from lesson concepts
    if ($info -and @($info.Concepts).Count -gt 0 -and @($sections).Count -gt 0) {
        $c1 = Esc ($info.Concepts[0])
        $scenarioText = '<strong>Scenariu:</strong> Analizezi un sistem hardware care utilizeaz' + [char]0x0103 + ' conceptul de ' + $c1 + '. Pe baza cuno' + [char]0x0219 + 'tin' + [char]0x021B + 'elor din aceast' + [char]0x0103 + ' lec' + [char]0x021B + 'ie, r' + [char]0x0103 + 'spunde la urm' + [char]0x0103 + 'toarele ' + [char]0x00EE + 'ntreb' + [char]0x0103 + 'ri:'
        [void]$sb.AppendLine('                <p>' + $scenarioText + '</p>')

        # Generate questions from concepts
        [void]$sb.AppendLine('                <ul class="specs-list">')
        $concepts = $info.Concepts
        $qTexts = @()
        $aTexts = @()

        # Q1: definition
        $qTexts += '1. Defineste pe scurt: ' + (Esc $concepts[0]) + '.'
        $ans1 = ''
        foreach ($sec in $sections) {
            foreach ($it in $sec.Items) {
                if ($it.Length -gt 20 -and $it.Length -lt 200) { $ans1 = $it; break }
            }
            if ($ans1) { break }
        }
        $aTexts += Esc $ans1

        # Q2: parameter/value
        if ($concepts.Count -gt 1) {
            $qTexts += '2. Ce rol are ' + (Esc $concepts[1]) + ' ' + [char]0x00EE + 'n contextul hardware-ului?'
        } else {
            $qTexts += '2. Ce parametri sunt relevan' + [char]0x021B + 'i pentru acest concept?'
        }
        $ans2 = ''
        if ($sections.Count -gt 1) {
            foreach ($it in $sections[1].Items) {
                if ($it.Length -gt 20 -and $it.Length -lt 200) { $ans2 = $it; break }
            }
        }
        if (-not $ans2 -and $ans1) { $ans2 = $ans1 }
        $aTexts += Esc $ans2

        # Q3: application
        if ($concepts.Count -gt 2) {
            $qTexts += '3. Explic' + [char]0x0103 + ' rela' + [char]0x021B + 'ia dintre ' + (Esc $concepts[0]) + ' ' + [char]0x0219 + 'i ' + (Esc $concepts[2]) + '.'
        } else {
            $qTexts += '3. Cum se aplic' + [char]0x0103 + ' aceast' + [char]0x0103 + ' no' + [char]0x021B + 'iune ' + [char]0x00EE + 'n ingineria consolelor?'
        }
        $ans3 = ''
        if ($sections.Count -gt 2) {
            foreach ($it in $sections[2].Items) {
                if ($it.Length -gt 20 -and $it.Length -lt 200) { $ans3 = $it; break }
            }
        }
        if (-not $ans3) { $ans3 = 'Conceptele studiate sunt aplicate direct ' + [char]0x00EE + 'n proiectarea hardware-ului consolelor.' }
        $aTexts += Esc $ans3

        foreach ($qt in $qTexts) {
            [void]$sb.AppendLine('                    <li>' + $qt + '</li>')
        }
        [void]$sb.AppendLine('                </ul>')

        # Solution
        [void]$sb.AppendLine('                <details style="margin-top: 1.5rem;">')
        [void]$sb.AppendLine('                    <summary style="cursor: pointer; color: var(--accent-color); font-weight: 600;">Arat' + [char]0x0103 + ' rezolvarea</summary>')
        [void]$sb.AppendLine('                    <div style="margin-top: 1rem;">')
        for ($qi = 0; $qi -lt $aTexts.Count; $qi++) {
            [void]$sb.AppendLine('                        <p><strong>' + ($qi + 1).ToString() + '.</strong> ' + $aTexts[$qi] + '</p>')
        }
        [void]$sb.AppendLine('                    </div>')
        [void]$sb.AppendLine('                </details>')
    }

    [void]$sb.AppendLine('            </div>')
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
$skipped = @()
$errors  = @()

foreach ($mf in $matFiles) {
    $m = [regex]::Match($mf.Name, 'lectia-(\d+)\.(\d+)')
    if (-not $m.Success) { continue }

    $x = $m.Groups[1].Value
    $y = $m.Groups[2].Value
    $key = "$x.$y"
    $htmlName = "lectia-$x-$y.html"
    $htmlPath = Join-Path $cursDir $htmlName

    # Skip hand-crafted lessons
    if ($skipLessons -contains $key) {
        $skipped += $htmlName
        Write-Host "  SKIP: $htmlName (hand-crafted)"
        continue
    }

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
        $tChar = [char]0x021B
        $modSub   = Esc ('Modul ' + $info.ModNum.ToString() + ' ' + $dash + ' ' + $info.ModName)
        $titleFull = Esc ('Lec' + $tChar + 'ia ' + $key + ' ' + $dash + ' ' + $info.Title)
        $descText = ''
        if ($info.Concepts.Count -gt 0) {
            $descText = Esc (($info.Concepts | Select-Object -First 4) -join ', ')
        }
        $heroInner  = '            <p style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 3px; color: rgba(237,233,227,0.5); margin-bottom: 0.5rem;">' + $modSub + '</p>'
        $heroInner += "`r`n" + '            <h1>' + $titleFull + '</h1>'
        $heroInner += "`r`n" + '            <p>' + $descText + '</p>'
        $heroInner += "`r`n" + '            <a href="#introducere" class="hero-button">Incepe Lec' + $tChar + 'ia</a>'

        $html = [regex]::Replace(
            $html,
            '(?s)(<section[^>]*hero-invata[^>]*>\s*<div class="hero-content">)\s*.*?\s*(</div>\s*</section>)',
            [System.Text.RegularExpressions.MatchEvaluator]{
                param($match)
                $match.Groups[1].Value + "`r`n" + $heroInner + "`r`n        " + $match.Groups[2].Value
            }
        )

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

    # Count classified items for report
    $cls = Get-ClassifiedItems $sections
    $clsCount = 0
    foreach ($k2 in $cls.Keys) { $clsCount += $cls[$k2].Count }
    $quizC = (Get-QuizCandidates $sections).Count

    Write-Host "  OK: $htmlName  ($($sections.Count) sec, $clsCount classified, $quizC quiz)"
}

# ── Report ────────────────────────────────────────────────────────────
Write-Host ''
Write-Host "Updated: $($updated.Count) files"
Write-Host "Skipped: $($skipped.Count) files"
if ($errors.Count -gt 0) {
    Write-Host "Errors: $($errors.Count)"
    $errors | ForEach-Object { Write-Host "  $_" }
}
