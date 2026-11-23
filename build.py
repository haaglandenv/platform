from html import escape
from pathlib import Path
import re
import hashlib

root = Path(__file__).resolve().parent
dist = root / "dist"
pages = root / "pages"
sections = [
    ("home", "Home", "home"),
    ("programma", "Programma", "program"),
    ("schema", "Bekerschema", "bracket"),
    ("live", "Live wedstrijden", "live"),
    ("wedstrijd", "Wedstrijdcentrum", "match"),
    ("finaledag", "Finaledag", "fans"),
    ("regie", "Wedstrijdregie", "control"),
    ("toernooien", "Toernooien", "tournaments"),
    ("locaties", "Sportparken", "venues"),
    ("account", "Mijn account", "account"),
    ("pers", "Pers", "press"),
    ("werkvoorraad", "Werkvoorraad", "inbox"),
    ("seizoen", "Seizoensbeheer", "season"),
    ("toernooibeheer", "Toernooibeheer", "competition"),
    ("tenues", "Wedstrijdtenues", "kits"),
    ("reglement", "Reglementen", "regulations"),
    ("club", "Clubleiding", "club"),
    ("team", "Teamleiding", "team"),
    ("official", "Scheidsrechter", "official"),
    ("finaleregie", "Finaledagregie", "final"),
    ("arbitrage", "Arbitrageplanning", "arbitration"),
    ("berichten", "Berichten", "messages"),
    ("vrijwilligers", "Vrijwilligers", "volunteers"),
    ("spelersbeheer", "Spelersbeheer", "eligibility-desk"),
    ("nieuws", "Nieuws", "news"),
    ("artikel", "Nieuwsartikel", "article"),
    ("vereniging", "Vereniging", "club-profile"),
    ("elftal", "Team", "team-profile"),
    ("nieuwsbeheer", "Nieuwsbeheer", "newsroom"),
    ("planning", "Wedstrijdplanning", "planner"),
    ("teamlive", "Teammanager live", "team-live"),
    ("statistieken", "Statistieken", "statistics"),
    ("speler", "Spelersprofiel", "player-profile"),
    ("spelersportaal", "Spelersportaal", "player"),
    ("supporters", "Supporters", "supporter"),
    ("dossiers", "Wedstrijddossiers", "cases"),
    ("beheerlog", "Besluiten en afsluiting", "governance"),
    ("fotograaf", "Fotograaf en inzendingen", "photographer"),
    ("media", "Beeld uit Haaglanden", "media"),
    ("privacy", "Publicatie en privacy", "privacy"),
    ("zoeken", "Zoeken", "discovery"),
    ("volgen", "Jouw favorieten", "following"),
    ("historie", "Bekerhistorie", "history"),
    ("start", "Mijn overzicht", "dashboard"),
    ("gereed", "Gereed voor aftrap", "readiness"),
    ("briefing", "Wedstrijdbriefing", "briefing"),
    ("datakwaliteit", "Datakwaliteit", "quality"),
    ("werkzekerheid", "Werkzekerheid", "reliability"),
    ("handleiding", "Functionele werking", "manual"),
    ("road", "Road to Houtrust", "road"),
    ("bekerkast", "Digitale bekerkast", "trophies"),
    ("moment", "Moment van de wedstrijd", "moment"),
    ("loting", "Loting en onthulling", "draw"),
]
workspace = {
    "start": "Mijn overzicht", "gereed": "Gereed voor aftrap", "briefing": "Wedstrijdbriefing", "datakwaliteit": "Datakwaliteit", "werkzekerheid": "Werkzekerheid", "handleiding": "Functionele werking", "loting": "Loting en onthulling",
    "dossiers": "Wedstrijddossiers", "beheerlog": "Besluiten en afsluiting", "privacy": "Publicatie en privacy", "fotograaf": "Fotograaf en inzendingen",
    "werkvoorraad": "Toernooileiding", "planning": "Planning", "toernooibeheer": "Toernooibeheer", "seizoen": "Seizoen", "tenues": "Tenues", "club": "Vereniging",
    "team": "Teamleiding", "teamlive": "Team live", "spelersportaal": "Spelers", "spelersbeheer": "Spelersbeheer", "arbitrage": "Arbitrage", "official": "Scheidsrechter",
    "regie": "Live regie", "finaleregie": "Finaledag", "vrijwilligers": "Vrijwilligers", "berichten": "Berichten", "nieuwsbeheer": "Nieuwsbeheer",
}

# All pages use the same hero dimensions and content rail.
heroes = {
    "start": ("Jouw wedstrijddag", "Mijn HV Control · Persoonlijk overzicht", "De wedstrijden, acties en informatie die bij jouw actieve rol horen.", "club.webp"),
    "gereed": ("Samen klaar voor de aftrap", "Wedstrijdvoorbereiding", "Van goedgekeurde spelerslijst tot bevestigde scheidsrechter. Iedere afspraak op één plek.", "kleedkamer.webp"),
    "briefing": ("Goed voorbereid op pad", "Jouw wedstrijdbriefing", "Verzamelen, aftrap, tenue en ontvangst. De juiste informatie voor jouw bekeravond.", "action.webp"),
    "datakwaliteit": ("Cijfers met een verhaal", "Toernooileiding · Datakwaliteit", "Controleer ontbrekende gegevens en maak de betrouwbaarheid van registraties inzichtelijk.", "official.webp"),
    "werkzekerheid": ("Jouw invoer in beeld", "HV Control · Werkzekerheid", "Bekijk lokale acties, verwerk je wachtrij en houd een noodpakket bij de hand.", "velden.webp"),
    "handleiding": ("Zo werkt HV Control", "Functioneel ontwerp · Versie 18", "De gewenste werking, uitzonderingen en controlecriteria voor het volledige platform.", "club.webp"),
    "road": ("De route naar Houtrust", "Jouw club · Jouw bekerreis", "Van de eerste ronde tot de finale. Volg de momenten die jouw bekerverhaal maken.", "action.webp"),
    "bekerkast": ("Een plek in de historie", "Haaglanden Voetbal · Digitale bekerkast", "De winnaars, finales en bijzondere prestaties van de clubs uit onze regio.", "finale.webp"),
    "moment": ("Een moment om te bewaren", "Langs de lijn · Moment van de wedstrijd", "Een doelpunt, een redding of een sportief gebaar. Deel de verhalen die bijblijven.", "crowd.webp"),
    "loting": ("De volgende ontmoeting", "Toernooileiding · Loting en onthulling", "Een controleerbare trekking en, als je dat wilt, een bijzondere onthulling voor de regio.", "finale.webp"),
    "dossiers": ("Een zorgvuldig wedstrijdverhaal", "Toernooileiding · Wedstrijddossiers", "Behandel bezwaren, incidenten en tuchtzaken met een navolgbaar besluit.", "official.webp"),
    "beheerlog": ("Iedere beslissing telt", "Toernooileiding · Besluiten en afsluiting", "Bekijk de historie, controleer openstaande zaken en sluit een editie zorgvuldig af.", "finale.webp"),
    "fotograaf": ("Leg de bekeravond vast", "Fotografen · Communitymedia", "Deel jouw beelden met een credit en duidelijke afspraken over gebruik.", "action.webp"),
    "media": ("De beker in beeld", "Haaglanden Voetbal · Beeldbank", "Goedgekeurde beelden en verhalen van langs de lijn.", "crowd.webp"),
    "privacy": ("Zichtbaar met een reden", "Toernooileiding · Publicatiebeleid", "Bepaal welke spelersgegevens en beelden voor publiek en pers worden vrijgegeven.", "kleedkamer.webp"),
    "zoeken": ("Vind jouw bekerverhaal", "Haaglanden Voetbal · Zoeken", "Van vereniging tot wedstrijd. Alles uit het toernooi op één plek.", "club.webp"),
    "volgen": ("Jouw club. Jouw verhaal", "Mijn HV Control · Favorieten", "Bewaar de teams, clubs, bekers en wedstrijden die jij wilt volgen.", "crowd.webp"),
    "historie": ("Een beker vol herinneringen", "Haaglanden Voetbal · Historie", "De winnaars, de cijfers en de verhalen van eerdere edities.", "finale.webp"),
    "programma": ("De wedstrijdkalender", "Alle bekers · Seizoen 2026/27", "Bekijk alle wedstrijden per dag, week of maand. Plan jouw volgende bekeravond.", "action.webp"),
    "live": ("Langs de lijn. Live", "Wedstrijddag · 5 juni 2027", "Alle actuele duels bij elkaar. Volg de standen en bekijk wat er op de velden gebeurt.", "action.webp"),
    "schema": ("Bekerschema", "Knock-outfase", "Volg ieder duel op weg naar de finale op Houtrust.", "finale.webp"),
    "wedstrijd": ("Duindorp SV – SVV Scheveningen", "Kwartfinale · Sir Winston Cup", "Volg de stand, het wedstrijdverloop en de aftrapgegevens.", "action.webp"),
    "finaledag": ("Samen naar Houtrust", "Finaledag · 12 juni 2027", "De finales, de sfeer en alles voor jouw dag op Houtrust. Eén regio, samen om de beker.", "crowd.webp"),
    "toernooien": ("Toernooien", "Seizoen 2026/27", "Kies een beker of leeftijdscategorie en ontdek de route naar Houtrust.", "finale.webp"),
    "locaties": ("Sportparken", "Haaglanden", "Bekijk waar je club speelt en welke velden je op de wedstrijddag nodig hebt.", "velden.webp"),
    "account": ("Jouw HV Control", "Mijn account · Prototype", "Volg jouw teams en open de werkruimte die bij jouw rol past.", "kleedkamer.webp"),
    "pers": ("Perscentrum", "Haaglanden Voetbal", "Vind officiële uitslagen, wedstrijdgegevens en beeldmateriaal voor publicatie.", "action.webp"),
    "werkvoorraad": ("Werkvoorraad", "Toernooileiding", "Bekijk de openstaande acties per club, team en wedstrijd.", "velden.webp"),
    "toernooibeheer": ("De route naar de beker", "Toernooileiding · Toernooibeheer", "Stel de reglementen vast, bepaal de rondevoortgang en deel het bekerschema in.", "finale.webp"),
    "tenues": ("Herkenbaar op het veld", "Verenigingsleiding · Wedstrijdtenues", "Leg de kleuren van shirt, broek en sokken vast. Zo komen beide teams goed voorbereid aan de aftrap.", "kleedkamer.webp"),
    "reglement": ("De afspraken voor de aftrap", "Toernooi- en wedstrijdreglementen", "Bekijk per beker de speelduur, beslisregels en afspraken voor deelname.", "official.webp"),
    "seizoen": ("Seizoensbeheer", "Toernooileiding", "Beheer bekers, inschrijvingen, lotingen en reglementen.", "finale.webp"),
    "club": ("Clubleiding", "Wedstrijdzaken", "Stem wedstrijden af en beheer je teams, velden en kleedkamers.", "club.webp"),
    "team": ("Teamleiding", "Wedstrijdzaken", "Bereid je wedstrijd voor en dien de spelerslijst in.", "kleedkamer.webp"),
    "official": ("Scheidsrechter", "Wedstrijdzaken", "Bevestig je aanstelling, controleer spelers en rond het duel af.", "official.webp"),
    "regie": ("Wedstrijdregie", "Sportpark Houtrust", "Volg de velden en werk de live tussenstand bij.", "action.webp"),
    "finaleregie": ("Finaledagregie", "12 juni 2027 · Sportpark Houtrust", "Beheer de planning, ontvangst en prijsuitreiking.", "velden.webp"),
    "arbitrage": ("Arbitrageplanning", "Wedstrijdzaken", "Wijs een scheidsrechter aan en controleer beschikbaarheid en bevestiging.", "official.webp"),
    "berichten": ("Berichten", "HV Control", "Volg wijzigingen in het programma, de aanstellingen en de uitslagen.", "club.webp"),
    "vrijwilligers": ("Vrijwilligers op Houtrust", "12 juni 2027 · Finaledag", "Bekijk je dienst, vink taken af en volg wijzigingen op de finaledag.", "crowd.webp"),
    "spelersbeheer": ("Spelersbeheer", "Toernooileiding", "Beoordeel spelersverzoeken en leg de regels voor leeftijd en dispensatie vast.", "kleedkamer.webp"),
    "nieuws": ("Langs de lijn", "Nieuws uit Haaglanden", "De verhalen, clubs en mensen achter het toernooi.", "crowd.webp"),
    "artikel": ("Het verhaal", "Haaglanden Voetbal", "Nieuws en achtergronden van het Haaglanden Voetbaltoernooi.", "action.webp"),
    "vereniging": ("Onze verenigingen", "Haaglanden Voetbal", "Ontdek de club, de teams en het laatste nieuws.", "club.webp"),
    "elftal": ("Dicht bij je team", "Haaglanden Voetbal", "Volg jouw elftal en de verhalen rond het toernooi.", "kleedkamer.webp"),
    "planning": ("De planning in jouw hand", "Toernooileiding · Seizoen 2026/27", "Verdeel de wedstrijden over de kalender en voeg gespeelde of nieuwe duels toe.", "velden.webp"),
    "teamlive": ("Dicht op de wedstrijd", "Teamleiding · Live wedstrijdbeeld", "Houd doelpunten, kaarten en wissels bij. De scheidsrechter bevestigt het definitieve wedstrijdbeeld.", "action.webp"),
    "statistieken": ("Het toernooi in cijfers", "Seizoen 2026/27 · Demostatistieken", "Van het eerste doelpunt tot de laatste finale. Ontdek de cijfers van clubs, teams en spelers.", "finale.webp"),
    "speler": ("Het verhaal van de speler", "Haaglanden Voetbal · Spelersprofiel", "Vorm, doelpunten en prestaties in het bekertoernooi, op één plek.", "action.webp"),
    "spelersportaal": ("Klaar voor jouw wedstrijd", "Spelersportaal · Demo", "Jouw team, de volgende aftrap en de praktische afspraken op één plek.", "kleedkamer.webp"),
    "supporters": ("Jouw club. Jouw bekeravond", "Supporters · Langs de lijn", "Volg je teams, mis geen aftrap en blijf bij met het nieuws uit Haaglanden.", "crowd.webp"),
    "nieuwsbeheer": ("Nieuwsbeheer", "Redactie", "Schrijf verhalen en verbind ze aan de juiste toernooien, verenigingen en teams.", "official.webp"),
}


def render_hero(ident):
    title, context, description, asset = heroes[ident]
    anchor = ' id="wedstrijd-HV-2701"' if ident == "wedstrijd" else ""
    return (
        f'<header class="hv-hero hv-page-hero"{anchor}>'
        '<div class="hv-hero__copy">'
        f'<p class="hv-hero__eyebrow"><i aria-hidden="true"></i>{escape(context)}</p>'
        f'<h1>{escape(title)}<span>.</span></h1><p>{escape(description)}</p>'
        '</div><div class="hv-hero__picture" aria-hidden="true">'
        f'<img src="assets/{escape(asset)}" alt="" loading="lazy" width="900" height="600">'
        '<div class="hv-hero__field-line"></div></div></header>'
    )


def documentation_markup(source):
    def inline(value):
        value = escape(value)
        value = re.sub(r"`([^`]+)`", r"<code>\1</code>", value)
        value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
        value = re.sub(r"\[([^\]]+)\]\((https?://[^\s)]+|#[^\s)]+)\)", r'<a href="\2">\1</a>', value)
        return value
    out, toc, paragraph, listing, fenced, code = [], [], [], None, False, []
    lines = source.splitlines()
    def flush():
        nonlocal paragraph, listing
        if paragraph:
            out.append('<p>' + inline(' '.join(paragraph)) + '</p>')
            paragraph = []
        if listing:
            out.append('</' + listing + '>')
            listing = None
    index = 0
    heading_count = 0
    heading_ids = {}
    while index < len(lines):
        line = lines[index].strip()
        if line.startswith('```'):
            flush()
            if fenced:
                out.append('<pre><code>' + escape('\n'.join(code)) + '</code></pre>')
                code = []
            fenced = not fenced
        elif fenced:
            code.append(lines[index])
        elif line.startswith('#'):
            flush()
            found = re.match(r'^(#{1,6})\s+(.+)', line)
            if found:
                level, title = min(4, max(2, len(found[1]))), found[2]
                heading_count += 1
                ident = 'werking-' + str(heading_count)
                slug = re.sub(r'[^\w\- ]', '', title.lower()).replace(' ', '-')
                heading_ids[slug] = ident
                out.append(f'<h{level} id="{ident}">' + inline(title) + f'</h{level}>')
                if len(found[1]) <= 2:
                    toc.append((ident, title))
        elif line.startswith('|') and index + 1 < len(lines) and re.match(r'^\|?[\s:|\-]+\|?$', lines[index+1].strip()):
            flush()
            cells = lambda row: [part.strip() for part in row.strip().strip('|').split('|')]
            out.append('<table><thead><tr>' + ''.join('<th>' + inline(c) + '</th>' for c in cells(line)) + '</tr></thead><tbody>')
            index += 2
            while index < len(lines) and lines[index].strip().startswith('|'):
                out.append('<tr>' + ''.join('<td>' + inline(c) + '</td>' for c in cells(lines[index])) + '</tr>')
                index += 1
            out.append('</tbody></table>')
            continue
        elif re.match(r'^([-*]|\d+\.)\s+', line):
            if paragraph:
                out.append('<p>' + inline(' '.join(paragraph)) + '</p>')
                paragraph = []
            kind = 'ol' if re.match(r'^\d+\.', line) else 'ul'
            if listing != kind:
                if listing:
                    out.append('</' + listing + '>')
                out.append('<' + kind + '>')
                listing = kind
            out.append('<li>' + inline(re.sub(r'^([-*]|\d+\.)\s+', '', line)) + '</li>')
        elif line.startswith('>'):
            flush()
            out.append('<blockquote>' + inline(line.lstrip('> ')) + '</blockquote>')
        elif not line or line in ('---', '***'):
            flush()
        else:
            paragraph.append(line)
        index += 1
    flush()
    content = re.sub(r'href="#([^"]+)"', lambda match: 'href="#' + heading_ids.get(match[1], match[1]) + '"', ''.join(out))
    return content, ''.join('<a href="#' + ident + '">' + escape(title) + '</a>' for ident, title in toc)


work_options = "".join(f'<option value="{key}">{title}</option>' for key, title in workspace.items())
work_nav = "".join(f'<a href="#{key}" data-nav="{key}">{title}</a>' for key, title in workspace.items())
final_card = (pages / "final-card.html").read_text(encoding="utf-8").strip()
match_events = (pages / "match-events.html").read_text(encoding="utf-8").strip()
footer = (pages / "footer.html").read_text(encoding="utf-8").strip()
manual_path = root / "docs" / "HV-Control-Functioneel-Ontwerp.md"
manual_content, manual_index = documentation_markup(manual_path.read_text(encoding="utf-8"))
(dist / "docs").mkdir(exist_ok=True)
for name in ("HV-Control-Functioneel-Ontwerp.md", "HV-Control-Acceptatiechecklist.md"):
    (dist / "docs" / name).write_text((root / "docs" / name).read_text(encoding="utf-8"), encoding="utf-8")
section_tags = []
for ident, title, filename in sections:
    content = (pages / (filename + ".html")).read_text(encoding="utf-8").replace("$$FINAL_DAY_CARD$$", final_card)
    content = content.replace("$$MANUAL_CONTENT$$", manual_content).replace("$$MANUAL_INDEX$$", manual_index)
    if ident == "official":
        content = content.replace("$$MATCH_EVENTS$$", match_events)
    hidden = "" if ident == "home" else " hidden"
    work_attr = ' data-workspace' if ident in workspace else ''
    if ident != "home":
        content = render_hero(ident) + f'<div class="hv-page-content">{content}</div>'
    section_tags.append(f'<section id="{ident}" data-page data-title="{title}"{work_attr}{hidden}>{content}</section>')

page = """<!doctype html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#fbfcf8"><meta name="description" content="Volg het Haaglanden Voetbaltoernooi. Bekijk het programma, live scores en de route naar de finale op Houtrust."><title>HV Control · Haaglanden Voetbaltoernooi</title><link rel="icon" href="assets/hv-logo.svg" type="image/svg+xml"><link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="assets/hv-app-192.png"><link rel="stylesheet" href="assets/fonts.css"><link rel="stylesheet" href="site.css"><script src="site.js" defer></script></head>
<body data-hv-prototype>
<header class="hv-top"><div class="hv-top-inner">
<a class="hv-brand" href="#home" aria-label="Haaglanden Voetbal, startpagina"><img src="assets/hv-logo.svg" width="1551" height="429" alt="Haaglanden Voetbal"><span>HV Control</span></a>
<nav class="hv-nav" aria-label="Hoofdnavigatie">
<a href="#toernooien" data-nav="toernooien">Toernooien</a><a href="#programma" data-nav="programma">Programma</a><a href="#schema" data-nav="schema">Bekerschema</a><a href="#nieuws" data-nav="nieuws">Nieuws</a><a href="#live" data-nav="live"><i class="hv-dot" aria-hidden="true"></i>Live</a><a href="#statistieken" data-nav="statistieken">Statistieken</a><a href="#finaledag" data-nav="finaledag">Finaledag</a>
</nav><a class="hv-button hv-button-dark hv-account-button" href="#account" data-nav="account"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="3.3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/></svg>Mijn account</a>
</div></header>
<main class="hv-main"><div class="hv-work-nav hv-workspace-nav" hidden><label class="hv-work-switch">Werkruimte<select data-workspace-select aria-label="Kies een werkruimte">$$WORK_OPTIONS$$</select></label><nav class="hv-tabbar hv-work-links" aria-label="Demowerkruimtes per rol">$$WORK_NAV$$</nav></div>
$$SECTIONS$$
</main>
$$FOOTER$$
$$SETUP_WIZARD$$
<dialog class="hv-reset-dialog" id="hv-reset-dialog"><form method="dialog"><h2>Demogegevens herstellen?</h2><p>Je eigen wijzigingen aan deze demo worden op dit apparaat teruggezet naar de voorbeeldgegevens.</p><div><button value="cancel" class="hv-button" autofocus>Annuleren</button><button value="reset" class="hv-button hv-button-dark" data-hv-reset-confirm>Herstel beginstand</button></div></form></dialog></body></html>""".replace("$$SECTIONS$$", "\n".join(section_tags)).replace("$$WORK_NAV$$", work_nav).replace("$$WORK_OPTIONS$$", work_options).replace("$$FOOTER$$", footer).replace("$$SETUP_WIZARD$$", (pages / "setup-wizard.html").read_text())
(dist / "index.html").write_text(page, encoding="utf-8")

for kind in ("css", "js"):
    parts = [(root / ("site." + kind)).read_text()]
    if kind == "js":
        parts.append((root / "clock.js").read_text())
        parts.append((root / "identity.js").read_text())
        parts.append((root / "workflow.js").read_text())
        parts.append((root / "access.js").read_text())
        parts.append((root / "competition.js").read_text())
        parts.append((root / "fixtures.js").read_text())
        parts.append((root / "editions.js").read_text())
        parts.append((root / "registrations.js").read_text())
        parts.append((root / "eligibility.js").read_text())
        parts.append((root / "match-center.js").read_text())
        parts.append((root / "cases.js").read_text())
        parts.append((root / "operations.js").read_text())
        parts.append((root / "operations-v15.js").read_text())
        parts.append((root / "privacy-media.js").read_text())
        parts.append((root / "statistics.js").read_text())
        parts.append((root / "kits.js").read_text())
        parts.append((root / "competition-views.js").read_text())
        parts.append((root / "news.js").read_text())
        parts.append((root / "public-tools.js").read_text())
        parts.append((root / "draw-show.js").read_text())
        parts.append((root / "experiences.js").read_text())
        parts.append((root / "matchday.js").read_text())
        parts.append((root / "reliability.js").read_text())
        parts.append((root / "access-controls.js").read_text())
        parts.append((root / "setup.js").read_text())
    else:
        parts.append((pages / "road.css").read_text())
    for _, _, filename in sections:
        fragment = pages / (filename + "." + kind)
        if fragment.exists() and not (kind == "css" and filename == "road"):
            parts.append(fragment.read_text())
    parts.append((pages / ("match-events." + kind)).read_text())
    if kind == "css":
        parts.append((root / "polish.css").read_text())
    parts.append((pages / ("setup-wizard." + kind)).read_text())
    if kind == "css":
        parts.append((root / "row-actions.css").read_text())
    (dist / ("site." + kind)).write_text("\n\n".join(parts), encoding="utf-8")

manifest = dist / "manifest.webmanifest"
manifest.write_text(manifest.read_text().replace('"./#app"', '"./#start"'))
worker = dist / "sw.js"
worker_text = worker.read_text()
version = hashlib.sha256((dist / "site.js").read_bytes() + (dist / "site.css").read_bytes() + (dist / "index.html").read_bytes()).hexdigest()[:12]
worker_text = re.sub(r"const cacheKey = '[^']+';", "const cacheKey = 'hv-control-demo-" + version + "';", worker_text)
worker.write_text(worker_text)
