#!/usr/bin/perl
use strict;
use warnings;
use IO::Uncompress::Unzip qw($UnzipError);

my $docx = 'backend/docx/consoles-de.docx';
my $u = IO::Uncompress::Unzip->new($docx, Name => 'word/document.xml')
    or die "failed: $UnzipError\n";
my $xml = '';
while ($u->read(my $buf, 65536) > 0) { $xml .= $buf; }
print "XML length: ", length($xml), "\n";
print substr($xml, 0, 200), "\n";
