"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

/** A server pager starts the new results at the top, including query-only moves. */
export function PaginationLink(props: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      scroll={false}
      onNavigate={() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }}
    />
  );
}
