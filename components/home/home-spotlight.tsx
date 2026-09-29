import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Spotlight } from "@/lib/home-spotlight";
import type { UiLang } from "@/lib/ui-text";

/** The band at the top of the home page, drawn. */
export function HomeSpotlight({
  spotlight,
  lang,
}: {
  spotlight: Spotlight;
  lang: UiLang;
}) {
  const { game, kicker, fact } = spotlight;
  return (
    <>
      {game.heroUrl && (
        <span
          className="home-spotlight-art"
          style={{ backgroundImage: `url(${game.heroUrl})` }}
          aria-hidden
        />
      )}
      <p className="home-spotlight">
        <span className="home-spotlight-kicker">{kicker}</span>
        <Link
          className="home-spotlight-name"
          href={`/${lang}/game/${game.slug}`}
        >
          {game.name}
          <ArrowRight size={15} aria-hidden />
        </Link>
        {fact && <span className="home-spotlight-fact">{fact}</span>}
      </p>
    </>
  );
}
