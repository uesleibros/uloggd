import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  Compass,
  Gamepad2,
  Globe2,
  HomeIcon,
  LibraryBig,
  ListPlus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { getPopularGames } from "@/lib/igdb";
import { getDictionary, hasLocale } from "./dictionaries";

const iconMap = {
  home: HomeIcon,
  compass: Compass,
  library: LibraryBig,
  star: Star,
  user: UserRound,
};

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [d, games] = await Promise.all([
    getDictionary(lang),
    getPopularGames(),
  ]);
  const [featured, ...catalog] = games;
  const otherLocale = lang === "pt-BR" ? "en" : "pt-BR";
  const nav = [
    ["home", d.nav.home],
    ["compass", d.nav.explore],
    ["library", d.nav.library],
    ["star", d.nav.reviews],
    ["user", d.nav.profile],
  ] as const;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand lang={lang} />
          <span className="product-stage">beta</span>
        </div>
        <nav className="main-nav" aria-label="Principal">
          <span className="nav-label">Navegação</span>
          {nav.map(([icon, label], index) => {
            const NavIcon = iconMap[icon];
            return (
              <Link
                key={label}
                href={`/${lang}`}
                aria-current={index === 0 ? "page" : undefined}
              >
                <NavIcon size={20} />
                <span>{label}</span>
                {index === 0 && <i />}
              </Link>
            );
          })}
        </nav>
        <button className="quick-log">
          <ListPlus size={19} />
          <span>{d.actions.addGame}</span>
          <kbd>+</kbd>
        </button>
        <div className="sidebar-bottom">
          <Link href={`/${lang}/legal/child-safety`}>
            <ShieldCheck size={19} />
            <span>{d.legal.safety}</span>
          </Link>
          <Link href={`/${otherLocale}`}>
            <Globe2 size={19} />
            <span>{otherLocale === "en" ? "English" : "Português"}</span>
          </Link>
          <Link href={`/${lang}`}>
            <Settings size={19} />
            <span>{d.nav.settings}</span>
          </Link>
          <button className="account-button">
            <div className="avatar">U</div>
            <div>
              <strong>Entrar</strong>
              <small>Sincronize sua jornada</small>
            </div>
            <ArrowUpRight size={16} />
          </button>
        </div>
      </aside>

      <main className="feed">
        <header className="mobile-header">
          <MobileSidebar
            lang={lang}
            otherLocale={otherLocale}
            labels={{
              menu: d.actions.menu,
              close: d.actions.close,
              home: d.nav.home,
              explore: d.nav.explore,
              library: d.nav.library,
              reviews: d.nav.reviews,
              profile: d.nav.profile,
              settings: d.nav.settings,
              safety: d.legal.safety,
            }}
          />
          <Brand lang={lang} />
          <button aria-label="Buscar">
            <Search size={21} />
          </button>
        </header>

        <header className="feed-header">
          <div>
            <span>11 JUL · SÁBADO</span>
            <h1>O que vale jogar agora</h1>
          </div>
          <label className="feed-search">
            <Search size={17} />
            <input aria-label="Buscar jogos" placeholder="Buscar no catálogo" />
            <kbd>⌘ K</kbd>
          </label>
        </header>

        {featured && (
          <section className="featured-game">
            <Image
              src={featured.heroUrl ?? featured.coverUrl}
              alt=""
              fill
              priority
              sizes="720px"
              className="featured-backdrop"
            />
            <div className="featured-scrim" />
            <div className="featured-cover">
              <Image
                src={featured.coverUrl}
                alt={`Capa de ${featured.name}`}
                fill
                priority
                sizes="150px"
              />
            </div>
            <div className="featured-copy">
              <span className="eyebrow">
                <Sparkles size={13} /> Escolha da comunidade
              </span>
              <h2>{featured.name}</h2>
              <div className="featured-meta">
                <span>
                  <Star size={13} fill="currentColor" />
                  {featured.rating ?? "—"}
                </span>
                <span>{featured.releaseYear}</span>
                <span>{featured.genres.join(" · ")}</span>
              </div>
              <p>{featured.summary || d.home.subtitle}</p>
              <div className="featured-actions">
                <button>
                  <Gamepad2 size={17} />
                  Quero jogar
                </button>
                <button aria-label="Salvar">
                  <Bookmark size={18} />
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="library-section">
          <div className="section-heading">
            <div>
              <h2>Mais registrados</h2>
              <p>Jogos que continuam voltando às bibliotecas</p>
            </div>
            <Link href={`/${lang}`}>
              {d.actions.seeAll}
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="cover-shelf">
            {catalog.slice(0, 5).map((game, index) => (
              <article className="shelf-game" key={game.id}>
                <div className="shelf-cover">
                  <Image
                    src={game.coverUrl}
                    alt={`Capa de ${game.name}`}
                    fill
                    sizes="(max-width: 620px) 42vw, 120px"
                  />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <button aria-label={`Salvar ${game.name}`}>
                    <Bookmark size={15} />
                  </button>
                </div>
                <h3>{game.name}</h3>
                <p>
                  {game.releaseYear} · {game.genres[0]}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="explore-section">
          <div className="section-heading">
            <div>
              <h2>Talvez seja sua próxima aventura</h2>
              <p>Bem avaliados por milhares de jogadores</p>
            </div>
          </div>
          <div className="game-list">
            {catalog.slice(5, 9).map((game) => (
              <article className="game-list-row" key={game.id}>
                <div className="list-cover">
                  <Image src={game.coverUrl} alt="" fill sizes="48px" />
                </div>
                <div className="list-main">
                  <h3>{game.name}</h3>
                  <p>
                    {[game.releaseYear, ...game.genres]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="list-rating">
                  <Star size={12} fill="currentColor" />
                  <strong>{game.rating ?? "—"}</strong>
                  <span>{game.ratingCount.toLocaleString(lang)}</span>
                </div>
                <button aria-label={`Adicionar ${game.name}`}>
                  <ListPlus size={18} />
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <aside className="right-rail">
        <section className="rail-intro">
          <span>
            <Check size={13} /> Comece por aqui
          </span>
          <h2>Sua biblioteca, do seu jeito.</h2>
          <p>
            Registre o que jogou, abandone sem culpa e encontre o próximo
            favorito.
          </p>
          <button>
            Montar minha biblioteca
            <ArrowUpRight size={15} />
          </button>
        </section>
        <section className="rail-section">
          <div className="rail-title">
            <h2>Em alta</h2>
            <span>24h</span>
          </div>
          {games.slice(0, 5).map((game, index) => (
            <Link href={`/${lang}`} className="trend" key={game.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{game.name}</strong>
                <small>{game.ratingCount.toLocaleString(lang)} registros</small>
              </div>
              <ArrowUpRight size={14} />
            </Link>
          ))}
        </section>
        <footer>
          <span>© 2026 uloggd · Dados por IGDB</span>
          <nav>
            <Link href={`/${lang}/legal/terms`}>{d.legal.terms}</Link>
            <Link href={`/${lang}/legal/privacy`}>{d.legal.privacy}</Link>
            <Link href={`/${lang}/legal/child-safety`}>{d.legal.safety}</Link>
          </nav>
        </footer>
      </aside>

      <nav className="bottom-nav" aria-label="Principal">
        {nav.map(([icon, label], index) => {
          const NavIcon = iconMap[icon];
          return (
            <Link
              key={label}
              href={`/${lang}`}
              className={index === 0 ? "active" : ""}
              aria-label={label}
            >
              <NavIcon size={22} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
