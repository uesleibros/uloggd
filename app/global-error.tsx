"use client";

import { useEffect } from "react";

/**
 * Catches errors thrown in the root layout itself, the one place the per-route
 * error.tsx cannot reach. It replaces the whole document, so it renders its own
 * <html>/<body>. Reports to telemetry like the route boundary does.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Global error: ${String(error.message ?? error).slice(0, 460)}`,
        digest: error.digest,
        stack: error.stack?.slice(0, 4000),
        path:
          typeof window !== "undefined" ? window.location.pathname : undefined,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0f0e11",
          color: "#f4f2f6",
        }}
      >
        <main style={{ textAlign: "center", padding: "24px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 650 }}>
            Algo deu muito errado
          </h1>
          <p style={{ marginTop: "8px", color: "#aaa5af", fontSize: "14px" }}>
            Recarregue a página. Se continuar, tente novamente em instantes.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "18px",
              padding: "10px 18px",
              borderRadius: "9px",
              border: "0",
              background: "#5865f2",
              color: "white",
              fontWeight: 620,
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>
        </main>
      </body>
    </html>
  );
}
