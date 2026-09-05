import {
  BUCKETS,
  ERROR_CODES,
  RESOURCES,
  say,
  type Text,
} from "@/lib/docs/api-reference";
import { tri, type UiLang } from "@/lib/ui-text";

function Table({
  head,
  rows,
}: {
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="docs-table-wrap">
      <table>
        <thead>
          <tr>
            {head.map((cell) => (
              <th key={cell}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])}>
              {row.map((cell, column) => (
                <td key={column}>
                  {column === 0 ? <code>{cell}</code> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Every scope a key may hold, and the resource it opens. */
export function ScopeTable({ lang }: { lang: UiLang }) {
  const seen = new Map<string, Text>();
  for (const resource of RESOURCES)
    for (const endpoint of resource.endpoints)
      if (endpoint.scope && !seen.has(endpoint.scope))
        seen.set(endpoint.scope, resource.title);

  return (
    <Table
      head={[
        tri(lang, "Escopo", "Scope", "Permiso"),
        tri(lang, "Alcança", "Covers", "Alcanza"),
      ]}
      rows={[...seen].map(([scope, title]) => [scope, say(lang, title)])}
    />
  );
}

export function LimitTable({ lang }: { lang: UiLang }) {
  return (
    <Table
      head={[
        tri(lang, "Cota", "Allowance", "Cuota"),
        tri(lang, "Por hora", "Per hour", "Por hora"),
        tri(lang, "Alcança", "Covers", "Alcanza"),
      ]}
      rows={BUCKETS.map((one) => [one.name, one.ceiling, say(lang, one.note)])}
    />
  );
}

export function ErrorTable({ lang }: { lang: UiLang }) {
  return (
    <Table
      head={[
        tri(lang, "Código", "Code", "Código"),
        tri(lang, "Status", "Status", "Estado"),
        tri(lang, "Significa", "Means", "Significa"),
      ]}
      rows={ERROR_CODES.map((one) => [
        one.code,
        one.status,
        say(lang, one.note),
      ])}
    />
  );
}
