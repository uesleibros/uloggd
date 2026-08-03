/**
 * How the auth cookies are written, stated once for all three writers: the
 * browser client, the server client and the proxy.
 *
 * `secure` was missing everywhere, which meant a network position that could
 * downgrade one request to plain HTTP could read the session. `Strict` would
 * break arriving from an external link signed in, so `lax` is the ceiling.
 *
 * What is deliberately NOT here is `httpOnly`, and it cannot be. The whole
 * client side of this site talks to PostgREST directly with the user's JWT,
 * which the browser client reads out of `document.cookie`; an httpOnly cookie
 * is invisible to JavaScript by definition, so flipping it would silently turn
 * every client-side call anonymous. Closing that would mean proxying all data
 * access through the server, which is an architecture change, not a flag.
 * Until then, the XSS surface is what has to stay closed: no dangerouslySet
 * markup outside the sanitized markdown pipeline, and a CSP would be the next
 * real step.
 */
export const AUTH_COOKIE_OPTIONS = {
  // Build-time constant in the browser bundle; secure cookies on plain-HTTP
  // localhost would otherwise vanish in development.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;
