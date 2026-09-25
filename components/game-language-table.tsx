"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { flagEmoji } from "@/lib/countries";
import { withEmoji } from "@/lib/emoji";
import { tri, type UiLang } from "@/lib/ui-text";

export type GameLanguage = {
  name: string;
  nativeName: string | null;
  locale: string | null;
  support: string[];
};

/** How many rows read as a list rather than as a wall. */
const SHOWN = 8;

/**
 * The region half of a locale, which is the flag to draw.
 *
 * A language is not a place, so the country comes from the catalogue's own
 * locale rather than from the language's name: "Spanish (Spain)" and
 * "Spanish (Mexico)" are the same word and two different flags, and no
 * mapping written here would have known which.
 */
function region(locale: string | null) {
  const part = locale?.split(/[-_]/)[1];
  return part && /^[A-Za-z]{2}$/.test(part) ? part.toUpperCase() : null;
}

/**
 * What a game is playable in, and in how much of it.
 *
 * The table used to print every row IGDB had. A big release carries thirty
 * languages, and thirty rows of three ticks each pushed the rest of the page
 * off the screen for something almost nobody reads to the end. It opens at
 * eight now, with the count of what is left on the button, and the rows the
 * reader's own language is in are never among the hidden ones.
 */
export function GameLanguageTable({
  languages,
  lang,
}: {
  languages: GameLanguage[];
  lang: UiLang;
}) {
  const [open, setOpen] = useState(false);
  // The reader's own language first, then the site's other two, then the
  // catalogue's order. Somebody checking whether a game speaks their language
  // should not have to open anything to find out.
  const priority = [lang.slice(0, 2), "en", "pt", "es"];
  const ordered = [...languages].sort((a, b) => {
    const rank = (one: GameLanguage) => {
      const at = priority.indexOf((one.locale ?? "").slice(0, 2).toLowerCase());
      return at === -1 ? priority.length : at;
    };
    return rank(a) - rank(b);
  });
  const rows = open ? ordered : ordered.slice(0, SHOWN);
  const hidden = ordered.length - rows.length;

  return (
    <>
      <div className="game-language-table-wrap">
        <table className="game-language-table">
          <thead>
            <tr>
              <th scope="col">{tri(lang, "Idioma", "Language", "Idioma")}</th>
              <th scope="col">Interface</th>
              <th scope="col">{tri(lang, "Áudio", "Audio", "Audio")}</th>
              <th scope="col">
                {tri(lang, "Legendas", "Subtitles", "Subtítulos")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((language) => {
              const country = region(language.locale);
              return (
                <tr key={language.name}>
                  <th scope="row">
                    <span className="game-language-name">
                      {country && (
                        <span className="game-language-flag" aria-hidden>
                          {withEmoji(flagEmoji(country))}
                        </span>
                      )}
                      <span>
                        {language.name}
                        {language.nativeName &&
                          language.nativeName !== language.name && (
                            <small>{language.nativeName}</small>
                          )}
                      </span>
                    </span>
                  </th>
                  {(["Interface", "Audio", "Subtitles"] as const).map(
                    (support) => {
                      const supported = language.support.includes(support);
                      return (
                        <td key={support}>
                          <span className="game-language-status">
                            {supported ? (
                              <Check size={14} aria-hidden />
                            ) : (
                              <span aria-hidden>-</span>
                            )}
                          </span>
                          <span className="sr-only">
                            {supported
                              ? tri(
                                  lang,
                                  "Disponível",
                                  "Available",
                                  "Disponible",
                                )
                              : tri(
                                  lang,
                                  "Indisponível",
                                  "Unavailable",
                                  "No disponible",
                                )}
                          </span>
                        </td>
                      );
                    },
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(hidden > 0 || open) && (
        <button
          type="button"
          className="game-language-more"
          data-open={open || undefined}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open
            ? tri(lang, "Ver menos", "Show less", "Ver menos")
            : tri(
                lang,
                `Ver mais ${hidden}`,
                `Show ${hidden} more`,
                `Ver ${hidden} más`,
              )}
          <ChevronDown size={14} aria-hidden />
        </button>
      )}
    </>
  );
}
