import { z } from "zod";
import { ApiFailure } from "./route";
import type { ActivityOptions } from "@/lib/activity-types";

const schema = z.object({
  profile: z.uuid().optional(),
  profiles: z
    .string()
    .transform((s) => s.split(","))
    .pipe(z.array(z.uuid()).max(1000))
    .optional(),
  game: z.coerce.number().int().positive().optional(),
  kinds: z
    .string()
    .transform((s) => s.split(","))
    .pipe(
      z
        .array(z.enum(["review", "diary", "screenshot"]))
        .min(1)
        .max(3),
    )
    .optional(),
  limit: z.coerce.number().int().min(1).max(180).default(30),
  offset: z.coerce.number().int().min(0).max(60000).default(0),
  before: z.iso.datetime({ offset: true }).optional(),
  rating: z
    .enum(["rated", "great", "positive", "mixed", "low", "unrated"])
    .optional(),
  spoilers: z.enum(["all", "hide", "only"]).optional(),
  order: z.enum(["recent", "oldest", "rating"]).optional(),
  q: z.string().trim().max(120).optional(),
});

export function activityInput(request: Request): ActivityOptions {
  const parsed = schema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    throw new ApiFailure("invalid_request", "Invalid activity filters.");
  const value = parsed.data;
  if (value.offset && value.kinds?.length !== 1)
    throw new ApiFailure(
      "invalid_request",
      "offset requires exactly one kind.",
    );
  return {
    profileId: value.profile,
    profileIds: value.profiles,
    gameId: value.game,
    kinds: value.kinds,
    limit: value.limit,
    offset: value.offset,
    before: value.before,
    rating: value.rating,
    spoilers: value.spoilers,
    order: value.order,
    search: value.q,
  };
}
