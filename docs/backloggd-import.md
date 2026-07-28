# Backloggd partner access

The importer reads only public game collection pages. It deliberately does not solve or automate Backloggd's Anubis/BotStopper challenge. Backloggd must allow the partner request before an import can reach IGDB validation.

## Preferred setup

Ask Backloggd to allow a secret request header for the collection route. Agree on the header name and a randomly generated value, then configure both as encrypted Vercel environment variables:

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

`partner_access_required` means Backloggd returned its challenge page before catalog validation. It is reported as HTTP 503, not as a generic 502. No game is written before a validated preview is explicitly confirmed.
