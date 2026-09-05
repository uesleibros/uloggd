import type { Endpoint, Param } from "@/lib/docs/api-reference";

function Params({ title, rows }: { title: string; rows: Param[] }) {
  return (
    <div className="docs-params">
      <h4>{title}</h4>
      <div className="docs-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td>
                  <code>{row.name}</code>
                  {row.required && <b className="docs-required">required</b>}
                </td>
                <td>{row.type}</td>
                <td>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  return (
    <article className="docs-endpoint" id={endpoint.path}>
      <header>
        <span data-method={endpoint.method}>{endpoint.method}</span>
        <code>{endpoint.path}</code>
      </header>
      <p>{endpoint.summary}</p>
      <p className="docs-endpoint-meta">
        {endpoint.scope ? (
          <>
            Scope <code>{endpoint.scope}</code>
          </>
        ) : (
          <>No scope required</>
        )}
        {" · "}
        Counted against the <code>{endpoint.bucket}</code> allowance
      </p>
      {endpoint.query && <Params title="Query" rows={endpoint.query} />}
      {endpoint.body && <Params title="Body" rows={endpoint.body} />}
      {endpoint.example && (
        <div className="docs-example">
          <h4>Example response</h4>
          <pre>
            <code>{endpoint.example}</code>
          </pre>
        </div>
      )}
    </article>
  );
}
