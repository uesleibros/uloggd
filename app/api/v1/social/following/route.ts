import { socialCollection } from "@/lib/api/social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = socialCollection("following");
