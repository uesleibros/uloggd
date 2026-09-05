import { say, type Endpoint, type Param } from "@/lib/docs/api-reference";
import { tri, type UiLang } from "@/lib/ui-text";

function Params({
  title,
  rows,
  lang,
}: {
  title: string;
  rows: Param[];
  lang: UiLang;
}) {
  return (
    <div className="docs-params">
      <h4>{title}</h4>
      <div className="docs-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{tri(lang, "Campo", "Field", "Campo")}</th>
              <th>{tri(lang, "Tipo", "Type", "Tipo")}</th>
              <th>{tri(lang, "Observações", "Notes", "Notas")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td>
                  <code>{row.name}</code>
                  {row.required && (
                    <b className="docs-required">
                      {tri(lang, "obrigatório", "required", "obligatorio")}
                    </b>
                  )}
                </td>
                <td>{row.type}</td>
                <td>{say(lang, row.note)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EndpointCard({
  endpoint,
  lang,
}: {
  endpoint: Endpoint;
  lang: UiLang;
}) {
  return (
    <article className="docs-endpoint" id={endpoint.path}>
      <header>
        <span data-method={endpoint.method}>{endpoint.method}</span>
        <code>{endpoint.path}</code>
      </header>
      <p>{say(lang, endpoint.summary)}</p>
      <p className="docs-endpoint-meta">
        {endpoint.scope ? (
          <>
            {tri(lang, "Escopo", "Scope", "Permiso")}{" "}
            <code>{endpoint.scope}</code>
          </>
        ) : (
          tri(lang, "Não exige escopo", "No scope required", "No exige permiso")
        )}
        {" · "}
        {tri(
          lang,
          "Conta na cota",
          "Counted against the",
          "Cuenta en la cuota",
        )}{" "}
        <code>{endpoint.bucket}</code>
        {tri(lang, "", " allowance", "")}
      </p>
      {endpoint.query && (
        <Params
          title={tri(lang, "Parâmetros", "Query", "Parámetros")}
          rows={endpoint.query}
          lang={lang}
        />
      )}
      {endpoint.body && (
        <Params
          title={tri(lang, "Corpo", "Body", "Cuerpo")}
          rows={endpoint.body}
          lang={lang}
        />
      )}
      {endpoint.example && (
        <div className="docs-example">
          <h4>{tri(lang, "Exemplo", "Example response", "Ejemplo")}</h4>
          <pre>
            <code>{endpoint.example}</code>
          </pre>
        </div>
      )}
    </article>
  );
}
