import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "./dictionaries";

type IconName = "home" | "compass" | "library" | "star" | "user" | "settings" | "plus" | "search" | "more" | "gamepad" | "globe";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></>,
    library: <><path d="M4 5h13v15H4z"/><path d="M7 3h13v15M8 9h5M8 13h5"/></>,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4.2 3.4-6 8-6s7.3 1.8 8 6"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a8 8 0 0 0 .1-6l-2 1-2-3 1.6-1.5a8 8 0 0 0-5.1-2l-.4 2.2H8.2L7.7 3.6a8 8 0 0 0-4.2 3l1.7 1.5-1.7 3-2.2-.7a8 8 0 0 0 .9 5.9l2-1 2 2.8-1.4 1.7a8 8 0 0 0 5.4 2l.3-2.2h3.4l.6 2.1a8 8 0 0 0 4.4-3.4L17 17l1.6-3 2.2.5"/></>,
    plus: <path d="M12 5v14M5 12h14"/>, search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    gamepad: <><path d="M7 8h10c3 0 5 2.5 5 6.5S20 21 17.5 18l-1-1h-9l-1 1C4 21 2 18.5 2 14.5S4 8 7 8Z"/><path d="M7 11v5M4.5 13.5h5M16 12h.01M19 15h.01"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const d = await getDictionary(lang);
  const otherLocale = lang === "pt-BR" ? "en" : "pt-BR";
  const nav = [
    ["home", d.nav.home], ["compass", d.nav.explore], ["library", d.nav.library],
    ["star", d.nav.reviews], ["user", d.nav.profile],
  ] as const;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href={`/${lang}`} className="brand" aria-label="uloggd"><span className="brand-mark"><Icon name="gamepad" size={25}/></span><span>uloggd</span></Link>
        <nav className="main-nav" aria-label="Principal">
          {nav.map(([icon, label], index) => <Link key={label} href={`/${lang}`} className={index === 0 ? "active" : ""}><Icon name={icon}/><span>{label}</span></Link>)}
        </nav>
        <button className="add-game"><Icon name="plus" size={19}/><span>{d.actions.addGame}</span></button>
        <div className="sidebar-bottom">
          <Link href={`/${otherLocale}`} title={d.actions.changeLanguage}><Icon name="globe"/><span>{otherLocale === "en" ? "English" : "Português"}</span></Link>
          <Link href={`/${lang}`}><Icon name="settings"/><span>{d.nav.settings}</span></Link>
          <div className="mini-profile"><div className="avatar">UB</div><div><strong>Ueslei</strong><small>@uesleibros</small></div><Icon name="more"/></div>
        </div>
      </aside>

      <main className="feed">
        <header className="mobile-header"><Link href={`/${lang}`} className="brand"><span className="brand-mark"><Icon name="gamepad" size={22}/></span><span>uloggd</span></Link><button aria-label="Buscar"><Icon name="search"/></button><div className="avatar">UB</div></header>
        <section className="hero">
          <Image src="/banner.png" alt="" fill priority sizes="(max-width: 760px) 100vw, 720px" className="hero-image"/>
          <div className="hero-shade"/><div className="hero-copy"><span>{d.home.eyebrow}</span><h1>{d.home.title}</h1><p>{d.home.subtitle}</p><button><Icon name="compass" size={18}/>{d.nav.explore}</button></div>
        </section>

        <section className="section-block"><div className="section-heading"><div><span className="live-dot"/><h2>{d.home.playing}</h2></div><Link href={`/${lang}`}>{d.actions.seeAll}</Link></div>
          <article className="playing-card"><div className="game-cover cover-elden"><span>ELDEN<br/>RING</span></div><div className="game-info"><div><span className="game-label">RPG · FromSoftware</span><h3>Elden Ring</h3></div><div className="progress-meta"><span>{d.home.progress}</span><strong>68%</strong></div><div className="progress"><i/></div><div className="game-actions"><span>{d.home.hours}</span><button>{d.actions.continue}</button></div></div></article>
        </section>

        <section className="section-block"><div className="section-heading"><h2>{d.home.activity}</h2><Link href={`/${lang}`}>{d.actions.seeAll}</Link></div><div className="activity-list">
          <article className="activity"><div className="avatar coral">MA</div><div className="activity-copy"><p><strong>Marina Alves</strong> {d.home.reviewed} <b>Hades II</b></p><span>2h · ★★★★★</span><blockquote>Combate impecável e uma direção de arte absurda. Já quero jogar tudo de novo.</blockquote></div><div className="game-thumb cover-hades">HADES<br/>II</div></article>
          <article className="activity"><div className="avatar purple">RC</div><div className="activity-copy"><p><strong>Rafael Costa</strong> {d.home.completed} <b>Hollow Knight</b></p><span>5h · 38 conquistas</span></div><div className="game-thumb cover-hollow">HOLLOW<br/>KNIGHT</div></article>
          <article className="activity"><div className="avatar blue">JS</div><div className="activity-copy"><p><strong>João Silva</strong> {d.home.added} <b>Clair Obscur: Expedition 33</b></p><span>8h</span></div><div className="game-thumb cover-clair">EXPEDITION<br/><b>33</b></div></article>
        </div></section>
      </main>

      <aside className="right-rail"><label className="search"><Icon name="search" size={19}/><input placeholder={`${d.nav.explore}...`} /></label><section className="rail-card"><div className="section-heading"><h2>{d.home.trending}</h2></div>{[["01","Baldur's Gate 3","12,4k"],["02","Hades II","9,8k"],["03","Elden Ring","8,1k"],["04","Cyberpunk 2077","6,7k"]].map(([rank,title,count]) => <Link href={`/${lang}`} className="trend" key={rank}><span>{rank}</span><div><strong>{title}</strong><small>{count} logs</small></div><Icon name="more" size={18}/></Link>)}</section><section className="community-card"><div className="community-icon"><Icon name="gamepad"/></div><div><strong>{d.home.community}</strong><span><i/> 2.847 {d.home.online}</span></div></section><footer>© 2026 uloggd · Privacy · Terms</footer></aside>

      <nav className="bottom-nav" aria-label="Principal">{nav.slice(0,5).map(([icon,label], index) => <Link key={label} href={`/${lang}`} className={index===0?"active":""} aria-label={label}><Icon name={icon} size={23}/><span>{label}</span></Link>)}</nav>
    </div>
  );
}
