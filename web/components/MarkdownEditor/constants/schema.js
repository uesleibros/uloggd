import { defaultSchema } from "rehype-sanitize"

const CUSTOM_TAGS = [
  "details", "summary", "iframe", "img", "spoiler", "spoilerimg",
  "div", "center", "mention", "game-card", "game-grid", "game-grid-auto",
  "svg", "path", "hr", "alert-box", "desktop", "mobile",
]

const ALIGNABLE_TAGS = ["p", "h1", "h2", "h3", "h4", "h5", "h6"]

export const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), ...CUSTOM_TAGS],
  attributes: {
    ...defaultSchema.attributes,
    img: ["src", "alt", "width", "height", "loading", "style"],
    spoilerimg: ["src", "alt", "width", "height"],
    iframe: ["src", "title", "allow", "allowfullscreen", "class", "className"],
    details: ["class", "className"],
    summary: ["class", "className"],
    div: [...(defaultSchema.attributes?.div || []), "class", "className", "style", "align"],
    ...Object.fromEntries(ALIGNABLE_TAGS.map(tag => [tag, ["style", "align"]])),
    hr: [],
    center: [],
    mention: [],
    spoiler: [],
    desktop: [],
    mobile: [],
    "alert-box": ["type"],
    "game-card": ["slug", "variant"],
    "game-grid": ["slugs"],
    "game-grid-auto": ["slugs"],
    svg: ["className", "class", "fill", "stroke", "viewBox", "strokeWidth", "width", "height"],
    path: ["d", "strokeLinecap", "strokeLinejoin"],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ["https"],
  },
}
