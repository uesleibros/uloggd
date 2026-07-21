"use client";

import { Check, Images, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, type UiLang } from "@/lib/ui-text";

type CoverScope = "OWN" | "EVERYONE";

export function ContentPreferences({
  initialScope,
  lang,
}: {
  initialScope: CoverScope;
  lang: UiLang;
}) {
  const [scope, setScope] = useState(initialScope);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function select(next: CoverScope) {
    if (pending || next === scope) return;
    const previous = scope;
    setScope(next);
    setPending(true);
    setError(false);
    const { error: actionError } = await createClient().rpc(
      "set_custom_cover_scope",
      { new_scope: next },
    );
    if (actionError) {
      setScope(previous);
      setError(true);
    }
    setPending(false);
  }

  const options = [
    {
      id: "OWN" as const,
      title: tri(lang, "Somente as minhas", "Only mine", "Solo las mías"),
      description: tri(
        lang,
        "Use suas capas personalizadas e mantenha a capa oficial no conteúdo de outras pessoas.",
        "Use your custom covers and keep official art on other people's content.",
        "Usa tus portadas personalizadas y mantén la oficial en el contenido de otras personas.",
      ),
    },
    {
      id: "EVERYONE" as const,
      title: tri(lang, "De todo mundo", "Everyone's", "De todo el mundo"),
      description: tri(
        lang,
        "Veja as capas escolhidas pelo autor de cada biblioteca, lista, avaliação e sessão.",
        "See the covers chosen by each library, list, review, and session author.",
        "Mira las portadas elegidas por el autor de cada biblioteca, lista, reseña y sesión.",
      ),
    },
  ];

  return (
    <section className="content-preferences" aria-labelledby="covers-title">
      <header>
        <span>
          <Images size={17} />
        </span>
        <div>
          <small>{tri(lang, "CONTEÚDO", "CONTENT", "CONTENIDO")}</small>
          <h2 id="covers-title">
            {tri(
              lang,
              "Capas personalizadas",
              "Custom covers",
              "Portadas personalizadas",
            )}
          </h2>
          <p>
            {tri(
              lang,
              "Escolha quais seleções de capa aparecem enquanto você navega.",
              "Choose whose cover selections appear while you browse.",
              "Elige qué selecciones de portada aparecen mientras navegas.",
            )}
          </p>
        </div>
      </header>
      <div
        className="content-preference-options"
        role="radiogroup"
        aria-label={tri(
          lang,
          "Capas exibidas",
          "Displayed covers",
          "Portadas mostradas",
        )}
      >
        {options.map((option) => (
          <button
            type="button"
            role="radio"
            aria-checked={scope === option.id}
            data-selected={scope === option.id || undefined}
            disabled={pending}
            onClick={() => void select(option.id)}
            key={option.id}
          >
            <span>
              <strong>{option.title}</strong>
              <small>{option.description}</small>
            </span>
            <i aria-hidden>
              {pending && scope === option.id ? (
                <LoaderCircle className="spin" size={14} />
              ) : (
                scope === option.id && <Check size={14} />
              )}
            </i>
          </button>
        ))}
      </div>
      {error && (
        <p role="alert">
          {tri(
            lang,
            "Não foi possível salvar a preferência.",
            "Could not save the preference.",
            "No se pudo guardar la preferencia.",
          )}
        </p>
      )}
    </section>
  );
}
