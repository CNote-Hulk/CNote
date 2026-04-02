#!/usr/bin/perl
use strict;
use warnings;
use IO::Uncompress::Unzip qw($UnzipError);

for my $lang (qw(de es)) {
    my $docx = "backend/docx/consoles-$lang.docx";
    my $u = IO::Uncompress::Unzip->new($docx, Name => 'word/document.xml')
        or die "Unzip failed for $lang: $UnzipError\n";
    my $xml = '';
    while ($u->read(my $buf, 65536) > 0) { $xml .= $buf; }
    print "$lang XML length: ", length($xml), "\n";
}
print "done\n";
