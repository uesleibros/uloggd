export const TOOLBAR_GROUPS = {
  text: ["heading", "bold", "italic", "strikethrough"],
  links: ["link", "image", "imagesize", "youtube"],
  code: ["code", "codeblock"],
  lists: ["ul", "ol", "checklist"],
  blocks: ["quote", "spoiler", "spoilerimage", "hr", "alert", "center", "desktop", "mobile", "mention", "table"],
}

export const TOOLBAR_TOOLTIPS = {
  heading: "Heading",
  bold: "Bold (Ctrl+B)",
  italic: "Italic (Ctrl+I)",
  strikethrough: "Strikethrough (Ctrl+Shift+X)",
  link: "Link (Ctrl+K)",
  image: "Image",
  imagesize: "Image with size",
  youtube: "YouTube video",
  code: "Inline code (Ctrl+E)",
  codeblock: "Code block (Ctrl+Shift+C)",
  ul: "List (Ctrl+Shift+L)",
  ol: "Numbered list (Ctrl+Shift+O)",
  checklist: "Checklist",
  quote: "Quote",
  spoiler: "Spoiler text",
  spoilerimage: "Spoiler image",
  hr: "Separator",
  alert: "Alert / Callout",
  center: "Center",
  desktop: "Show on Desktop only",
  mobile: "Show on Mobile only",
  mention: "Mention user",
  table: "Table",
}

export const TOOLBAR_ITEMS = [
  ...TOOLBAR_GROUPS.text,
  "divider",
  ...TOOLBAR_GROUPS.links,
  "divider",
  ...TOOLBAR_GROUPS.code,
  "divider",
  ...TOOLBAR_GROUPS.lists,
  "divider",
  ...TOOLBAR_GROUPS.blocks,
]

export const KEYBOARD_SHORTCUTS = {
  "ctrl+b": "bold",
  "ctrl+i": "italic",
  "ctrl+k": "link",
  "ctrl+e": "code",
  "ctrl+shift+x": "strikethrough",
  "ctrl+shift+l": "ul",
  "ctrl+shift+o": "ol",
  "ctrl+shift+c": "codeblock",
}

export const HEADING_LEVELS = [1, 2, 3, 4, 5, 6]
