import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Records a view. The client posts here on the game/profile/list pages; auth
// comes from the request cookies (server-side), so the RPC always runs as the
// signed-in viewer — no dependence on the browser session being warm yet.
export async function POST(request: NextRequest) {
  let body: {
    type?: "game" | "profile" | "list";
    gameIgdbId?: number;
    gameSlug?: string;
    profileId?: string;
    listId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (body.type !== "game" && body.type !== "profile" && body.type !== "list") {
    return Response.json({ ok: false }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_content_view", {
    p_type: body.type,
    p_game_igdb_id: body.gameIgdbId ?? null,
    p_game_slug: body.gameSlug ?? null,
    p_profile_id: body.profileId ?? null,
    p_list_id: body.listId ?? null,
  });
  if (error) {
    console.error("record_content_view failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true });
}
