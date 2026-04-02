#!/usr/bin/perl
use strict;
use warnings;
use utf8;
use open qw(:std :utf8);
use IO::Uncompress::Unzip qw($UnzipError);
use Encode qw(decode);

my @problem_ids = qw(coleco-telstar microvision atari-5200 famicom wonderswan psp);
my %want = map { $_ => 1 } @problem_ids;

my $docx = 'backend/docx/consoles-fr.docx';
my $u = IO::Uncompress::Unzip->new($docx, Name => 'word/document.xml')
    or die "Unzip failed: $UnzipError\n";
my $xml_raw = '';
while ($u->read(my $buf, 65536) > 0) { $xml_raw .= $buf; }
my $xml = decode('UTF-8', $xml_raw);

# Extract paragraph text
my @paras;
while ($xml =~ /<w:p[ >](.*?)<\/w:p>/gs) {
    my $p = $1; my $t = '';
    while ($p =~ /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g) { $t .= $1; }
    next if $t =~ /^\s*$/;
    $t =~ s/&lt;/</g; $t =~ s/&gt;/>/g; $t =~ s/&amp;/&/g;
    push @paras, $t;
}
my $text = join("\n", @paras);
$text =~ s/\x{201E}|\x{201C}|\x{201D}|\x{AB}|\x{BB}/"/g;

# Split into blocks and find the problem consoles
my @blocks;
{
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
}

for my $block (@blocks) {
    next unless $block =~ /"id"\s*:\s*"([^"]+)"/;
    my $id = $1;
    next unless $want{$id};

    print "\n=== Block: $id ===\n";
    # Look for history key (Historique, histoire, etc.)
    my @lines = split /\n/, $block;
    my $found_hist = 0;
    for my $line (@lines) {
        $line =~ s/\r$//;
        if ($line =~ /[Hh]istorique|[Hh]istoire/) {
            $found_hist = 1;
            print "  HISTORY LINE: $line\n";
        }
    }
    print "  No history key found!\n" unless $found_hist;

    # Show all keys in this block
    print "  Keys in block:\n";
    for my $line (@lines) {
        $line =~ s/\r$//;
        if ($line =~ /^\s*"([^"]+)"\s*:/) {
            printf "    %s\n", $1;
        }
    }
}
