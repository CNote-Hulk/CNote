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

print "=== English GPU capabilities ===\n";
for my $c (@$en_data) {
    my $id   = $c->{id};
    my $gcap = ($c->{gpu}//{})->{capabilities} // 'NONE';
    printf "  %-30s %s\n", $id, $gcap;
}

print "\n=== English history check (first 3) ===\n";
for my $c (@$en_data[0..2]) {
    printf "  %s: history len=%d\n", $c->{id}, length($c->{history}//'');
}
