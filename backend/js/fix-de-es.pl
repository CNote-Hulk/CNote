#!/usr/bin/perl
# Fix DE and ES JSON files by re-processing with normalized ID matching
use strict;
use warnings;
use utf8;
use open qw(:std :utf8);
use JSON;
use Encode qw(encode decode);
use IO::Uncompress::Unzip qw($UnzipError);

my $BASE = "/c/Users/andre/OneDrive/Documentos/CNote";
my $DOCX_DIR = "$BASE/backend/docx";
my $DATA_DIR = "$BASE/frontend/js/data";
my $EN_FILE  = "$DATA_DIR/consoles-en.json";

my %CFG = (
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
);

sub normalise {
    my $s = lc(shift);
    $s =~ s/[ăâáà]/a/g; $s =~ s/[îíì]/i/g; $s =~ s/[șş]/s/g;
    $s =~ s/[țţ]/t/g; $s =~ s/[éèê]/e/g; $s =~ s/[óò]/o/g;
    $s =~ s/[ő]/o/g; $s =~ s/[üú]/u/g; $s =~ s/[ñ]/n/g;
    $s =~ s/[^a-z0-9]+/-/g; $s =~ s/-+/-/g; $s =~ s/^-|-$//g;
    return $s;
}

sub read_docx_xml {
    my $docx = shift;
    my $u = IO::Uncompress::Unzip->new($docx, Name => 'word/document.xml')
        or die "Unzip failed: $UnzipError\n";
    my $xml = '';
    while ($u->read(my $buf, 65536) > 0) { $xml .= $buf; }
    return decode('UTF-8', $xml);
}

sub xml_to_text {
    my $xml = shift;
    my @paras;
    while ($xml =~ /<w:p[ >](.*?)<\/w:p>/gs) {
        my $p = $1; my $t = '';
        while ($p =~ /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) { $t .= $1; }
        next if $t =~ /^\s*$/;
        $t =~ s/&lt;/</g; $t =~ s/&gt;/>/g; $t =~ s/&amp;/&/g;
        push @paras, $t;
    }
    return join("\n", @paras);
}

sub normalize_quotes {
    my $s = shift;
    $s =~ s/\x{201E}|\x{201C}|\x{201D}|\x{AB}|\x{BB}/"/g;
    return $s;
}

# Fast block splitting using regex
sub split_blocks {
    my $text = shift;
    my @blocks;
    my $depth = 0; my $start = -1; my $len = length($text);
    for my $i (0 .. $len - 1) {
        my $c = substr($text, $i, 1);
        if    ($c eq '{') { $depth++; $start = $i if $depth == 1; }
        elsif ($c eq '}') {
            $depth--;
            if ($depth == 0 && $start >= 0) {
                push @blocks, substr($text, $start, $i - $start + 1);
                $start = -1;
            }
        }
    }
    return @blocks;
}

sub block_id { return $_[0] =~ /"id"\s*:\s*"([^"]+)"/ ? $1 : undef; }

sub extract_array {
    my ($block, $pat) = @_;
    my @lines = split /\n/, $block;
    my ($in, @items) = (0);
    for my $line (@lines) {
        $line =~ s/\r$//;
        if (!$in) {
            if ($line =~ /"[^"]*$pat[^"]*"\s*:\s*\[/i) {
                $in = 1;
                if ($line =~ /\[(.+)\]/) {
                    my $c = $1; while ($c =~ /"([^"]+)"/g) { push @items, $1; }
                    $in = 0;
                }
            }
        } else {
            my $t = $line; $t =~ s/^\s+|\s+$//g;
            last if $t =~ /^\]\s*,?\s*$/;
            push @items, $1 if $t =~ /^"(.*?)"\s*,?\s*$/ && $1 ne '';
        }
    }
    return @items ? \@items : undef;
}

sub extract_string {
    my ($block, $pat) = @_;
    my @lines = split /\n/, $block;
    my ($col, @vp) = (0);
    for my $line (@lines) {
        $line =~ s/\r$//;
        if (!$col) {
            if ($line =~ /"[^"]*$pat[^"]*"\s*:\s*"(.*)/i) {
                my $a = $1;
                return $1 if $a =~ /^(.*?)"\s*,?\s*$/;
                $col = 1; push @vp, $a;
            }
        } else {
            my $t = $line; $t =~ s/^\s+|\s+$//g;
            last if $t =~ /^"[^"]+"\s*:/ || $t =~ /^[}\]]/;
            (my $p = $line) =~ s/"\s*,?\s*$//;
            push @vp, $p;
        }
    }
    if ($col && @vp) {
        my $v = join("\n", @vp); $v =~ s/"\s*,?\s*$//; $v =~ s/^\s+|\s+$//g;
        return $v if $v ne '';
    }
    return undef;
}

sub apply_translations {
    my ($con, $block, $cfg) = @_;
    my $a = extract_array($block, $cfg->{adv});   $con->{advantages}            = $a if $a && @$a;
    my $d = extract_array($block, $cfg->{dis});   $con->{disadvantages}         = $d if $d && @$d;
    my $h = extract_string($block, $cfg->{hist}); $con->{history}               = $h if defined $h && $h ne '';
    my $o = extract_string($block, $cfg->{other});$con->{technologies}{other}   = $o if defined $o && $o ne '';
    my $g = extract_string($block, $cfg->{gcap}); $con->{gpu}{capabilities}     = $g if defined $g && $g ne '';
}

# Load English base
open(my $ef, "<:utf8", $EN_FILE) or die "Cannot read $EN_FILE: $!";
my $en_data = decode_json(encode('UTF-8', do { local $/; <$ef> }));
close $ef;
print "English: " . scalar(@$en_data) . " consoles\n";

for my $lang (qw(de es)) {
    print "\n=== $lang ===\n";
    my $docx    = "$DOCX_DIR/consoles-$lang.docx";
    my $outfile = "$DATA_DIR/consoles-$lang.json";
    my $cfg     = $CFG{$lang};

    my $xml     = read_docx_xml($docx);
    my $text    = normalize_quotes(xml_to_text($xml));
    my @blocks  = split_blocks($text);
    print "  Blocks: " . scalar(@blocks) . "\n";

    my (%by_exact, %by_norm, @ordered);
    for my $b (@blocks) {
        my $id = block_id($b); next unless $id;
        my $n  = normalise($id);
        $by_exact{$id} //= $b;
        $by_norm{$n}   //= $b;
        push @ordered, { id => $id, norm => $n, block => $b };
    }

    my $json_copy = decode_json(encode_json($en_data));
    my (%matched_md, $mc, $pc, $wc);

    # Pass 1: exact + normalized match
    for my $con (@$json_copy) {
        my $eid = $con->{id};
        my $en  = normalise($eid);
        my $b   = $by_exact{$eid} // $by_norm{$en};
        if ($b) {
            apply_translations($con, $b, $cfg);
            $mc++;
            $con->{_matched} = 1;
            # Record which md block was used (find by content)
            for my $o (@ordered) {
                if ($o->{block} eq $b) { $matched_md{$o->{id}} = 1; last; }
            }
        }
    }

    # Pass 2: positional fallback
    my @unmatched_md = grep { !$matched_md{$_->{id}} } @ordered;
    my $pos = 0;
    for my $con (@$json_copy) {
        next if $con->{_matched};
        my $eid = $con->{id};
        if ($pos < scalar(@unmatched_md)) {
            my $e = $unmatched_md[$pos];
            print "  Positional: $eid <- " . $e->{id} . "\n";
            apply_translations($con, $e->{block}, $cfg);
            $pc++; $pos++;
        } else {
            print "  WARNING: no block for $eid\n";
            $wc++;
        }
    }
    delete $_->{_matched} for @$json_copy;

    my $total = ($mc//0) + ($pc//0);
    print "  Matched: $total (exact/norm=" . ($mc//0) . " positional=" . ($pc//0) . " warnings=" . ($wc//0) . ")\n";

    my $js  = JSON->new->utf8(0)->pretty(1)->canonical(0);
    open(my $of, ">:utf8", $outfile) or die "Cannot write $outfile: $!";
    print $of $js->encode($json_copy);
    close $of;
    print "  Written: $outfile\n";
}
print "\nDone.\n";
