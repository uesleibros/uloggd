import { z } from "zod";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";

const inputSchema = z.object({ importId: z.uuid() });

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "invalid_origin" }, { status: 403 });
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > 2_048)
    return Response.json({ error: "invalid_import" }, { status: 400 });
  let parsed: ReturnType<typeof inputSchema.safeParse>;
  try {
    const text = await request.text();
    if (text.length > 2_048)
      return Response.json({ error: "invalid_import" }, { status: 400 });
    parsed = inputSchema.safeParse(JSON.parse(text));
  } catch {
    return Response.json({ error: "invalid_import" }, { status: 400 });
  }
  if (!parsed.success)
    return Response.json({ error: "invalid_import" }, { status: 400 });

  const [user, supabase] = await Promise.all([getAuthUser(), getSupabase()]);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase.rpc("commit_backloggd_import", {
    import_id: parsed.data.importId,
  });
  if (error) {
    const message = error.message.toLowerCase();
    const code = message.includes("expired")
      ? "preview_expired"
      : message.includes("not found")
        ? "import_not_found"
        : message.includes("not available")
          ? "import_unavailable"
          : "import_failed";
    return Response.json(
      { error: code },
      {
        status:
          code === "import_not_found"
            ? 404
            : code === "import_failed"
              ? 500
              : 409,
      },
    );
  }
  return Response.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
