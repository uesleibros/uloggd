// Reduces markdown (including uloggd shortcuts) to plain text for contexts
// like cards and Open Graph descriptions.
export function stripMarkdown(source: string) {
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/!game(?::[a-z-]+)?\(([^)]*)\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^:::\s*\w*\s*$/gm, " ")
    .replace(/\|\|/g, "")
    .replace(/[*_~`#>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
