#!/usr/bin/perl
use strict;
use warnings;
use Cwd 'abs_path';

my $p = abs_path('backend/docx/consoles-de.docx');
if (defined $p) {
    print "abs_path: $p\n";
} else {
    print "abs_path returned undef\n";
    print "cwd: ", `pwd`, "\n";
}

# Try opening directly
open(my $f, '<', 'backend/docx/consoles-de.docx') or print "open failed: $!\n";
if ($f) {
    my $data = do { local $/; <$f> };
    close $f;
    print "read ", length($data), " bytes\n";
    print "first 4 bytes: ", unpack("H8", substr($data, 0, 4)), "\n";
}
