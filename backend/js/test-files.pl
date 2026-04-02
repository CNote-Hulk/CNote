#!/usr/bin/perl
use strict;
use warnings;
use Cwd;

my $cwd = getcwd();
print "CWD: $cwd\n";

my @test_paths = (
    'backend/js/fix-de-es.pl',
    'backend/js/convert-md-to-json.js',
    'frontend/js/data/consoles-en.json',
    'backend/docx/consoles-de.docx',
);

for my $p (@test_paths) {
    my $exists = -e $p ? "EXISTS" : "MISSING";
    my $size   = -e $p ? (-s $p) : 0;
    print "$p: $exists (size=$size)\n";
}

# Try with absolute path
my $abs = "$cwd/frontend/js/data/consoles-en.json";
print "\nAbsolute path test: $abs\n";
print "Exists: ", (-e $abs ? "YES" : "NO"), "\n";

open(my $f, '<', $abs) or print "Cannot open: $!\n";
if ($f) {
    my $line = <$f>;
    close $f;
    print "First line: $line";
}
