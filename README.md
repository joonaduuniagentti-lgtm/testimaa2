# KANTAMA

Selainpohjainen tähtivaltakunnan strategiasimulaatio. Johda yhtä nuorta valtiota läpi galaksin ensimmäisen laajentumiskauden: kartoita tuntemattomia järjestelmiä, perusta siirtokuntia, rakenna tuotantoketjuja, ohjaa tutkimusta ja neuvottele neljän kilpailevan sivilisaation kanssa.

## Pelaa

Vaatimukset: Node.js 18+ ja npm. Riippuvuuksia ei asenneta.

1. Suorita npm run dev.
2. Avaa palvelimen tulostama paikallinen osoite (oletuksena http://localhost:4173).
3. Aja testit komennolla npm test.

Vaihtoehtoisesti julkaise repoa staattisena GitHub Pages -sivuna.

## Komentokeskuksen näkymät

- **Komentosilta:** talous, strategiset tavoitteet, kartta ja päivän tärkeät tapahtumat.
- **Galaksi:** 42 järjestelmän interaktiivinen kartta, järjestelmätiedot, tutkimusretket ja asuttaminen.
- **Siirtokunnat:** väestö, vakaus, rakennusten seuraavan tason kustannukset ja lisätuotanto.
- **Tutkimus:** neljän haaran teknologiapuu ja käynnissä oleva hanke.
- **Diplomatia:** neljä tekoälyvaltaa, suhteet, lähetystöt ja sopimukset.
- **Laivastot:** reitit, laivueet, niiden sijainnit, rajojen puolustusarviot sekä uusien alusten rakentaminen.
- **Kronikka:** resurssikäyrä, historia ja viimeisimmät tapahtumat.

Kartoitettavaksi jää myös yksi harvinainen löytö. Se kannattaa etsiä itse.

## Strategian peruspolku

Jokainen vuoro on yksi kuukausi. Siirtokunnat tuottavat resursseja, väestö kuluttaa ruokaa ja laboratorio kasvattaa tutkimusta. Tekoälyvaltiot laajentuvat ja sopimukset vanhenevat. Vuoroja voi siirtää yksitellen tai neljännesvuosittain. Tapahtumat pysäyttävät kellon valinnan ajaksi; jos varastossa ei ole varaa yhteenkään maksulliseen vaihtoehtoon, kriisipäätös päästää pelin jatkumaan vakaustappiolla.

Puolustuslaivueet vaikuttavat, kun ne ovat paikallaan omassa Vesperin rajamaailmassa. Joka 12. kuukauden rajatarkastuksessa laivueiden yhteisvoimaa ja siirtokunnan vakautta verrataan uhkaan. Laivastonäkymä näyttää rajamaailmat, puolustusarvot ja seuraavan tarkistuksen.

Voittoon on kolme tietä: 10 teknologiaa, joista vähintään kaksi on tasolta III ylöspäin; kolme samanaikaisesti voimassa olevaa, molempia tyyppejä edustavaa sopimusta ja vähintään +30 keskimääräiset suhteet; tai kahdeksan siirtokuntaa vähintään 70 prosentin keskivakaudella. Tavoitteiden eteneminen näkyy komentosillalla.

## Tietosuoja ja tallennus

Peli tallentuu selaimen localStorageen. Varmuuskopioi tilanne JSON-tiedostoksi tai tuo se takaisin myöhemmin; tiedostoa ei lähetetä mihinkään. Pelin siemen mahdollistaa saman lähtögalaksin luomisen uudelleen.

## Tekninen rakenne

- src/ sisältää erilliset maailman, talouden, simulaation, toiminta-, tallennus- ja käyttöliittymämoduulit.
- tests/ tarkistaa determinismin, resurssisäännöt, reitit, tapahtumat ja tallennusmuodon.
- PLAN.md kuvaa arkkitehtuurin, vaiheet ja hyväksymiskriteerit.

Ei ulkoisia JavaScript-kirjastoja, fonttipalveluja tai taustapalvelua.
