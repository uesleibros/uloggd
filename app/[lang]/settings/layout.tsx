import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { hasLocale } from "../dictionaries";
import "./settings.css";
import "../profile.css";
import { tri } from "@/lib/ui-text";

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
        <h1>{tri(lang, "Configurações", "Settings", "Ajustes")}</h1>
        <p>
          {tri(
            lang,
            "Ajuste sua conta, identidade, preferências, aparência e segurança no uloggd.",
            "Control your account, identity, preferences, appearance, and security across uloggd.",
            "Ajusta tu cuenta, identidad, preferencias, apariencia y seguridad en uloggd.",
          )}
        </p>
      </header>
      <div className="settings-main">{children}</div>
    </main>
  );
}
