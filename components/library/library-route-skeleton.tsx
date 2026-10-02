"use client";

import { useSearchParams } from "next/navigation";
import { LibrarySkeleton } from "./library-skeleton";

export function LibraryRouteSkeleton() {
  const params = useSearchParams();
  return (
    <LibrarySkeleton
      series={params.get("shelf") === "series"}
      copies={params.get("shelf") === "copies"}
      view={params.get("view") === "list" ? "list" : "grid"}
    />
  );
}
