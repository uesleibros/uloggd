import { BUCKETS, ERROR_CODES, RESOURCES } from "@/lib/docs/api-reference";

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
export function ScopeTable() {
  const seen = new Map<string, string>();
  for (const resource of RESOURCES)
    for (const endpoint of resource.endpoints)
      if (endpoint.scope && !seen.has(endpoint.scope))
        seen.set(endpoint.scope, resource.title);

  return (
    <Table head={["Scope", "Covers"]} rows={[...seen].map(([a, b]) => [a, b])} />
  );
}

export function LimitTable() {
  return (
    <Table
      head={["Allowance", "Per hour", "Covers"]}
      rows={BUCKETS.map((one) => [one.name, one.ceiling, one.note])}
    />
  );
}

export function ErrorTable() {
  return (
    <Table
      head={["Code", "Status", "Means"]}
      rows={ERROR_CODES.map((one) => [one.code, one.status, one.note])}
    />
  );
}
