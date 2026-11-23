# HV Control — visuele polijstronde versie 16

20 november 2026. Visuele revisie op de functionele versie 15; de sportieve regels, mockgegevens en bevoegdheden veranderen niet.

## Uitwerking

- Eén verticale paginaflow met gedeelde tussenruimte van 20–30 px, onafhankelijk van verborgen tabpanelen. Welkom- en accountblokken, governance-tabs, wedstrijdcontext/score/acties, beheerpanelen en de finaledagkaart staan vrij van elkaar.
- De actuele wedstrijdpagina staat onder de hero; de bedoelde zwevende scorekaart blijft uitsluitend op de homepagina.
- DM Sans blijft het gedeelde font. Gemeenschappelijke sectiekoppen hebben één schaal; labels en bediening minimaal 14 px, invoervelden 16 px en secundaire bijschriften minimaal 12 px. IBM Plex Mono blijft voor identificatie.
- Formuliervelden, knoppen, keuzevelden en tabs hebben consistente bediening en voldoende hoogte. Selects hebben dezelfde ingesprongen chevron. Focus van interactieve elementen blijft zichtbaar.
- Panelen in dezelfde gridrij sluiten gelijk aan. Korte mobiele tabpanelen worden niet tot grote lege desktophoogtes uitgerekt.
- Kalender- en bracketregels zijn groter gemaakt voor leesbare teamnamen en metadata. De complexe matrix kan binnen een eigen vlak scrollen; de pagina zelf niet.
- Finaledagkaarten groeien met hun tekst. De spelerprofieltoolbar gebruikt de bedoelde responsieve grid. De kale wedstrijdselector bij wedstrijdmomenten gebruikt dezelfde formulierstijl.
- Reduced motion en de bestaande branding blijven behouden.

## Verificatie

Alle 53 routes zijn in de browser gemeten op 360, 800, 1024, 1120 en 1280 px weergavebreedte. De twee meetreeksen bevatten samen 318 waarnemingen, omdat de telefoonbreedte in beide reeksen is opgenomen.

Geen horizontale pagina-overloop, hero-tekst buiten de hero, overlappende tabknoppen, direct rakende onafhankelijke panelen of zichtbare gecontroleerde tekst kleiner dan 12 px aangetroffen. Ook het geopende scheidsrechter-wedstrijdmenu is gecontroleerd; de spelerscontrole is aanvullend visueel bekeken.

Het gekoppelde meetbestand bevat geometrische controles van de standaardweergaven en het wedstrijdmenu. Dit is geen claim dat elke mogelijke combinatie van gebruikersinvoer en iedere verborgen formulierstatus visueel is bewezen.

De CSS-structuurcontrole van 47 bronbestanden, de Pythonbuild, de JavaScript-syntaxcontrole van de bundel en git diff --check slagen. Er zijn geen domeinregels gewijzigd; de volledige sportieve testsuite is daarom niet opnieuw uitgevoerd voor deze visuele revisie.
