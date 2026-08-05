import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * The client the share cards read with: no cookies, no session, no headers.
 *
 * Share cards are fetched by Discord, WhatsApp, Slack and the search crawlers,
 * none of which send a cookie, so every card was already being rendered as an
 * anonymous visitor. What the cookie-bound client added was not access, it was
 * a `cookies()` call, and that one call opts a route out of every cache Next
 * has: the card was regenerated from scratch on each unfurl, counts, avatar
 * fetch, PNG encode and all.
 *
 * Reading as `anon` is also the honest thing for a picture that gets posted in
 * a group chat: whatever row level security hides from a stranger is exactly
 * what a share card should not be putting on screen.
 *
 * Removing the cookie is the whole fix. Next caches these routes on its own:
 * per its docs, `opengraph-image` and `twitter-image` "are special Route
 * Handlers that is cached by default unless it uses a Request-time API". There
 * is no cache setting to add, and adding one is rejected outright, which is
 * how the first attempt at this failed the build.
 */
export const getOgSupabase = cache(() =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  ),
);

/**
 * Wraps a card's data reading so Next will actually cache the card.
 *
 * Removing the cookie was necessary but not sufficient. The docs say these
 * routes are cached "unless it uses a Request-time API **or uncached data**",
 * and a Supabase query is uncached data: supabase-js brings its own fetch, so
 * Next sees an opaque call it cannot reason about and keeps the route dynamic.
 * Measured after the cookie was gone, the profile card still took 1.27s on
 * every single request.
 *
 * The key has to carry everything the result depends on, which for a card is
 * the route parameters. Same shape the IGDB layer already uses.
 */
export function cachedCardData<T>(
  key: readonly string[],
  read: () => Promise<T>,
): Promise<T> {
  return unstable_cache(read, ["og-card", ...key], {
    revalidate: OG_CARD_SECONDS,
  })();
}

/**
 * An hour. A card is a snapshot of something that changes slowly, and the cost
 * of it being an hour stale is a count off by one in a picture; the cost of
 * not caching it is a full render, avatar fetch and PNG encode on every
 * unfurl, which is what people were waiting on.
 */
export const OG_CARD_SECONDS = 3600;
