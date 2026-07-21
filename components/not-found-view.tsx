"use client";

import Link from "next/link";
import { ArrowLeft, Compass, Gamepad2, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { tri, type UiLang } from "@/lib/ui-text";

export function NotFoundView() {
  const pathname = usePathname();
  // These boundaries render outside the [lang] params, so the locale is read
  // back off the path.
  const segment = pathname.split("/")[1];
  const lang: UiLang = segment === "en" || segment === "es" ? segment : "pt-BR";
  return (
    <main className="not-found-page">
      <section className="not-found-card">
        <div className="not-found-orbit" aria-hidden>
          <span>
            <Gamepad2 size={27} />
          </span>
          <i />
        </div>
        <span className="not-found-code">
          404 · {tri(lang, "FORA DO MAPA", "OFF THE MAP", "FUERA DEL MAPA")}
        </span>
        <h1>
          {tri(
            lang,
            "Essa página não foi encontrada",
            "This page could not be found",
            "No se encontró esta página",
          )}
        </h1>
        <p>
          {tri(
            lang,
            "O endereço pode ter mudado, o jogo pode ter saído do catálogo ou este conteúdo não existe mais.",
            "The address may have changed, the game may have left the catalog, or this content no longer exists.",
            "La dirección puede haber cambiado, el juego puede haber salido del catálogo o este contenido ya no existe.",
          )}
        </p>
        <div className="not-found-actions">
          <Link href={`/${lang}`}>
            <Compass size={17} />
            {tri(
              lang,
              "Explorar o catálogo",
              "Explore catalog",
              "Explorar el catálogo",
            )}
          </Link>
          <button type="button" onClick={() => history.back()}>
            <ArrowLeft size={17} />
            {tri(lang, "Voltar", "Go back", "Volver")}
          </button>
        </div>
        <small>
          <Search size={13} />{" "}
          {tri(
            lang,
            "Tente buscar pelo nome do jogo no topo da página.",
            "Try searching for the game name at the top of the page.",
            "Prueba a buscar el nombre del juego arriba en la página.",
          )}
        </small>
      </section>
    </main>
  );
}
