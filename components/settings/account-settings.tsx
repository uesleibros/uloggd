"use client";

import {
  AlertTriangle,
  CalendarDays,
  CloudDownload,
  CircleUserRound,
  SlidersHorizontal,
  ShieldCheck,
  SwatchBook,
  UserRound,
  LockKeyhole,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProfileSettingsPanel } from "./profile-settings-panel";
import { PasskeySettings } from "./passkey-settings";
import { TwoFactorSettings } from "./two-factor-settings";
import { DeleteAccount } from "./delete-account";
import { AppearanceSettings } from "./appearance-settings";
import { PushSettings } from "./push-settings";
import { InstallSettings } from "./install-settings";
import { ContentPreferences } from "./content-preferences";
import { PrivacySettings, type FollowRequest } from "./privacy-settings";
import { UsernameSettings } from "./username-settings";
import { AccountTypeSettings, type AccountType } from "./account-type-settings";
import { OrganizationMembers } from "./organization-members";
import type { OrganizationCategory } from "@/lib/organization";
import { BackloggdImportSettings } from "./backloggd-import-settings";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

type Profile = Parameters<typeof ProfileSettingsPanel>[0]["initial"] & {
  custom_cover_scope: "OWN" | "EVERYONE";
  profile_comment_scope: "EVERYONE" | "FOLLOWERS" | "NOBODY";
  content_comment_scope: "EVERYONE" | "FOLLOWERS" | "NOBODY";
  profile_visibility: "EVERYONE" | "FOLLOWERS";
  is_private: boolean;
  username_changed_at: string | null;
  account_type: AccountType;
  organization_tagline: string | null;
  organization_category: OrganizationCategory | null;
  organization_url: string | null;
  organization_company_slug: string | null;
};
type BlockedProfile = {
  id: string;
  username: string;
  display_name: string | null;
};
type Tab =
  | "general"
  | "profile"
  | "preferences"
  | "privacy"
  | "appearance"
  | "import"
  | "security";

export function AccountSettings({
  profile,
  blockedProfiles,
  followRequests,
  requestTotal,
  blockedTotal,
  viewerId,
  infractions,
  lang,
  vapidPublicKey,
}: {
  profile: Profile;
  blockedProfiles: BlockedProfile[];
  followRequests: FollowRequest[];
  requestTotal: number;
  blockedTotal: number;
  viewerId: string;
  infractions: number;
  lang: UiLang;
  /** Empty when the deployment has no keys, which hides the control. */
  vapidPublicKey: string;
}) {
  const t = uiText(lang);
  const organization = profile.account_type === "ORGANIZATION";
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: Tab =
    requestedTab === "general" ||
    requestedTab === "profile" ||
    requestedTab === "preferences" ||
    requestedTab === "privacy" ||
    requestedTab === "appearance" ||
    requestedTab === "import" ||
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
      label: tri(lang, "Geral", "General", "General"),
      icon: CircleUserRound,
    },
    {
      id: "profile" as const,
      label: tri(lang, "Perfil", "Profile", "Perfil"),
      icon: UserRound,
    },
    {
      id: "preferences" as const,
      label: t.preferences,
      icon: SlidersHorizontal,
    },
    {
      id: "privacy" as const,
      label: t.privacy,
      icon: LockKeyhole,
    },
    {
      id: "appearance" as const,
      label: tri(lang, "Aparência", "Appearance", "Apariencia"),
      icon: SwatchBook,
    },
    {
      id: "import" as const,
      label: tri(lang, "Importar", "Import", "Importar"),
      icon: CloudDownload,
    },
    {
      id: "security" as const,
      label: tri(lang, "Segurança", "Security", "Seguridad"),
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
        aria-label={tri(
          lang,
          "Seções das configurações",
          "Settings sections",
          "Secciones de los ajustes",
        )}
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
            <UsernameSettings
              initialUsername={profile.username}
              changedAt={profile.username_changed_at}
              lang={lang}
            />
            {organization && (
              /* Only for organizations: a person has no team, and the card
                 would be an empty promise on their settings page. */
              <OrganizationMembers viewerId={viewerId} lang={lang} />
            )}
            <AccountTypeSettings
              initialType={profile.account_type}
              initialTagline={profile.organization_tagline}
              initialCategory={profile.organization_category}
              initialUrl={profile.organization_url}
              initialCompany={profile.organization_company_slug}
              lang={lang}
            />
            <section className="settings-account-card">
              <span>
                <CalendarDays size={20} />
              </span>
              <div>
                <small>
                  {tri(
                    lang,
                    organization
                      ? "DATA DE NASCIMENTO DO RESPONSÁVEL"
                      : "DATA DE NASCIMENTO",
                    organization ? "OPERATOR'S BIRTH DATE" : "BIRTH DATE",
                    organization
                      ? "FECHA DE NACIMIENTO DEL RESPONSABLE"
                      : "FECHA DE NACIMIENTO",
                  )}
                </small>
                <strong>
                  {profile.birth_date
                    ? new Intl.DateTimeFormat(lang, {
                        dateStyle: "long",
                        timeZone: "UTC",
                      }).format(new Date(`${profile.birth_date}T00:00:00Z`))
                    : tri(lang, "Não informada", "Not provided", "No indicada")}
                </strong>
                <p>
                  {/* An organization has no birth date. The stored one belongs
                      to whoever operates the account, and it still gates age
                      restricted content: relaxing that for organizations would
                      be a trivial bypass, since anyone may self-declare one. */}
                  {tri(
                    lang,
                    organization
                      ? "Data de quem opera esta conta. Privada, permanente e usada só para o controle de idade."
                      : "Informação privada e permanente.",
                    organization
                      ? "The date of whoever operates this account. Private, permanent, and used only for age gating."
                      : "Private and permanent information.",
                    organization
                      ? "Fecha de quien opera esta cuenta. Privada, permanente y usada solo para el control de edad."
                      : "Información privada y permanente.",
                  )}
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
                <small>
                  {tri(lang, "INFRAÇÕES", "INFRACTIONS", "INFRACCIONES")}
                </small>
                <strong>
                  {infractions === 0
                    ? tri(
                        lang,
                        "Conta em situação regular",
                        "Account in good standing",
                        "Cuenta en regla",
                      )
                    : `${infractions} ${tri(lang, "registro(s)", "record(s)", "registro(s)")}`}
                </strong>
                <p>
                  {infractions === 0
                    ? tri(
                        lang,
                        "Nenhuma infração registrada na sua conta.",
                        "No infractions recorded on your account.",
                        "Ninguna infracción registrada en tu cuenta.",
                      )
                    : tri(
                        lang,
                        "Consulte o suporte caso precise contestar uma decisão.",
                        "Contact support if you need to appeal a decision.",
                        "Contacta con soporte si necesitas apelar una decisión.",
                      )}
                </p>
              </div>
            </section>
            <DeleteAccount username={profile.username} lang={lang} />
          </div>
        )}
        {tab === "profile" && (
          <ProfileSettingsPanel initial={profile} lang={lang} />
        )}
        {tab === "preferences" && (
          <>
            <ContentPreferences
              initialScope={profile.custom_cover_scope}
              lang={lang}
            />
            {/* Which kinds you receive lives in the notification centre; this
                is the separate question of whether this device is reachable at
                all when the app is closed. */}
            {/* Above push on purpose: on iPhone, installing is what makes
                push possible at all, so the order matches the dependency. */}
            <InstallSettings lang={lang} />
            <PushSettings
              lang={lang}
              viewerId={viewerId}
              vapidPublicKey={vapidPublicKey}
            />
          </>
        )}
        {tab === "privacy" && (
          <PrivacySettings
            initialScope={profile.profile_comment_scope}
            initialContentScope={profile.content_comment_scope}
            initialVisibility={profile.profile_visibility}
            initialPrivate={profile.is_private ?? false}
            initialRequests={followRequests}
            initialBlocked={blockedProfiles}
            requestTotal={requestTotal}
            blockedTotal={blockedTotal}
            viewerId={viewerId}
            lang={lang}
          />
        )}
        {tab === "appearance" && <AppearanceSettings lang={lang} />}
        {tab === "import" && (
          <BackloggdImportSettings lang={lang} username={profile.username} />
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
