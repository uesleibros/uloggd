import type { NextRequest } from "next/server";
import { z } from "zod";

const reportSchema = z.object({
  message: z.string().min(1).max(500),
  digest: z.string().max(120).optional(),
  stack: z.string().max(4000).optional(),
  path: z.string().max(300).optional(),
});

// Client error boundaries report here so production failures reach the
// server logs; nothing is stored and nothing sensitive is echoed back.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });
  const { message, digest, stack, path } = parsed.data;
  console.error(
    `[client-error]${digest ? ` digest=${digest}` : ""}${path ? ` path=${path}` : ""} ${message}`,
    stack ? `\n${stack}` : "",
  );
  return new Response(null, { status: 204 });
}
