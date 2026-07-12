"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";

type Props = Omit<ComponentProps<typeof Link>, "className"> & {
  children: ReactNode;
  activeClassName?: string;
};

export function ActiveLink({
  href,
  children,
  activeClassName,
  ...props
}: Props) {
  const pathname = usePathname();
  const hrefPath = typeof href === "string" ? href : href.pathname;
  const active = pathname === hrefPath;
  return (
    <Link
      href={href}
      className={active ? activeClassName : undefined}
      aria-current={active ? "page" : undefined}
      {...props}
    >
      {children}
    </Link>
  );
}
