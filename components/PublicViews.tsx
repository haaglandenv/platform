"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Filter,
  Heart,
  MapPin,
  Play,
  Search,
  Share2,
  ShieldCheck,
  Star,
  Trophy,
  Upload,
} from "lucide-react";
import type { Role } from "@/lib/types";
import {
  Button,
  Card,
  ClubCrest,
  EmptyState,
  MatchRow,
  MatchScore,
  PageHeader,
  PlayerPhoto,
  StatusBadge,
  teamDetails,
  type ActionHandler,
  type AppData,
} from "@/components/ui";

interface Props {
  path: string;
  data: AppData;
  role: Role;
  action: ActionHandler;
  busy: string | null;
  switchRole: (role: Role, destination?: string) => Promise<void>;
}

const stories = [
  {
    slug: "quick-klaar-voor-kwartfinale",
    tag: "Sir Winston Cup",
    title: "Quick en Duindorp SV maken zich op voor bekeravond",
    intro: "Twee regionale voetbalwerelden komen zaterdag samen op Nieuw Hanenburg.",
  },
  {
    slug: "route-naar-de-finale",
    tag: "Toernooi",
    title: "De route naar de finale ligt open",
    intro: "Vier kwartfinales, één beker en geen ruimte voor een slechte avond.",
  },
  {
    slug: "clubs-dragen-de-regio",
    tag: "Clubs",
    title: "De clubs die Haaglanden iedere week laten leven",
    intro: "Van Houtrust tot De Diepput: vrijwilligers en spelers bouwen de voetbalregio.",
  },
];

function roundLabel(round: string) {
  return (
    {
      QUARTER_FINAL: "kwartfinale",
      SEMI_FINAL: "halve finale",
      FINAL: "finale",
    }[round] ?? round.toLowerCase().replaceAll("_", " ")
  );
}

export function PublicView(props: Props) {
  const { path } = props;
  if (path === "/") return <HomeView {...props} />;
  if (path === "/nieuws") return <NewsView {...props} />;
  if (path.startsWith("/nieuws/")) return <ArticleView {...props} />;
  if (path.startsWith("/toernooien/sir-winston-cup")) return <TournamentView {...props} />;
  if (path === "/toernooien") return <TournamentsIndex {...props} />;
  if (path === "/wedstrijden/quick-duindorp-sv") return <MatchCentre {...props} />;
  if (path === "/wedstrijden") return <MatchesView {...props} />;
  if (path === "/clubs/duindorp-sv") return <ClubDetail {...props} />;
  if (path === "/clubs") return <ClubsView {...props} />;
  if (path.startsWith("/spelers/")) return <PlayerPublicView />;
  if (path === "/media" || path.startsWith("/media/")) return <MediaView {...props} />;
  if (path === "/historie") return <HistoryView />;
  if (path === "/finaledag") return <FinalDayView {...props} />;
  if (path === "/zoeken") return <SearchView {...props} />;
  if (path === "/account" || path.startsWith("/next")) return <NextView {...props} />;
  if (path === "/meldingen") return <NotificationsView {...props} />;
  return <LoginView {...props} />;
}

function HomeView({ data, action, busy }: Props) {
  const featured =
    data.matches.find((match) => match.status === "LIVE") ??
    data.matches.find((match) => match.id === "match_qf_1")!;
  const featuredHome = teamDetails(data, featured.homeTeamId);
  const featuredAway = teamDetails(data, featured.awayTeamId);
  const featuredTournament = data.tournaments.find(
    (tournament) => tournament.id === featured.tournamentId,
  );
  const featuredRoute =
    featured.id === "match_qf_1" ? "/wedstrijden/quick-duindorp-sv" : "/wedstrijden";
  const metrics = data.runtime.matchMetrics[featured.id];
  const [shareFeedback, setShareFeedback] = useState("");
  const latestEvent = [
    ...data.liveEvents.filter((event) => event.matchId === featured.id),
    ...data.runtime.matchEvents.filter(
      (event) => event.matchId === featured.id && !event.corrected,
    ),
  ]
    .sort((left, right) => left.minute - right.minute)
    .at(-1);
  const cards = data.runtime.matchEvents.filter(
    (event) =>
      event.matchId === featured.id &&
      !event.corrected &&
      (event.type === "YELLOW" || event.type === "RED"),
  );
  const shareMatch = async () => {
    const url = `${window.location.origin}${featuredRoute}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${featuredHome.team?.name ?? "Thuisteam"} – ${featuredAway.team?.name ?? "Uitteam"}`,
          url,
        });
        setShareFeedback("Deelvenster geopend");
      } else {
        await navigator.clipboard.writeText(url);
        setShareFeedback("Wedstrijdlink gekopieerd");
      }
    } catch (error) {
      setShareFeedback(
        error instanceof DOMException && error.name === "AbortError"
          ? "Delen geannuleerd"
          : "Delen is niet gelukt",
      );
    }
  };
  return (
    <>
      <section className="home-stage">
        <div className="editorial-hero">
          <Image
            src="/media/tournament-hero-v2.png"
            alt="Synthetische groen-witte spelers vieren een moment op een regionaal voetbalveld"
            fill
            loading="eager"
            sizes="100vw"
          />
          <div className="editorial-hero__overlay" />
          <div className="container editorial-hero__content">
            <p className="eyebrow eyebrow--light">Sir Winston Cup · kwartfinale</p>
            <h1>De strijd om de Sir Winston Cup gaat verder</h1>
            <p>
              Alles staat op scherp. Acht clubs, vier affiches en één route naar de grote finaledag
              van Haaglanden.
            </p>
            <Link
              className="button button--lime home-primary-cta"
              href="/nieuws/quick-klaar-voor-kwartfinale"
            >
              Lees het verhaal <ChevronRight size={20} />
            </Link>
            <Link className="home-secondary-link" href="/toernooien/sir-winston-cup">
              Bekijk het toernooi
            </Link>
            <small>Synthetisch demobeeld · OpenAI ImageGen</small>
          </div>
        </div>

        <article
          className="container home-live-card"
          aria-label={`Uitgelichte wedstrijd ${featuredHome.team?.name ?? "thuisteam"} tegen ${featuredAway.team?.name ?? "uitteam"}`}
        >
          <Image
            src="/media/tournament-hero-v2.png"
            alt=""
            fill
            sizes="(max-width: 767px) calc(100vw - 32px), 900px"
          />
          <div className="home-live-card__veil" />
          <div className="home-live-card__content">
            <header>
              <StatusBadge status={featured.official ? "OFFICIEEL" : featured.status} />
              <button
                className="home-share-button"
                onClick={shareMatch}
                aria-label="Deel deze wedstrijd"
              >
                <Share2 size={22} />
              </button>
            </header>
            <p className="eyebrow eyebrow--light">
              {featuredTournament?.name ?? "Bekertoernooi"} · {roundLabel(featured.round)}
            </p>
            <div className="home-live-score">
              <span>
                <ClubCrest club={featuredHome.club} size="lg" />
                <strong>{featuredHome.team?.name.replace(/ 1$/, "") ?? "Nog te bepalen"}</strong>
              </span>
              <MatchScore match={featured} />
              <span>
                <ClubCrest club={featuredAway.club} size="lg" />
                <strong>{featuredAway.team?.name.replace(/ 1$/, "") ?? "Nog te bepalen"}</strong>
              </span>
            </div>
            <div className="home-live-event">
              <span aria-hidden="true">⚽</span>
              <div>
                <strong>
                  {latestEvent
                    ? `${latestEvent.minute}′ · ${latestEvent.type === "GOAL" ? "Doelpunt" : "Wedstrijdmoment"}`
                    : "Zaterdag · 20:00"}
                </strong>
                <small>
                  {latestEvent
                    ? `${featuredHome.team?.name.replace(/ 1$/, "") ?? "Thuis"} – ${featuredAway.team?.name.replace(/ 1$/, "") ?? "Uit"}`
                    : featured.venue}
                </small>
              </div>
            </div>
            <Button
              className="button--lime home-follow-button"
              busy={busy === "follow"}
              onClick={() => action("follow", { id: featured.id }, "Wedstrijd gevolgd.")}
            >
              {data.runtime.favorites.includes(featured.id)
                ? "Je volgt deze wedstrijd"
                : "Volg live"}
              <ChevronRight size={20} />
            </Button>
            <dl className="home-live-stats">
              <div>
                <dt>Balbezit</dt>
                <dd>
                  {metrics
                    ? `${metrics.possession.home}–${metrics.possession.away}%`
                    : "Nog niet beschikbaar"}
                </dd>
              </div>
              <div>
                <dt>Schoten</dt>
                <dd>{metrics ? `${metrics.shots.home}–${metrics.shots.away}` : "–"}</dd>
              </div>
              <div>
                <dt>Kaarten</dt>
                <dd>{cards.length ? `0–${cards.length}` : "0–0"}</dd>
              </div>
            </dl>
            {shareFeedback ? (
              <span className="home-share-feedback" role="status">
                {shareFeedback}
              </span>
            ) : null}
          </div>
        </article>
      </section>

      <section className="container section-block">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Vandaag in Haaglanden</p>
            <h2>Voetbal zonder omweg</h2>
          </div>
          <Link href="/nieuws">
            Alle verhalen <ChevronRight size={18} />
          </Link>
        </div>
        <div className="story-grid">
          {stories.map((story, index) => (
            <article
              className={index === 0 ? "story-card story-card--lead" : "story-card"}
              key={story.slug}
            >
              <div className={`story-card__image story-card__image--${index + 1}`}>
                <Image
                  src={index === 2 ? "/media/community-night.png" : "/media/matchday-live.png"}
                  alt="Synthetische regionale voetbalreportage"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <p className="eyebrow">{story.tag}</p>
              <h3>
                <Link href={`/nieuws/${story.slug}`}>{story.title}</Link>
              </h3>
              <p>{story.intro}</p>
              <Link className="text-link" href={`/nieuws/${story.slug}`}>
                Lees verder <ChevronRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="arena-section">
        <div className="container arena-grid">
          <div>
            <p className="eyebrow eyebrow--light">Road to the final</p>
            <h2>Van acht naar één.</h2>
            <p>
              De bracket reageert pas op officiële uitslagen. Voorlopig blijft ook echt voorlopig.
            </p>
            <Link className="button button--lime" href="/toernooien/sir-winston-cup/bracket">
              Open de bracket
            </Link>
          </div>
          <BracketPreview data={data} />
        </div>
      </section>

      <section className="container section-block community-feature">
        <div className="community-feature__image">
          <Image
            src="/media/community-night.png"
            alt="Synthetische supporters langs de lijn bij een regionaal voetbalveld"
            fill
            sizes="(max-width: 768px) 100vw, 60vw"
          />
          <small>Synthetisch demobeeld · OpenAI ImageGen</small>
        </div>
        <div>
          <p className="eyebrow">Football Network</p>
          <h2>De club is groter dan de uitslag.</h2>
          <p>
            Vind clubs, volg hun programma en beleef de lokale voetbalcultuur vanuit één regionaal
            netwerk.
          </p>
          <Link className="button" href="/clubs">
            Ontdek de clubs
          </Link>
        </div>
      </section>

      <section className="container section-block media-strip">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Uit de regio</p>
            <h2>Beelden die blijven</h2>
          </div>
          <Link href="/media">Open media</Link>
        </div>
        <div className="media-cards">
          <Card className="photo-vote">
            <div className="media-image">
              <Image
                src="/media/matchday-live.png"
                fill
                alt="Synthetisch actiebeeld van een regionale wedstrijd"
                sizes="50vw"
              />
            </div>
            <p className="eyebrow">Foto van de week</p>
            <h3>Het moment vóór de treffer</h3>
            <Button
              busy={busy === "vote"}
              disabled={data.runtime.votes.includes("photo-week")}
              onClick={() => action("vote", { id: "photo-week" }, "Je stem is opgeslagen.")}
            >
              <Star size={17} />{" "}
              {data.runtime.votes.includes("photo-week") ? "Gestemd" : "Stem op deze foto"}
            </Button>
          </Card>
          <Card className="goal-card">
            <div className="goal-card__play">
              <Play size={34} />
              <span>74′</span>
            </div>
            <p className="eyebrow">Goal van de ronde</p>
            <h3>De aanval die Houtrust liet ontploffen</h3>
            <p>Een fictief demomoment, zonder betting of commerciële voorspellingen.</p>
            <Link className="text-link" href="/media/goal-van-de-ronde">
              Bekijk detail <ChevronRight size={16} />
            </Link>
          </Card>
        </div>
      </section>
    </>
  );
}

function NewsView({ data }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Alles");
  const filtered = stories.filter(
    (story) =>
      (category === "Alles" || story.tag === category) &&
      story.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="container page-space">
      <PageHeader
        eyebrow="Redactie"
        title="Nieuws uit de hele regio"
        intro="Wedstrijden, clubs en mensen — helder verteld en gekoppeld aan de brondata."
      />
      <div className="filter-bar">
        <label>
          <span>Zoek verhalen</span>
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek op club of onderwerp"
          />
        </label>
        <div className="segmented" role="group" aria-label="Categorie">
          {["Alles", "Sir Winston Cup", "Clubs"].map((item) => (
            <button
              className={category === item ? "active" : ""}
              key={item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {filtered.length ? (
        <div className="news-list-grid">
          {filtered.map((story, index) => (
            <article className="news-list-card" key={story.slug}>
              <div className="news-list-card__image">
                <Image
                  src={index === 2 ? "/media/community-night.png" : "/media/matchday-live.png"}
                  fill
                  alt="Synthetische regionale voetbalreportage"
                />
              </div>
              <div>
                <p className="eyebrow">{story.tag}</p>
                <h2>
                  <Link href={`/nieuws/${story.slug}`}>{story.title}</Link>
                </h2>
                <p>{story.intro}</p>
                <small>28 augustus 2026 · 4 min leestijd</small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Geen verhalen gevonden" detail="Pas je zoekterm of categorie aan." />
      )}
      <Card title="Wedstrijdcontext">
        <MatchRow match={data.matches.find((match) => match.id === "match_qf_1")!} data={data} />
      </Card>
    </div>
  );
}

function ArticleView({ data }: Props) {
  const [shareFeedback, setShareFeedback] = useState("");
  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: document.title, url: window.location.href });
      setShareFeedback("Deelvenster geopend");
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setShareFeedback("Link gekopieerd");
    }
  };
  return (
    <article className="article-page">
      <header className="article-header container">
        <Link className="back-link" href="/nieuws">
          <ChevronLeft size={17} /> Terug naar nieuws
        </Link>
        <p className="eyebrow">Sir Winston Cup · voorbeschouwing</p>
        <h1>Quick en Duindorp SV maken zich op voor bekeravond</h1>
        <p className="lede">
          Nieuw Hanenburg vormt zaterdag het decor voor een kwartfinale waarin details het verschil
          gaan maken.
        </p>
        <div className="article-meta">
          <span>Haaglanden Voetbal</span>
          <span>28 augustus 2026</span>
          <span>4 min leestijd</span>
        </div>
      </header>
      <div className="article-hero">
        <Image
          src="/media/matchday-live.png"
          fill
          alt="Synthetische avondwedstrijd op een regionaal voetbalveld"
          loading="eager"
        />
        <small>Synthetisch demobeeld · OpenAI ImageGen</small>
      </div>
      <div className="article-body">
        <p className="dropcap">
          De lichten zijn aan, de lijnen zijn getrokken en de bekeravond komt dichterbij. Quick
          ontvangt Duindorp SV in een duel dat in TournamentOS al weken als centraal moment door
          alle rollen loopt.
        </p>
        <h2>Eén wedstrijd, één bron</h2>
        <p>
          De opstellingen, controle, uitslag en bracket gebruiken exact hetzelfde wedstrijd-ID.
          Daardoor blijft het verhaal dat supporters lezen gelijk aan wat managers en
          wedstrijdleiding afhandelen.
        </p>
        <Card className="article-embed" title="Kwartfinale">
          <MatchRow match={data.matches.find((match) => match.id === "match_qf_1")!} data={data} />
        </Card>
        <h2>Officieel is officieel</h2>
        <p>
          Een voorlopige uitslag laat nog niemand doorgaan. Pas na bevestiging door de
          toernooileiding verandert de bracket en verschijnt het officiële label op alle publieke
          schermen.
        </p>
        <div className="article-share">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(window.location.href);
              setShareFeedback("Link gekopieerd");
            }}
          >
            <Copy size={17} /> Kopieer link
          </button>
          <button onClick={share}>
            <Share2 size={17} /> Deel artikel
          </button>
          {shareFeedback ? <span role="status">{shareFeedback}</span> : null}
        </div>
      </div>
    </article>
  );
}

function TournamentsIndex({ data }: Props) {
  const [archive, setArchive] = useState(false);
  return (
    <div className="container page-space">
      <PageHeader
        eyebrow="Bekervoetbal"
        title="Toernooien"
        intro="Van de eerste loting tot de laatste treffer."
      />
      <div className="segmented">
        <button className={!archive ? "active" : ""} onClick={() => setArchive(false)}>
          Actueel
        </button>
        <button className={archive ? "active" : ""} onClick={() => setArchive(true)}>
          Archief
        </button>
      </div>
      {archive ? (
        <Card>
          <EmptyState
            title="Seizoen 2025–2026"
            detail="Bekijk de winnaars en records in het historiearchief."
          />
          <Link className="button button--outline" href="/historie">
            Naar historie
          </Link>
        </Card>
      ) : (
        <div className="tournament-grid">
          {data.tournaments.map((tournament, index) => (
            <Link
              className="tournament-card"
              href={index === 0 ? "/toernooien/sir-winston-cup" : "/wedstrijden"}
              key={tournament.id}
            >
              <span>
                <Trophy />
              </span>
              <p className="eyebrow">{tournament.season}</p>
              <h2>{tournament.name}</h2>
              <p>
                {tournament.teamIds.length} teams · {tournament.status.replaceAll("_", " ")}
              </p>
              <div className="progress">
                <i style={{ width: index === 0 ? "50%" : "75%" }} />
              </div>
              <strong>
                Bekijk toernooi <ChevronRight size={17} />
              </strong>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentView(props: Props) {
  const { path, data } = props;
  const active = path.split("/").at(-1) ?? "sir-winston-cup";
  const tabs = [
    ["/toernooien/sir-winston-cup", "Overzicht"],
    ["/toernooien/sir-winston-cup/programma", "Programma"],
    ["/toernooien/sir-winston-cup/bracket", "Bracket"],
    ["/toernooien/sir-winston-cup/teams", "Teams"],
    ["/toernooien/sir-winston-cup/statistieken", "Statistieken"],
    ["/toernooien/sir-winston-cup/nieuws", "Nieuws"],
    ["/toernooien/sir-winston-cup/reglement", "Reglement"],
  ];
  return (
    <>
      <section className="tournament-hero">
        <div className="container tournament-hero__grid">
          <div>
            <p className="eyebrow eyebrow--light">2026–2027 · senioren</p>
            <h1>Sir Winston Cup</h1>
            <p>Acht clubs. Zeven wedstrijden. Eén regionale beker.</p>
          </div>
          <div className="trophy-image">
            <Image
              src="/media/tournament-trophy.png"
              fill
              alt="Synthetische zilveren beker met groene en gele linten"
              loading="eager"
            />
          </div>
        </div>
      </section>
      <div className="tournament-tabs">
        <div className="container">
          {tabs.map(([href, label]) => (
            <Link className={path === href ? "active" : ""} key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="container page-space page-space--tight">
        {active === "bracket" ? (
          <BracketView data={data} />
        ) : active === "programma" ? (
          <MatchesView {...props} embedded />
        ) : active === "teams" ? (
          <div className="club-grid">
            {data.tournaments[0].teamIds.map((id) => {
              const { team, club } = teamDetails(data, id);
              return (
                <Card key={id}>
                  <ClubCrest club={club} size="lg" />
                  <h2>{team?.name}</h2>
                  <p>{club?.venue}</p>
                  <Link
                    className="text-link"
                    href={club?.id === "club_duindorp" ? "/clubs/duindorp-sv" : "/clubs"}
                  >
                    Bekijk club <ChevronRight size={16} />
                  </Link>
                </Card>
              );
            })}
          </div>
        ) : active === "statistieken" ? (
          <StatisticsView />
        ) : active === "nieuws" ? (
          <NewsView {...props} />
        ) : active === "reglement" ? (
          <RulesView data={data} />
        ) : (
          <TournamentOverview data={data} />
        )}
      </div>
    </>
  );
}

function TournamentOverview({ data }: { data: AppData }) {
  return (
    <>
      <PageHeader
        eyebrow="Kwartfinales"
        title="De weg naar de finale"
        intro="Alle wedstrijddata en bracketposities komen uit één gedeelde bron."
      />
      <div className="dashboard-grid">
        <Card title="Komende wedstrijd" className="span-7">
          <MatchRow match={data.matches.find((match) => match.id === "match_qf_1")!} data={data} />
        </Card>
        <Card title="Toernooivoortgang" className="span-5">
          <div className="road">
            <span className="done">
              8<small>Kwartfinale</small>
            </span>
            <span>
              4<small>Halve finale</small>
            </span>
            <span>
              2<small>Finale</small>
            </span>
          </div>
        </Card>
      </div>
      <BracketPreview data={data} />
    </>
  );
}

function BracketPreview({ data }: { data: AppData }) {
  const qfs = data.matches.filter((match) => match.round === "QUARTER_FINAL");
  const sfs = data.matches.filter((match) => match.round === "SEMI_FINAL");
  return (
    <div className="bracket-preview">
      <div>
        <strong>Kwartfinale</strong>
        {qfs.map((match) => (
          <BracketNode key={match.id} match={match} data={data} />
        ))}
      </div>
      <div>
        <strong>Halve finale</strong>
        {sfs.map((match) => (
          <BracketNode key={match.id} match={match} data={data} />
        ))}
      </div>
      <div>
        <strong>Finale</strong>
        <div className="bracket-node bracket-node--empty">Nog te bepalen</div>
      </div>
    </div>
  );
}

function BracketNode({ match, data }: { match: AppData["matches"][number]; data: AppData }) {
  const home = teamDetails(data, match.homeTeamId);
  const away = teamDetails(data, match.awayTeamId);
  return (
    <Link
      className="bracket-node"
      href={match.id === "match_qf_1" ? "/wedstrijden/quick-duindorp-sv" : "/wedstrijden"}
    >
      <span>
        <ClubCrest club={home.club} size="sm" />
        {home.team?.name ?? "Nog te bepalen"}
        <b>{match.score?.home ?? "–"}</b>
      </span>
      <span>
        <ClubCrest club={away.club} size="sm" />
        {away.team?.name ?? "Nog te bepalen"}
        <b>{match.score?.away ?? "–"}</b>
      </span>
      {match.official ? <small>✓ Officieel</small> : null}
    </Link>
  );
}

function BracketView({ data }: { data: AppData }) {
  const [round, setRound] = useState(0);
  const rounds = [
    {
      name: "Kwartfinale",
      matches: data.matches.filter((match) => match.round === "QUARTER_FINAL"),
    },
    { name: "Halve finale", matches: data.matches.filter((match) => match.round === "SEMI_FINAL") },
    { name: "Finale", matches: [] },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Tournament Arena"
        title="Knock-outschema"
        intro="Alleen een officiële uitslag vult de volgende ronde."
      />
      <div className="mobile-round-controls">
        <Button
          className="button--outline"
          disabled={round === 0}
          onClick={() => setRound((value) => value - 1)}
          aria-label="Vorige ronde"
        >
          <ChevronLeft />
        </Button>
        <div>
          <strong>{rounds[round].name}</strong>
          <span>
            {round + 1} van {rounds.length}
          </span>
        </div>
        <Button
          className="button--outline"
          disabled={round === rounds.length - 1}
          onClick={() => setRound((value) => value + 1)}
          aria-label="Volgende ronde"
        >
          <ChevronRight />
        </Button>
      </div>
      <div className="desktop-bracket">
        <BracketPreview data={data} />
      </div>
      <div className="mobile-bracket">
        {rounds[round].matches.length ? (
          rounds[round].matches.map((match) => (
            <BracketNode key={match.id} match={match} data={data} />
          ))
        ) : (
          <EmptyState
            title="Finalisten nog niet bekend"
            detail="De officiële halvefinale-uitslagen vullen deze ronde."
          />
        )}
      </div>
      <details className="accessible-bracket">
        <summary>Toon toegankelijke lijstweergave</summary>
        <table>
          <caption>Knock-outwedstrijden Sir Winston Cup</caption>
          <thead>
            <tr>
              <th>Ronde</th>
              <th>Wedstrijd</th>
              <th>Stand</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.matches
              .filter((match) => match.tournamentId === "tournament_swc_2026")
              .map((match) => (
                <tr key={match.id}>
                  <td>{match.round}</td>
                  <td>
                    <Link
                      href={
                        match.id === "match_qf_1"
                          ? "/wedstrijden/quick-duindorp-sv"
                          : "/wedstrijden"
                      }
                    >
                      {teamDetails(data, match.homeTeamId).team?.name ?? "TBD"} –{" "}
                      {teamDetails(data, match.awayTeamId).team?.name ?? "TBD"}
                    </Link>
                  </td>
                  <td>{match.score ? `${match.score.home}–${match.score.away}` : "–"}</td>
                  <td>{match.official ? "Officieel" : match.status}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

function MatchesView({ data, embedded = false }: Props & { embedded?: boolean }) {
  const [status, setStatus] = useState("Alles");
  const [date, setDate] = useState("");
  const filtered = data.matches.filter(
    (match) =>
      (!date || match.kickoff.startsWith(date)) &&
      (status === "Alles" ||
        (status === "Afgelopen"
          ? match.official
          : status === "Live"
            ? match.status === "LIVE"
            : !match.official && match.status !== "LIVE")),
  );
  return (
    <div className={embedded ? "" : "container page-space"}>
      {!embedded ? (
        <PageHeader
          eyebrow="Wedstrijdkalender"
          title="Wedstrijden"
          intro="Programma, live duels en officiële uitslagen."
        />
      ) : (
        <PageHeader title="Programma & uitslagen" />
      )}
      <div className="filter-bar">
        <div className="segmented">
          {["Alles", "Komend", "Live", "Afgelopen"].map((item) => (
            <button
              key={item}
              className={status === item ? "active" : ""}
              onClick={() => setStatus(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <label>
          <span>Datum</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>
      <Card>
        {filtered.map((match) => (
          <MatchRow key={match.id} match={match} data={data} />
        ))}
      </Card>
    </div>
  );
}

function MatchCentre({ data, action, busy }: Props) {
  const [tab, setTab] = useState("Tijdlijn");
  const [feedback, setFeedback] = useState("");
  const match = data.matches.find((item) => item.id === "match_qf_1")!;
  const home = teamDetails(data, match.homeTeamId);
  const away = teamDetails(data, match.awayTeamId);
  const publicStatus =
    match.status === "STOPPED"
      ? "GESTAAKT · 71′"
      : match.official
        ? "✓ OFFICIEEL"
        : match.status === "FINISHED_PROVISIONAL"
          ? "VOORLOPIG"
          : match.status;
  const events = [...data.runtime.matchEvents]
    .filter((event) => event.matchId === match.id && !event.corrected)
    .sort((a, b) => a.minute - b.minute)
    .map((event, index, orderedEvents) => {
      const eventsThroughCurrent = orderedEvents.slice(0, index + 1);
      const runningHome = eventsThroughCurrent.filter(
        (item) => item.type === "GOAL" && item.teamId === match.homeTeamId,
      ).length;
      const runningAway = eventsThroughCurrent.filter(
        (item) => item.type === "GOAL" && item.teamId === match.awayTeamId,
      ).length;
      return {
        ...event,
        label: `${event.type === "GOAL" ? "Doelpunt" : event.type === "YELLOW" ? "Gele kaart" : event.type === "RED" ? "Rode kaart" : event.type.replaceAll("_", " ")} ${event.teamId === match.homeTeamId ? "Quick" : event.teamId === match.awayTeamId ? "Duindorp SV" : ""}`,
        score: event.type === "GOAL" ? `${runningHome}–${runningAway}` : "",
      };
    });
  const copy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setFeedback("Link gekopieerd");
  };
  return (
    <>
      <section className="match-centre-hero">
        <Image
          src="/media/matchday-live.png"
          fill
          alt="Synthetische avondwedstrijd op Nieuw Hanenburg"
          loading="eager"
        />
        <div className="match-centre-hero__veil" />
        <div className="container match-centre-score">
          <p className="eyebrow eyebrow--light">Sir Winston Cup · kwartfinale</p>
          <StatusBadge status={publicStatus} />
          <div className="score-geometry">
            <span>
              <ClubCrest club={home.club} size="lg" />
              <strong>{home.team?.name}</strong>
            </span>
            <div>
              <MatchScore match={match} />
              <small>{match.minute ? `${match.minute}′` : "Zaterdag · 20:00"}</small>
            </div>
            <span>
              <ClubCrest club={away.club} size="lg" />
              <strong>{away.team?.name}</strong>
            </span>
          </div>
          <div className="match-actions">
            <Button
              className="button--lime"
              busy={busy === "follow"}
              onClick={() => action("follow", { id: "match_qf_1" }, "Wedstrijd gevolgd.")}
            >
              <Heart size={17} /> Volg
            </Button>
            <Button className="button--ghost-light" onClick={copy}>
              <Copy size={17} /> Kopieer
            </Button>
            <Button
              className="button--ghost-light"
              onClick={async () => {
                if (navigator.share) {
                  await navigator.share({
                    title: "Quick – Duindorp SV",
                    url: window.location.href,
                  });
                  setFeedback("Deelvenster geopend");
                } else {
                  await copy();
                }
              }}
            >
              <Share2 size={17} /> Deel
            </Button>
          </div>
          {feedback ? <p role="status">{feedback}</p> : null}
        </div>
      </section>
      <div className="match-tabs">
        <div className="container">
          {["Tijdlijn", "Opstellingen", "Statistieken", "Info", "Media"].map((item) => (
            <button
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="container page-space page-space--tight">
        <div className="match-layout">
          <Card title={tab}>
            {tab === "Tijdlijn" ? (
              match.status === "STOPPED" ? (
                <div className="notice notice--warning">
                  <ShieldCheck />
                  De wedstrijd is gestaakt. De toernooicommissie beoordeelt het verdere verloop.
                </div>
              ) : events.length ? (
                <ol className="timeline-list">
                  {events.map((event) => (
                    <li key={event.minute}>
                      <time>{event.minute}′</time>
                      <span>
                        {event.type === "GOAL"
                          ? "⚽"
                          : event.type === "YELLOW"
                            ? "🟨"
                            : event.type === "RED"
                              ? "🟥"
                              : "↔"}
                      </span>
                      <p>{event.label}</p>
                      <strong>{event.score}</strong>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState
                  title="De bal rolt nog niet"
                  detail="Live gebeurtenissen verschijnen hier zodra de wedstrijd start."
                />
              )
            ) : tab === "Opstellingen" ? (
              <EmptyState
                title="Opstellingen worden na vrijgave gepubliceerd"
                detail="Private identiteit- en controlegegevens blijven buiten de publieke route."
              />
            ) : tab === "Statistieken" ? (
              <div className="stats-grid">
                <span>
                  <b>{match.score ? 9 : 0}</b>Schoten
                </span>
                <span>
                  <b>{match.score ? 53 : 0}%</b>Balbezit Quick
                </span>
                <span>
                  <b>{match.score ? 5 : 0}</b>Hoekschoppen
                </span>
              </div>
            ) : tab === "Info" ? (
              <dl className="info-list">
                <div>
                  <dt>Aftrap</dt>
                  <dd>12 september 2026 · 20:00</dd>
                </div>
                <div>
                  <dt>Locatie</dt>
                  <dd>
                    {match.venue} · {match.field}
                  </dd>
                </div>
                <div>
                  <dt>Scheidsrechter</dt>
                  <dd>Demo Scheidsrechter</dd>
                </div>
                <div>
                  <dt>Regel</dt>
                  <dd>
                    {data.runtime.rules.halves} × {data.runtime.rules.halfDurationMinutes} minuten ·{" "}
                    {data.runtime.rules.extraTimeRounds.includes(match.round)
                      ? `${data.runtime.rules.finalExtraTimeMinutes} minuten verlenging`
                      : "direct strafschoppen bij gelijkspel"}
                  </dd>
                </div>
              </dl>
            ) : (
              <EmptyState
                title="Nog geen wedstrijdmedia"
                detail="Goedgekeurde beelden verschijnen hier na moderatie."
              />
            )}
          </Card>
          <aside>
            <Card title="Wedstrijdinformatie">
              <p>
                <MapPin size={17} /> {match.venue}
              </p>
              <p>
                <CalendarDays size={17} /> Zaterdag 12 september
              </p>
              <p>
                <Clock3 size={17} /> 20:00
              </p>
            </Card>
            <Card title="Volgende ronde">
              <p>De winnaar speelt tegen RKAVV.</p>
              <Link className="text-link" href="/toernooien/sir-winston-cup/bracket">
                Bekijk bracket <ChevronRight size={16} />
              </Link>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

function ClubsView({ data, action, busy }: Props) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("Alle regio’s");
  const clubs = data.clubs.filter(
    (club) =>
      club.name.toLowerCase().includes(query.toLowerCase()) &&
      (region === "Alle regio’s" || club.region === region),
  );
  return (
    <div className="container page-space">
      <PageHeader
        eyebrow="Football Network"
        title="Clubs van de regio"
        intro="Ontdek het programma, de verhalen en de mensen rondom de velden."
      />
      <div className="filter-bar">
        <label>
          <span>Zoek club</span>
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Bijvoorbeeld Duindorp SV"
          />
        </label>
        <label>
          <span>Regio</span>
          <Filter size={17} />
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            <option>Alle regio’s</option>
            {[...new Set(data.clubs.map((club) => club.region))].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      {clubs.length ? (
        <div className="club-grid">
          {clubs.map((club) => (
            <Card key={club.id}>
              <div className="club-card__top">
                <ClubCrest club={club} size="lg" />
                <Button
                  className="button--icon"
                  busy={busy === "follow"}
                  onClick={() => action("follow", { id: club.id })}
                  aria-label={`${data.runtime.favorites.includes(club.id) ? "Ontvolg" : "Volg"} ${club.name}`}
                >
                  <Heart
                    fill={data.runtime.favorites.includes(club.id) ? "currentColor" : "none"}
                    size={18}
                  />
                </Button>
              </div>
              <p className="eyebrow">{club.region}</p>
              <h2>{club.name}</h2>
              <p>
                <MapPin size={16} /> {club.venue}
              </p>
              <p className="club-card__next">Volgende: zaterdag · 20:00</p>
              <Link
                className="text-link"
                href={club.id === "club_duindorp" ? "/clubs/duindorp-sv" : "/wedstrijden"}
              >
                Bekijk club <ChevronRight size={16} />
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Geen clubs gevonden" detail="Wis de filters om opnieuw te beginnen." />
      )}
    </div>
  );
}

function ClubDetail({ data, action, busy }: Props) {
  const club = data.clubs.find((item) => item.id === "club_duindorp")!;
  return (
    <>
      <section className="club-hero">
        <Image
          src="/media/community-night.png"
          fill
          alt="Synthetische supporters bij een regionale voetbalclub"
          loading="eager"
        />
        <div className="club-hero__veil" />
        <div className="container">
          <ClubCrest club={club} size="lg" />
          <p className="eyebrow eyebrow--light">Den Haag · sinds 1920</p>
          <h1>Duindorp SV</h1>
          <p>Voetbal aan de kust, gedragen door de buurt.</p>
          <Button
            className="button--lime"
            busy={busy === "follow"}
            onClick={() =>
              action(
                "follow",
                { id: club.id },
                data.runtime.favorites.includes(club.id) ? "Club ontvolgd." : "Club gevolgd.",
              )
            }
          >
            <Heart size={17} /> {data.runtime.favorites.includes(club.id) ? "Volgend" : "Volg club"}
          </Button>
        </div>
      </section>
      <div className="container page-space">
        <div className="dashboard-grid">
          <Card title="Volgende wedstrijd" className="span-7">
            <MatchRow
              match={data.matches.find((match) => match.id === "match_qf_1")!}
              data={data}
            />
          </Card>
          <Card title="Clubprofiel" className="span-5">
            <p>
              <MapPin size={17} /> {club.venue}
            </p>
            <p>1 actief toernooiteam</p>
            <StatusBadge status="Contactgegevens afgeschermd" />
          </Card>
        </div>
        <section className="section-block">
          <div className="section-heading">
            <h2>Nieuws uit Duindorp</h2>
            <Link href="/nieuws">Meer nieuws</Link>
          </div>
          <div className="story-grid">
            <article className="story-card story-card--lead">
              <div className="story-card__image">
                <Image src="/media/community-night.png" fill alt="Supporters langs het veld" />
              </div>
              <p className="eyebrow">Clubleven</p>
              <h3>De buurt staat zaterdag weer langs de lijn</h3>
              <p>Een avond waarop sportpark en wijk samenkomen.</p>
            </article>
          </div>
        </section>
      </div>
    </>
  );
}

function MediaView({ path, data, action, busy }: Props) {
  const [type, setType] = useState("Alles");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(true);
  const [articles, setArticles] = useState(true);
  const [social, setSocial] = useState(false);
  if (path !== "/media")
    return (
      <div className="container page-space">
        <PageHeader
          eyebrow="Media"
          title="Het moment vóór de treffer"
          intro="Synthetisch demobeeld · OpenAI ImageGen"
        />
        <div className="media-detail">
          <Image src="/media/matchday-live.png" fill alt="Synthetische wedstrijdactie" />
        </div>
        <dl className="info-list">
          <div>
            <dt>Wedstrijd</dt>
            <dd>Quick – Duindorp SV</dd>
          </div>
          <div>
            <dt>Rechten</dt>
            <dd>Lokale TournamentOS-demo</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>Redactioneel goedgekeurd</dd>
          </div>
        </dl>
      </div>
    );
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await action(
      "submit-media",
      {
        name,
        consent,
        matchId: "match_qf_1",
        clubId: "club_duindorp",
        website,
        articles,
        social,
        credit: "Community-inzender",
      },
      "Upload staat veilig in moderatie.",
    );
    setName("");
    setConsent(false);
  };
  return (
    <div className="container page-space">
      <PageHeader
        eyebrow="Beeldbank"
        title="Media uit Haaglanden"
        intro="Fotografie, video en communitybijdragen met duidelijke rechten en moderatie."
      />
      <div className="segmented">
        {["Alles", "Foto", "Video"].map((item) => (
          <button
            className={type === item ? "active" : ""}
            key={item}
            onClick={() => setType(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="editorial-media-grid">
        <Link href="/media/matchday-live" className="media-tile media-tile--large">
          <Image src="/media/matchday-live.png" fill alt="Synthetische avondwedstrijd" />
          <span>Foto · Quick – Duindorp SV</span>
        </Link>
        {type !== "Video" ? (
          <Link href="/media/community-night" className="media-tile">
            <Image
              src="/media/community-night.png"
              fill
              alt="Synthetische supporters langs het veld"
            />
            <span>Foto · Langs de lijn</span>
          </Link>
        ) : null}
        <Link href="/media/goal-van-de-ronde" className="media-tile">
          <Image src="/media/matchday-live.png" fill alt="Videominiatuur van fictief doelpunt" />
          <span>
            <Play size={18} /> Video · Goal van de ronde
          </span>
        </Link>
      </div>
      <Card title="Communitybeeld insturen">
        <form className="upload-form" onSubmit={submit}>
          <label>
            <span>Bestandsnaam</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="bijvoorbeeld sfeer-houtrust.jpg"
              required
              minLength={2}
            />
          </label>
          <label className="file-control">
            <Upload size={20} />
            <span>Kies foto of video</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4"
              onChange={(event) => setName(event.target.files?.[0]?.name ?? "")}
            />
          </label>
          <label className="check-control">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              required
            />
            <span>
              Ik geef toestemming voor redactionele beoordeling en bevestig dat ik de rechten heb.
            </span>
          </label>
          <fieldset className="rights-fieldset">
            <legend>Haaglanden Voetbal mag dit gebruiken voor</legend>
            <label className="check-control">
              <input
                type="checkbox"
                checked={website}
                onChange={(event) => setWebsite(event.target.checked)}
              />
              <span>Website en wedstrijdpagina</span>
            </label>
            <label className="check-control">
              <input
                type="checkbox"
                checked={articles}
                onChange={(event) => setArticles(event.target.checked)}
              />
              <span>Nieuwsartikelen</span>
            </label>
            <label className="check-control">
              <input
                type="checkbox"
                checked={social}
                onChange={(event) => setSocial(event.target.checked)}
              />
              <span>Social media</span>
            </label>
          </fieldset>
          <Button
            busy={busy === "submit-media"}
            disabled={!consent || (!website && !articles && !social)}
          >
            Verstuur voor moderatie
          </Button>
          <p className="form-help">
            Bestanden worden in deze demo niet publiek als identiteitsmateriaal opgeslagen.
          </p>
        </form>
        {data.runtime.mediaSubmissions.map((item) => (
          <p className="submission-row" key={item.id}>
            <Check size={16} />
            {item.name}
            <StatusBadge status="IN MODERATIE" />
          </p>
        ))}
      </Card>
    </div>
  );
}

function SearchView({ data }: Props) {
  const [query, setQuery] = useState("");
  const clubs =
    query.length > 1
      ? data.clubs.filter((club) => club.name.toLowerCase().includes(query.toLowerCase()))
      : [];
  const news =
    query.length > 1
      ? stories.filter((story) => story.title.toLowerCase().includes(query.toLowerCase()))
      : [];
  return (
    <div className="container page-space">
      <PageHeader eyebrow="Doorzoek TournamentOS" title="Zoeken" />
      <label className="search-page-input">
        <Search />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoek club, wedstrijd of nieuws"
        />
      </label>
      {query.length < 2 ? (
        <EmptyState
          title="Waar ben je naar op zoek?"
          detail="Typ minimaal twee tekens om gegroepeerde resultaten te zien."
        />
      ) : clubs.length + news.length ? (
        <div className="search-results">
          <Card title={`Clubs (${clubs.length})`}>
            {clubs.map((club) => (
              <Link
                key={club.id}
                href={club.id === "club_duindorp" ? "/clubs/duindorp-sv" : "/clubs"}
              >
                <ClubCrest club={club} size="sm" />
                {club.name}
                <ChevronRight />
              </Link>
            ))}
          </Card>
          <Card title={`Nieuws (${news.length})`}>
            {news.map((story) => (
              <Link key={story.slug} href={`/nieuws/${story.slug}`}>
                {story.title}
                <ChevronRight />
              </Link>
            ))}
          </Card>
        </div>
      ) : (
        <EmptyState title="Geen resultaten" detail={`We vonden niets voor “${query}”.`} />
      )}
    </div>
  );
}

function NotificationsView({ data, action, busy }: Props) {
  const [filter, setFilter] = useState("Alles");
  const items = data.runtime.notifications.filter(
    (item) => filter === "Alles" || (filter === "Ongelezen" && !item.read),
  );
  return (
    <div className="container page-space narrow-page">
      <PageHeader eyebrow="Persoonlijk" title="Meldingen" />
      <div className="segmented">
        <button className={filter === "Alles" ? "active" : ""} onClick={() => setFilter("Alles")}>
          Alles
        </button>
        <button
          className={filter === "Ongelezen" ? "active" : ""}
          onClick={() => setFilter("Ongelezen")}
        >
          Ongelezen
        </button>
      </div>
      <div className="notification-list">
        {items.length ? (
          items.map((item) => (
            <Card
              className={item.read ? "notification notification--read" : "notification"}
              key={item.id}
            >
              <Bell size={20} />
              <div>
                <h2>{item.title}</h2>
                <p>{item.detail}</p>
                <Link href={item.href}>Open taak</Link>
              </div>
              {!item.read ? (
                <Button
                  className="button--outline"
                  busy={busy === "mark-read"}
                  onClick={() =>
                    action("mark-read", { id: item.id }, "Melding gemarkeerd als gelezen.")
                  }
                >
                  Markeer gelezen
                </Button>
              ) : (
                <StatusBadge status="Gelezen" />
              )}
            </Card>
          ))
        ) : (
          <EmptyState title="Alles bijgewerkt" detail="Er zijn geen ongelezen meldingen." />
        )}
      </div>
    </div>
  );
}

function NextView({ path, data, action, busy }: Props) {
  const match = data.matches.find((item) => item.id === "match_qf_1")!;
  if (path === "/next/favorieten")
    return (
      <div className="container page-space">
        <PageHeader eyebrow="HV Next" title="Favorieten" />
        <div className="club-grid">
          {data.clubs.slice(0, 6).map((club) => (
            <Card key={club.id}>
              <ClubCrest club={club} size="lg" />
              <h2>{club.name}</h2>
              <Button busy={busy === "follow"} onClick={() => action("follow", { id: club.id })}>
                <Heart size={17} />
                {data.runtime.favorites.includes(club.id) ? "Ontvolg" : "Volg"}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    );
  if (path === "/next/meldingen")
    return (
      <NotificationsView
        path="/meldingen"
        data={data}
        role="supporter"
        action={action}
        busy={busy}
        switchRole={async () => {}}
      />
    );
  if (path === "/next/instellingen")
    return <SettingsView data={data} action={action} busy={busy} />;
  return (
    <div className="next-page">
      <div className="container page-space">
        <PageHeader
          eyebrow="Goedemorgen"
          title="Jouw Haaglanden"
          intro="Alles wat nu telt, zonder ruis."
          actions={
            <Link className="button button--outline" href="/next/instellingen">
              Instellingen
            </Link>
          }
        />
        <div className="next-grid">
          <Card className="next-live span-7">
            <StatusBadge status={match.official ? "OFFICIEEL" : match.status} />
            <div className="featured-score">
              <span>
                <ClubCrest club={teamDetails(data, match.homeTeamId).club} />
                <strong>Quick</strong>
              </span>
              <div>
                <MatchScore match={match} />
              </div>
              <span>
                <ClubCrest club={teamDetails(data, match.awayTeamId).club} />
                <strong>Duindorp SV</strong>
              </span>
            </div>
            <Link className="button button--lime" href="/wedstrijden/quick-duindorp-sv">
              Open Match Centre
            </Link>
          </Card>
          <Card className="span-5 next-task" title="Volgende actie">
            <span className="task-number">01</span>
            <h2>De kwartfinale volgen</h2>
            <p>12 september · 20:00 · Nieuw Hanenburg</p>
            <Link className="text-link" href="/meldingen">
              Bekijk meldingen <ChevronRight size={16} />
            </Link>
          </Card>
          <Card className="span-4" title="Jouw club">
            <ClubCrest club={data.clubs.find((club) => club.id === "club_duindorp")} />
            <h3>Duindorp SV</h3>
            <Link href="/clubs/duindorp-sv">Open club</Link>
          </Card>
          <Card className="span-4" title="Toernooivoortgang">
            <div className="road road--compact">
              <span className="done">8</span>
              <span>4</span>
              <span>2</span>
            </div>
            <Link href="/toernooien/sir-winston-cup/bracket">Bekijk bracket</Link>
          </Card>
          <Card className="span-4" title="Nieuwe meldingen">
            <strong className="big-number">
              {data.runtime.notifications.filter((item) => !item.read).length}
            </strong>
            <Link href="/next/meldingen">Naar meldingen</Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ data, action, busy }: Pick<Props, "data" | "action" | "busy">) {
  return (
    <div className="container page-space narrow-page">
      <PageHeader
        eyebrow="HV Next"
        title="Instellingen"
        intro="Voorkeuren blijven bewaard in de lokale demostaat."
      />
      <Card title="Meldingen">
        <div className="setting-list">
          {(["match", "news", "club"] as const).map((key) => (
            <label key={key}>
              <span>
                <strong>
                  {key === "match" ? "Wedstrijden" : key === "news" ? "Nieuws" : "Clubs"}
                </strong>
                <small>Ontvang relevante updates</small>
              </span>
              <input
                type="checkbox"
                checked={data.runtime.notificationSettings[key]}
                disabled={busy === "preference"}
                onChange={(event) =>
                  action("preference", { key, value: event.target.checked }, "Voorkeur bijgewerkt.")
                }
              />
            </label>
          ))}
        </div>
      </Card>
      <Card title="Privacy">
        <p>
          Publieke favorieten staan los van operationele spelersgegevens. Geboortedata,
          pasfoto-controles en interne notities zijn hier niet beschikbaar.
        </p>
        <StatusBadge status="Privacy actief" />
      </Card>
      <Card title="PWA-status">
        <p>
          Deze demo bevat een installatiemanifest en app-kleuren. Installatie hangt af van browser
          en beveiligde context.
        </p>
        <StatusBadge
          status={
            data.runtime.pushPermission === "ENABLED"
              ? "PUSH INGESCHAKELD"
              : data.runtime.pushPermission
          }
        />
        <div className="button-row">
          <Button
            busy={busy === "set-push"}
            disabled={data.runtime.pushPermission === "ENABLED"}
            onClick={() =>
              action("set-push", { permission: "ENABLED" }, "Gesimuleerde pushstatus ingeschakeld.")
            }
          >
            Push inschakelen
          </Button>
          <Button
            className="button--outline"
            busy={busy === "set-push"}
            disabled={data.runtime.pushPermission === "DENIED"}
            onClick={() =>
              action("set-push", { permission: "DENIED" }, "Pushmeldingen uitgeschakeld.")
            }
          >
            Niet toestaan
          </Button>
        </div>
        <p className="form-help">
          De demo bewaart de toestemmingsstatus; externe browserpush wordt niet verzonden.
        </p>
      </Card>
    </div>
  );
}

function LoginView({ switchRole, busy, action }: Props) {
  const roles: Array<{ role: Role; title: string; href: string }> = [
    { role: "supporter", title: "Supporter · HV Next", href: "/next" },
    { role: "leadership", title: "Toernooileiding", href: "/beheer/toernooileiding" },
    { role: "matchops", title: "Wedstrijdleiding", href: "/beheer/wedstrijdleiding" },
    { role: "association", title: "Verenigingsmanager", href: "/beheer/vereniging" },
    { role: "team", title: "Teammanager", href: "/beheer/team" },
    { role: "referee", title: "Scheidsrechter", href: "/beheer/scheidsrechter" },
    { role: "press", title: "Pers / Redactie", href: "/beheer/pers" },
    { role: "photographer", title: "Fotograaf", href: "/beheer/fotograaf" },
  ];
  return (
    <div className="login-page">
      <div className="container login-grid">
        <div>
          <p className="eyebrow eyebrow--light">Veilige reviewomgeving</p>
          <h1>Kies je demo-rol</h1>
          <p>
            Elke rol krijgt een eigen server-gecontroleerde scope. Dit is geen
            productie-authenticatie.
          </p>
          <div className="role-entry-grid">
            {roles.map((item) => (
              <Button
                className="role-entry"
                busy={busy === "switch-role"}
                key={item.role}
                onClick={() => switchRole(item.role, item.href)}
              >
                <ShieldCheck />
                <span>
                  <strong>{item.title}</strong>
                  <small>Open afgeschermde demo</small>
                </span>
                <ChevronRight />
              </Button>
            ))}
          </div>
          <Button
            className="button--outline-light"
            busy={busy === "reset-demo"}
            onClick={() => {
              if (
                window.confirm(
                  "Weet je zeker dat je de volledige gouden demostaat wilt herstellen?",
                )
              )
                action("reset-demo", {}, "Demo volledig hersteld.");
            }}
          >
            Demo resetten
          </Button>
        </div>
        <div className="login-image">
          <Image src="/media/tournament-trophy.png" fill alt="Synthetische toernooibeker" />
        </div>
      </div>
    </div>
  );
}

function PlayerPublicView() {
  return (
    <div className="container page-space narrow-page">
      <PageHeader
        eyebrow="Spelersprofiel"
        title="Geen openbaar spelersprofiel beschikbaar"
        intro="Persoons- en jeugdgegevens worden alleen gepubliceerd met een geldige grondslag."
      />
      <Card>
        <ShieldCheck size={34} />
        <h2>Privacyfallback actief</h2>
        <p>
          Bekijk teamstatistieken en wedstrijduitslagen zonder private identiteit te ontsluiten.
        </p>
        <Link className="button" href="/toernooien/sir-winston-cup/statistieken">
          Naar statistieken
        </Link>
      </Card>
    </div>
  );
}
function StatisticsView() {
  return (
    <>
      <PageHeader eyebrow="Toernooi" title="Statistieken" />
      <div className="leaderboard">
        <Card title="Topscorers">
          <ol>
            <li>
              <PlayerPhoto name="Daan van Meer" size="sm" />
              <span>
                Daan van Meer<small>Quick</small>
              </span>
              <b>7</b>
            </li>
            <li>
              <PlayerPhoto name="Rayan de Groot" size="sm" />
              <span>
                Rayan de Groot<small>RKAVV</small>
              </span>
              <b>5</b>
            </li>
          </ol>
        </Card>
        <Card title="Teamvorm">
          <p>
            Quick <strong>W · W · G · W</strong>
          </p>
          <p>
            Duindorp SV <strong>W · V · W · W</strong>
          </p>
        </Card>
      </div>
    </>
  );
}
function RulesView({ data }: { data: AppData }) {
  const [open, setOpen] = useState(0);
  const [query, setQuery] = useState("");
  const rules = ["Wedstrijdduur", "Gelijke stand", "Dispensaties", "Tucht"].filter((item) =>
    item.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow={`Versie ${data.runtime.rules.version} · geldig vanaf ${data.runtime.rules.effectiveFrom}`}
        title="Toernooireglement"
        intro="Doorzoekbare kernregels met een duidelijke ingangsdatum."
      />
      <label className="search-page-input">
        <Search />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoek in het reglement"
        />
      </label>
      {rules.map((item, index) => (
        <section className="accordion" key={item}>
          <button
            onClick={() => setOpen(open === index ? -1 : index)}
            aria-expanded={open === index}
          >
            <strong>
              {index + 1}. {item}
            </strong>
            <ChevronRight />
          </button>
          {open === index ? (
            <p>
              {item === "Wedstrijdduur"
                ? `De wedstrijd bestaat uit ${data.runtime.rules.halves} helften van ${data.runtime.rules.halfDurationMinutes} minuten in spelvorm ${data.runtime.rules.format}.`
                : item === "Gelijke stand"
                  ? data.runtime.rules.extraTimeRounds.includes("FINAL")
                    ? `In de finale volgt ${data.runtime.rules.finalExtraTimeMinutes} minuten verlenging; daarna strafschoppen.`
                    : "Bij een gelijke stand volgen direct strafschoppen."
                  : item === "Dispensaties"
                    ? `Maximaal ${data.runtime.rules.maxDispensations} dispensatiespelers per selectie.`
                    : `Na ${data.runtime.rules.yellowCardsForSuspension} gele kaarten volgt een automatische selectiewaarschuwing.`}
            </p>
          ) : null}
        </section>
      ))}
      {!rules.length ? (
        <EmptyState title="Geen regel gevonden" detail="Probeer een andere zoekterm." />
      ) : null}
    </>
  );
}
function HistoryView() {
  return (
    <div className="container page-space">
      <PageHeader
        eyebrow="Sinds 2019"
        title="Bekerhistorie"
        intro="Winnaars, records en de momenten die de regio vormen."
      />
      <div className="history-grid">
        <div className="history-trophy">
          <Image
            src="/media/tournament-trophy.png"
            fill
            alt="Synthetische zilveren toernooibeker"
          />
        </div>
        <Card title="Winnaars">
          <ol className="winners">
            <li>
              <b>2026</b>
              <span>HVV</span>
            </li>
            <li>
              <b>2025</b>
              <span>RKAVV</span>
            </li>
            <li>
              <b>2024</b>
              <span>Quick</span>
            </li>
            <li>
              <b>2023</b>
              <span>Duindorp SV</span>
            </li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
function FinalDayView({ data }: Props) {
  return (
    <>
      <section className="final-day-hero">
        <Image
          src="/media/tournament-trophy.png"
          fill
          alt="Synthetische zilveren beker bij een regionaal voetbalveld"
        />
        <div className="container">
          <p className="eyebrow eyebrow--light">Finaledag · 12 juni 2027</p>
          <h1>
            Vier finales.
            <br />
            Eén locatie.
          </h1>
          <p>Het slotstuk van het Haaglanden-bekerseizoen.</p>
          <Link className="button button--lime" href="/toernooien/sir-winston-cup/bracket">
            Volg de route
          </Link>
        </div>
      </section>
      <div className="container page-space">
        <PageHeader title="Finaleprogramma" />
        <Card>
          <EmptyState
            title="Finalisten nog niet bekend"
            detail="Officiële resultaten vullen het programma automatisch."
          />
          <MatchRow match={data.matches.find((match) => match.id === "match_sf_2")!} data={data} />
        </Card>
      </div>
    </>
  );
}
