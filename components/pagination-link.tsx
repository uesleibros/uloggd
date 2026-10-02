"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { ShallowLink } from "@/components/shallow-link";
import { scrollPaginationResults } from "@/lib/pagination-scroll";

/** Server and shallow pagers share the same result-section scroll destination. */
export function PaginationLink({
  shallow,
  ...props
}: ComponentProps<typeof Link> & { shallow?: boolean }) {
  if (shallow)
    return (
      <ShallowLink
        {...props}
        href={String(props.href)}
        scroll={false}
        onClick={(event) => {
          props.onClick?.(event);
          if (
            !event.defaultPrevented &&
            event.button === 0 &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey
          )
            scrollPaginationResults(event.currentTarget);
        }}
      />
    );
  return (
    <Link
      {...props}
      scroll={false}
      onClick={(event) => {
        props.onClick?.(event);
        if (
          !event.defaultPrevented &&
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        )
          scrollPaginationResults(event.currentTarget);
      }}
    />
  );
}
