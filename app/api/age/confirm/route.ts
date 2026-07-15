import { cookies } from "next/headers";
import { ageOnDate } from "@/lib/age-access";
import {
  ANONYMOUS_AGE_COOKIE,
  anonymousAgeCookieOptions,
  createAnonymousAgeAssertion,
} from "@/lib/anonymous-age";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    birthDate?: unknown;
    minimumAge?: unknown;
  } | null;
  const birthDate = typeof body?.birthDate === "string" ? body.birthDate : "";
  const minimumAge = Number(body?.minimumAge);
  const age = ageOnDate(birthDate);
  if (
    age === null ||
    age < 0 ||
    age > 120 ||
    !Number.isInteger(minimumAge) ||
    minimumAge < 0 ||
    minimumAge > 19
  ) {
    return Response.json({ error: "invalid_age" }, { status: 400 });
  }
  (await cookies()).set(
    ANONYMOUS_AGE_COOKIE,
    createAnonymousAgeAssertion(age),
    anonymousAgeCookieOptions,
  );
  return Response.json({ eligible: age >= minimumAge });
}
