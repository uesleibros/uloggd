import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ApiKeyIdentity = {
  keyId: string;
  profileId: string;
  scopes: string[];
};

type ResolvedRow = { key_id: string; profile_id: string; scopes: string[] };

export async function identifyRequest(
  request: Request,
): Promise<ApiKeyIdentity | null> {
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
    keyId: rows[0].key_id,
    profileId: rows[0].profile_id,
    scopes: rows[0].scopes ?? [],
  };
}

export function holdsScope(identity: ApiKeyIdentity, scope: string) {
  return identity.scopes.includes(scope);
}
