"use client";

import { LockKeyhole, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function SettingsNavigation({ lang }: { lang: "pt-BR" | "en" }) {
  const pathname = usePathname();
  const pt = lang === "pt-BR";
  const links = [
    {
      href: `/${lang}/settings/profile`,
      label: pt ? "Perfil" : "Profile",
      icon: UserRound,
    },
    {
      href: `/${lang}/settings/security`,
      label: pt ? "Segurança" : "Security",
      icon: LockKeyhole,
    },
  ];
  return (
    <nav
      className="settings-navigation"
      aria-label={pt ? "Configurações" : "Settings"}
    >
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
        >
          <Icon size={17} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
