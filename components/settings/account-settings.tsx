"use client";

import {
  AlertTriangle,
  CalendarDays,
  CircleUserRound,
  ShieldCheck,
  SwatchBook,
  UserRound,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProfileSettingsPanel } from "./profile-settings-panel";
import { PasskeySettings } from "./passkey-settings";
import { TwoFactorSettings } from "./two-factor-settings";
import { DeleteAccount } from "./delete-account";
import { AppearanceSettings } from "./appearance-settings";

type Profile = Parameters<typeof ProfileSettingsPanel>[0]["initial"];
type Tab = "general" | "profile" | "appearance" | "security";

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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: Tab =
    requestedTab === "general" ||
    requestedTab === "profile" ||
    requestedTab === "appearance" ||
    requestedTab === "security"
      ? requestedTab
      : "general";

  function selectTab(nextTab: Tab) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", nextTab);
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }
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
      id: "appearance" as const,
      label: pt ? "Aparência" : "Appearance",
      icon: SwatchBook,
    },
    {
      id: "security" as const,
      label: pt ? "Segurança" : "Security",
      icon: ShieldCheck,
    },
  ];

  function moveTab(event: React.KeyboardEvent<HTMLElement>) {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    )
      return;
    event.preventDefault();
    const currentIndex = tabs.findIndex(({ id }) => id === tab);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (currentIndex +
              (event.key === "ArrowRight" ? 1 : -1) +
              tabs.length) %
            tabs.length;
    const nextTab = tabs[nextIndex].id;
    selectTab(nextTab);
    window.requestAnimationFrame(() =>
      document.getElementById(`settings-tab-${nextTab}`)?.focus(),
    );
  }

  return (
    <main className="account-settings-page">
      <nav
        className="game-page-nav account-settings-tabs"
        role="tablist"
        aria-label={pt ? "Seções das configurações" : "Settings sections"}
        onKeyDown={moveTab}
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`settings-tab-${id}`}
            aria-controls="settings-active-panel"
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => selectTab(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>
      <div
        className="account-settings-panel"
        id="settings-active-panel"
        role="tabpanel"
        aria-labelledby={`settings-tab-${tab}`}
        tabIndex={0}
      >
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
            <DeleteAccount username={profile.username} lang={lang} />
          </div>
        )}
        {tab === "profile" && (
          <ProfileSettingsPanel initial={profile} lang={lang} />
        )}
        {tab === "appearance" && <AppearanceSettings lang={lang} />}
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
