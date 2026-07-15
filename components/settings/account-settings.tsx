"use client";

import {
  AlertTriangle,
  CalendarDays,
  CircleUserRound,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { ProfileSettingsPanel } from "./profile-settings-panel";
import { PasskeySettings } from "./passkey-settings";
import { TwoFactorSettings } from "./two-factor-settings";

type Profile = Parameters<typeof ProfileSettingsPanel>[0]["initial"];
type Tab = "general" | "profile" | "security";

export function AccountSettings({
  profile,
  infractions,
  lang,
}: {
  profile: Profile;
  infractions: number;
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
  const [tab, setTab] = useState<Tab>("general");
  const tabs = [
    {
      id: "general" as const,
      label: pt ? "Geral" : "General",
      icon: CircleUserRound,
    },
    {
      id: "profile" as const,
      label: pt ? "Perfil" : "Profile",
      icon: UserRound,
    },
    {
      id: "security" as const,
      label: pt ? "Segurança" : "Security",
      icon: ShieldCheck,
    },
  ];
  return (
    <main className="account-settings-page">
      <nav
        className="game-page-nav account-settings-tabs"
        role="tablist"
        aria-label={pt ? "Seções das configurações" : "Settings sections"}
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>
      <div className="account-settings-panel" role="tabpanel">
        {tab === "general" && (
          <div className="settings-general-grid">
            <section className="settings-account-card">
              <span>
                <CircleUserRound size={20} />
              </span>
              <div>
                <small>{pt ? "NOME DE USUÁRIO" : "USERNAME"}</small>
                <strong>@{profile.username}</strong>
                <p>
                  {pt
                    ? "Seu identificador único e permanente no uloggd."
                    : "Your unique, permanent identifier on uloggd."}
                </p>
              </div>
            </section>
            <section className="settings-account-card">
              <span>
                <CalendarDays size={20} />
              </span>
              <div>
                <small>{pt ? "DATA DE NASCIMENTO" : "BIRTH DATE"}</small>
                <strong>
                  {new Intl.DateTimeFormat(lang, {
                    dateStyle: "long",
                    timeZone: "UTC",
                  }).format(new Date(`${profile.birth_date}T00:00:00Z`))}
                </strong>
                <p>
                  {pt
                    ? "Informação privada e permanente."
                    : "Private and permanent information."}
                </p>
              </div>
            </section>
            <section
              className="settings-account-card"
              data-safe={infractions === 0 || undefined}
            >
              <span>
                <AlertTriangle size={20} />
              </span>
              <div>
                <small>{pt ? "INFRAÇÕES" : "INFRACTIONS"}</small>
                <strong>
                  {infractions === 0
                    ? pt
                      ? "Conta em situação regular"
                      : "Account in good standing"
                    : `${infractions} ${pt ? "registro(s)" : "record(s)"}`}
                </strong>
                <p>
                  {infractions === 0
                    ? pt
                      ? "Nenhuma infração registrada na sua conta."
                      : "No infractions recorded on your account."
                    : pt
                      ? "Consulte o suporte caso precise contestar uma decisão."
                      : "Contact support if you need to appeal a decision."}
                </p>
              </div>
            </section>
          </div>
        )}
        {tab === "profile" && (
          <ProfileSettingsPanel initial={profile} lang={lang} />
        )}
        {tab === "security" && (
          <div className="settings-security-stack">
            <TwoFactorSettings lang={lang} />
            <PasskeySettings lang={lang} />
          </div>
        )}
      </div>
    </main>
  );
}
