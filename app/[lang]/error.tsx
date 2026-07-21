"use client";

import { RotateCcw, Compass, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { tri, type UiLang } from "@/lib/ui-text";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  // These boundaries render outside the [lang] params, so the locale is read
  // back off the path.
  const segment = pathname.split("/")[1];
  const lang: UiLang = segment === "en" || segment === "es" ? segment : "pt-BR";
  useEffect(() => {
    console.error(error);
    void fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: String(error.message ?? error).slice(0, 500),
        digest: error.digest,
        stack: error.stack?.slice(0, 4000),
        path: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => undefined);
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
          {tri(lang, "ERRO INESPERADO", "UNEXPECTED ERROR", "ERROR INESPERADO")}
        </span>
        <h1>
          {tri(
            lang,
            "Algo deu errado por aqui",
            "Something went wrong here",
            "Algo salió mal por aquí",
          )}
        </h1>
        <p>
          {tri(
            lang,
            "Não foi possível carregar esta página agora. Tente novamente em instantes — se continuar, volte para o catálogo.",
            "This page could not be loaded right now. Try again in a moment — if it keeps happening, head back to the catalog.",
            "No se pudo cargar esta página ahora. Inténtalo en un momento; si sigue pasando, vuelve al catálogo.",
          )}
        </p>
        <div className="not-found-actions">
          <button type="button" onClick={() => reset()}>
            <RotateCcw size={17} />
            {tri(lang, "Tentar novamente", "Try again", "Reintentar")}
          </button>
          <Link href={`/${lang}`}>
            <Compass size={17} />
            {tri(
              lang,
              "Explorar o catálogo",
              "Explore catalog",
              "Explorar el catálogo",
            )}
          </Link>
        </div>
      </section>
    </main>
  );
}
