import Link from "next/link";
import { gameMetaLine, primaryGameCompany } from "@/lib/game-company";
import type { UiLang } from "@/lib/ui-text";

type MetaGame = {
  releaseYear?: number | null;
  developers?: readonly string[] | null;
  publishers?: readonly string[] | null;
  primaryCompany?: { name: string; slug: string } | null;
};

/**
 * The line under a game's name: the year, and who made it.
 *
 * The company was the one piece of a game card that led nowhere. It is the
 * credit the studio is owed and the most useful thing on the card for finding
 * more of the same, and it sat there as text on every shelf, every search
 * result and every embed, next to a cover that was a link and a title that
 * was a link.
 *
 * It falls back to the plain line whenever the catalogue did not hand over a
 * slug, which is the honest answer: a link that guesses an address is worse
 * than a word that admits it is only a word.
 */
export function GameMetaLine({ game, lang }: { game: MetaGame; lang: UiLang }) {
  const company = game.primaryCompany;
  // Only when the slug belongs to the name the line would have printed
  // anyway, so a card never credits one studio and links to another.
  if (!company || company.name !== primaryGameCompany(game))
    return <>{gameMetaLine(game)}</>;
  return (
    <>
      {game.releaseYear ? `${game.releaseYear} · ` : ""}
      <Link
        className="game-meta-company"
        href={`/${lang}/company/${company.slug}`}
        prefetch={false}
      >
        {company.name}
      </Link>
    </>
  );
}
