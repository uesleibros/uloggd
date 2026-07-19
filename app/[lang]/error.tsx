"use client";

import { RotateCcw, Compass, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const lang = pathname.startsWith("/en") ? "en" : "pt-BR";
  const pt = lang === "pt-BR";
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="not-found-page">
      <section className="not-found-card">
        <div className="not-found-orbit" aria-hidden>
          <span>
            <TriangleAlert size={27} />
          </span>
          <i />
        </div>
        <span className="not-found-code">
          {pt ? "ERRO INESPERADO" : "UNEXPECTED ERROR"}
        </span>
        <h1>{pt ? "Algo deu errado por aqui" : "Something went wrong here"}</h1>
        <p>
          {pt
            ? "Não foi possível carregar esta página agora. Tente novamente em instantes — se continuar, volte para o catálogo."
            : "This page could not be loaded right now. Try again in a moment — if it keeps happening, head back to the catalog."}
        </p>
        <div className="not-found-actions">
          <button type="button" onClick={() => reset()}>
            <RotateCcw size={17} />
            {pt ? "Tentar novamente" : "Try again"}
          </button>
          <Link href={`/${lang}`}>
            <Compass size={17} />
            {pt ? "Explorar o catálogo" : "Explore catalog"}
          </Link>
        </div>
      </section>
    </main>
  );
}
