"use client";

/* eslint-disable @next/next/no-img-element */

import * as DropdownMenu from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  LoaderCircle,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { VerifiedBadge, VerifiedNameMark } from "./verified-badge";
import { LevelMark, ProfileLevelBadge } from "./profile-level-badge";
import { tri, type UiLang } from "@/lib/ui-text";
import { useXpStanding } from "./xp-feedback-provider";

export type NavigationAccount = {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
  role: "USER" | "MODERATOR" | "ADMIN";
};

/**
 * The account row at the foot of the sidebar.
 *
 * The whole row is the menu trigger. Splitting it, with the name as a link to
 * the profile and only the caret opening the menu, left the caret as a bare
 * glyph on a row of text: it stopped reading as a button, which is a worse
 * trade than the shortcut was worth.
 *
 * The menu keeps destinations that belong to the account itself. The wallet
 * remains a header action, while settings and moderation live here instead of
 * competing with the person's main navigation destinations.
 */
export function AccountMenu({
  account,
  lang,
  onNavigate,
}: {
  account: NavigationAccount;
  lang: UiLang;
  onNavigate?: () => void;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const handle = account.username ? `@${account.username}` : account.email;
  const label = account.displayName || handle;
  const initial = (account.username || account.email).slice(0, 1).toUpperCase();
  const profileHref = account.username
    ? `/${lang}/u/${account.username}`
    : `/${lang}/onboarding/username`;
  const standing = useXpStanding();

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const response = await fetch(`/${lang}/auth/signout`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("signout_failed");
      window.location.replace(`/${lang}/login`);
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="account-button">
        <span className="account-initial">
          {account.avatarUrl ? <img src={account.avatarUrl} alt="" /> : initial}
        </span>
        <span className="account-copy">
          <strong>
            <span>{label}</span>
            {/* Marks, not badges: this whole row is the trigger, and a button
                inside a button is invalid. The interactive pair lives in the
                menu below, where each has room to open what it describes. */}
            {standing && <LevelMark lang={lang} standing={standing} />}
            {account.verified && <VerifiedNameMark />}
          </strong>
          <small>{handle}</small>
        </span>
        <ChevronDown size={15} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="account-menu"
          align="start"
          side="top"
          sideOffset={8}
          collisionPadding={12}
        >
          <div className="account-menu-identity">
            <strong>
              <span>{label}</span>
              {standing && (
                <ProfileLevelBadge lang={lang} standing={standing} />
              )}
              {account.verified && (
                <VerifiedBadge lang={lang} profileId={account.id} />
              )}
            </strong>
            <span>{handle}</span>
            <small>{account.email}</small>
          </div>
          <DropdownMenu.Separator />
          <DropdownMenu.Item asChild>
            <Link
              className="account-menu-profile"
              href={profileHref}
              onClick={onNavigate}
            >
              <UserRound size={16} />
              {tri(lang, "Ver perfil", "View profile", "Ver perfil")}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link
              className="account-menu-settings"
              href={`/${lang}/settings?tab=general`}
              onClick={onNavigate}
            >
              <Settings size={16} />
              {tri(lang, "Configurações", "Settings", "Configuración")}
            </Link>
          </DropdownMenu.Item>
          {(account.role === "ADMIN" || account.role === "MODERATOR") && (
            <DropdownMenu.Item asChild>
              <Link
                className="account-menu-moderation"
                href={`/${lang}/moderation`}
                onClick={onNavigate}
              >
                <ShieldCheck size={16} />
                {tri(lang, "Moderação", "Moderation", "Moderación")}
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            className="account-menu-signout"
            disabled={signingOut}
            onSelect={(event) => {
              event.preventDefault();
              void signOut();
            }}
          >
            {signingOut ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <LogOut size={16} />
            )}
            {signingOut
              ? tri(lang, "Saindo…", "Signing out…", "Cerrando sesión…")
              : tri(lang, "Sair da conta", "Sign out", "Cerrar sesión")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
