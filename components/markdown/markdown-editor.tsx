"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import {
  bracketMatching,
  defaultHighlightStyle,
  HighlightStyle,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState, type Range } from "@codemirror/state";
import {
  drawSelection,
  Decoration,
  EditorView,
  keymap,
  lineNumbers,
  placeholder as codeMirrorPlaceholder,
  ViewPlugin,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { tags } from "@lezer/highlight";
import {
  AlignCenter,
  AlertCircle,
  AtSign,
  Bold,
  CheckSquare,
  ChevronDown,
  CircleHelp,
  Code,
  Columns2,
  Contrast,
  Eye,
  EyeOff,
  FileCode2,
  Gamepad2,
  GalleryHorizontal,
  GripVertical,
  Heading,
  Image,
  ImageOff,
  ImagePlus,
  Info,
  Italic,
  Languages,
  LayoutGrid,
  Link2,
  List,
  ListCollapse,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Monitor,
  Pencil,
  Plus,
  Quote,
  Search,
  Smartphone,
  Strikethrough,
  Table,
  Tag,
  X,
  Video,
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { MarkdownContent } from "./markdown-content";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

type Tab = "write" | "preview" | "sidebyside";
type Tool =
  | "bold"
  | "italic"
  | "strikethrough"
  | "link"
  | "image"
  | "imagesize"
  | "youtube"
  | "code"
  | "codeblock"
  | "ul"
  | "ol"
  | "checklist"
  | "quote"
  | "spoiler"
  | "spoilerimage"
  | "hr"
  | "alert"
  | "center"
  | "desktop"
  | "mobile"
  | "mention"
  | "game"
  | "gamemini"
  | "gamegrid"
  | "gamegridauto"
  | "table"
  | "details"
  | "lang"
  | "theme";

/** Kept on the bar itself: what someone reaches for while actually writing. */
const toolGroups: Array<Array<[Tool, ComponentType<{ size?: number }>]>> = [
  [
    ["bold", Bold],
    ["italic", Italic],
    ["strikethrough", Strikethrough],
  ],
  [
    ["link", Link2],
    ["image", Image],
  ],
  [
    ["ul", List],
    ["ol", ListOrdered],
    ["checklist", CheckSquare],
  ],
  [
    ["quote", Quote],
    ["code", Code],
  ],
];

/**
 * Everything else, behind one menu. All 24 tools used to sit in a single
 * horizontally scrolling strip, so most of them were off-screen and the ones
 * you could see were an undifferentiated wall of icons.
 */
const insertGroups: Array<{
  titlePt: string;
  titleEn: string;
  titleEs: string;
  tools: Array<[Tool, ComponentType<{ size?: number }>]>;
}> = [
  {
    titlePt: "Jogos",
    titleEn: "Games",
    titleEs: "Juegos",
    tools: [
      ["game", Gamepad2],
      ["gamemini", Tag],
      ["gamegrid", LayoutGrid],
      ["gamegridauto", GalleryHorizontal],
      ["mention", AtSign],
    ],
  },
  {
    titlePt: "Texto",
    titleEn: "Text",
    titleEs: "Texto",
    tools: [
      ["bold", Bold],
      ["italic", Italic],
      ["strikethrough", Strikethrough],
      ["link", Link2],
      ["quote", Quote],
      ["ul", List],
      ["ol", ListOrdered],
      ["checklist", CheckSquare],
    ],
  },
  {
    titlePt: "Mídia",
    titleEn: "Media",
    titleEs: "Medios",
    tools: [
      ["image", Image],
      ["imagesize", ImagePlus],
      ["youtube", Video],
      ["spoilerimage", ImageOff],
      ["spoiler", EyeOff],
    ],
  },
  {
    titlePt: "Blocos",
    titleEn: "Blocks",
    titleEs: "Bloques",
    tools: [
      ["code", Code],
      ["codeblock", FileCode2],
      ["table", Table],
      ["alert", AlertCircle],
      ["details", ListCollapse],
      ["hr", Minus],
    ],
  },
  {
    titlePt: "uloggd",
    titleEn: "uloggd",
    titleEs: "uloggd",
    tools: [
      ["center", AlignCenter],
      ["lang", Languages],
      ["theme", Contrast],
      ["desktop", Monitor],
      ["mobile", Smartphone],
    ],
  },
];

const shortcuts: Record<string, Tool> = {
  "ctrl+b": "bold",
  "ctrl+i": "italic",
  "ctrl+k": "link",
  "ctrl+e": "code",
  "ctrl+shift+x": "strikethrough",
  "ctrl+shift+l": "ul",
  "ctrl+shift+o": "ol",
  "ctrl+shift+c": "codeblock",
};

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "transparent",
    color: "var(--screen-white)",
    fontSize: "13px",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    lineHeight: "1.65",
  },
  ".cm-content": {
    padding: "15px 12px",
    caretColor: "var(--brand-blurple-bright)",
  },
  ".cm-cursor": { borderLeftColor: "var(--brand-blurple-bright)" },
  ".cm-selectionBackground": {
    backgroundColor:
      "color-mix(in srgb, var(--brand-blurple) 24%, transparent) !important",
  },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid var(--shell-line)",
    color: "var(--screen-muted)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "30px",
    padding: "0 8px 0 5px",
    fontSize: "10px",
  },
  ".cm-activeLineGutter": { color: "var(--screen-dim)" },
  ".cm-placeholder": { color: "var(--screen-muted)" },
});

const markdownHighlightStyle = HighlightStyle.define([
  {
    tag: [
      tags.heading1,
      tags.heading2,
      tags.heading3,
      tags.heading4,
      tags.heading5,
    ],
    color: "var(--screen-white)",
    fontWeight: "700",
  },
  {
    tag: tags.heading6,
    color: "var(--screen-dim)",
    fontWeight: "650",
  },
  {
    tag: tags.strong,
    color: "var(--screen-white)",
    fontWeight: "700",
  },
  {
    tag: tags.emphasis,
    color: "var(--screen-dim)",
    fontStyle: "italic",
  },
  {
    tag: tags.strikethrough,
    color: "var(--screen-muted)",
    textDecoration: "line-through",
  },
  { tag: [tags.link, tags.url], color: "var(--safe-blue)" },
  {
    tag: tags.monospace,
    color: "var(--tonal-brand-text)",
    backgroundColor: "var(--brand-blurple-wash)",
  },
  { tag: tags.list, color: "var(--brand-blurple-bright)" },
  { tag: tags.quote, color: "var(--screen-muted)", fontStyle: "italic" },
  { tag: tags.meta, color: "var(--safe-blue)" },
  { tag: tags.contentSeparator, color: "var(--shell-line-strong)" },
  { tag: tags.tagName, color: "var(--safe-green)" },
  { tag: tags.attributeName, color: "var(--brand-blurple-bright)" },
  { tag: [tags.attributeValue, tags.string], color: "var(--safe-blue)" },
  { tag: tags.comment, color: "var(--screen-muted)", fontStyle: "italic" },
]);

const specialSyntax = ViewPlugin.fromClass(
  class {
    decorations;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(update: import("@codemirror/view").ViewUpdate) {
      if (update.docChanged || update.viewportChanged)
        this.decorations = this.build(update.view);
    }
    build(view: EditorView) {
      const ranges: Array<Range<Decoration>> = [];
      const doc = view.state.doc.toString();
      const patterns = [
        {
          regex: /@[a-zA-Z0-9_]{2,32}/g,
          className: "cm-uloggd-mention",
        },
        {
          regex: /\|\|.+?\|\|/g,
          className: "cm-uloggd-spoiler",
        },
        {
          regex: /!game(?::(?:mini|grid|grid-auto))?\([^\n)]+\)/g,
          className: "cm-uloggd-game",
        },
        {
          regex: /^:::(?:\w+)?$/gm,
          className: "cm-uloggd-alert",
        },
      ];
      for (const { regex, className } of patterns) {
        for (const match of doc.matchAll(regex)) {
          const from = match.index;
          ranges.push(
            Decoration.mark({ class: className }).range(
              from,
              from + match[0].length,
            ),
          );
        }
      }
      return Decoration.set(
        ranges.sort((a, b) => a.from - b.from),
        true,
      );
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

async function mentionCompletion(
  context: CompletionContext,
): Promise<CompletionResult | null> {
  const match = context.matchBefore(/@[a-zA-Z0-9_]{0,32}/);
  if (!match) return null;
  const query = match.text.slice(1);
  if (query.length < 2) return null;
  try {
    const response = await fetch(
      `/api/igdb/search?q=${encodeURIComponent(query)}`,
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      users?: Array<{
        username: string;
        display_name: string | null;
        verified: boolean;
      }>;
    };
    return {
      from: match.from + 1,
      filter: false,
      options: (payload.users ?? []).map((user) => ({
        label: user.username,
        displayLabel: `@${user.username}`,
        detail: user.display_name || undefined,
        type: user.verified ? "constant" : "text",
      })),
    };
  } catch {
    return null;
  }
}

type HelpItem = {
  syntax: string;
  pt: string;
  en: string;
  es: string;
  // Rendered live in the guide. Falls back to the syntax; "" disables it.
  demo?: string;
};

const helpSections: Array<{
  pt: string;
  en: string;
  es: string;
  items: HelpItem[];
}> = [
  {
    pt: "Texto",
    en: "Text",
    es: "Texto",
    items: [
      { syntax: "**negrito**", pt: "Negrito", en: "Bold", es: "Negrita" },
      { syntax: "*itálico*", pt: "Itálico", en: "Italic", es: "Cursiva" },
      {
        syntax: "~~riscado~~",
        pt: "Riscado",
        en: "Strikethrough",
        es: "Tachado",
      },
      {
        syntax: "# Título",
        pt: "Títulos, de # até ######",
        en: "Headings, from # to ######",
        es: "Encabezados, de # a ######",
        demo: "# Título\n## Subtítulo",
      },
      {
        syntax: "[texto](https://url)",
        pt: "Link",
        en: "Link",
        es: "Enlace",
        demo: "[uloggd](https://uloggd.com)",
      },
      {
        syntax: "> citação",
        pt: "Citação",
        en: "Blockquote",
        es: "Cita",
        demo: "> Um dos melhores jogos que já joguei.",
      },
      {
        syntax: "`código`",
        pt: "Código em linha",
        en: "Inline code",
        es: "Código en línea",
        demo: "Use `npm run dev` para começar.",
      },
      {
        syntax: "```\ncódigo\n```",
        pt: "Bloco de código",
        en: "Code block",
        es: "Bloque de código",
        demo: "```\nconst a = 1;\n```",
      },
      {
        syntax: "---",
        pt: "Linha separadora",
        en: "Divider",
        es: "Línea separadora",
      },
      {
        syntax: "linha 1\nlinha 2",
        pt: "Uma quebra de linha simples já vale — não precisa de linha em branco. Linhas em branco extras também são mantidas.",
        en: "A single line break is enough — no blank line needed. Extra blank lines are kept too.",
        es: "Basta un salto de línea simple — no hace falta una línea en blanco. Las líneas en blanco extra también se conservan.",
        demo: "linha 1\nlinha 2",
      },
    ],
  },
  {
    pt: "Listas e tabelas",
    en: "Lists and tables",
    es: "Listas y tablas",
    items: [
      {
        syntax: "- item",
        pt: "Lista",
        en: "List",
        es: "Lista",
        demo: "- primeiro\n- segundo",
      },
      {
        syntax: "1. item",
        pt: "Lista numerada",
        en: "Numbered list",
        es: "Lista numerada",
        demo: "1. primeiro\n2. segundo",
      },
      {
        syntax: "- [ ] tarefa",
        pt: "Checklist — itens marcados ficam riscados",
        en: "Checklist — checked items are struck through",
        es: "Checklist — los ítems marcados aparecen tachados",
        demo: "- [x] zerado\n- [ ] platinado",
      },
      {
        syntax: "| a | b |\n| --- | --- |\n| 1 | 2 |",
        pt: "Tabela — rola na horizontal quando não cabe",
        en: "Table — scrolls horizontally when it does not fit",
        es: "Tabla — se desplaza en horizontal cuando no cabe",
        demo: "| Jogo | Nota |\n| --- | --- |\n| Celeste | 10 |",
      },
    ],
  },
  {
    pt: "Jogos",
    en: "Games",
    es: "Juegos",
    items: [
      {
        syntax: "!game(slug)",
        pt: "Card completo, com capa, sinopse e plataformas",
        en: "Full card, with cover, summary and platforms",
        es: "Tarjeta completa, con portada, sinopsis y plataformas",
        demo: "!game(celeste)",
      },
      {
        syntax: "!game:mini(slug)",
        pt: "Card compacto, que flui junto com o texto",
        en: "Compact card that flows inline with the text",
        es: "Tarjeta compacta, que fluye junto al texto",
        demo: "Terminei !game:mini(celeste) ontem.",
      },
      {
        syntax: "!game:grid(slug-1, slug-2)",
        pt: "Grade de capas. Um + depois do slug marca o jogo como favorito",
        en: "Grid of covers. A + after the slug marks the game as a favourite",
        es: "Cuadrícula de portadas. Un + después del slug marca el juego como favorito",
        demo: "!game:grid(celeste, hollow-knight+, hades)",
      },
      {
        syntax: "!game:grid-auto(slug-1, slug-2)",
        pt: "Carrossel em loop, que pausa quando o mouse passa por cima",
        en: "Looping carousel that pauses on hover",
        es: "Carrusel en bucle, que se pausa al pasar el ratón",
        demo: "!game:grid-auto(celeste, hollow-knight, hades, braid)",
      },
      {
        syntax: "@usuario",
        pt: "Menção a um perfil",
        en: "Mention a profile",
        es: "Mención a un perfil",
        demo: "",
      },
    ],
  },
  {
    pt: "Mídia",
    en: "Media",
    es: "Medios",
    items: [
      {
        syntax: "![descrição](https://url)",
        pt: "Imagem",
        en: "Image",
        es: "Imagen",
        demo: "",
      },
      {
        syntax: '<img src="https://url" width="400" />',
        pt: "Imagem com largura definida — nunca passa da largura disponível",
        en: "Image with a set width — never exceeds the available width",
        es: "Imagen con ancho definido — nunca supera el ancho disponible",
        demo: "",
      },
      {
        syntax: "https://youtube.com/watch?v=ID",
        pt: "Colar o link do YouTube já vira player",
        en: "Pasting a YouTube link turns it into a player",
        es: "Pegar el enlace de YouTube lo convierte en reproductor",
        demo: "",
      },
      {
        syntax: '<spoilerimg src="https://url" />',
        pt: "Imagem borrada até clicarem nela",
        en: "Image blurred until clicked",
        es: "Imagen difuminada hasta que la pulsen",
        demo: "",
      },
      {
        syntax: "||texto escondido||",
        pt: "Spoiler de texto",
        en: "Text spoiler",
        es: "Spoiler de texto",
        demo: "O final é ||surpreendente||.",
      },
    ],
  },
  {
    pt: "Destaques",
    en: "Callouts",
    es: "Destacados",
    items: [
      {
        syntax: ":::info\ntexto\n:::",
        pt: "Caixa de destaque",
        en: "Callout box",
        es: "Caja destacada",
        demo: ":::info\nUm aviso rápido.\n:::",
      },
      {
        syntax: ":::warning / :::danger / :::tip",
        pt: "Tipos disponíveis: info, note, tip, success, important, warning, danger, bug, question, example",
        en: "Available types: info, note, tip, success, important, warning, danger, bug, question, example",
        es: "Tipos disponibles: info, note, tip, success, important, warning, danger, bug, question, example",
        demo: ":::warning\nCuidado com spoilers.\n:::",
      },
    ],
  },
  {
    pt: "Layout",
    en: "Layout",
    es: "Diseño",
    items: [
      {
        syntax: "<center>\n\ntexto\n\n</center>",
        pt: "Centraliza texto, imagens, tabelas e cards",
        en: "Centres text, images, tables and cards",
        es: "Centra texto, imágenes, tablas y tarjetas",
        demo: "<center>\n\n**No meio**\n\n</center>",
      },
      {
        syntax: "<details>\n<summary>Título</summary>\n\ntexto\n\n</details>",
        pt: "Seção recolhível",
        en: "Collapsible section",
        es: "Sección plegable",
        demo: "<details>\n<summary>Minha lista completa</summary>\n\nConteúdo escondido.\n\n</details>",
      },
      {
        syntax: "<pt>\n\ntexto\n\n</pt>",
        pt: "Só aparece para quem está lendo em português",
        en: "Only shows for readers using Portuguese",
        es: "Solo aparece para quien lee en portugués",
        demo: "<pt>\n\nVocê está lendo em português.\n\n</pt>\n<en>\n\nYou are reading in English.\n\n</en>",
      },
      {
        syntax: "<en>\n\ntext\n\n</en>",
        pt: "Só aparece para quem está lendo em inglês. Junto com <pt>, dá para manter as duas versões no mesmo perfil",
        en: "Only shows for readers using English. Together with <pt>, one profile can carry both versions",
        es: "Solo aparece para quien lee en inglés. Junto con <pt> y <es>, un mismo perfil puede llevar las tres versiones",
        demo: "",
      },
      {
        syntax: "<es>\n\ntexto\n\n</es>",
        pt: "Só aparece para quem está lendo em espanhol",
        en: "Only shows for readers using Spanish",
        es: "Solo aparece para quien lee en español",
        demo: "",
      },
      {
        syntax: "<dark>\n\ntexto\n\n</dark>",
        pt: "Só aparece para quem está lendo em um tema escuro",
        en: "Only shows for readers using a dark theme",
        es: "Solo aparece para quien lee con un tema oscuro",
        demo: "<dark>\n\nVocê está no tema escuro.\n\n</dark>\n<light>\n\nVocê está no tema claro.\n\n</light>",
      },
      {
        syntax: "<light>\n\ntexto\n\n</light>",
        pt: "Só aparece no tema claro. Dos quatro temas, só o Claro conta como claro: Cinza, Escuro e Ônix entram como escuros",
        en: "Only shows on the light theme. Of the four themes only Light counts as light: Gray, Dark and Onyx all count as dark",
        es: "Solo aparece en el tema claro. De los cuatro temas solo Claro cuenta como claro: Gris, Oscuro y Ónix cuentan como oscuros",
        demo: "",
      },
      {
        syntax: "<desktop>\n\ntexto\n\n</desktop>",
        pt: "Só aparece em telas grandes",
        en: "Only shows on large screens",
        es: "Solo aparece en pantallas grandes",
        demo: "",
      },
      {
        syntax: "<mobile>\n\ntexto\n\n</mobile>",
        pt: "Só aparece em telas pequenas",
        en: "Only shows on small screens",
        es: "Solo aparece en pantallas pequeñas",
        demo: "",
      },
    ],
  },
];

export function MarkdownEditor({
  value,
  onChange,
  name,
  maxLength = 10000,
  placeholder,
  lang,
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
  lang: UiLang;
}) {
  const t = uiText(lang);
  const [tab, setTab] = useState<Tab>("write");
  const [fullscreen, setFullscreen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSearch, setHelpSearch] = useState("");
  const [largeScreen, setLargeScreen] = useState(false);
  const [split, setSplit] = useState(50);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const splitRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [onChange, value]);

  const labels: Record<Tool, string> = {
    bold: tri(lang, "Negrito (Ctrl+B)", "Bold (Ctrl+B)", "Negrita (Ctrl+B)"),
    italic: tri(
      lang,
      "Itálico (Ctrl+I)",
      "Italic (Ctrl+I)",
      "Cursiva (Ctrl+I)",
    ),
    strikethrough: tri(
      lang,
      "Riscado (Ctrl+Shift+X)",
      "Strikethrough",
      "Tachado (Ctrl+Shift+X)",
    ),
    link: "Link (Ctrl+K)",
    image: tri(lang, "Imagem", "Image", "Imagen"),
    imagesize: tri(
      lang,
      "Imagem com tamanho",
      "Sized image",
      "Imagen con tamaño",
    ),
    youtube: "YouTube",
    code: tri(lang, "Código em linha", "Inline code", "Código en línea"),
    codeblock: tri(lang, "Bloco de código", "Code block", "Bloque de código"),
    ul: t.list,
    ol: tri(lang, "Lista numerada", "Numbered list", "Lista numerada"),
    checklist: "Checklist",
    quote: tri(lang, "Citação", "Quote", "Cita"),
    spoiler: "Spoiler",
    spoilerimage: tri(
      lang,
      "Imagem com spoiler",
      "Spoiler image",
      "Imagen con spoiler",
    ),
    hr: tri(lang, "Separador", "Divider", "Separador"),
    alert: tri(lang, "Destaque", "Callout", "Destacado"),
    center: tri(lang, "Centralizar", "Center", "Centrar"),
    theme: tri(lang, "Texto por tema", "Text per theme", "Texto por tema"),
    desktop: tri(lang, "Somente desktop", "Desktop only", "Solo escritorio"),
    mobile: tri(lang, "Somente mobile", "Mobile only", "Solo móvil"),
    mention: tri(lang, "Mencionar", "Mention", "Mencionar"),
    game: tri(lang, "Card de jogo", "Game card", "Tarjeta de juego"),
    gamemini: tri(lang, "Card compacto", "Compact card", "Tarjeta compacta"),
    gamegrid: tri(lang, "Grade de jogos", "Game grid", "Cuadrícula de juegos"),
    gamegridauto: tri(
      lang,
      "Carrossel de jogos",
      "Game carousel",
      "Carrusel de juegos",
    ),
    table: tri(lang, "Tabela", "Table", "Tabla"),
    details: tri(
      lang,
      "Seção recolhível",
      "Collapsible section",
      "Sección plegable",
    ),
    lang: tri(
      lang,
      "Texto por idioma",
      "Text per language",
      "Texto por idioma",
    ),
  };

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setLargeScreen(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    document.body.style.overflow = fullscreen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  const activeTab =
    tab === "sidebyside" && (!fullscreen || !largeScreen) ? "write" : tab;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const state = EditorState.create({
      doc: valueRef.current,
      extensions: [
        editorTheme,
        syntaxHighlighting(markdownHighlightStyle),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        specialSyntax,
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        history(),
        indentUnit.of("  "),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        drawSelection(),
        lineNumbers(),
        bracketMatching(),
        autocompletion({ override: [mentionCompletion] }),
        EditorView.lineWrapping,
        placeholder ? codeMirrorPlaceholder(placeholder) : [],
        EditorState.transactionFilter.of((transaction) =>
          transaction.docChanged && transaction.newDoc.length > maxLength
            ? []
            : transaction,
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged)
            onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });
    const view = new EditorView({ state, parent: host });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [activeTab, fullscreen, maxLength, placeholder]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value)
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
  }, [value]);

  const insertText = useCallback(
    (before: string, after = "", fallback = "") => {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      const selected = view.state.sliceDoc(from, to) || fallback;
      const insertion = `${before}${selected}${after}`;
      if (view.state.doc.length - (to - from) + insertion.length > maxLength)
        return;
      view.dispatch({
        changes: { from, to, insert: insertion },
        selection: {
          anchor: from + before.length,
          head: from + before.length + selected.length,
        },
        scrollIntoView: true,
      });
      view.focus();
    },
    [maxLength],
  );

  const insertLine = useCallback(
    (prefix: string) => {
      const view = viewRef.current;
      if (!view) return;
      const { from } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);
      if (view.state.doc.length + prefix.length > maxLength) return;
      view.dispatch({
        changes: { from: line.from, insert: prefix },
        selection: { anchor: from + prefix.length },
      });
      view.focus();
    },
    [maxLength],
  );

  const insertBlock = useCallback(
    (block: string) => {
      const view = viewRef.current;
      if (!view) return;
      const { from } = view.state.selection.main;
      const prefix =
        from > 0 && view.state.sliceDoc(from - 1, from) !== "\n"
          ? "\n\n"
          : from === 0
            ? ""
            : "\n";
      const insertion = `${prefix}${block}\n`;
      if (view.state.doc.length + insertion.length > maxLength) return;
      view.dispatch({
        changes: { from, insert: insertion },
        selection: { anchor: from + insertion.length },
        scrollIntoView: true,
      });
      view.focus();
    },
    [maxLength],
  );

  const runTool = useCallback(
    (tool: Tool) => {
      const text = tri(lang, "texto", "text", "texto");
      const actions: Record<Tool, () => void> = {
        bold: () => insertText("**", "**", text),
        italic: () => insertText("*", "*", text),
        strikethrough: () => insertText("~~", "~~", text),
        link: () => insertText("[", "](https://)", text),
        image: () =>
          insertText(
            "![",
            "](https://url-da-imagem.com)",
            tri(lang, "descrição", "description", "descripción"),
          ),
        imagesize: () =>
          insertBlock(
            '<img src="https://url-da-imagem.com" alt="descrição" width="400" />',
          ),
        youtube: () => insertBlock("https://www.youtube.com/watch?v=VIDEO_ID"),
        code: () => insertText("`", "`", tri(lang, "código", "code", "código")),
        codeblock: () =>
          insertBlock(
            `\`\`\`\n${tri(lang, "código aqui", "code here", "código aquí")}\n\`\`\``,
          ),
        ul: () => insertLine("- "),
        ol: () => insertLine("1. "),
        checklist: () => insertLine("- [ ] "),
        quote: () => insertLine("> "),
        spoiler: () => insertText("||", "||", "spoiler"),
        spoilerimage: () =>
          insertBlock(
            '<spoilerimg src="https://url-da-imagem.com" alt="descrição" width="400" />',
          ),
        hr: () => insertBlock("---"),
        alert: () =>
          insertBlock(
            `:::info\n${tri(lang, "Texto do alerta", "Alert text", "Texto del aviso")}\n:::`,
          ),
        center: () => insertBlock(`<center>\n\n${text}\n\n</center>`),
        theme: () =>
          insertBlock(
            `<dark>\n\n${tri(lang, "Aparece no tema escuro", "Shows on the dark theme", "Aparece en el tema oscuro")}\n\n</dark>\n\n<light>\n\n${tri(lang, "Aparece no tema claro", "Shows on the light theme", "Aparece en el tema claro")}\n\n</light>`,
          ),
        desktop: () => insertBlock(`<desktop>\n\n${text}\n\n</desktop>`),
        mobile: () => insertBlock(`<mobile>\n\n${text}\n\n</mobile>`),
        mention: () => insertText("@", "", "username"),
        game: () => insertText("!game(", ")", "slug"),
        gamemini: () => insertText("!game:mini(", ")", "slug"),
        gamegrid: () =>
          insertText("!game:grid(", ")", "slug-1, slug-2, slug-3"),
        gamegridauto: () =>
          insertText("!game:grid-auto(", ")", "slug-1, slug-2, slug-3"),
        table: () =>
          insertBlock(
            "| Coluna 1 | Coluna 2 |\n| --- | --- |\n| dado | dado |",
          ),
        details: () =>
          insertBlock(
            `<details>\n<summary>${tri(lang, "Título da seção", "Section title", "Título de la sección")}</summary>\n\n${text}\n\n</details>`,
          ),
        lang: () =>
          insertBlock(
            `<pt>\n\nTexto em português\n\n</pt>\n\n<en>\n\nEnglish text\n\n</en>\n\n<es>\n\nTexto en español\n\n</es>`,
          ),
      };
      actions[tool]();
    },
    [insertBlock, insertLine, insertText, lang],
  );

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!viewRef.current || !(event.ctrlKey || event.metaKey)) return;
      const key = `ctrl+${event.shiftKey ? "shift+" : ""}${event.key.toLowerCase()}`;
      const tool = shortcuts[key];
      if (!tool) return;
      event.preventDefault();
      runTool(tool);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [runTool]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!draggingRef.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      setSplit(
        Math.min(
          80,
          Math.max(20, ((event.clientX - rect.left) / rect.width) * 100),
        ),
      );
    };
    const end = () => {
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
  }, []);

  const stats = useMemo(
    () => ({
      words: value.trim() ? value.trim().split(/\s+/).length : 0,
      lines: value.split("\n").length,
      percent: Math.min(100, (value.length / maxLength) * 100),
    }),
    [maxLength, value],
  );
  const helpQuery = helpSearch.trim().toLocaleLowerCase();
  const filteredHelp = helpSections
    .map((section) => ({
      ...section,
      items: helpQuery
        ? section.items.filter((item) =>
            `${item.syntax} ${item.pt} ${item.en}`
              .toLocaleLowerCase()
              .includes(helpQuery),
          )
        : section.items,
    }))
    .filter((section) => section.items.length > 0);
  const showEditor = activeTab !== "preview";
  const showPreview = activeTab !== "write";

  const content = (
    <div className="md-editor" data-fullscreen={fullscreen || undefined}>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="md-editor-tabs">
        <div
          role="tablist"
          aria-label={tri(
            lang,
            "Modo do editor",
            "Editor mode",
            "Modo del editor",
          )}
        >
          {[
            ["write", Pencil, tri(lang, "Escrever", "Write", "Escribir")],
            [
              "preview",
              Eye,
              tri(lang, "Visualizar", "Preview", "Previsualizar"),
            ],
            ...(fullscreen && largeScreen
              ? [
                  [
                    "sidebyside",
                    Columns2,
                    Contrast,
                    tri(lang, "Lado a lado", "Side by side", "Lado a lado"),
                  ],
                ]
              : []),
          ].map(([id, Icon, label]) => (
            <button
              key={String(id)}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setTab(id as Tab)}
            >
              <Icon size={15} />
              {String(label)}
            </button>
          ))}
        </div>
        <span data-warning={stats.percent > 90 || undefined}>
          {value.length.toLocaleString(lang)}/{maxLength.toLocaleString(lang)}
        </span>
        <button
          type="button"
          aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
          onClick={() => setFullscreen((current) => !current)}
        >
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
      <div className="md-editor-progress">
        <span
          data-warning={stats.percent > 90 || undefined}
          style={{ width: `${stats.percent}%` }}
        />
      </div>
      {showEditor && (
        <div
          className="md-editor-toolbar"
          role="toolbar"
          aria-label={tri(lang, "Formatação", "Formatting", "Formato")}
        >
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label={tri(lang, "Título", "Heading", "Encabezado")}
              >
                <Heading size={16} />
                <ChevronDown size={11} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="md-heading-menu" sideOffset={5}>
                {[1, 2, 3, 4, 5, 6].map((level) => (
                  <DropdownMenu.Item
                    key={level}
                    onSelect={() => insertLine(`${"#".repeat(level)} `)}
                  >
                    <strong>H{level}</strong>
                    <span>{"#".repeat(level)} Título</span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          {toolGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.map(([tool, Icon]) => (
                <Tooltip key={tool} label={labels[tool]}>
                  <button
                    type="button"
                    aria-label={labels[tool]}
                    onClick={() => runTool(tool)}
                  >
                    <Icon size={16} />
                  </button>
                </Tooltip>
              ))}
            </div>
          ))}
          <div className="md-editor-toolbar-end">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="md-insert-trigger"
                  aria-label={t.insert}
                >
                  <Plus size={16} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="md-insert-menu"
                  align="end"
                  sideOffset={6}
                  collisionPadding={12}
                >
                  {insertGroups.map((group) => (
                    <div key={group.titleEn}>
                      <span>
                        {tri(lang, group.titlePt, group.titleEn, group.titleEs)}
                      </span>
                      {group.tools.map(([tool, Icon]) => (
                        <DropdownMenu.Item
                          key={tool}
                          onSelect={() => runTool(tool)}
                        >
                          <Icon size={15} />
                          {labels[tool]}
                        </DropdownMenu.Item>
                      ))}
                    </div>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      )}
      <div className="md-editor-stage" ref={splitRef}>
        <div
          className="md-editor-write"
          hidden={!showEditor}
          style={{ width: activeTab === "sidebyside" ? `${split}%` : "100%" }}
        >
          <div ref={hostRef} />
        </div>
        {activeTab === "sidebyside" && (
          <button
            type="button"
            className="md-editor-split"
            aria-label={tri(
              lang,
              "Redimensionar painéis",
              "Resize panels",
              "Redimensionar paneles",
            )}
            onPointerDown={(event) => {
              event.preventDefault();
              draggingRef.current = true;
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
          >
            <GripVertical size={14} />
          </button>
        )}
        <div
          className="md-editor-preview"
          hidden={!showPreview}
          style={{
            width: activeTab === "sidebyside" ? `${100 - split}%` : "100%",
          }}
        >
          {value.trim() ? (
            <MarkdownContent content={value} lang={lang} />
          ) : (
            <p className="md-editor-empty">
              {tri(
                lang,
                "Nada para visualizar.",
                "Nothing to preview.",
                "Nada que previsualizar.",
              )}
            </p>
          )}
        </div>
      </div>
      <footer className="md-editor-status">
        <span>
          <Info size={13} />
          <b>MD</b>
          <i>
            {stats.words} {tri(lang, "palavras", "words", "palabras")} ·{" "}
            {stats.lines} {tri(lang, "linhas", "lines", "líneas")}
          </i>
        </span>
        <button
          type="button"
          aria-label={t.help}
          onClick={() => setHelpOpen(true)}
        >
          <CircleHelp size={15} />
        </button>
      </footer>
    </div>
  );

  return (
    <>
      {fullscreen
        ? createPortal(
            <div className="md-editor-fullscreen">
              <button
                type="button"
                aria-label={tri(
                  lang,
                  "Sair da tela cheia",
                  "Exit fullscreen",
                  "Salir de pantalla completa",
                )}
                onClick={() => setFullscreen(false)}
              />
              {content}
            </div>,
            document.body,
          )
        : content}
      <Dialog.Root open={helpOpen} onOpenChange={setHelpOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="md-help-overlay" />
          <Dialog.Content className="md-help-dialog">
            <header>
              <div>
                <Info size={18} />
                <Dialog.Title>
                  {tri(
                    lang,
                    "Guia de Markdown",
                    "Markdown guide",
                    "Guía de Markdown",
                  )}
                </Dialog.Title>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={17} />
              </Dialog.Close>
            </header>
            <label>
              <Search size={15} />
              <input
                value={helpSearch}
                onChange={(event) => setHelpSearch(event.target.value)}
                placeholder={tri(
                  lang,
                  "Buscar recurso…",
                  "Search features…",
                  "Buscar función…",
                )}
              />
            </label>
            <div className="md-help-body">
              {filteredHelp.map((section) => (
                <section key={section.en}>
                  <h3>{tri(lang, section.pt, section.en, section.es)}</h3>
                  {section.items.map((item) => {
                    const demo = item.demo ?? item.syntax;
                    return (
                      <article key={item.syntax}>
                        <p>{tri(lang, item.pt, item.en, item.es)}</p>
                        <div className="md-help-example">
                          <pre>
                            <code>{item.syntax}</code>
                          </pre>
                          {demo && (
                            <div className="md-help-render">
                              <MarkdownContent content={demo} lang={lang} />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setHelpOpen(false);
                            insertBlock(item.syntax);
                          }}
                        >
                          {t.insert}
                        </button>
                      </article>
                    );
                  })}
                </section>
              ))}
              {!filteredHelp.length && (
                <p className="md-help-empty">
                  {tri(
                    lang,
                    "Nenhum recurso encontrado.",
                    "No features found.",
                    "No se encontró ninguna función.",
                  )}
                </p>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
