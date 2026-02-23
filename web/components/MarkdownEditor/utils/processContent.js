const CONTENT_TRANSFORMS = [
  { pattern: /<center>([\s\S]*?)(?:<\/center>|(?=<center>)|$)/gi, replace: (match, inner) => match.endsWith("</center>") ? match : `<center>${inner}</center>` },
  { pattern: /!game:mini\(([^)\n]+)\)/g, replace: '<game-card slug="$1" variant="mini"></game-card>' },
  { pattern: /!game:grid-auto\(([^)\n]+)\)/g, replace: '<game-grid-auto slugs="$1"></game-grid-auto>' },
  { pattern: /!game:grid\(([^)\n]+)\)/g, replace: '<game-grid slugs="$1"></game-grid>' },
  { pattern: /!game\(([^)\n]+)\)/g, replace: '<game-card slug="$1"></game-card>' },
  { pattern: /@(\w+)/g, replace: '<mention>$1</mention>' },
]

export function processContent(content) {
  let result = content

  for (const { pattern, replace } of CONTENT_TRANSFORMS) {
    result = result.replace(pattern, replace)
  }

  result = result.replace(
    /(```[\s\S]*?```|`[^`\n]+`)|\|\|(.+?)\|\|/g,
    (match, code, spoiler) => code ? code : `<spoiler>${spoiler}</spoiler>`
  )

  return result
}