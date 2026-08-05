import Link from "next/link";
import { ArrowRight, Library } from "lucide-react";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * What the home page says to somebody whose library is empty.
 *
 * Three sections above and below this one read a library — what was left
 * unfinished, what is queued, who plays what you play — and all three render
 * nothing without one. So the page had a hole in the middle and no explanation
 * for it, and nine accounts sat on that page having never added a game.
 *
 * It points at the same import the onboarding step offers, because that step
 * only exists for accounts created after it shipped and these people are
 * already past it.
 */
export function EmptyLibraryCallout({ lang }: { lang: UiLang }) {
  return (
    <section className="home-empty-library" aria-labelledby="empty-library">
      <Library size={20} aria-hidden />
      <div>
        <h2 id="empty-library">
          {tri(
            lang,
            "Sua biblioteca está vazia",
            "Your library is empty",
            "Tu biblioteca está vacía",
          )}
        </h2>
        <p>
          {tri(
            lang,
            "É ela que diz o que continuar, o que está na fila e quem tem o seu gosto. Traga a sua do Backloggd ou escolha alguns jogos no catálogo.",
            "It is what tells you what to continue, what is queued, and who shares your taste. Bring yours over from Backloggd, or pick a few games from the catalog.",
            "Es lo que dice qué continuar, qué está en cola y quién comparte tu gusto. Trae la tuya de Backloggd o elige algunos juegos del catálogo.",
          )}
        </p>
      </div>
      <div className="home-empty-library-actions">
        <Link href={`/${lang}/onboarding/library`}>
          {tri(
            lang,
            "Importar do Backloggd",
            "Import from Backloggd",
            "Importar de Backloggd",
          )}
          <ArrowRight size={15} />
        </Link>
        <Link href={`/${lang}/search`}>
          {tri(lang, "Ver o catálogo", "Browse the catalog", "Ver el catálogo")}
        </Link>
      </div>
    </section>
  );
}
