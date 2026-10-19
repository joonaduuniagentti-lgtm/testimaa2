export const RESOURCE_DEFS = [
  { id: "credits", label: "Krediitit", short: "KRD", glyph: "◇", color: "#e9c77c" },
  { id: "alloys", label: "Seokset", short: "SEK", glyph: "▧", color: "#d9a18b" },
  { id: "food", label: "Ravinto", short: "RAV", glyph: "✿", color: "#a9cf9a" },
  { id: "fuel", label: "Polttoaine", short: "POL", glyph: "◉", color: "#88c8d8" },
  { id: "influence", label: "Vaikutusvalta", short: "VAI", glyph: "✧", color: "#c4a6dd" },
  { id: "science", label: "Tutkimus", short: "TUT", glyph: "⌬", color: "#84d2c5" }
];

export const FACTIONS = [
  {
    id: "helion", name: "Helionin sopimuskunta", short: "HELION",
    motto: "Yhteys on turvaa.", color: "#f0b785", style: "diplomatic",
    description: "Sovittelijoita, jotka sitovat naapurit toisiinsa sopimuksilla.",
    baseRelation: 18, expansion: 0.55, trade: 1.2, research: 0.8
  },
  {
    id: "vesper", name: "Vesperin direktoraatti", short: "VESPER",
    motto: "Raja on kysymys.", color: "#d78588", style: "military",
    description: "Kurinalainen valtio, jonka laivastot lähtevät usein liikkeelle.",
    baseRelation: -8, expansion: 1.15, trade: 0.65, research: 0.75
  },
  {
    id: "nacre", name: "Nacre-kauppaliitto", short: "NACRE",
    motto: "Kaikki löytävät vaihtonsa.", color: "#8fc9bd", style: "commercial",
    description: "Kauppareittien rakentajia ja kärsivällisiä neuvottelijoita.",
    baseRelation: 9, expansion: 0.8, trade: 1.45, research: 0.7
  },
  {
    id: "asterion", name: "Asterionin arkisto", short: "ASTERION",
    motto: "Jokainen valo on dataa.", color: "#b0a5ec", style: "scientific",
    description: "Tutkijoiden verkosto, joka vaihtaa tietoa mielellään.",
    baseRelation: 5, expansion: 0.65, trade: 0.8, research: 1.35
  }
];

export const BUILDINGS = [
  { id: "mine", name: "Syväkaivos", icon: "▤", cost: { credits: 28, alloys: 12 }, output: { alloys: 4 }, description: "Louhii asteroidivyön metallit käyttöön.", maxLevel: 4 },
  { id: "farm", name: "Biosfääri", icon: "❋", cost: { credits: 24, alloys: 8 }, output: { food: 7 }, description: "Kasvattaa ravintoa siirtokunnalle ja laivueille.", maxLevel: 4 },
  { id: "lab", name: "Tutkimusasema", icon: "⌬", cost: { credits: 30, alloys: 14 }, output: { science: 5 }, description: "Kääntää havaintoja uusiksi teknologioiksi.", maxLevel: 4 },
  { id: "foundry", name: "Kierrätyssulatto", icon: "▧", cost: { credits: 36, alloys: 16 }, output: { credits: 4, alloys: 2 }, description: "Kierrättää hylätyn kaluston ja pitää talouden liikkeessä.", maxLevel: 4 },
  { id: "tradeport", name: "Väyläsatama", icon: "⌁", cost: { credits: 32, alloys: 10 }, output: { credits: 5, influence: 2 }, description: "Kasvattaa kauppaa ja näkyvyyttä tähtiväylillä.", maxLevel: 4 },
  { id: "habitat", name: "Kiertoratahabitaatti", icon: "◌", cost: { credits: 42, alloys: 22 }, output: { food: 2 }, population: 0.5, description: "Laajentaa elintilaa ja houkuttelee uutta väkeä.", maxLevel: 3 }
];

export const POLICIES = [
  { id: "austerity", name: "Säästölinja", effect: "Krediittejä +5/kk, mutta vakaus −2", credits: 5, stability: -2, science: 0 },
  { id: "balanced", name: "Tasapaino", effect: "Luotettava tuotanto ja vakaa yhteiskunta", credits: 0, stability: 1, science: 0 },
  { id: "open-science", name: "Avoin tiede", effect: "Tutkimusta +3/kk, krediittejä −3/kk", credits: -3, stability: 0, science: 3 }
];

export const TECH_BRANCHES = [
  { id: "engineering", name: "Tekniikka", icon: "⌘", color: "#e6ad83", subtitle: "Laivat ja teollisuus" },
  { id: "biology", name: "Elämä", icon: "❋", color: "#a9d294", subtitle: "Väestö ja ekologia" },
  { id: "physics", name: "Fysiikka", icon: "⌬", color: "#84d2c5", subtitle: "Energia ja havainto" },
  { id: "society", name: "Yhteiskunta", icon: "◎", color: "#c3a5e2", subtitle: "Sopimukset ja vakaus" }
];

export const TECHS = [
  { id: "survey-lattices", branch: "physics", tier: 1, name: "Havaintoristikot", cost: 42, prereq: [], summary: "Retkikunnat lukitsevat kohteensa nopeammin.", effect: { type: "survey", value: 1 } },
  { id: "adaptive-maps", branch: "physics", tier: 2, name: "Mukautuvat kartat", cost: 88, prereq: ["survey-lattices"], summary: "Uudet löydöt avaavat lähiseudun karttaa.", effect: { type: "survey", value: 1 } },
  { id: "folded-space", branch: "physics", tier: 3, name: "Taitettu avaruus", cost: 142, prereq: ["adaptive-maps"], summary: "Polttoaine riittää pidemmälle retkelle.", effect: { type: "fuel", value: 2 } },
  { id: "deep-spectrum", branch: "physics", tier: 4, name: "Syväspektri", cost: 210, prereq: ["folded-space"], summary: "Havaintoasemien tuotto kasvaa.", effect: { type: "science", value: 2 } },
  { id: "modular-hulls", branch: "engineering", tier: 1, name: "Moduulirungot", cost: 45, prereq: [], summary: "Laivojen rakentaminen kuluttaa vähemmän seoksia.", effect: { type: "fleetCost", value: -6 } },
  { id: "orbital-foundries", branch: "engineering", tier: 2, name: "Kiertoratasulattamot", cost: 86, prereq: ["modular-hulls"], summary: "Sulatot tuottavat lisää seoksia.", effect: { type: "alloys", value: 2 } },
  { id: "colony-charters", branch: "engineering", tier: 3, name: "Siirtokuntakirjat", cost: 136, prereq: ["orbital-foundries"], summary: "Uusien siirtokuntien perustaminen helpottuu.", effect: { type: "colonyCost", value: -10 } },
  { id: "relay-cathedrals", branch: "engineering", tier: 4, name: "Väyläkatedraalit", cost: 205, prereq: ["colony-charters"], summary: "Kaikki maailmat liittyvät suoraan kauppaan.", effect: { type: "credits", value: 4 } },
  { id: "seed-vaults", branch: "biology", tier: 1, name: "Siemenholvit", cost: 44, prereq: [], summary: "Ravintopuskuri suojaa katovuosilta.", effect: { type: "food", value: 3 } },
  { id: "closed-ecologies", branch: "biology", tier: 2, name: "Suljetut ekosysteemit", cost: 90, prereq: ["seed-vaults"], summary: "Biosfäärien tuotanto kasvaa.", effect: { type: "farm", value: 3 } },
  { id: "memory-gardens", branch: "biology", tier: 3, name: "Muistopuutarhat", cost: 140, prereq: ["closed-ecologies"], summary: "Väestö kasvaa ja vakaus vahvistuu.", effect: { type: "stability", value: 2 } },
  { id: "biosphere-worlds", branch: "biology", tier: 4, name: "Biosfäärimaailmat", cost: 212, prereq: ["memory-gardens"], summary: "Heikompikin maailma voi kasvaa kodiksi.", effect: { type: "habitability", value: 1 } },
  { id: "civic-ledgers", branch: "society", tier: 1, name: "Kansalaiskirjanpito", cost: 41, prereq: [], summary: "Hallinnon läpinäkyvyys lisää vaikutusvaltaa.", effect: { type: "influence", value: 2 } },
  { id: "mutual-aid", branch: "society", tier: 2, name: "Vastavuoroisuus", cost: 84, prereq: ["civic-ledgers"], summary: "Lähetystöt parantavat suhteita enemmän.", effect: { type: "diplomacy", value: 4 } },
  { id: "interstellar-law", branch: "society", tier: 3, name: "Tähtienvälinen laki", cost: 138, prereq: ["mutual-aid"], summary: "Sopimukset kestävät kaksi kuukautta pidempään.", effect: { type: "treaty", value: 2 } },
  { id: "commonwealth", branch: "society", tier: 4, name: "Yhteisvarallisuus", cost: 215, prereq: ["interstellar-law"], summary: "Liitto on mahdollista solmia vähemmällä tuella.", effect: { type: "federation", value: 10 } }
];

export const EVENTS = [
  { id: "drift-capsule", title: "Aikakapseli hiljaisella radalla", category: "LÖYTÖ", text: "Tutkimusalus löytää kapselin, jonka pintaan on kaiverrettu eri kalenteri kuin omamme. Sisällä odottaa jotain käyttökelpoista — ja yksi avoin kysymys.", choices: [
    { id: "decode", title: "Puretaan se laboratorioissa", detail: "Tutkimus +24, vaikutusvalta +2", effects: { resources: { science: 24, influence: 2 } } },
    { id: "preserve", title: "Säilytetään yhteinen perintö", detail: "Vaikutusvalta +10, vakaus +3", effects: { resources: { influence: 10 }, stability: 3 } }
  ] },
  { id: "solar-wind", title: "Aurinkotuuli kääntyy", category: "VAROITUS", text: "Koronan hiukkasrintama on tulossa lähimmän asutun maailman yli. Suojaus ehtii valmistua, jos ohjaamme siihen materiaalia nyt.", choices: [
    { id: "shield", title: "Vahvistetaan suojakilvet", detail: "Seokset −12, vakaus +4", effects: { resources: { alloys: -12 }, stability: 4 } },
    { id: "ride-out", title: "Siirretään alukset suojaan", detail: "Polttoaine −8, säästää materiaalit", effects: { resources: { fuel: -8 }, stability: -1 } }
  ] },
  { id: "green-light", title: "Vihreä vyöhyke", category: "MAHDOLLISUUS", text: "Yksi retkikunta palaa mukanaan kartta viljelyyn sopivasta maailmasta. Lähialueen asukkaat pyytävät, että sitä käsitellään yhteisenä kotina.", choices: [
    { id: "reserve", title: "Merkitään suojelluksi", detail: "Vaikutusvalta +8, suhteet +4", effects: { resources: { influence: 8 }, relations: 4 } },
    { id: "settle", title: "Avataan se uudelle asutukselle", detail: "Krediitit +12, lisää asutushalua", effects: { resources: { credits: 12 }, colonization: 1 } }
  ] },
  { id: "listening-room", title: "Kuunteluhuoneen yö", category: "NEUVOSTO", text: "Asema havaitsee viestin, joka toistuu joka 31. sekunti. Se ei ole vielä keskustelua, mutta se kuulostaa siltä kuin joku odottaisi vuoroaan.", choices: [
    { id: "reply", title: "Lähetetään yksinkertainen vastaus", detail: "Vaikutusvalta −5, tutkimus +18", effects: { resources: { influence: -5, science: 18 }, relations: 5 } },
    { id: "listen", title: "Odotetaan ja kirjataan taajuus", detail: "Tutkimus +28", effects: { resources: { science: 28 } } }
  ] },
  { id: "market-bloom", title: "Kauppareitti kukoistaa", category: "TALOUS", text: "Kahden sivilisaation välinen rahtiväylä kulkee nyt läheltä rajojamme. Se voi ruokkia satamia tai kasvattaa varastoja.", choices: [
    { id: "tax", title: "Sovitaan väylämaksuista", detail: "Krediitit +32", effects: { resources: { credits: 32 } } },
    { id: "share", title: "Tarjotaan avoin levähdyssatama", detail: "Suhteet +9, vaikutusvalta +4", effects: { relations: 9, resources: { influence: 4 } } }
  ] },
  { id: "quiet-strike", title: "Hiljainen lakko", category: "SIIRTOKUNTA", text: "Etäisen siirtokunnan työntekijät kieltäytyvät käynnistämästä uusia louhijoita. Heidän pyyntönsä on yksinkertainen: lepoa ja tilaa.", choices: [
    { id: "rest", title: "Myönnetään tauko", detail: "Krediitit −12, vakaus +8", effects: { resources: { credits: -12 }, stability: 8 } },
    { id: "bonus", title: "Maksetaan kertakorvaus", detail: "Krediitit −26, vakaus +4", effects: { resources: { credits: -26 }, stability: 4 } }
  ] },
  { id: "refugee-flotilla", title: "Hätäviesti Hilasta", category: "SIIRTOKUNTA", text: "Rajaseudun evakuointilaivat pyytävät lupaa telakoitua. Mukana on viljelijöitä, insinöörejä ja kokonainen koululuokka.", choices: [
    { id: "welcome-refugees", title: "Avataan heille uusi koti", detail: "Ravinto −12, uusi asutusalus ja vakaus +3", effects: { resources: { food: -12 }, colonization: 1, stability: 3 } },
    { id: "offer-relief", title: "Lähetetään avustuskuorma", detail: "Vaikutusvalta +8, suhteet +3", effects: { resources: { influence: 8 }, relations: 3 } }
  ] },
  { id: "relay-fracture", title: "Katkennut väyläviesti", category: "VAROITUS", text: "Sektorin viestirele on alkanut toistaa vanhoja käskyjä. Sen takana kulkeva rahti odottaa varmistusta.", choices: [
    { id: "repair-relay", title: "Korjataan rele", detail: "Krediitit −22, kaikki suhteet +4", effects: { resources: { credits: -22 }, relations: 4 } },
    { id: "decode-relay", title: "Puretaan häiriö tutkimusasemalla", detail: "Tutkimus +22, polttoaine −6", effects: { resources: { science: 22, fuel: -6 } } }
  ] },
  { id: "archive-seed", title: "Arkiston siemenkammio", category: "LÖYTÖ", text: "Hylätyn luotaimen sisällä on siemenholvi ja katkelmallinen tähtikartta. Holvin merkinnät sopivat usean sivilisaation kalenteriin.", choices: [
    { id: "catalogue-seeds", title: "Luetteloidaan arkisto yhdessä", detail: "Tutkimus +20, vaikutusvalta +5, suhteet +3", effects: { resources: { science: 20, influence: 5 }, relations: 3 } },
    { id: "secure-seeds", title: "Siirretään holvi kotimaailmaan", detail: "Ravinto +18, vakaus +4", effects: { resources: { food: 18 }, stability: 4 } }
  ] },
  { id: "market-surge", title: "Satamien ruuhkahuippu", category: "TALOUS", text: "Uusi kauppasaattue tuo markkinoille ennätysmäärän tavaraa. Satamien kapasiteetti ei riitä kaikkien lastien käsittelyyn.", choices: [
    { id: "expand-market", title: "Vuokrataan lisäkapasiteettia", detail: "Krediitit −18, vaikutusvalta +10", effects: { resources: { credits: -18, influence: 10 } } },
    { id: "ration-docks", title: "Asetetaan rahti tärkeysjärjestykseen", detail: "Seokset +14, vakaus −2", effects: { resources: { alloys: 14 }, stability: -2 } }
  ] }
];

export const SYSTEM_FIRST_NAMES = [
  "Aamu", "Aava", "Alcyon", "Amara", "Ansa", "Ardea", "Aster", "Aurora",
  "Borealis", "Caligo", "Ceres", "Dione", "Eira", "Elara", "Enceladus", "Eos",
  "Faro", "Fenrir", "Gaia", "Halla", "Helmi", "Iaso", "Ilma", "Iris",
  "Janus", "Juno", "Kajo", "Kallio", "Kide", "Kuu", "Lumen", "Lyyra",
  "Maia", "Meri", "Mimir", "Nacre", "Nemi", "Nix", "Oka", "Origo",
  "Pallas", "Pilvi", "Rhea", "Sade", "Soma", "Sointi", "Talvi", "Tara",
  "Tethys", "Tir", "Tyyni", "Umbra", "Vega", "Vesper", "Vilja", "Yö"
];

export const PLANET_TYPES = [
  { id: "garden", name: "Puutarhamaailma", habitability: 0.94, color: "#83c9a2" },
  { id: "ocean", name: "Valtameriplaneetta", habitability: 0.78, color: "#78b9d6" },
  { id: "temperate", name: "Lauhkea maailma", habitability: 0.72, color: "#a8bd81" },
  { id: "arid", name: "Kuiva planeetta", habitability: 0.48, color: "#d4aa74" },
  { id: "ice", name: "Jääkuori", habitability: 0.31, color: "#9abbd2" },
  { id: "volcanic", name: "Tuhkamaa", habitability: 0.2, color: "#d17c69" }
];

export const SCREEN_DEFS = [
  { id: "command", label: "Komentosilta", short: "SILTA", icon: "◫" },
  { id: "galaxy", label: "Galaksi", short: "KARTTA", icon: "✳" },
  { id: "colonies", label: "Siirtokunnat", short: "MAAILMAT", icon: "◉" },
  { id: "research", label: "Tutkimus", short: "TIEDE", icon: "⌬" },
  { id: "diplomacy", label: "Diplomatia", short: "SOPIMUKSET", icon: "◎" },
  { id: "fleets", label: "Laivastot", short: "LAIVASTO", icon: "⌁" },
  { id: "chronicle", label: "Kronikka", short: "AIKAJANA", icon: "≋" }
];
