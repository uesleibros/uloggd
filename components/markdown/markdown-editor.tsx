"use client";

import * as DropdownMenu from "@/components/ui/dropdown-menu";
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
  Smartphone,
  Strikethrough,
  Table,
  Tag,
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
import { EmojiPicker } from "./emoji-picker";

type Tab = "write" | "preview" | "sidebyside";
export type MarkdownEditorVariant = "showcase" | "review";
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

const reviewToolGroups: Array<Array<[Tool, ComponentType<{ size?: number }>]>> =
  [
    [
      ["bold", Bold],
      ["italic", Italic],
      ["strikethrough", Strikethrough],
    ],
    [
      ["link", Link2],
      ["quote", Quote],
      ["code", Code],
    ],
    [
      ["ul", List],
      ["ol", ListOrdered],
    ],
    [
      ["mention", AtSign],
      ["spoiler", EyeOff],
    ],
    [
      ["image", Image],
      ["spoilerimage", ImageOff],
    ],
  ];

const REVIEW_TOOLS = new Set<Tool>(
  reviewToolGroups.flatMap((group) => group.map(([tool]) => tool)),
);

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
      people?: Array<{
        username: string;
        displayName: string | null;
        verified: boolean;
      }>;
    };
    return {
      from: match.from + 1,
      filter: false,
      options: (payload.people ?? []).map((user) => ({
        label: user.username,
        displayLabel: `@${user.username}`,
        detail: user.displayName || undefined,
        type: user.verified ? "constant" : "text",
      })),
    };
  } catch {
    return null;
  }
}

export function MarkdownEditor({
  value,
  onChange,
  name,
  maxLength = 10000,
  placeholder,
  lang,
  variant = "showcase",
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
  lang: UiLang;
  variant?: MarkdownEditorVariant;
}) {
  const t = uiText(lang);
  const [tab, setTab] = useState<Tab>("write");
  const [fullscreen, setFullscreen] = useState(false);
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
        variant === "showcase" ? lineNumbers() : [],
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
  }, [activeTab, fullscreen, maxLength, placeholder, variant]);

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
      if (variant === "review" && !REVIEW_TOOLS.has(tool)) return;
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
    [insertBlock, insertLine, insertText, lang, variant],
  );

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!viewRef.current || !(event.ctrlKey || event.metaKey)) return;
      const key = `ctrl+${event.shiftKey ? "shift+" : ""}${event.key.toLowerCase()}`;
      const tool = shortcuts[key];
      if (!tool || (variant === "review" && !REVIEW_TOOLS.has(tool))) return;
      event.preventDefault();
      runTool(tool);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [runTool, variant]);

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

  const lengthPercent = useMemo(
    () => Math.min(100, (value.length / maxLength) * 100),
    [maxLength, value.length],
  );
  const showEditor = activeTab !== "preview";
  const showPreview = activeTab !== "write";

  const content = (
    <div
      className="md-editor"
      data-fullscreen={fullscreen || undefined}
      data-variant={variant}
    >
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
        <span data-warning={lengthPercent > 90 || undefined}>
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
          data-warning={lengthPercent > 90 || undefined}
          style={{ width: `${lengthPercent}%` }}
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
          {(variant === "review" ? reviewToolGroups : toolGroups).map(
            (group, groupIndex) => (
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
            ),
          )}
          {variant === "showcase" && (
            <div className="md-editor-toolbar-end">
              <EmojiPicker lang={lang} onPick={(emoji) => insertText(emoji)} />
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
                          {tri(
                            lang,
                            group.titlePt,
                            group.titleEn,
                            group.titleEs,
                          )}
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
          )}
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
            <MarkdownContent content={value} lang={lang} variant={variant} />
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
    </div>
  );

  return fullscreen
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
    : content;
}
