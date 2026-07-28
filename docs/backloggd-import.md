# Backloggd source access

The importer reads only public game collection pages and parses them with `h1-parser@1.0.2`. When Backloggd presents its public Anubis/BotStopper proof-of-work challenge, the server completes the official `fast` SHA-256 protocol in a short-lived in-memory session before parsing the collection.

Challenge input is parsed as untrusted data. Only the official `fast` method, a canonical challenge UUID, 128 hexadecimal random-data characters, a local base prefix, and difficulty up to 5 are accepted. Solving stops after 2.5 million nonces or 8 seconds. Cookies are restricted to `backloggd.com`, capped at 8 KiB, used only for the current import, and never persisted or returned to the browser.

## Optional partner bypass

If Backloggd offers a dedicated bypass, prefer a secret request header for the collection route to avoid unnecessary proof-of-work. Agree on the header name and a randomly generated value, then configure both as encrypted Vercel environment variables:

```text
BACKLOGGD_PARTNER_HEADER_NAME=X-Uloggd-Partner-Key
BACKLOGGD_PARTNER_HEADER_VALUE=<shared secret>
```

The value is read only in the Node.js route, is sent only to the allowlisted `backloggd.com` collection URL, and is never returned to the browser or written to logs. Configure neither variable until Backloggd confirms the exact header name; a partial or unsafe configuration fails closed.

The default User-Agent identifies the live uloggd origin, such as `uloggd-partner-import/1.0 (+https://dev.uloggd.com)`. If Backloggd agrees on a fixed identifier, set `BACKLOGGD_PARTNER_USER_AGENT` in Vercel to that exact value.

If Backloggd requires IP allowlisting instead of a secret header, the project needs Vercel Static IPs or Secure Compute because ordinary function egress addresses are not fixed.

## Diagnostics

Failed preview rows remain in `backloggd_imports` with an `error_code`. The API and settings UI return the import UUID as a safe reference. Search Vercel runtime logs for either that UUID or these structured events:

```text
[backloggd-import] preview rejected
[backloggd-import] preview failed
[backloggd-import] commit failed
```

`partner_access_required` means the challenge was unsupported, exceeded the bounded work limits, or remained active after a valid proof. It is reported as HTTP 503, not as a generic 502. Successful proofs emit `[backloggd-import] source challenge solved`. No game is written before a validated preview is explicitly confirmed.
