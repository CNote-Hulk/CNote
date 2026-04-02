#!/usr/bin/perl
use strict;
use warnings;
use utf8;
use open qw(:std :utf8);
use JSON;
use Encode qw(encode decode);

my $DATA = "frontend/js/data";
my $EN_FILE = "$DATA/consoles-en.json";

open(my $ef, "<:utf8", $EN_FILE) or die $!;
my $en_data = decode_json(encode('UTF-8', do { local $/; <$ef> }));
close $ef;
my %en_by_id = map { $_->{id} => $_ } @$en_data;

for my $lang (qw(ro de es fr it)) {
    my $file = "$DATA/consoles-$lang.json";
    open(my $fh, "<:utf8", $file) or die "Cannot read $file: $!";
    my $data = decode_json(encode('UTF-8', do { local $/; <$fh> }));
    close $fh;

    my ($count, $t_adv, $t_hist, $t_gcap, $e_hist, $e_gcap, $m_hist, $m_gcap) = (scalar(@$data));

    for my $c (@$data) {
        my $id = $c->{id};
        my $en = $en_by_id{$id};
        my $hist  = $c->{history} // '';
        my $gcap  = ($c->{gpu}//{})->{capabilities} // '';
        my $en_h  = $en ? ($en->{history}//'') : '';
        my $en_g  = $en ? (($en->{gpu}//{})->{capabilities}//'') : '';

        $t_adv++ if @{$c->{advantages}//[]} > 0;
        if    (!$hist)             { $m_hist++; }
        elsif ($hist eq $en_h)    { $e_hist++; }
        else                       { $t_hist++; }
        if    (!$gcap)             { $m_gcap++; }
        elsif ($gcap eq $en_g)    { $e_gcap++; }
        else                       { $t_gcap++; }
    }

    printf "\n=== %-2s (%d consoles) ===\n", $lang, $count;
    printf "  advantages:   %d translated\n", $t_adv//0;
    printf "  history:      %d translated, %d English, %d missing\n", $t_hist//0, $e_hist//0, $m_hist//0;
    printf "  gpu.cap:      %d translated, %d English, %d missing\n", $t_gcap//0, $e_gcap//0, $m_gcap//0;
}

# Spot-check specific consoles
print "\n=== Spot checks ===\n";
for my $check (
    ['de', 'microvision',     'gpu.cap'],
    ['de', 'game-boy',        'history'],
    ['es', 'microvision',     'gpu.cap'],
    ['es', 'nintendo-switch', 'history'],
    ['es', 'nintendo-switch-2', 'advantages'],
    ['ro', 'magnavox-odyssey', 'history'],
) {
    my ($lang, $id, $field) = @$check;
    my $file = "$DATA/consoles-$lang.json";
    open(my $fh, "<:utf8", $file) or next;
    my $data = decode_json(encode('UTF-8', do { local $/; <$fh> }));
    close $fh;
    my ($con) = grep { $_->{id} eq $id } @$data;
    unless ($con) { print "  [$lang/$id/$field]: NOT FOUND\n"; next; }

    my $val;
    if ($field eq 'gpu.cap')   { $val = ($con->{gpu}//{})->{capabilities}; }
    elsif ($field eq 'history') {
        $val = $con->{history};
        $val = defined $val ? substr($val, 0, 60) . '...' : undef;
    }
    elsif ($field eq 'advantages') {
        $val = join('; ', @{$con->{advantages}//[]});
        $val = substr($val, 0, 80) if defined $val && length($val) > 80;
    }

    my $en_con = $en_by_id{$id};
    my $en_val;
    if ($field eq 'gpu.cap')    { $en_val = ($en_con->{gpu}//{})->{capabilities}; }
    elsif ($field eq 'history')  { $en_val = $en_con->{history}; $en_val = defined $en_val ? substr($en_val,0,60).'...' : undef; }
    elsif ($field eq 'advantages') { $en_val = join('; ', @{$en_con->{advantages}//[]}); }

    my $status = (defined $val && $val ne ($en_val//'')) ? "TRANSLATED" : "ENGLISH";
    printf "  [%s/%s/%s]: %s\n  Value: %s\n", $lang, $id, $field, $status, $val//'MISSING';
}

print "\nValidation done.\n";
