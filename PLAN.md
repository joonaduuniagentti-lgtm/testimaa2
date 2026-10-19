# Tähtisaari: toteutussuunnitelma

## Tavoite

Rakentaa repoonsa valmis, suomenkielinen generatiivinen tutkimusmatka. Käyttäjä luo oman tunnelmansa mukaisen pienen saaren, tutkii sitä viiden löydön verran ja kerää löydöt henkilökohtaiseen kenttäkirjaan. Kokemus on rauhallinen, leikkisä, yksityinen ja käytettävä myös puhelimella.

## Rajaukset ja tekniset valinnat

- Ei kirjautumista, palvelinta, ulkoisia kirjastoja, fonttipyyntöjä tai seurantaa. Sivun voi avata paikallisesti ja julkaista sellaisenaan staattisena sivuna.
- Käyttöliittymä on semanttista HTML:ää. Maisema piirtyy omaan responsiiviseen canvas-elementtiinsä, jonka rinnalla kaikki toiminnot ja sisältö ovat tavallisia saavutettavia HTML-elementtejä.
- Neljä tunnelmaa muuttaa saaren värimaailmaa. Saari saa siemenen, nimen ja toistettavan löytöjärjestyksen, jotta näkymä pysyy samanlaisena sivun päivityksen jälkeen.
- Edistyminen ja kenttäkirja tallentuvat selaimen localStorageen. JSON-vienti antaa käyttäjälle oman kopion löytömuistoista.
- Canvas-animaatio kunnioittaa järjestelmän vähennetyn liikkeen asetusta. Kaikki keskeiset toiminnot toimivat näppäimistöllä, kosketuksella ja hiirellä.

## Toteutusvaiheet

1. **Suunta ja runko:** määrittele tunnelma, pieni pelisilmukka, saaren tilamalli ja responsiivinen näkymä. Valmis.
2. **Generatiivinen maisema:** piirrä yötaivas, meri, saari, kasvillisuus, reitti ja löytöjen valot; lisää neljä väripalettia sekä hillitty liike. Valmis.
3. **Tutkiminen:** lisää neljä tunnelmavalintaa, saaren arpominen ja viisi erilaista löytöä. Viides avaa yllätyslöydön. Valmis.
4. **Muisti ja yksityisyys:** tallenna tila paikallisesti, rakenna kenttäkirja, päivitä tilan palautuminen ja lisää JSON-vienti. Valmis.
5. **Viimeistely ja laadunvarmistus:** tarkista HTML:n rakenne, mobiilin asettelu, näppäimistöpolku, virhetilanteet sekä JavaScriptin syntaksi. Valmis.

## Tilarakenne

- current: saaren siemen, nimi, tunnelma, viiden löydön järjestys ja etenemisen vaihe.
- worldCount: käyttäjän luomien saarten määrä.
- journal: järjestetty paikallinen kokoelma löydöistä saarineen ja aikaleimoineen.
- Tallennuksen versio on mukana, jotta tuleva rakennepäivitys voidaan erottaa vanhasta selaindatasta.

## Hyväksymiskriteerit

- Ensimmäinen saari ja näkymä syntyvät heti ilman asennusta.
- Uusi saari vaihtaa siemenen ja nimen; tunnelmaa voi vaihtaa milloin tahansa.
- Viiden löydön jälkeen edistymispalkki täyttyy, viides salaisuus näkyy ja lisälöytö ei monista kirjaa.
- Kenttäkirja ja JSON-vienti sisältävät samat tallennetut löydöt.
- Tyylit ja kuvitus mukautuvat kapealle näytölle; canvas ei estä käyttöliittymän käyttöä.
- Animaatio pysähtyy vähennetyn liikkeen asetuksella. Käyttöliittymän palautteet ilmoitetaan ruudunlukijalle.

## Mahdolliset jatkot

1. Lisää kartalle nimettyjä alueita, joihin voi kulkea eri järjestyksessä.
2. Lisää tunnelmakohtaiset pienet äänimaisemat vain käyttäjän erillisellä valinnalla.
3. Lisää jaettava staattinen saarikortti, joka ei sisällä kenttäkirjaa tai selaimen muita tietoja.
