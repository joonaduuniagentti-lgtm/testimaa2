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
- **Siirtokunnat:** väestö, vakaus, rakennukset ja planeettakohtainen tuotanto.
- **Tutkimus:** neljän haaran teknologiapuu ja käynnissä oleva hanke.
- **Diplomatia:** neljä tekoälyvaltaa, suhteet, lähetystöt ja sopimukset.
- **Laivastot:** reitit, laivueet, niiden sijainnit sekä uusien alusten rakentaminen.
- **Kronikka:** resurssikäyrä, historia ja viimeisimmät tapahtumat.

Kartoitettavaksi jää myös yksi harvinainen löytö. Se kannattaa etsiä itse.

## Strategian peruspolku

Jokainen vuoro on yksi kuukausi. Siirtokunnat tuottavat resursseja, väestö kuluttaa ruokaa ja laboratorio kasvattaa tutkimusta. Tekoälyvaltiot laajentuvat ja sopimukset vanhenevat. Vuoroja voi siirtää yksitellen tai neljännesvuosittain. Tapahtumat pysäyttävät kellon, kunnes niiden valinta on ratkaistu.

Voittoon on kolme tietä: tieteellinen läpimurto, usean valtion rauhanliitto tai laaja tähtirintama. Tavoitteet näkyvät komentosillalla.

## Tietosuoja ja tallennus

Peli tallentuu selaimen localStorageen. Varmuuskopioi tilanne JSON-tiedostoksi tai tuo se takaisin myöhemmin; tiedostoa ei lähetetä mihinkään. Pelin siemen mahdollistaa saman lähtögalaksin luomisen uudelleen.

## Tekninen rakenne

- src/ sisältää erilliset maailman, talouden, simulaation, toiminta-, tallennus- ja käyttöliittymämoduulit.
- tests/ tarkistaa determinismin, resurssisäännöt, reitit, tapahtumat ja tallennusmuodon.
- PLAN.md kuvaa arkkitehtuurin, vaiheet ja hyväksymiskriteerit.

Ei ulkoisia JavaScript-kirjastoja, fonttipalveluja tai taustapalvelua.
