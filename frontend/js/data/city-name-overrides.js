/**
 * City name overrides — window.CITY_NAME_OVERRIDES
 *
 * location-data.js keeps each city's *native* spelling as the canonical
 * value (used for filtering/storage — a listing's `location` field is
 * always one of those native strings, regardless of the viewer's
 * language). Most cities don't have a real name in other languages and
 * are shown as-is. This file only covers the ones that genuinely do
 * (e.g. "München" → "Munich" in English, "Moskva" → "Moscova" in
 * Romanian) — a display-only override, keyed by the exact native string
 * from location-data.js. Missing language entries just fall back to the
 * native spelling (see `cityLabel()` in community.js).
 */
window.CITY_NAME_OVERRIDES = {
  "București":     { en: "Bucharest", es: "Bucarest", fr: "Bucarest", it: "Bucarest", de: "Bukarest" },
  "München":       { en: "Munich", es: "Múnich", fr: "Munich", it: "Monaco di Baviera" },
  "Köln":          { en: "Cologne", es: "Colonia", fr: "Cologne", it: "Colonia" },
  "Nürnberg":       { en: "Nuremberg", es: "Núremberg", fr: "Nuremberg", it: "Norimberga" },
  "Hannover":       { en: "Hanover" },
  "Roma":          { en: "Rome", fr: "Rome", de: "Rom" },
  "Milano":        { en: "Milan", es: "Milán", fr: "Milan", de: "Mailand" },
  "Napoli":        { en: "Naples", es: "Nápoles", fr: "Naples", de: "Neapel" },
  "Torino":        { en: "Turin", es: "Turín", fr: "Turin", de: "Torino" },
  "Genova":        { en: "Genoa", es: "Génova", fr: "Gênes", de: "Genua" },
  "Venezia":       { en: "Venice", es: "Venecia", fr: "Venise", de: "Venedig" },
  "Firenze":       { en: "Florence", es: "Florencia", fr: "Florence", de: "Florenz" },
  "Padova":        { en: "Padua", fr: "Padoue" },
  "Warszawa":      { en: "Warsaw", ro: "Varșovia", es: "Varsovia", fr: "Varsovie", it: "Varsavia", de: "Warschau" },
  "Kraków":        { en: "Krakow", ro: "Cracovia", es: "Cracovia", fr: "Cracovie", it: "Cracovia", de: "Krakau" },
  "Beograd":       { en: "Belgrade", ro: "Belgrad", es: "Belgrado", fr: "Belgrade", it: "Belgrado", de: "Belgrad" },
  "Ciudad de México": { en: "Mexico City", fr: "Mexico", it: "Città del Messico", de: "Mexiko-Stadt" },
  "Moskva":        { en: "Moscow", ro: "Moscova", es: "Moscú", fr: "Moscou", it: "Mosca", de: "Moskau" },
  "Sankt-Peterburg": { en: "Saint Petersburg", ro: "Sankt Petersburg", es: "San Petersburgo", fr: "Saint-Pétersbourg", it: "San Pietroburgo", de: "Sankt Petersburg" },
  "Genève":        { en: "Geneva", ro: "Geneva", es: "Ginebra", it: "Ginevra", de: "Genf" },
  "Zürich":        { en: "Zurich", ro: "Zurich", es: "Zúrich", fr: "Zurich", it: "Zurigo" },
  "Basel":         { es: "Basilea", fr: "Bâle", it: "Basilea" },
  "Wien":          { en: "Vienna", ro: "Viena", es: "Viena", fr: "Vienne", it: "Vienna" },
  "Den Haag":      { en: "The Hague", ro: "Haga", es: "La Haya", fr: "La Haye", it: "L'Aia" },
  "Bruxelles":     { en: "Brussels", es: "Bruselas", de: "Brüssel" },
  "Antwerpen":      { en: "Antwerp", es: "Amberes", fr: "Anvers", it: "Anversa" },
  "Gent":          { en: "Ghent", es: "Gante", fr: "Gand", it: "Gand" },
  "Atena":         { en: "Athens", es: "Atenas", fr: "Athènes", it: "Atene", de: "Athen" },
  "Salonic":       { en: "Thessaloniki", es: "Salónica", fr: "Thessalonique", it: "Salonicco", de: "Thessaloniki" },
  "Pireu":         { en: "Piraeus", es: "El Pireo", fr: "Le Pirée", it: "Pireo", de: "Piräus" },
  "Lisboa":        { en: "Lisbon", fr: "Lisbonne", it: "Lisbona", de: "Lissabon" },
  "Praha":         { en: "Prague", ro: "Praga", es: "Praga", it: "Praga", de: "Prag" },
  "København":     { en: "Copenhagen", ro: "Copenhaga", es: "Copenhague", fr: "Copenhague", it: "Copenaghen", de: "Kopenhagen" },
  "Göteborg":      { en: "Gothenburg", es: "Gotemburgo" },
  "Cairo":         { es: "El Cairo", fr: "Le Caire", it: "Il Cairo", de: "Kairo" },
  "Jerusalem":     { ro: "Ierusalim", es: "Jerusalén", fr: "Jérusalem", it: "Gerusalemme" },
};
