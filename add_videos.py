import os

BASE = r"c:/Users/andre/OneDrive/Documentos/CNote/frontend/html/pages/consoles"

VIDEOS = {
    "magnavox-odyssey.html":    ("jLGBtkKPj2U", "Magnavox Odyssey in Action",            "The world's first home video game console — where interactive gaming began."),
    "atari-home-pong.html":     ("FFkaIHBVns0",  "Atari Home Pong in Action",             "The console that brought Pong into living rooms and started the home gaming revolution."),
    "coleco-telstar.html":      ("5lShU4eM8VI",  "Coleco Telstar in Action",              "Coleco's first home gaming system — a dedicated Pong machine for the masses."),
    "atari-2600.html":          ("YJNbhekKShI",  "Atari 2600 in Action",                  "The console that defined a generation — bringing arcade hits home for the very first time."),
    "magnavox-odyssey-2.html":  ("yrmUaagrh68",  "Magnavox Odyssey 2 in Action",          "A voice-capable home console ahead of its time, challenging Atari in the early 80s."),
    "intellivision.html":       ("1O17bGSd9SU",  "Intellivision in Action",               "Mattel's answer to Atari — more sophisticated gameplay and the first sports titles."),
    "microvision.html":         ("wIqrC6W9JTY",  "Microvision in Action",                 "The world's first handheld game console with interchangeable cartridges."),
    "atari-5200.html":          ("Mv1nuGjGe04",  "Atari 5200 in Action",                  "Atari's ambitious follow-up, bringing enhanced arcade performance to the home."),
    "colecovision.html":        ("unpuywHanBc",  "ColecoVision in Action",                "Near-arcade quality at home — the ColecoVision set the bar for early-80s gaming."),
    "vectrex.html":             ("UNV4VTQFtsI",  "Vectrex in Action",                     "The only vector-graphics home console ever made — a truly unique gaming experience."),
    "famicom.html":             ("L0q1A08LDMY",  "Nintendo Famicom in Action",            "The console that saved the gaming industry and launched Nintendo's golden era."),
    "sega-sg-1000.html":        ("ErzGZ1lYqnA",  "Sega SG-1000 in Action",               "Sega's first home console — the humble beginning of a legendary gaming legacy."),
    "nes.html":                 ("xUEfp_hsC9U",  "Nintendo NES in Action",                "The console that revived gaming after the crash — and gave us Mario, Zelda, and Metroid."),
    "sega-master-system.html":  ("7lJw3MlaUmo",  "Sega Master System in Action",         "Sega's stylish challenger to the NES, with impressive graphics for its time."),
    "atari-7800.html":          ("_X4ZWtLYNLE",  "Atari 7800 in Action",                 "Backwards-compatible and powerful — Atari's last stand against Nintendo and Sega."),
    "pc-engine.html":           ("QTY4EZKoxQ0",  "PC Engine in Action",                  "NEC's powerhouse packed with incredible shooters and CD-ROM innovation."),
    "sega-genesis.html":        ("bun8tA_ksZw",  "Sega Genesis in Action",               "Blast Processing, Sonic the Hedgehog, and attitude — Sega's 16-bit revolution."),
    "game-boy.html":            ("E-ej_8XBwmI",  "Game Boy in Action",                   "The humble grey brick that conquered portable gaming and outlasted every rival."),
    "atari-lynx.html":          ("vtbKpmT_owE",  "Atari Lynx in Action",                 "The world's first colour handheld — technically impressive, criminally underrated."),
    "sega-game-gear.html":      ("t2HECWtY39w",  "Sega Game Gear in Action",             "Colour, backlighting, and Sega power — Game Gear brought the Genesis in your pocket."),
    "neo-geo-aes.html":         ("EK6gRxMH1gI",  "Neo Geo AES in Action",                "The most powerful console of its era — arcade perfect, and priced to match."),
    "snes.html":                ("oWyMk-2aH9E",  "Super Nintendo in Action",             "Mode 7, incredible sound hardware, and the greatest game library of the 16-bit era."),
    "philips-cd-i.html":        ("9ZIbnZuqUuo",  "Philips CD-i in Action",               "Nintendo's unlikely partner — the CD-i left a strange and fascinating mark on gaming history."),
    "3do.html":                 ("W7slSmIbJrk",  "3DO Interactive Multiplayer in Action", "The $700 multimedia powerhouse — ambitious, innovative, and ahead of its time."),
    "atari-jaguar.html":        ("nxuna944dls",  "Atari Jaguar in Action",                "64-bit and fighting for survival — Atari's final home console and its boldest bet."),
    "playstation-1.html":       ("U7w5i_YCFmQ",  "PlayStation in Action",                "Sony's disruptive debut — CD-ROMs, 3D gaming, and the end of Nintendo's dominance."),
    "sega-saturn.html":         ("haOCJ8wL0OA",  "Sega Saturn in Action",                "Overlooked in the West, beloved in Japan — a goldmine of 2D arcade perfection."),
    "nintendo-64.html":         ("DPGhsYg0l40",  "Nintendo 64 in Action",                "Super Mario 64, Ocarina of Time, and the dawn of true 3D gaming greatness."),
    "game-boy-color.html":      ("cn3EAVpOdro",  "Game Boy Color in Action",             "Colour at last — the GBC breathed new life into Nintendo's portable dynasty."),
    "neo-geo-pocket.html":      ("bJv5rlyZ8Ss",  "Neo Geo Pocket in Action",             "SNK's underrated portable — a clicky joystick and arcade-quality fighters on the go."),
    "sega-dreamcast.html":      ("Hi0TGMoRxwQ",  "Sega Dreamcast in Action",             "Online gaming, VMUs, and visionary titles — Sega's final console burned bright."),
    "neo-geo-pocket-color.html":("dUHYNmNrqoY",  "Neo Geo Pocket Color in Action",       "Colour upgrades and incredible SNK fighters — the best handheld you never played."),
    "wonderswan.html":          ("42Qaxqsrn5o",  "WonderSwan in Action",                 "Bandai's bold handheld — Final Fantasy exclusives and a rotatable screen design."),
    "game-boy-advance.html":    ("e-9IlxDkv8s",  "Game Boy Advance in Action",           "16-bit power in your pocket — the GBA's library remains one of gaming's finest."),
    "nintendo-gamecube.html":   ("ULMOcdlHH1s",  "Nintendo GameCube in Action",          "Mini discs, a handle on the side, and some of the most creative games Nintendo ever made."),
    "psp.html":                 ("X_W1JQ5ubWQ",  "PlayStation Portable in Action",       "Sony's first handheld — powerful, sleek, and home to a phenomenal game library."),
    "playstation-3.html":       ("-XF2pu-4rXc",  "PlayStation 3 in Action",              "Blu-ray, Cell processor, and free online — PS3 became a powerhouse for exclusives."),
    "ps-vita.html":             ("RIaJHh60hQY",  "PlayStation Vita in Action",           "Beautiful screen, dual analogs, and a library of hidden gems — too good for its time."),
    "nintendo-wii.html":        ("L6F_QBKeXfU",  "Nintendo Wii in Action",               "Motion controls, Wii Sports, and 100 million units sold — Nintendo's biggest gamble ever."),
    "playstation-5.html":       ("RkC0l4iekYo",  "PlayStation 5 in Action",              "Ultra-fast SSD, DualSense haptics, and the most ambitious PlayStation launch to date."),
    "xbox-series-x.html":       ("4eVfNSAta4U",  "Xbox Series X in Action",              "The most powerful console at launch — built for speed, Game Pass, and the future of Xbox."),
    "nintendo-switch-2.html":   ("uzZJCwn6CMo",  "Nintendo Switch 2 in Action",          "The next generation of Nintendo's hybrid revolution — bigger, faster, more connected."),
}

def make_section(vid, title, desc):
    return (
        '\n    <!-- ===========================\n'
        '         VIDEO MONTAGE SECTION\n'
        '         =========================== -->\n'
        '    <section class="console-video-section">\n'
        '        <div class="container">\n'
        '            <div class="console-video__header">\n'
        '                <h2 class="section-title console-video__title">' + title + '</h2>\n'
        '                <p class="console-video__sub">' + desc + '</p>\n'
        '            </div>\n'
        '            <div class="console-video__wrap">\n'
        '                <iframe src="https://www.youtube-nocookie.com/embed/' + vid + '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>\n'
        '            </div>\n'
        '        </div>\n'
        '    </section>\n\n'
    )

updated = []
skipped = []

for filename, (vid, title, desc) in VIDEOS.items():
    path = os.path.join(BASE, filename)
    if not os.path.exists(path):
        skipped.append("NOT FOUND: " + filename)
        continue

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if "console-video-section" in content:
        skipped.append("ALREADY HAS VIDEO: " + filename)
        continue

    footer_idx = content.find("<!-- ===========================\n         FOOTER")
    if footer_idx == -1:
        footer_idx = content.find("<footer")
    if footer_idx == -1:
        skipped.append("NO FOOTER: " + filename)
        continue

    section_html = make_section(vid, title, desc)
    new_content = content[:footer_idx] + section_html + content[footer_idx:]

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)

    updated.append(filename)

print("Updated " + str(len(updated)) + " files:")
for f in updated:
    print("  OK " + f)
print("\nSkipped " + str(len(skipped)) + ":")
for f in skipped:
    print("  - " + f)
