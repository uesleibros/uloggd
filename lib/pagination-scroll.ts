/** Keep pagination inside its result section, including query-only navigation. */
export function scrollPaginationResults(source: HTMLElement | null) {
  const scope = source?.closest("[data-pagination-scope]");
  const start = scope?.querySelector<HTMLElement>("[data-pagination-start]");
  if (!start) return;
  // Disabling the clicked pager can cancel a scroll started in that same event.
  requestAnimationFrame(() => {
    if (!start.isConnected) return;
    const reduced =
      document.documentElement.dataset.reduceMotion === "true" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    start.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: reduced ? "instant" : "smooth",
    });
  });
}
