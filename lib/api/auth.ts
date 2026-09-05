import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ApiIdentity =
  | { kind: "key"; keyId: string; profileId: string; scopes: string[] }
  | { kind: "session"; profileId: string };

type ResolvedRow = { key_id: string; profile_id: string; scopes: string[] };

async function fromKey(request: Request): Promise<ApiIdentity | null> {
  const header = request.headers.get("authorization") ?? "";
  const presented = /^Bearer\s+(\S+)$/i.exec(header)?.[1];
  if (!presented) return null;

  const { data, error } = await createAdminClient().rpc("resolve_api_key", {
    raw_token: presented,
  });
  if (error) return null;
  const rows = (data ?? []) as ResolvedRow[];
  if (rows.length === 0) return null;

  return {
    kind: "key",
    keyId: rows[0].key_id,
    profileId: rows[0].profile_id,
    scopes: rows[0].scopes ?? [],
  };
}

/**
 * A cookie is only proof that a browser has a session, not that the person
 * behind it meant to send this request: any other site can make the browser
 * send it. A key travels in a header nobody else can set, so it needs no such
 * check, which is why this one guards the cookie path alone.
 */
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function fromSession(request: Request): Promise<ApiIdentity | null> {
  if (!sameOrigin(request)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;
  if (error || !subject) return null;
  return { kind: "session", profileId: subject };
}

/**
 * Two ways in, one surface behind them.
 *
 * The website is the API's first caller, and it holds a session rather than a
 * key, so asking it to mint one for itself would only be a key nobody could
 * revoke. Both identities answer the same question — whose account is this —
 * and every route past this point reads `profileId` and nothing else.
 */
export async function identifyRequest(
  request: Request,
): Promise<ApiIdentity | null> {
  return (await fromKey(request)) ?? (await fromSession(request));
}

/** A session is the account itself, so it is bounded by nothing but the rules. */
export function holdsScope(identity: ApiIdentity, scope: string) {
  return identity.kind === "session" || identity.scopes.includes(scope);
}
