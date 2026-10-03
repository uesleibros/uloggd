"use client";
import { AwardSelect } from "./award-select";
import { AwardSourcePicker } from "./award-source-picker";
import { VisibilitySelect } from "@/components/ui/visibility-select";
import { tri, type UiLang } from "@/lib/ui-text";
import { awardModeLabel, type AwardDocument } from "@/lib/awards";

export function AwardSettings({
  doc,
  onChange,
  sourceName,
  onSourceName,
  lang,
}: {
  doc: AwardDocument;
  onChange: (doc: AwardDocument) => void;
  sourceName: string | null;
  onSourceName: (name: string) => void;
  lang: UiLang;
}) {
  return (
    <div className="awards-settings create-list-form">
      <label>
        <span>
          {tri(
            lang,
            "Nome da premiação",
            "Award name",
            "Nombre de la premiación",
          )}
        </span>
        <input
          required
          maxLength={100}
          value={doc.name}
          placeholder={tri(
            lang,
            "Ex.: Erick Awards",
            "E.g. My Game Awards",
            "Ej.: Mis Game Awards",
          )}
          onChange={(e) => onChange({ ...doc, name: e.target.value })}
        />
      </label>
      <div className="awards-form-row">
        <label>
          <span>
            {tri(lang, "Ano da edição", "Edition year", "Año de la edición")}
          </span>
          <input
            type="number"
            min={1970}
            max={9999}
            required
            value={doc.year || ""}
            onChange={(e) => onChange({ ...doc, year: Number(e.target.value) })}
          />
        </label>
        <div className="awards-field">
          <span>{tri(lang, "Objetivo", "Purpose", "Objetivo")}</span>
          <AwardSelect
            label={tri(lang, "Objetivo", "Purpose", "Objetivo")}
            value={doc.mode}
            options={["PERSONAL", "PREDICTIONS"].map((mode) => ({
              value: mode,
              label: awardModeLabel(mode as AwardDocument["mode"], lang),
            }))}
            onChange={(mode) =>
              onChange({ ...doc, mode: mode as AwardDocument["mode"] })
            }
          />
        </div>
      </div>
      <div className="awards-field">
        <span>
          {tri(lang, "Jogos elegíveis", "Eligible games", "Juegos elegibles")}
        </span>
        <AwardSelect
          label={tri(
            lang,
            "Jogos elegíveis",
            "Eligible games",
            "Juegos elegibles",
          )}
          value={doc.source}
          options={[
            {
              value: "CATALOG",
              label: tri(
                lang,
                "Todo o catálogo",
                "Entire catalogue",
                "Todo el catálogo",
              ),
            },
            {
              value: "LIST",
              label: tri(
                lang,
                "Somente uma lista",
                "Only a source list",
                "Solo una lista",
              ),
            },
            {
              value: "PLAYED_YEAR",
              label: tri(
                lang,
                "Jogos que registrei no ano",
                "Games I logged this year",
                "Juegos registrados en el año",
              ),
            },
          ]}
          onChange={(source) =>
            onChange({
              ...doc,
              source: source as AwardDocument["source"],
              source_list_id: source === "LIST" ? doc.source_list_id : null,
            })
          }
        />
      </div>
      {doc.source === "LIST" && (
        <AwardSourcePicker
          value={doc.source_list_id}
          name={sourceName}
          lang={lang}
          onChange={(id, name) => {
            onChange({ ...doc, source_list_id: id });
            onSourceName(name);
          }}
        />
      )}
      {doc.source === "PLAYED_YEAR" && (
        <p className="awards-help">
          {tri(
            lang,
            "Considera sessões e datas de início ou conclusão registradas no ano da edição. Jogos sem data podem entrar por uma lista base.",
            "Uses sessions and start or finish dates recorded in the edition year. Undated games can be included through a source list.",
            "Considera sesiones y fechas de inicio o final registradas en el año de la edición. Los juegos sin fecha pueden entrar mediante una lista base.",
          )}
        </p>
      )}
      <label>
        <span>{tri(lang, "Suas regras", "Your rules", "Tus reglas")}</span>
        <textarea
          rows={3}
          maxLength={5000}
          value={doc.rules}
          placeholder={tri(
            lang,
            "Ex.: Só jogos que zerei; remakes contam; um vencedor por categoria.",
            "E.g. Only games I finished; remakes count; one winner per category.",
            "Ej.: Solo juegos terminados; se permiten remakes; un ganador por categoría.",
          )}
          onChange={(e) => onChange({ ...doc, rules: e.target.value })}
        />
      </label>
      <div className="awards-field">
        <span>
          {tri(
            lang,
            "Quem pode ver ao publicar",
            "Who can see it when published",
            "Quién puede verlo al publicar",
          )}
        </span>
        <VisibilitySelect
          value={doc.visibility}
          lang={lang}
          onChange={(visibility) => onChange({ ...doc, visibility })}
        />
        <p className="awards-help">
          {tri(
            lang,
            "Rascunhos são visíveis só para você, independentemente desta opção.",
            "Drafts are only visible to you, regardless of this setting.",
            "Los borradores solo son visibles para ti, independientemente de esta opción.",
          )}
        </p>
      </div>
    </div>
  );
}
