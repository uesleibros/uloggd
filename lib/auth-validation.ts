import { z } from "zod";

export const emailSchema = z.string().trim().email();
export const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[a-zA-Z]/)
  .regex(/[0-9]/);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(32)
  .regex(/^[a-z0-9](?!.*__)[a-z0-9_]*[a-z0-9]$/);

export function safeInternalNext(value: string | null, lang: string) {
  return value?.startsWith(`/${lang}`) && !value.startsWith("//")
    ? value
    : `/${lang}`;
}
