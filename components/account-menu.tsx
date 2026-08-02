"use client";

/* eslint-disable @next/next/no-img-element */

import * as DropdownMenu from "@/components/ui/dropdown-menu";
import {
  Settings,
  ChevronDown,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { VerifiedBadge, VerifiedNameMark } from "./verified-badge";
import { LevelMark, ProfileLevelBadge } from "./profile-level-badge";
import { useProfileLevels } from "@/lib/use-profile-levels";
import { tri, type UiLang } from "@/lib/ui-text";

export type NavigationAccount = {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
  role: "USER" | "MODERATOR" | "ADMIN";
};

export function AccountMenu({
  account,
  lang,
}: {
  account: NavigationAccount;
  lang: UiLang;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const handle = account.username ? `@${account.username}` : account.email;
  const label = account.displayName || handle;
  const initial = (account.username || account.email).slice(0, 1).toUpperCase();
  const standing = useProfileLevels(
    useMemo(() => [account.id], [account.id]),
  ).get(account.id);

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
            {/* A mark here: this whole row is the menu trigger, and a button
                inside a button is invalid. The interactive one is in the menu
                below, where it has room to open. */}
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
              {/* Inside the menu, not in its trigger, so both marks can open
                  what they describe. The pair in the trigger above stays
                  inert: one opening and the other not is the odd state. */}
              {account.verified && (
                <VerifiedBadge lang={lang} profileId={account.id} />
              )}
            </strong>
            <span>{handle}</span>
            <small>{account.email}</small>
          </div>
          <DropdownMenu.Separator />
          {account.username && (
            <>
              <DropdownMenu.Item asChild>
                <Link
                  className="account-menu-profile"
                  href={`/${lang}/u/${account.username}`}
                >
                  <UserRound size={16} />
                  {tri(lang, "Ver perfil", "View profile", "Ver perfil")}
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
            </>
          )}
          {/* Also in the sidebar, and deliberately in both. This menu is where
              someone looks for anything about their own account, and settings
              is the most common thing they are looking for. */}
          <DropdownMenu.Item asChild>
            <Link
              className="account-menu-settings"
              href={`/${lang}/settings?tab=general`}
            >
              <Settings size={16} />
              {tri(lang, "Configurações", "Settings", "Ajustes")}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          {(account.role === "MODERATOR" || account.role === "ADMIN") && (
            <>
              <DropdownMenu.Item asChild>
                <Link
                  className="account-menu-moderation"
                  href={`/${lang}/moderation`}
                >
                  <ShieldCheck size={16} />
                  {tri(lang, "Moderação", "Moderation", "Moderación")}
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
            </>
          )}
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
