import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const ANONYMOUS_AGE_COOKIE = "uloggd_age_assertion";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  const value =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.TWITCH_CLIENT_SECRET;
  if (!value) throw new Error("Missing server secret for age assertion");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createAnonymousAgeAssertion(age: number) {
  const payload = `${age}.${Math.floor(Date.now() / 1000)}`;
  return `${payload}.${signature(payload)}`;
}

export function readAnonymousAgeAssertion(value: string | undefined) {
  if (!value) return null;
  const [ageValue, issuedValue, receivedSignature, ...extra] = value.split(".");
  if (extra.length || !ageValue || !issuedValue || !receivedSignature)
    return null;
  const age = Number(ageValue);
  const issuedAt = Number(issuedValue);
  if (
    !Number.isInteger(age) ||
    age < 0 ||
    age > 120 ||
    !Number.isInteger(issuedAt)
  )
    return null;
  const now = Math.floor(Date.now() / 1000);
  if (issuedAt > now + 60 || now - issuedAt > MAX_AGE_SECONDS) return null;
  const expected = signature(`${ageValue}.${issuedValue}`);
  const received = Buffer.from(receivedSignature);
  const valid = Buffer.from(expected);
  if (received.length !== valid.length || !timingSafeEqual(received, valid))
    return null;
  return age;
}

export const anonymousAgeCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  priority: "high" as const,
};
