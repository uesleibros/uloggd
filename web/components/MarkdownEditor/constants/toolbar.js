export const TOOLBAR_GROUPS = {
  text: ["heading", "bold", "italic", "strikethrough"],
  links: ["link", "image", "imagesize", "youtube"],
  code: ["code", "codeblock"],
  lists: ["ul", "ol", "checklist"],
  blocks: ["quote", "spoiler", "spoilerimage", "hr", "alert", "center", "desktop", "mobile", "mention", "table"],
}

export const TOOLBAR_TOOLTIPS = {
  heading: "Título",
  bold: "Negrito (Ctrl+B)",
  italic: "Itálico (Ctrl+I)",
  strikethrough: "Riscado (Ctrl+Shift+X)",
  link: "Link (Ctrl+K)",
  image: "Imagem",
  imagesize: "Imagem com tamanho",
  youtube: "Vídeo do YouTube",
  code: "Código inline (Ctrl+E)",
  codeblock: "Bloco de código (Ctrl+Shift+C)",
  ul: "Lista (Ctrl+Shift+L)",
  ol: "Lista numerada (Ctrl+Shift+O)",
  checklist: "Checklist",
  quote: "Citação",
  spoiler: "Spoiler texto",
  spoilerimage: "Imagem com spoiler",
  hr: "Separador",
  alert: "Alerta / Callout",
  center: "Centralizar",
  desktop: "Mostrar apenas no Desktop",
  mobile: "Mostrar apenas no Mobile",
  mention: "Mencionar usuário",
  table: "Tabela",
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
