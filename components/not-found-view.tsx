"use client";

import Link from "next/link";
import { ArrowLeft, Compass, Gamepad2, Search } from "lucide-react";
import { usePathname } from "next/navigation";

export function NotFoundView() {
  const pathname = usePathname();
  const lang = pathname.startsWith("/en") ? "en" : "pt-BR";
  const pt = lang === "pt-BR";
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
          404 · {pt ? "FORA DO MAPA" : "OFF THE MAP"}
        </span>
        <h1>
          {pt
            ? "Essa página não foi encontrada"
            : "This page could not be found"}
        </h1>
        <p>
          {pt
            ? "O endereço pode ter mudado, o jogo pode ter saído do catálogo ou este conteúdo não existe mais."
            : "The address may have changed, the game may have left the catalog, or this content no longer exists."}
        </p>
        <div className="not-found-actions">
          <Link href={`/${lang}`}>
            <Compass size={17} />
            {pt ? "Explorar o catálogo" : "Explore catalog"}
          </Link>
          <button type="button" onClick={() => history.back()}>
            <ArrowLeft size={17} />
            {pt ? "Voltar" : "Go back"}
          </button>
        </div>
        <small>
          <Search size={13} />{" "}
          {pt
            ? "Tente buscar pelo nome do jogo no topo da página."
            : "Try searching for the game name at the top of the page."}
        </small>
      </section>
    </main>
  );
}
