import { z } from "zod";
import {
  BackloggdImportError,
  collectAndValidateBackloggdGames,
} from "@/lib/backloggd-import";
import { normalizeBackloggdUsername } from "@/lib/backloggd/parser";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const inputSchema = z.object({ profile: z.string().trim().min(1).max(200) });

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function readInput(request: Request) {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > 4_096) return null;
  const text = await request.text();
  if (text.length > 4_096) return null;
  try {
    return inputSchema.safeParse(JSON.parse(text));
  } catch {
    return null;
  }
}

function errorStatus(error: BackloggdImportError) {
  if (error.code === "profile_not_found") return 404;
  if (error.code === "profile_private") return 403;
  if (error.code === "source_too_large") return 413;
  return 502;
}

async function existingGameIds(
  profileId: string,
  ids: number[],
  supabase: Awaited<ReturnType<typeof getSupabase>>,
) {
  const batches: number[][] = [];
  for (let index = 0; index < ids.length; index += 300)
    batches.push(ids.slice(index, index + 300));
  const rows = await Promise.all(
    batches.map((batch) =>
      supabase
        .from("user_games")
        .select("igdb_id")
        .eq("profile_id", profileId)
        .in("igdb_id", batch),
    ),
  );
  const failure = rows.find(({ error }) => error)?.error;
  if (failure) throw failure;
  return new Set(
    rows.flatMap(({ data }) => data ?? []).map((row) => row.igdb_id),
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "invalid_origin" }, { status: 403 });
  const parsed = await readInput(request);
  if (!parsed?.success)
    return Response.json({ error: "invalid_profile" }, { status: 400 });
  const username = normalizeBackloggdUsername(parsed.data.profile);
  if (!username)
    return Response.json({ error: "invalid_profile" }, { status: 400 });

  const [user, supabase] = await Promise.all([getAuthUser(), getSupabase()]);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }

  const now = Date.now();
  const tenMinutesAgo = new Date(now - 10 * 60 * 1_000).toISOString();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1_000).toISOString();
  await admin
    .from("backloggd_imports")
    .delete()
    .eq("profile_id", user.id)
    .lt("created_at", oneDayAgo);
  const { count, error: limitError } = await admin
    .from("backloggd_imports")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .gte("created_at", tenMinutesAgo);
  if (limitError)
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  if ((count ?? 0) >= 3)
    return Response.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "600" } },
    );

  const importId = crypto.randomUUID();
  const { error: createError } = await admin.from("backloggd_imports").insert({
    id: importId,
    profile_id: user.id,
    source_username: username,
    status: "FETCHING",
  });
  if (createError)
    return Response.json({ error: "service_unavailable" }, { status: 503 });

  try {
    const result = await collectAndValidateBackloggdGames(username);
    const sourceOrder = new Map(
      result.sourceGames.map((game, index) => [game.slug, index]),
    );
    const validated = [...result.validatedGames].sort(
      (a, b) =>
        (sourceOrder.get(a.slug) ?? Number.MAX_SAFE_INTEGER) -
        (sourceOrder.get(b.slug) ?? Number.MAX_SAFE_INTEGER),
    );
    const existing = await existingGameIds(
      user.id,
      validated.map((game) => game.id),
      supabase,
    );
    const expiresAt = new Date(now + 30 * 60 * 1_000).toISOString();
    const items = validated.map((game) => ({
      igdb_id: game.id,
      game_slug: game.slug,
    }));
    const { error: updateError } = await admin
      .from("backloggd_imports")
      .update({
        status: "PREVIEWED",
        source_count: result.sourceGames.length,
        validated_count: validated.length,
        items,
        error_code: null,
        expires_at: expiresAt,
      })
      .eq("id", importId)
      .eq("profile_id", user.id);
    if (updateError) throw updateError;

    const games = validated.slice(0, 48).map((game) => ({
      id: game.id,
      name: game.name,
      slug: game.slug,
      coverUrl: game.coverUrl,
      releaseYear: game.releaseYear,
      alreadySaved: existing.has(game.id),
    }));
    return Response.json(
      {
        importId,
        sourceUsername: username,
        discoveredCount: result.sourceGames.length,
        validatedCount: validated.length,
        existingCount: existing.size,
        readyCount: validated.length - existing.size,
        skippedCount: result.unmatchedGames.length,
        games,
        previewedCount: games.length,
        expiresAt,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const code =
      error instanceof BackloggdImportError
        ? error.code
        : "catalog_unavailable";
    await admin
      .from("backloggd_imports")
      .update({ status: "FAILED", error_code: code, items: [] })
      .eq("id", importId)
      .eq("profile_id", user.id);
    if (!(error instanceof BackloggdImportError))
      console.error("[backloggd-import] preview failed", error);
    return Response.json(
      { error: code },
      {
        status:
          error instanceof BackloggdImportError ? errorStatus(error) : 502,
      },
    );
  }
}
