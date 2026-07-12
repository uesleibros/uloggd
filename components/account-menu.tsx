"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut } from "lucide-react";

export type NavigationAccount = { email: string; username: string | null };

export function AccountMenu({
  account,
  lang,
}: {
  account: NavigationAccount;
  lang: "pt-BR" | "en";
}) {
  const label = account.username ? `@${account.username}` : account.email;
  const initial = (account.username || account.email).slice(0, 1).toUpperCase();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="account-button">
        <span className="account-initial">{initial}</span>
        <span className="account-copy">
          <strong>{label}</strong>
          <small>{account.email}</small>
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
            <strong>{label}</strong>
            <span>{account.email}</span>
          </div>
          <DropdownMenu.Separator />
          <form action={`/${lang}/auth/signout`} method="post">
            <DropdownMenu.Item asChild>
              <button className="account-menu-signout" type="submit">
                <LogOut size={16} />
                {lang === "pt-BR" ? "Sair da conta" : "Sign out"}
              </button>
            </DropdownMenu.Item>
          </form>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
