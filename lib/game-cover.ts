export function resolveGameCover(
  defaultCover: string,
  customCover?: string | null,
) {
  return customCover || defaultCover;
}
