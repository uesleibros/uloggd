"use client";

import { Accessibility, Check, Images, LoaderCircle, Type } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_INTERFACE_PREFERENCES,
  INTERFACE_PREFERENCES_EVENT,
  INTERFACE_PREFERENCES_KEY,
  normalizeInterfacePreferences,
  readInterfacePreferences,
  saveInterfacePreferences,
  type InterfaceFont,
  type InterfacePreferences,
  type ReadingSize,
} from "@/lib/interface-preferences";
import { tri, type UiLang } from "@/lib/ui-text";
import { Switch } from "@/components/ui/switch";

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
  const serializedInterfacePreferences = useSyncExternalStore(
    (notify) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === INTERFACE_PREFERENCES_KEY) notify();
      };
      window.addEventListener(INTERFACE_PREFERENCES_EVENT, notify);
      window.addEventListener("storage", onStorage);
      return () => {
        window.removeEventListener(INTERFACE_PREFERENCES_EVENT, notify);
        window.removeEventListener("storage", onStorage);
      };
    },
    () => JSON.stringify(readInterfacePreferences()),
    () => JSON.stringify(DEFAULT_INTERFACE_PREFERENCES),
  );
  const interfacePreferences = normalizeInterfacePreferences(
    JSON.parse(serializedInterfacePreferences),
  );

  function updateInterfacePreferences(changes: Partial<InterfacePreferences>) {
    saveInterfacePreferences({ ...interfacePreferences, ...changes });
  }

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

  const fontOptions: Array<{
    id: InterfaceFont;
    title: string;
    sample: string;
  }> = [
    {
      id: "inter",
      title: "Inter",
      sample: tri(
        lang,
        "Clara e familiar",
        "Clear and familiar",
        "Clara y familiar",
      ),
    },
    {
      id: "system",
      title: tri(lang, "Do sistema", "System", "Del sistema"),
      sample: tri(
        lang,
        "Combina com o aparelho",
        "Matches your device",
        "Combina con tu dispositivo",
      ),
    },
    {
      id: "source-sans",
      title: "Source Sans 3",
      sample: tri(
        lang,
        "Aberta e equilibrada",
        "Open and balanced",
        "Abierta y equilibrada",
      ),
    },
    {
      id: "readable",
      title: "Atkinson Hyperlegible",
      sample: tri(
        lang,
        "Letras mais distintas",
        "More distinct letters",
        "Letras más distintas",
      ),
    },
    {
      id: "serif",
      title: "Source Serif 4",
      sample: tri(
        lang,
        "Confortável para textos",
        "Comfortable for reading",
        "Cómoda para leer",
      ),
    },
  ];
  const sizeOptions: Array<{ id: ReadingSize; label: string; sample: string }> =
    [
      {
        id: "standard",
        label: tri(lang, "Padrão", "Standard", "Estándar"),
        sample: "Aa",
      },
      {
        id: "large",
        label: tri(lang, "Grande", "Large", "Grande"),
        sample: "Aa",
      },
      {
        id: "extra-large",
        label: tri(lang, "Maior", "Extra large", "Más grande"),
        sample: "Aa",
      },
    ];

  return (
    <div className="content-preferences-stack">
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
      <section
        className="content-preferences interface-preferences"
        aria-labelledby="interface-title"
      >
        <header>
          <span>
            <Type size={17} />
          </span>
          <div>
            <small>{tri(lang, "LEITURA", "READING", "LECTURA")}</small>
            <h2 id="interface-title">
              {tri(
                lang,
                "Texto e acessibilidade",
                "Text and accessibility",
                "Texto y accesibilidad",
              )}
            </h2>
            <p>
              {tri(
                lang,
                "Ajustes locais aplicados imediatamente neste dispositivo.",
                "Local adjustments applied immediately on this device.",
                "Ajustes locales aplicados de inmediato en este dispositivo.",
              )}
            </p>
          </div>
        </header>
        <div className="interface-preference-body">
          <fieldset className="interface-preference-field">
            <legend>
              {tri(
                lang,
                "Fonte da interface",
                "Interface font",
                "Fuente de la interfaz",
              )}
            </legend>
            <div className="interface-font-options">
              {fontOptions.map((option) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={interfacePreferences.font === option.id}
                  data-selected={
                    interfacePreferences.font === option.id || undefined
                  }
                  data-font={option.id}
                  onClick={() =>
                    updateInterfacePreferences({ font: option.id })
                  }
                  key={option.id}
                >
                  <span aria-hidden>Aa</span>
                  <strong>{option.title}</strong>
                  <small>{option.sample}</small>
                  <i aria-hidden>
                    {interfacePreferences.font === option.id && (
                      <Check size={13} />
                    )}
                  </i>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="interface-preference-field">
            <legend>
              {tri(
                lang,
                "Tamanho de leitura",
                "Reading size",
                "Tamaño de lectura",
              )}
            </legend>
            <div className="interface-size-options">
              {sizeOptions.map((option) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={interfacePreferences.readingSize === option.id}
                  data-selected={
                    interfacePreferences.readingSize === option.id || undefined
                  }
                  data-size={option.id}
                  onClick={() =>
                    updateInterfacePreferences({ readingSize: option.id })
                  }
                  key={option.id}
                >
                  <b aria-hidden>{option.sample}</b>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="interface-motion-option">
            <span>
              <Accessibility size={17} aria-hidden />
            </span>
            <label htmlFor="reduce-interface-motion">
              <strong>
                {tri(
                  lang,
                  "Reduzir movimento",
                  "Reduce motion",
                  "Reducir movimiento",
                )}
              </strong>
              <small>
                {tri(
                  lang,
                  "Remove deslocamentos e animações automáticas.",
                  "Removes movement and automatic animations.",
                  "Elimina desplazamientos y animaciones automáticas.",
                )}
              </small>
            </label>
            <Switch
              id="reduce-interface-motion"
              checked={interfacePreferences.reduceMotion}
              onCheckedChange={(reduceMotion) =>
                updateInterfacePreferences({ reduceMotion })
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
}
