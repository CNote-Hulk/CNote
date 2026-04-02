#!/usr/bin/perl
use strict;
use warnings;

# Try Windows-style absolute path
my $winpath = 'C:\\Users\\andre\\OneDrive\\Documentos\\CNote\\backend\\docx\\consoles-de.docx';
open(my $f, '<:raw', $winpath) or die "Cannot open: $!\n";
my $data = do { local $/; <$f> };
close $f;
print "Read ", length($data), " bytes with Windows path\n";
print "First 4 bytes (PK magic): ", unpack("H8", substr($data, 0, 4)), "\n";
