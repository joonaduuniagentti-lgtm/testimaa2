# Tähtisaari

Pieni suomenkielinen generatiivinen tutkimusmatka. Luo tunnelma, saavu omalle saarelle ja etsi viisi ihmettä. Viimeinen löytö on salainen.

## Avaa

Avaa index.html selaimessa. Asennusta, build-vaihetta tai verkkoyhteyttä ei tarvita. GitHub Pages toimii suoraan tämän kansion julkaisulähteenä.

## Mitä mukana

- Neljä väritunnelmaa, siemenellä generoitu saaren nimi ja toistettava maisema.
- Elävä canvas-kuvitus: taivas, tähdet, meri, saari, polku, kasvillisuus ja löytöjen hehku.
- Viiden löydön retki ja salainen loppulöytö.
- Selaimen paikallinen kenttäkirja ja JSON-vienti.
- Näppäimistö- ja kosketuskäyttö sekä vähennetyn liikkeen tuki.

Toteutussuunnitelma ja hyväksymiskriteerit ovat PLAN.md-tiedostossa.

## Tietosuoja

Saaren tila ja löydöt jäävät tälle selaimelle localStorageen. Sovellus ei lähetä niitä mihinkään. Kenttäkirjan painike lataa käyttäjän pyynnöstä JSON-kopion omalle laitteelle.

## Rakenne

- index.html: sisältö ja saavutettavat ohjaimet
- styles.css: responsiivinen visuaalinen suunnittelu
- app.js: saaren generointi, maisema, tallennus ja löydöt
- PLAN.md: suunnitelma sekä toteutuksen hyväksymiskriteerit

## Käyttöönoton tarkistus

1. Avaa index.html selaimessa.
2. Valitse tunnelma ja lähde tutkimaan.
3. Etsi viisi löytöä ja avaa Kenttäkirja.
4. Päivitä sivu ja tarkista, että nykyinen saari sekä löydöt ovat tallella.
5. Vähennetyn liikkeen asetuksen voi tarkistaa käyttöjärjestelmän saavutettavuusasetuksista.

Tämä on staattinen selainkokemus: lisäkirjastoja tai build-komentoja ei ole.
