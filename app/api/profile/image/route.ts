import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 3 * 1024 * 1024;

function isKind(
  value: FormDataEntryValue | null,
): value is "avatar" | "banner" {
  return value === "avatar" || value === "banner";
}

async function hasValidSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png")
    return bytes
      .slice(0, 8)
      .every(
        (byte, index) =>
          byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index],
      );
  if (file.type === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const apiKey = process.env.IMGCHEST_API_KEY;
  if (!apiKey)
    return Response.json({ error: "upload_unavailable" }, { status: 503 });

  const input = await request.formData();
  const kind = input.get("kind");
  const image = input.get("image");
  if (!isKind(kind) || !(image instanceof File)) {
    return Response.json({ error: "invalid_upload" }, { status: 400 });
  }
  if (
    !allowedTypes.has(image.type) ||
    image.size <= 0 ||
    image.size > maxBytes ||
    !(await hasValidSignature(image))
  ) {
    return Response.json({ error: "invalid_image" }, { status: 400 });
  }

  const upload = new FormData();
  upload.append("images[]", image, `${kind}-${user.id}.webp`);
  upload.append("privacy", "hidden");

  let response: Response;
  try {
    response = await fetch("https://api.imgchest.com/v1/post", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upload,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return Response.json({ error: "upload_failed" }, { status: 502 });
  }
  if (!response.ok)
    return Response.json({ error: "upload_failed" }, { status: 502 });

  const payload = (await response.json()) as {
    data?: { images?: Array<{ link?: string }> };
  };
  const url = payload.data?.images?.[0]?.link;
  if (!url || !/^https:\/\/(?:cdn\.)?imgchest\.com\//i.test(url)) {
    return Response.json({ error: "upload_failed" }, { status: 502 });
  }

  const column = kind === "avatar" ? "avatar_url" : "banner_url";
  const { error } = await supabase
    .from("profiles")
    .update({ [column]: url })
    .eq("id", user.id);
  if (error)
    return Response.json({ error: "profile_update_failed" }, { status: 500 });
  return Response.json({ url });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind !== "avatar" && kind !== "banner") {
    return Response.json({ error: "invalid_kind" }, { status: 400 });
  }
  const column = kind === "avatar" ? "avatar_url" : "banner_url";
  const { error } = await supabase
    .from("profiles")
    .update({ [column]: null })
    .eq("id", user.id);
  if (error)
    return Response.json({ error: "profile_update_failed" }, { status: 500 });
  return Response.json({ url: null });
}
