"use client";

/* eslint-disable @next/next/no-img-element */

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ChevronDown,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { VerifiedMark } from "./verified-badge";

export type NavigationAccount = {
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
  lang: "pt-BR" | "en";
}) {
  const [signingOut, setSigningOut] = useState(false);
  const handle = account.username ? `@${account.username}` : account.email;
  const label = account.displayName || handle;
  const initial = (account.username || account.email).slice(0, 1).toUpperCase();

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
            {account.verified && <VerifiedMark size={16} />}
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
              {account.verified && <VerifiedMark size={16} />}
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
                  {lang === "pt-BR" ? "Ver perfil" : "View profile"}
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
            </>
          )}
          {(account.role === "MODERATOR" || account.role === "ADMIN") && (
            <>
              <DropdownMenu.Item asChild>
                <Link
                  className="account-menu-moderation"
                  href={`/${lang}/moderation`}
                >
                  <ShieldCheck size={16} />
                  {lang === "pt-BR" ? "Moderação" : "Moderation"}
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
              ? lang === "pt-BR"
                ? "Saindo…"
                : "Signing out…"
              : lang === "pt-BR"
                ? "Sair da conta"
                : "Sign out"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
