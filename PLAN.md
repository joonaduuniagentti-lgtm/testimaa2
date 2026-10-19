# KANTAMA — tekninen suunnitelma

## Tuote

Kantama on selaimessa pelattava, vuoropohjainen tähtivaltakunnan simulaatio. Pelaaja aloittaa yhden siirtokunnan ja pienen tutkimuslaivueen kanssa. Hän laajentaa tunnettua galaksia retkikunnilla, rakentaa tuotantoketjuja, asuttaa elinkelpoisia maailmoja, ohjaa teknologista kehitystä ja neuvottelee neljän itsenäisen vallan kanssa. Galaksi reagoi jokaiseen kuukauteen: siirtokunnat tuottavat, väestö kasvaa tai levottomuus lisääntyy, tekoälyvaltiot laajenevat, laivastot liikkuvat ja tapahtumat muuttavat suunnitelmia.

Tavoite ei ole yksi irrallinen näkymä vaan pelattava strategiasilmukka, jonka voi aloittaa, tallentaa, jatkaa, viedä tiedostoon ja voittaa usealla tavalla.

## Pelin ydinsilmukka

1. Tarkastele resurssien tuloa, tutkimusta ja valtiokohtaista tilannetta.
2. Valitse strateginen teko: perusta siirtokunta, rakenna, tutki, lähetä retkikunta, suuntaa laivasto, säädä verotusta tai neuvottele.
3. Vie aikaa yksi kuukausi kerrallaan tai neljännes kerrallaan.
4. Ratkaise tapahtumien valinnat ja reagoi simulaation seurauksiin.
5. Rakenna kohti tieteellistä, diplomaattista tai alueellista voittoa; puolusta Vesperin painostamia rajasiirtokuntia sijoitetuilla laivueilla.

## Sisältöraja

- 42 proseduraalisesti nimettyä tähtijärjestelmää, sidottu tähtiväyläverkko ja sumukartta.
- Pelaajan valtio sekä neljä eri tavoin käyttäytyvää tekoälyvaltaa.
- Kuusi resurssia, siirtokuntien väestö ja vakaus sekä kuusi rakennustyyppiä, joista näytetään seuraavan tason kustannus ja lisätuotanto.
- Neljä tutkimushaaraa ja 16 avattavaa teknologiaa.
- Tutkimusretket, laivastojen reitit ja kuukausittainen liike.
- Harvinainen, käsin kirjoitettu tähtilöytö, joka avaa oman tarinan ja pysyvän muiston.
- Suhteet, diplomaattiset lähetystöt, kauppasopimukset ja tutkimusliitot.
- Kymmenen tapahtumakorttia valintoineen, mahdottoman maksutilanteen kriisipäätös, tapahtumaloki, resurssihistoria ja kolme mitattavaa voittoehtoa.
- Paikallinen automaattitallennus, JSON-varmuuskopio ja turvallinen tuontivalidointi.
- Responsiivinen komentokeskus, hiirellä/kosketuksella panoroitava ja zoomattava tähtikartta sekä graafit.

## Arkkitehtuuri

- src/random.js: siemenpohjainen PRNG. Maailman luonti ja simulaatio ovat toistettavia.
- src/world.js: staattiset määrittelyt ja 42 järjestelmän proseduraalinen generointi.
- src/actions.js: pelaajan komennot, kustannus- ja kelpoisuussäännöt.
- src/simulation.js: kuukauden siirtymä, talous, väestö, AI, laivueet, tapahtumat ja voitot.
- src/storage.js: skeemaversioitu paikallistallennus sekä tuonti ja vienti.
- src/galaxy-map.js: responsiivinen Canvas-kartta, pan/zoom ja järjestelmän valinta.
- src/charts.js: taloushistorian piirtäminen ilman ulkoisia kirjastoja.
- src/view.js: saavutettava HTML-näkymä jokaiselle komentokeskuksen osalle.
- src/main.js: tapahtumien sidonta ja näkymän sekä pelitilan yhteensovitus.
- tests/: Node.js:n omilla testityökaluilla simulaation invarianssit ja pelikierrot.

Toteutus on riippumaton ulkoisista kirjastoista ja API-palveluista. Samaa puhdasta simulaatiomoottoria käytetään käyttöliittymässä ja testeissä.

## Toteutusvaiheet

1. **Rajaa maailma ja testattavat säännöt.** Määrittele skeema, siemenpohjainen satunnaisuus, galaksin verkko ja talouden yksikkötestattavat funktiot.
2. **Luo galaksi.** Generoi 42 ainutkertaista maailmaa, reitit, löydettävyys, resurssipotentiaali ja viisi valtaa.
3. **Tee komentotalous.** Toteuta tuotantoketjut, resurssikustannukset, väestö, vakaus, veropolitiikka ja tutkimuksen eteneminen.
4. **Lisää liike ja valtapeli.** Toteuta reitinhaku, tutkimusretket, laivastojen liike, tekoälyvaltioiden päätökset ja diplomatia.
5. **Rakenna tapahtumajärjestelmä ja voitot.** Kymmenen tapahtumaa tarjoavat erilaisia valintoja; kriisipäätös estää tyhjään varastoon lukkiutumisen. Voittopolut vaativat mitattavia, samanaikaisia ehtoja.
6. **Tee komentokeskus.** Rakenna kartta, tilannekuva, siirtokunnat, teknologiat, diplomatia, laivastot ja kronikka omiksi näkymikseen.
7. **Tee tallennuksesta osa peliä.** Palauta sama siemen, tapahtumaloki, reitit ja edistyminen; anna käyttäjän varmuuskopioida pelitila.
8. **Testaa järjestelmärajat ja julkaise.** Aja simulaatiotestejä, tarkista reitit, resurssit, tuonti, saavutettavuuden peruspolku ja repoon päätyvät tiedostot.

## Valmiuden hyväksymiskriteerit

- Sama siemen antaa saman galaksin ja 12 kuukauden simulaatiohistorian.
- Generoidussa verkossa jokaisella järjestelmällä on naapurit, eikä järjestelmien nimiä tai tunnisteita ole kahdesti.
- Komento ei kuluta resursseja, jos se hylätään; hyväksytty teko veloitetaan täsmälleen kerran.
- Retkikunta etenee reittinsä mukaisesti ja paljastaa kohdejärjestelmän saapuessaan.
- Kuukausi tuottaa tuloja, maksaa väestön ruoan, kasvattaa tutkimusta, vanhentaa sopimuksia ja tallentaa historiapisteen.
- Tapahtumavalinta muuttaa pelitilaa, lukkiutunut maksutilanne voidaan aina ratkaista, ja voittoehdot syntyvät vain niitä vastaavista pelitilan arvoista.
- Vienti voidaan tuoda takaisin; väärä tai rikkinäinen JSON ei korvaa käynnissä olevaa tallennusta.
- Rakennusnäkymä näyttää seuraavan tason kustannuksen ja lisätuotannon; hintojen teknologiamuutokset näkyvät myös kartalla ja laivastoissa.
- Kartan zoomaus ja pan pysyvät samoina näkymää uudelleen piirrettäessä.
- npm test toimii ilman verkkoa tai kolmannen osapuolen paketteja.
- Käyttöliittymän pääpolku toimii näppäimistöllä ja kapealla näytöllä.

## Riskit ja rajaukset

- Tämä on yksinpelattava simulaatio, ei verkkopeli. Tallennus ja tekoäly jäävät käyttäjän selaimeen.
- 42 järjestelmää ja vuoropohjainen eteneminen pitävät generoinnin ymmärrettävänä; peli ei yritä olla rajaton universumi.
- Puolustus on strateginen rajapaineen ja varuskunnan voimavertailu, ei taktinen taisteluruutu. Alueiden valtaaminen tai sotilaallinen kampanja jää jatkokehitykseen.
- Canvas piirtää kartan itse, jotta projekti säilyy riippuvuudettomana ja julkaistavana staattisena sivuna.
