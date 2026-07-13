import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { hasLocale } from "../dictionaries";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <main className="settings-page">
      <header className="settings-page-header">
        <span>{lang === "pt-BR" ? "SUA CONTA" : "YOUR ACCOUNT"}</span>
        <h1>{lang === "pt-BR" ? "Configurações" : "Settings"}</h1>
        <p>
          {lang === "pt-BR"
            ? "Ajuste como sua identidade aparece no uloggd."
            : "Control how your identity appears across uloggd."}
        </p>
      </header>
      <div className="settings-main">{children}</div>
    </main>
  );
}
