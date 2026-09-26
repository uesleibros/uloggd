/**
 * Whether a cookie-authenticated request came from this site.
 *
 * A cookie is only proof that a browser has a session, not that the person
 * behind it meant to send this request: any other site can make the browser
 * send it. A key travels in a header nobody else can set, so it needs no such
 * check, which is why this guards the cookie path alone.
 *
 * It compares against the **forwarded host**, not against `request.url`.
 *
 * That distinction is the whole reason this file exists. Four routes had
 * grown a copy of this check that read `new URL(request.url).origin`, which
 * works on a laptop and fails on the only deployment this has: the browser
 * sends `Origin: https://uloggd.com`, Cloudflare passes the request to a
 * cleartext listener this process owns, and `request.url` is that listener's
 * address. The two never matched, so importing a Backloggd profile answered
 * `invalid_origin` in production and worked perfectly in development, which
 * is the shape of bug that survives a long time.
 *
 * `proxy.ts` carries the same warning about `request.nextUrl.origin` for the
 * same reason. Anything that needs to know where a request really came from
 * asks the headers the edge sets, and it asks them here rather than growing
 * a fifth copy.
 *
 * No `server-only` marker, unlike the rest of `lib/api`: this reads headers
 * off a `Request` and holds no secret, nothing but server routes import it,
 * and the marker is a build-time shim the unit tests cannot resolve. The
 * test below is worth more than the marker would be.
 */
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // No Origin header at all: a same-site navigation or a non-browser caller.
  // `sec-fetch-site` is what a browser says instead, and anything that is
  // not cross-site is allowed through. The copies this replaced returned
  // `true` here without asking, which let a cross-site form post that omits
  // Origin reach routes that write.
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}
