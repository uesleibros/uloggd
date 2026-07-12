import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen, Compass, Gamepad2, Globe2, HomeIcon, LibraryBig, MoreHorizontal,
  Plus, Search, Settings, Star, UserRound,
} from "lucide-react";
import { getPopularGames } from "@/lib/igdb";
import { getDictionary, hasLocale } from "./dictionaries";

const iconMap = { home: HomeIcon, compass: Compass, library: LibraryBig, star: Star, user: UserRound };

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [d, games] = await Promise.all([getDictionary(lang), getPopularGames()]);
  const [featured, ...catalog] = games;
  const otherLocale = lang === "pt-BR" ? "en" : "pt-BR";
  const nav = [["home", d.nav.home], ["compass", d.nav.explore], ["library", d.nav.library], ["star", d.nav.reviews], ["user", d.nav.profile]] as const;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href={`/${lang}`} className="brand" aria-label="uloggd"><span className="brand-mark"><Gamepad2 size={25}/></span><span>uloggd</span></Link>
        <nav className="main-nav" aria-label="Principal">{nav.map(([icon,label], index) => { const NavIcon = iconMap[icon]; return <Link key={label} href={`/${lang}`} className={index === 0 ? "active" : ""}><NavIcon size={22}/><span>{label}</span></Link>; })}</nav>
        <button className="add-game"><Plus size={19}/><span>{d.actions.addGame}</span></button>
        <div className="sidebar-bottom">
          <Link href={`/${otherLocale}`} title={d.actions.changeLanguage}><Globe2 size={22}/><span>{otherLocale === "en" ? "English" : "Português"}</span></Link>
          <Link href={`/${lang}`}><Settings size={22}/><span>{d.nav.settings}</span></Link>
          <div className="mini-profile"><div className="avatar">UB</div><div><strong>Ueslei</strong><small>@uesleibros</small></div><MoreHorizontal size={20}/></div>
        </div>
      </aside>

      <main className="feed">
        <header className="mobile-header"><Link href={`/${lang}`} className="brand"><span className="brand-mark"><Gamepad2 size={22}/></span><span>uloggd</span></Link><button aria-label="Buscar"><Search size={22}/></button><div className="avatar">UB</div></header>
        {featured && <section className="hero">
          <Image src={featured.heroUrl ?? featured.coverUrl} alt="" fill priority sizes="(max-width: 760px) 100vw, 720px" className="hero-image"/>
          <div className="hero-shade"/><div className="hero-copy"><span>{featured.genres.join(" · ") || d.home.eyebrow}</span><h1>{featured.name}</h1><p>{featured.summary || d.home.subtitle}</p><button><Compass size={18}/>{d.nav.explore}</button></div>
        </section>}

        <section className="section-block"><div className="section-heading"><div><span className="live-dot"/><h2>{d.home.trending}</h2></div><Link href={`/${lang}`}>{d.actions.seeAll}</Link></div>
          <div className="game-grid">{catalog.slice(0, 6).map((game) => <article className="igdb-card" key={game.id}><div className="igdb-cover"><Image src={game.coverUrl} alt={`Capa de ${game.name}`} fill sizes="(max-width: 620px) 44vw, 150px"/></div><div className="igdb-info"><h3>{game.name}</h3><p>{[game.releaseYear, ...game.genres].filter(Boolean).join(" · ")}</p><span><Star size={13} fill="currentColor"/> {game.rating ?? "—"}<small>{game.ratingCount.toLocaleString(lang)}</small></span></div></article>)}</div>
        </section>

        <section className="section-block discover"><div className="section-heading"><h2>{d.nav.explore}</h2></div>{catalog.slice(6, 9).map((game, index) => <article className="discover-row" key={game.id}><span>{String(index + 1).padStart(2,"0")}</span><div className="row-cover"><Image src={game.coverUrl} alt="" fill sizes="54px"/></div><div><h3>{game.name}</h3><p>{game.summary || game.genres.join(" · ")}</p></div><strong>{game.rating ?? "—"}</strong></article>)}</section>
      </main>

      <aside className="right-rail"><label className="search"><Search size={19}/><input placeholder={`${d.nav.explore}...`} /></label><section className="rail-card"><div className="section-heading"><h2>{d.home.trending}</h2></div>{games.slice(0,5).map((game,index) => <Link href={`/${lang}`} className="trend" key={game.id}><span>{String(index+1).padStart(2,"0")}</span><div><strong>{game.name}</strong><small>{game.ratingCount.toLocaleString(lang)} ratings</small></div><MoreHorizontal size={18}/></Link>)}</section><section className="community-card"><div className="community-icon"><BookOpen size={21}/></div><div><strong>Dados da IGDB</strong><span><i/> catálogo atualizado automaticamente</span></div></section><footer>© 2026 uloggd · Privacy · Terms · Game data by IGDB</footer></aside>

      <nav className="bottom-nav" aria-label="Principal">{nav.map(([icon,label], index) => { const NavIcon = iconMap[icon]; return <Link key={label} href={`/${lang}`} className={index===0?"active":""} aria-label={label}><NavIcon size={23}/><span>{label}</span></Link>; })}</nav>
    </div>
  );
}
