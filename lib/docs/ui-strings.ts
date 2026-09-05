import type { UiLang } from "@/lib/ui-text";

/**
 * The reference's own furniture, in the reader's language.
 *
 * fumadocs keys these by its own English sentence plus the note it passes for
 * context, which is why "Search(search trigger)" and "Search(search dialog)"
 * are two entries: the left-hand side is the key its lookup builds, not a name
 * anybody chose. Generated from the package rather than guessed, so a key that
 * stopped existing shows up as a translation that stopped applying.
 *
 * English is absent on purpose: with no entry the lookup falls back to the
 * key's own text, which is already the English.
 */
const PT: Record<string, string> = {
  "Back to Home(404 page)": "Voltar ao início",
  "Choose a language(language switcher)": "Escolher o idioma",
  "Choose a language(language switcher)(aria-label)": "Escolher o idioma",
  "Close Banner(banner)(aria-label)": "Fechar o aviso",
  "Close Search(search dialog)(aria-label)": "Fechar a busca",
  "Close Sidebar(aria-label)": "Fechar o menu",
  "Close Sidebar(sidebar)(aria-label)": "Fechar o menu",
  "Collapse Sidebar(sidebar)(aria-label)": "Recolher o menu",
  "Copied Text(code block)(aria-label)": "Texto copiado",
  "Copy Anchor Link(heading anchor)(aria-label)": "Copiar o link da seção",
  "Copy Link(accordion)(aria-label)": "Copiar o link",
  "Copy Markdown(page actions)": "Copiar o Markdown",
  "Copy Text(code block)(aria-label)": "Copiar o texto",
  "Dark(theme switcher)(aria-label)": "Escuro",
  "Default(type table)": "Padrão",
  "Hide Sidebar(sidebar)": "Esconder o menu",
  "Last updated on(page footer)": "Atualizado em",
  "Light(theme switcher)(aria-label)": "Claro",
  "Next Page(pagination)": "Próxima",
  "No Headings(table of contents)": "Sem seções",
  "On this page(table of contents)": "Nesta página",
  "Open Search(search trigger)(aria-label)": "Abrir a busca",
  "Open Sidebar(sidebar)(aria-label)": "Abrir o menu",
  "Open(page actions)": "Abrir",
  "Page Not Found(404 page)": "Página não encontrada",
  "Parameters(type table)": "Parâmetros",
  "Previous Page(pagination)": "Anterior",
  "Prop(type table)": "Campo",
  "Returns(type table)": "Retorna",
  "Search(search dialog)": "Buscar",
  "Search(search trigger)": "Buscar",
  "Show Sidebar(sidebar)": "Mostrar o menu",
  "System(theme switcher)(aria-label)": "Do sistema",
  "Table of Contents(inline table of contents)": "Índice",
  "Toggle Menu(mobile menu)(aria-label)": "Abrir o menu",
  "Toggle Theme(theme switcher)(aria-label)": "Trocar o tema",
  "Type(type table)": "Tipo",
  "View as Markdown(page actions)": "Ver como Markdown",
};

const ES: Record<string, string> = {
  "Back to Home(404 page)": "Volver al inicio",
  "Choose a language(language switcher)": "Elegir el idioma",
  "Choose a language(language switcher)(aria-label)": "Elegir el idioma",
  "Close Banner(banner)(aria-label)": "Cerrar el aviso",
  "Close Search(search dialog)(aria-label)": "Cerrar la búsqueda",
  "Close Sidebar(aria-label)": "Cerrar el menú",
  "Close Sidebar(sidebar)(aria-label)": "Cerrar el menú",
  "Collapse Sidebar(sidebar)(aria-label)": "Plegar el menú",
  "Copied Text(code block)(aria-label)": "Texto copiado",
  "Copy Anchor Link(heading anchor)(aria-label)":
    "Copiar el enlace de la sección",
  "Copy Link(accordion)(aria-label)": "Copiar el enlace",
  "Copy Markdown(page actions)": "Copiar el Markdown",
  "Copy Text(code block)(aria-label)": "Copiar el texto",
  "Dark(theme switcher)(aria-label)": "Oscuro",
  "Default(type table)": "Por defecto",
  "Hide Sidebar(sidebar)": "Ocultar el menú",
  "Last updated on(page footer)": "Actualizado el",
  "Light(theme switcher)(aria-label)": "Claro",
  "Next Page(pagination)": "Siguiente",
  "No Headings(table of contents)": "Sin secciones",
  "On this page(table of contents)": "En esta página",
  "Open Search(search trigger)(aria-label)": "Abrir la búsqueda",
  "Open Sidebar(sidebar)(aria-label)": "Abrir el menú",
  "Open(page actions)": "Abrir",
  "Page Not Found(404 page)": "Página no encontrada",
  "Parameters(type table)": "Parámetros",
  "Previous Page(pagination)": "Anterior",
  "Prop(type table)": "Campo",
  "Returns(type table)": "Devuelve",
  "Search(search dialog)": "Buscar",
  "Search(search trigger)": "Buscar",
  "Show Sidebar(sidebar)": "Mostrar el menú",
  "System(theme switcher)(aria-label)": "Del sistema",
  "Table of Contents(inline table of contents)": "Índice",
  "Toggle Menu(mobile menu)(aria-label)": "Abrir el menú",
  "Toggle Theme(theme switcher)(aria-label)": "Cambiar el tema",
  "Type(type table)": "Tipo",
  "View as Markdown(page actions)": "Ver como Markdown",
};

export function docsUiStrings(lang: UiLang) {
  if (lang === "pt-BR") return PT;
  if (lang === "es") return ES;
  return undefined;
}
