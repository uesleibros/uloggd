/** One lightweight event shared by every mutation that can change XP. */
export const XP_REFRESH_EVENT = "uloggd:xp-refresh";

export type XpRefreshDetail = {
  /** Creation announces a gain; deletion only synchronizes the baseline. */
  announce: boolean;
};

export function requestXpRefresh(announce = true) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<XpRefreshDetail>(XP_REFRESH_EVENT, {
      detail: { announce },
    }),
  );
}
