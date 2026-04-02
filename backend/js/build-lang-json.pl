#!/usr/bin/perl
use strict;
use warnings;
use utf8;
use open qw(:std :utf8);
use JSON;
use Encode qw(encode decode);

# ── Configuration ─────────────────────────────────────────────────────────────
my $BASE = "/c/Users/andre/OneDrive/Documentos/CNote";
my $EN   = "$BASE/frontend/js/data/consoles-en.json";

# Per-language regex patterns for the translatable fields.
# Each pattern matches the KEY name as it appears inside quotes in the MD file.
my %CFG = (
    ro => {
        adv   => qr/avantaje/,
        dis   => qr/dezavantaje/,
        hist  => qr/istor/,
        other => qr/altele|^other$/,
        gcap  => qr/capacit[aă]/,
    },
    de => {
        adv   => qr/Vorteile/,
        dis   => qr/Nachteile/,
        hist  => qr/Geschichte/,
        other => qr/Sonstige/,
        gcap  => qr/F[äa]higkeiten|Funktionen/,
    },
    es => {
        adv   => qr/ventajas/,
        dis   => qr/desventajas/,
        hist  => qr/[Hh]istoria/,
        other => qr/[Oo]tros|^other$/,
        gcap  => qr/capacidades|^capacity$/,
    },
    fr => {
        adv   => qr/avantages/,
        dis   => qr/d[eé]savantages|inconv[eé]nients?/,
        hist  => qr/[Hh]istorique/,
        other => qr/[Aa]utre[s]?|^other$/,
        gcap  => qr/[Cc]apacit[eé]s?|Fonctionnalit[eé]s?|^capacity$/,
    },
    it => {
        adv   => qr/vantaggi/,
        dis   => qr/svantaggi/,
        hist  => qr/storia/,
        other => qr/[Aa]ltro/,
        gcap  => qr/funzionalit[aà]|capacit[aà]|^capacity$/,
    },
);

# ── Helpers ───────────────────────────────────────────────────────────────────

# Strip any leading/trailing whitespace AND surrounding quote characters
# (ASCII ", left/right curly ", low-9 „, French «»).
sub strip_outer_quotes {
    my $s = shift;
    $s =~ s/^\s+|\s+$//g;
    $s =~ s/,\s*$//;        # trailing comma
    # Remove matching outer quote pair: « » or „ " or " " or just "
    $s =~ s/^[\x{AB}\x{201E}\x{201C}\x{22}]//u;
    $s =~ s/[\x{BB}\x{201D}\x{201C}\x{22}]$//u;
    return $s;
}

# Given a raw line like:  "keyname": "some long value",
# return the value portion (everything after the first colon, outer-quote-stripped).
sub value_from_line {
    my $line = shift;
    # Strip the key part up to and including the first ":"
    $line =~ s/^[^\x{22}\x{201E}\x{201C}\x{AB}]*[\x{22}\x{201E}\x{201C}\x{AB}][^\x{22}\x{201D}\x{201C}\x{BB}]*[\x{22}\x{201D}\x{201C}\x{BB}]\s*:\s*//u;
    # Now strip outer quotes from what remains
    return strip_outer_quotes($line);
}

# Split the MD text into per-console blocks.
# Returns an array of text blocks, each starting from "id": "..." to the next
# top-level closing brace.
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

# Extract the console id from a block (always "id": "xxx" in English).
sub block_id {
    my $block = shift;
    if ($block =~ /"id"\s*:\s*"([^"]+)"/) {
        return $1;
    }
    return undef;
}

# Extract an array field (advantages or disadvantages) from a block.
# $pat is a regex that matches (part of) the translated key name.
# Returns an array of translated strings, or undef if not found.
sub extract_array {
    my ($block, $pat) = @_;

    # Find the line containing the array open, e.g.:  "avantaje": [
    # Allow any characters around the pattern within the quoted key name.
    my @lines = split /\n/, $block;
    my $in_array = 0;
    my @items;

    for my $line (@lines) {
        if (!$in_array) {
            # Look for:  <quote> ... PAT ... <quote> : [
            if ($line =~ /[\x{22}\x{201E}\x{201C}\x{AB}][^\x{22}\x{201D}\x{201C}\x{BB}]*$pat[^\x{22}\x{201D}\x{201C}\x{BB}]*[\x{22}\x{201D}\x{201C}\x{BB}]\s*[:]\s*\[/u) {
                $in_array = 1;
                next;
            }
        } else {
            # We're inside the array
            my $trimmed = $line;
            $trimmed =~ s/^\s+|\s+$//g;

            # End of array?
            last if $trimmed =~ /^\]\s*,?\s*$/;
            last if $trimmed =~ /^\],?\s*$/;

            # Skip empty lines
            next if $trimmed eq '';

            # Extract the item: it's a quoted string on its own line
            my $item = strip_outer_quotes($trimmed);
            push @items, $item if $item ne '';
        }
    }

    return @items ? \@items : undef;
}

# Extract a single-string field (history, technologies.other, gpu.capabilities)
# from a block. Returns the string value, or undef if not found.
sub extract_string {
    my ($block, $pat) = @_;
    my @lines = split /\n/, $block;
    for my $line (@lines) {
        # Allow any characters around the pattern within the quoted key name.
        if ($line =~ /[\x{22}\x{201E}\x{201C}\x{AB}][^\x{22}\x{201D}\x{201C}\x{BB}]*$pat[^\x{22}\x{201D}\x{201C}\x{BB}]*[\x{22}\x{201D}\x{201C}\x{BB}]\s*[:]\s*(.+)/u) {
            my $val = $1;
            $val =~ s/^\s+|\s+$//g;
            # Strip opening quote
            $val =~ s/^[\x{22}\x{201E}\x{201C}\x{AB}]//u;
            # Strip trailing quote (and optional comma/brace)
            $val =~ s/[\x{22}\x{201D}\x{201C}\x{BB}][,}\s]*$//u;
            return $val if $val ne '';
        }
    }
    return undef;
}

# Build a mapping from English ID -> position index in @$en_consoles.
sub en_id_map {
    my $en = shift;
    my %map;
    for my $i (0 .. $#$en) {
        $map{ $en->[$i]{id} } = $i;
    }
    return %map;
}

# ── Main ──────────────────────────────────────────────────────────────────────

# Load English JSON
open(my $en_fh, "<:utf8", $EN) or die "Cannot read $EN: $!";
my $en_raw  = do { local $/; <$en_fh> };
close $en_fh;
my $en_data = decode_json(encode('UTF-8', $en_raw));
print "Loaded English JSON: " . scalar(@$en_data) . " consoles\n";

for my $lang (qw(ro de es fr it)) {
    my $md_file  = "$BASE/consoles-$lang.md";
    my $out_file = "$BASE/frontend/js/data/consoles-$lang.json";
    my $cfg      = $CFG{$lang};

    print "\n=== Processing $lang ===\n";

    open(my $fh, "<:utf8", $md_file) or die "Cannot read $md_file: $!";
    my $md_text = do { local $/; <$fh> };
    close $fh;

    # Split into per-console blocks
    my @blocks = split_blocks($md_text);
    print "  MD blocks found: " . scalar(@blocks) . "\n";

    # Build a quick lookup: md_id -> block (md_id may be translated)
    # Also build an ordered list of blocks for position-based fallback
    my @md_ordered;
    my %md_by_id;
    for my $b (@blocks) {
        my $id = block_id($b);
        next unless defined $id;
        push @md_ordered, { id => $id, block => $b };
        $md_by_id{$id} = $b;
    }

    # We'll make a deep copy of the English data and update translatable fields.
    # Use JSON round-trip to deep-copy.
    my $json_copy = decode_json(encode_json($en_data));

    # Match MD entries to English consoles.
    # Strategy:
    #   1. For languages where IDs match EN exactly (de, es, fr, it): match by ID.
    #   2. For RO (translated IDs): match by position, skipping any EN console
    #      that has no corresponding MD entry.

    my $match_count = 0;

    if ($lang ne 'ro') {
        # ID-based matching
        for my $console (@$json_copy) {
            my $eid = $console->{id};
            my $block = $md_by_id{$eid};
            unless ($block) {
                print "  WARNING: no MD block found for id=$eid, keeping English\n";
                next;
            }
            apply_translations($console, $block, $cfg);
            $match_count++;
        }
    } else {
        # Position-based matching for RO (which may be missing some entries
        # and may have translated IDs).
        # We go through EN consoles in order; for each EN console we look at
        # the next unmatched RO block and check if it's a reasonable match.
        # If the RO ID starts with "nintendo-64" equivalent but that entry is
        # absent, we keep English and advance only the EN pointer.

        my $ri = 0;  # index into @md_ordered
        for my $ei (0 .. $#$json_copy) {
            my $console  = $json_copy->[$ei];
            my $en_id    = $console->{id};
            my $en_name  = lc($console->{name} // '');

            # Do we have an RO block left to consume?
            if ($ri >= scalar(@md_ordered)) {
                print "  No more RO blocks; keeping English for $en_id\n";
                next;
            }

            my $ro_entry = $md_ordered[$ri];
            my $ro_id    = $ro_entry->{id};

            # Simple heuristic: if either the IDs match (ignoring diacritics/
            # minor transliteration) or it's the next block in sequence,
            # treat as a match.  To detect the nintendo-64 gap specifically,
            # we check if the EN console ID is known to be absent from RO.

            # Normalise IDs for comparison (remove diacritics, lower)
            my $en_norm = normalise($en_id);
            my $ro_norm = normalise($ro_id);

            my $is_match;
            if ($en_norm eq $ro_norm) {
                $is_match = 1;
            } elsif ($en_norm =~ /^nintendo.?64$/ || $en_id eq 'nintendo-64') {
                # This entry is missing in RO
                print "  Skipping missing RO entry for $en_id (keeping English)\n";
                next;   # advance $ei but NOT $ri
            } else {
                # Accept positional match (translator may have changed the ID)
                $is_match = 1;
            }

            if ($is_match) {
                apply_translations($console, $ro_entry->{block}, $cfg);
                $match_count++;
                $ri++;
            }
        }
    }

    print "  Matched and translated: $match_count consoles\n";

    # Serialise with clean UTF-8 JSON
    my $js = JSON->new->utf8(0)->pretty(1)->canonical(0);
    my $out = $js->encode($json_copy);

    open(my $ofh, ">:utf8", $out_file) or die "Cannot write $out_file: $!";
    print $ofh $out;
    close $ofh;
    print "  Written: $out_file\n";
}

print "\nDone.\n";

# ── Subroutines ───────────────────────────────────────────────────────────────

sub apply_translations {
    my ($console, $block, $cfg) = @_;

    # advantages
    my $adv = extract_array($block, $cfg->{adv});
    if ($adv && @$adv) {
        $console->{advantages} = $adv;
    }

    # disadvantages
    my $dis = extract_array($block, $cfg->{dis});
    if ($dis && @$dis) {
        $console->{disadvantages} = $dis;
    }

    # history
    my $hist = extract_string($block, $cfg->{hist});
    if (defined $hist && $hist ne '') {
        $console->{history} = $hist;
    }

    # technologies.other
    my $other = extract_string($block, $cfg->{other});
    if (defined $other && $other ne '') {
        $console->{technologies}{other} = $other;
    }

    # gpu.capabilities
    my $gcap = extract_string($block, $cfg->{gcap});
    if (defined $gcap && $gcap ne '') {
        $console->{gpu}{capabilities} = $gcap;
    }
}

sub normalise {
    my $s = lc(shift);
    # Remove common diacritic substitutions used in Romanian
    $s =~ s/[ăâ]/a/g;
    $s =~ s/[î]/i/g;
    $s =~ s/[șş]/s/g;
    $s =~ s/[țţ]/t/g;
    $s =~ s/[é]/e/g;
    $s =~ s/[ő]/o/g;
    # collapse non-alphanumeric to -
    $s =~ s/[^a-z0-9]+/-/g;
    $s =~ s/-+/-/g;
    $s =~ s/^-|-$//g;
    return $s;
}
