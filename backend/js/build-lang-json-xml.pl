#!/usr/bin/perl
use strict;
use warnings;
use utf8;
use open qw(:std :utf8);
use JSON;
use Encode qw(encode decode);

# ── Configuration ─────────────────────────────────────────────────────────────
my $BASE     = "/c/Users/andre/OneDrive/Documentos/CNote";
my $EN_FILE  = "$BASE/frontend/js/data/consoles-en.json";
my $TMP      = "/tmp";

# Per-language regex patterns for the translatable fields.
my %CFG = (
    ro => {
        adv   => qr/avantaje/i,
        dis   => qr/dezavantaje/i,
        hist  => qr/istor/i,
        other => qr/altele|^other$/i,
        gcap  => qr/capacit/i,
    },
    de => {
        adv   => qr/Vorteile/,
        dis   => qr/Nachteile/,
        hist  => qr/Geschichte/,
        other => qr/Sonstige/,
        gcap  => qr/F[äa]higkeiten|Funktionen/,
    },
    es => {
        adv   => qr/ventajas/i,
        dis   => qr/desventajas/i,
        hist  => qr/[Hh]istoria/,
        other => qr/[Oo]tros?|^other$/i,
        gcap  => qr/capacidades|^capacity$/i,
    },
    fr => {
        adv   => qr/avantages/i,
        dis   => qr/d[eé]savantages|inconv[eé]nients?/i,
        hist  => qr/[Hh]istorique|[Hh]istoire/,
        other => qr/[Aa]utre[s]?|^other$/i,
        gcap  => qr/[Cc]apacit[eé]s?|Fonctionnalit[eé]s?|^capacity$/i,
    },
    it => {
        adv   => qr/vantaggi/i,
        dis   => qr/svantaggi/i,
        hist  => qr/storia/i,
        other => qr/[Aa]ltro/i,
        gcap  => qr/funzionalit[aà]|capacit[aà]|^capacity$/i,
    },
);

# ── XML helpers ────────────────────────────────────────────────────────────────

# Extract paragraph-level text from XML by joining all <w:t> nodes within
# each <w:p> paragraph, then concatenating paragraphs with newlines.
# This correctly handles history fields that span multiple <w:t> nodes.
sub xml_to_text {
    my $xml = shift;

    # Unescape XML entities
    sub xml_unescape {
        my $s = shift;
        $s =~ s/&lt;/</g;
        $s =~ s/&gt;/>/g;
        $s =~ s/&amp;/&/g;
        $s =~ s/&quot;/"/g;
        $s =~ s/&apos;/'/g;
        return $s;
    }

    my @paragraphs;

    # Split by paragraph boundaries
    while ($xml =~ /<w:p[ >](.*?)<\/w:p>/gs) {
        my $para_xml = $1;

        # Collect all <w:t> text nodes within this paragraph
        my $para_text = '';
        while ($para_xml =~ /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) {
            $para_text .= $1;
        }

        next if $para_text =~ /^\s*$/;   # skip blank paragraphs
        $para_text = xml_unescape($para_text);
        push @paragraphs, $para_text;
    }

    return join("\n", @paragraphs);
}

# ── Quote normalization ───────────────────────────────────────────────────────

# Normalize fancy curly quotes to ASCII double-quote for easier parsing.
# We keep track so we can identify key vs value boundaries.
sub normalize_quotes {
    my $s = shift;
    # Keep fancy quotes as-is — we use Unicode char classes in regexes.
    # Actually: for simpler parsing, let's normalize them all to ASCII "
    $s =~ s/\x{201E}/"/g;   # „  low-9 opening
    $s =~ s/\x{201C}/"/g;   # "  left double
    $s =~ s/\x{201D}/"/g;   # "  right double
    $s =~ s/\x{AB}/"/g;     # «  left angle
    $s =~ s/\x{BB}/"/g;     # »  right angle
    return $s;
}

# ── Block splitting ───────────────────────────────────────────────────────────

sub split_blocks {
    my $text = shift;
    my @blocks;
    my $depth = 0;
    my $start = -1;
    my $len   = length($text);
    for my $i (0 .. $len - 1) {
        my $c = substr($text, $i, 1);
        if ($c eq '{') {
            $depth++;
            $start = $i if $depth == 1;
        } elsif ($c eq '}') {
            $depth--;
            if ($depth == 0 && $start >= 0) {
                push @blocks, substr($text, $start, $i - $start + 1);
                $start = -1;
            }
        }
    }
    return @blocks;
}

sub block_id {
    my $block = shift;
    if ($block =~ /"id"\s*:\s*"([^"]+)"/) {
        return $1;
    }
    return undef;
}

# ── Field extraction ──────────────────────────────────────────────────────────

# Extract an array field (advantages or disadvantages) from a block.
sub extract_array {
    my ($block, $pat) = @_;

    my @lines = split /\n/, $block;
    my $in_array = 0;
    my @items;

    for my $line (@lines) {
        $line =~ s/\r$//;   # strip CR from Windows line endings
        if (!$in_array) {
            # Match: "key_matching_pat": [
            if ($line =~ /"[^"]*$pat[^"]*"\s*:\s*\[/i) {
                $in_array = 1;
                # Check if array closes on same line
                if ($line =~ /\[\s*\]/) {
                    $in_array = 0;
                } elsif ($line =~ /\[(.+)\]/) {
                    # Inline items
                    my $content = $1;
                    while ($content =~ /"([^"]+)"/g) {
                        push @items, $1;
                    }
                    $in_array = 0;
                }
                next;
            }
        } else {
            my $trimmed = $line;
            $trimmed =~ s/^\s+|\s+$//g;

            last if $trimmed =~ /^\]\s*,?\s*$/;
            next if $trimmed eq '';

            # Each item is a quoted string
            if ($trimmed =~ /^"(.*?)"\s*,?\s*$/) {
                push @items, $1 if $1 ne '';
            }
        }
    }

    return @items ? \@items : undef;
}

# Extract a single-string field from a block.
# For history, the value can be very long and span multiple "lines"
# (since paragraphs are joined with \n). We look for the key, then
# grab everything until the next key or block end.
sub extract_string {
    my ($block, $pat) = @_;

    my @lines = split /\n/, $block;
    my $collecting = 0;
    my @value_parts;

    for my $line (@lines) {
        $line =~ s/\r$//;

        if (!$collecting) {
            # Look for: "key_matching_pat": "value...
            if ($line =~ /"[^"]*$pat[^"]*"\s*:\s*"(.*)/i) {
                my $after = $1;
                # Check if value closes on same line
                if ($after =~ /^(.*?)"\s*,?\s*$/) {
                    return $1;
                } else {
                    # Multi-line value starts here
                    $collecting = 1;
                    push @value_parts, $after;
                }
            }
        } else {
            my $trimmed = $line;
            $trimmed =~ s/^\s+|\s+$//g;

            # End conditions: line starts a new key or is a closing brace
            if ($trimmed =~ /^"[^"]+"\s*:/ || $trimmed =~ /^[}\]]/) {
                last;
            }

            # Append to value, strip trailing closing quote+comma if present
            my $part = $line;
            $part =~ s/"\s*,?\s*$//;
            push @value_parts, $part;
        }
    }

    if ($collecting && @value_parts) {
        my $val = join("\n", @value_parts);
        $val =~ s/"\s*,?\s*$//;
        $val =~ s/^\s+|\s+$//g;
        return $val if $val ne '';
    }

    return undef;
}

# ── Translation application ───────────────────────────────────────────────────

sub apply_translations {
    my ($console, $block, $cfg) = @_;

    my $adv = extract_array($block, $cfg->{adv});
    $console->{advantages} = $adv if $adv && @$adv;

    my $dis = extract_array($block, $cfg->{dis});
    $console->{disadvantages} = $dis if $dis && @$dis;

    my $hist = extract_string($block, $cfg->{hist});
    $console->{history} = $hist if defined $hist && $hist ne '';

    my $other = extract_string($block, $cfg->{other});
    $console->{technologies}{other} = $other if defined $other && $other ne '';

    my $gcap = extract_string($block, $cfg->{gcap});
    $console->{gpu}{capabilities} = $gcap if defined $gcap && $gcap ne '';
}

# ── ID normalization ──────────────────────────────────────────────────────────

sub normalise {
    my $s = lc(shift);
    $s =~ s/[ăâ]/a/g;
    $s =~ s/[î]/i/g;
    $s =~ s/[șş]/s/g;
    $s =~ s/[țţ]/t/g;
    $s =~ s/[éè]/e/g;
    $s =~ s/[ő]/o/g;
    $s =~ s/[^a-z0-9]+/-/g;
    $s =~ s/-+/-/g;
    $s =~ s/^-|-$//g;
    return $s;
}

# ── Main ──────────────────────────────────────────────────────────────────────

# Load English JSON
open(my $en_fh, "<:utf8", $EN_FILE) or die "Cannot read $EN_FILE: $!";
my $en_raw = do { local $/; <$en_fh> };
close $en_fh;
my $en_data = decode_json(encode('UTF-8', $en_raw));
print "Loaded English JSON: " . scalar(@$en_data) . " consoles\n";

for my $lang (qw(ro de es fr it)) {
    my $xml_file = "$TMP/$lang.xml";
    my $out_file = "$BASE/frontend/js/data/consoles-$lang.json";
    my $cfg      = $CFG{$lang};

    print "\n=== Processing $lang ===\n";

    # Read XML
    open(my $xfh, "<:utf8", $xml_file) or die "Cannot read $xml_file: $!";
    my $xml_raw = do { local $/; <$xfh> };
    close $xfh;

    # Convert XML paragraphs to text
    my $md_text = xml_to_text($xml_raw);
    # Normalize quotes to ASCII "
    $md_text = normalize_quotes($md_text);

    # Split into per-console blocks
    my @blocks = split_blocks($md_text);
    print "  Blocks found: " . scalar(@blocks) . "\n";

    # Build lookup maps
    my @md_ordered;
    my %md_by_id;
    for my $b (@blocks) {
        my $id = block_id($b);
        next unless defined $id;
        push @md_ordered, { id => $id, block => $b };
        $md_by_id{$id} = $b;
    }

    # Deep-copy English data via JSON round-trip
    my $json_copy = decode_json(encode_json($en_data));

    my $match_count  = 0;
    my $warn_count   = 0;

    if ($lang ne 'ro') {
        # ID-based matching
        for my $console (@$json_copy) {
            my $eid   = $console->{id};
            my $block = $md_by_id{$eid};
            unless ($block) {
                print "  WARNING: no block for id=$eid, keeping English\n";
                $warn_count++;
                next;
            }
            apply_translations($console, $block, $cfg);
            $match_count++;
        }
    } else {
        # Position-based matching for RO (translated IDs, missing nintendo-64)
        my $ri = 0;
        for my $ei (0 .. $#$json_copy) {
            my $console = $json_copy->[$ei];
            my $en_id   = $console->{id};

            if ($ri >= scalar(@md_ordered)) {
                print "  No more RO blocks; keeping English for $en_id\n";
                next;
            }

            my $ro_entry = $md_ordered[$ri];
            my $ro_id    = $ro_entry->{id};

            my $en_norm = normalise($en_id);
            my $ro_norm = normalise($ro_id);

            if ($en_norm =~ /^nintendo.?64$/ || $en_id eq 'nintendo-64') {
                print "  Skipping missing RO entry for $en_id (keeping English)\n";
                next;   # advance $ei but NOT $ri
            }

            apply_translations($console, $ro_entry->{block}, $cfg);
            $match_count++;
            $ri++;
        }
    }

    print "  Translated: $match_count consoles";
    print " ($warn_count warnings)" if $warn_count;
    print "\n";

    # Write output JSON (UTF-8, pretty-printed, no BOM)
    my $js  = JSON->new->utf8(0)->pretty(1)->canonical(0);
    my $out = $js->encode($json_copy);

    open(my $ofh, ">:utf8", $out_file) or die "Cannot write $out_file: $!";
    print $ofh $out;
    close $ofh;
    print "  Written: $out_file\n";
}

print "\nDone.\n";
