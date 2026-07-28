import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Shared shadcn class combiner: conditional classes first, Tailwind conflicts last. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
