#!/usr/bin/perl
use strict;
use warnings;
use utf8;
use open qw(:std :utf8);
use JSON;
use Encode qw(encode decode);

my $DATA = "frontend/js/data";

open(my $ef, "<:utf8", "$DATA/consoles-en.json") or die $!;
my $en_data = decode_json(encode('UTF-8', do { local $/; <$ef> }));
close $ef;
my %en_by_id = map { $_->{id} => $_ } @$en_data;

print "=== FR consoles with English history ===\n";
open(my $ff, "<:utf8", "$DATA/consoles-fr.json") or die $!;
my $fr_data = decode_json(encode('UTF-8', do { local $/; <$ff> }));
close $ff;
for my $c (@$fr_data) {
    my $id = $c->{id};
    my $en = $en_by_id{$id} or next;
    my $hist   = $c->{history}  // '';
    my $en_h   = $en->{history} // '';
    if ($hist eq $en_h) {
        printf "  ENGLISH: %-30s (len=%d)\n", $id, length($hist);
    }
}

print "\n=== DE consoles with English gpu.cap (non-N/A) ===\n";
open(my $df, "<:utf8", "$DATA/consoles-de.json") or die $!;
my $de_data = decode_json(encode('UTF-8', do { local $/; <$df> }));
close $df;
my $shown = 0;
for my $c (@$de_data) {
    next if $shown >= 5;
    my $id = $c->{id};
    my $en = $en_by_id{$id} or next;
    my $gcap  = ($c->{gpu}//{})->{capabilities}  // '';
    my $en_g  = ($en->{gpu}//{})->{capabilities} // '';
    if ($gcap eq $en_g && $gcap ne 'N/A') {
        printf "  SAME-AS-EN: %-30s %s\n", $id, $gcap;
        $shown++;
    }
}

print "\n=== RO 3 consoles with English gpu.cap ===\n";
open(my $rf, "<:utf8", "$DATA/consoles-ro.json") or die $!;
my $ro_data = decode_json(encode('UTF-8', do { local $/; <$rf> }));
close $rf;
for my $c (@$ro_data) {
    my $id = $c->{id};
    my $en = $en_by_id{$id} or next;
    my $gcap  = ($c->{gpu}//{})->{capabilities}  // '';
    my $en_g  = ($en->{gpu}//{})->{capabilities} // '';
    if ($gcap eq $en_g) {
        printf "  SAME-AS-EN: %-30s %s\n", $id, $gcap;
    }
}
