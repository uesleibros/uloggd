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
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  keymap,
  lineNumbers,
  placeholder as codeMirrorPlaceholder,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
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
  Eye,
  EyeOff,
  FileCode2,
  GripVertical,
  Heading,
  Image,
  ImageOff,
  ImagePlus,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Monitor,
  Pencil,
  Quote,
  Search,
  Smartphone,
  Strikethrough,
  Table,
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
import { MarkdownContent } from "./markdown-content";

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
  | "table";

const toolGroups: Array<Array<[Tool, ComponentType<{ size?: number }>]>> = [
  [
    ["bold", Bold],
    ["italic", Italic],
    ["strikethrough", Strikethrough],
  ],
  [
    ["link", Link2],
    ["image", Image],
    ["imagesize", ImagePlus],
    ["youtube", Video],
  ],
  [
    ["code", Code],
    ["codeblock", FileCode2],
  ],
  [
    ["ul", List],
    ["ol", ListOrdered],
    ["checklist", CheckSquare],
  ],
  [
    ["quote", Quote],
    ["spoiler", EyeOff],
    ["spoilerimage", ImageOff],
    ["hr", Minus],
    ["alert", AlertCircle],
    ["center", AlignCenter],
    ["desktop", Monitor],
    ["mobile", Smartphone],
    ["mention", AtSign],
    ["table", Table],
  ],
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
  ".cm-content": { padding: "15px 12px", caretColor: "var(--brand-blurple-bright)" },
  ".cm-cursor": { borderLeftColor: "var(--brand-blurple-bright)" },
  ".cm-selectionBackground": {
    backgroundColor: "color-mix(in srgb, var(--brand-blurple) 24%, transparent) !important",
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

const helpItems = [
  ["**texto**", "Negrito"],
  ["*texto*", "Itálico"],
  ["~~texto~~", "Riscado"],
  ["# até ######", "Títulos"],
  ["[texto](url)", "Link"],
  ["![alt](url)", "Imagem"],
  ["- [ ] item", "Checklist"],
  ["```código```", "Bloco de código"],
  [":::info", "Destaque / alerta"],
  ["||texto||", "Spoiler"],
  ["@usuario", "Menção"],
  ["!game(slug)", "Card de jogo"],
  ["!game:grid(slug-1, slug-2)", "Grade de jogos"],
  ["<center>…</center>", "Conteúdo centralizado"],
  ["<desktop>…</desktop>", "Somente desktop"],
  ["<mobile>…</mobile>", "Somente mobile"],
] as const;

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
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
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
    bold: pt ? "Negrito (Ctrl+B)" : "Bold (Ctrl+B)",
    italic: pt ? "Itálico (Ctrl+I)" : "Italic (Ctrl+I)",
    strikethrough: pt ? "Riscado (Ctrl+Shift+X)" : "Strikethrough",
    link: "Link (Ctrl+K)",
    image: pt ? "Imagem" : "Image",
    imagesize: pt ? "Imagem com tamanho" : "Sized image",
    youtube: "YouTube",
    code: pt ? "Código em linha" : "Inline code",
    codeblock: pt ? "Bloco de código" : "Code block",
    ul: pt ? "Lista" : "List",
    ol: pt ? "Lista numerada" : "Numbered list",
    checklist: "Checklist",
    quote: pt ? "Citação" : "Quote",
    spoiler: "Spoiler",
    spoilerimage: pt ? "Imagem com spoiler" : "Spoiler image",
    hr: pt ? "Separador" : "Divider",
    alert: pt ? "Destaque" : "Callout",
    center: pt ? "Centralizar" : "Center",
    desktop: pt ? "Somente desktop" : "Desktop only",
    mobile: pt ? "Somente mobile" : "Mobile only",
    mention: pt ? "Mencionar" : "Mention",
    table: pt ? "Tabela" : "Table",
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
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
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
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
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
      const prefix = from > 0 && view.state.sliceDoc(from - 1, from) !== "\n"
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
      const text = pt ? "texto" : "text";
      const actions: Record<Tool, () => void> = {
        bold: () => insertText("**", "**", text),
        italic: () => insertText("*", "*", text),
        strikethrough: () => insertText("~~", "~~", text),
        link: () => insertText("[", "](https://)", text),
        image: () =>
          insertText("![", "](https://url-da-imagem.com)", pt ? "descrição" : "description"),
        imagesize: () =>
          insertBlock('<img src="https://url-da-imagem.com" alt="descrição" width="400" />'),
        youtube: () => insertBlock("https://www.youtube.com/watch?v=VIDEO_ID"),
        code: () => insertText("`", "`", pt ? "código" : "code"),
        codeblock: () => insertBlock(`\`\`\`\n${pt ? "código aqui" : "code here"}\n\`\`\``),
        ul: () => insertLine("- "),
        ol: () => insertLine("1. "),
        checklist: () => insertLine("- [ ] "),
        quote: () => insertLine("> "),
        spoiler: () => insertText("||", "||", "spoiler"),
        spoilerimage: () =>
          insertBlock('<spoilerimg src="https://url-da-imagem.com" alt="descrição" width="400" />'),
        hr: () => insertBlock("---"),
        alert: () => insertBlock(`:::info\n${pt ? "Texto do alerta" : "Alert text"}\n:::`),
        center: () => insertBlock(`<center>\n\n${text}\n\n</center>`),
        desktop: () => insertBlock(`<desktop>\n\n${text}\n\n</desktop>`),
        mobile: () => insertBlock(`<mobile>\n\n${text}\n\n</mobile>`),
        mention: () => insertText("@", "", "username"),
        table: () =>
          insertBlock("| Coluna 1 | Coluna 2 |\n| --- | --- |\n| dado | dado |"),
      };
      actions[tool]();
    },
    [insertBlock, insertLine, insertText, pt],
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
        Math.min(80, Math.max(20, ((event.clientX - rect.left) / rect.width) * 100)),
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
  const filteredHelp = helpItems.filter(([syntax, label]) =>
    `${syntax} ${label}`.toLocaleLowerCase().includes(helpSearch.toLocaleLowerCase()),
  );
  const showEditor = activeTab !== "preview";
  const showPreview = activeTab !== "write";

  const content = (
    <div className="md-editor" data-fullscreen={fullscreen || undefined}>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="md-editor-tabs">
        <div role="tablist" aria-label={pt ? "Modo do editor" : "Editor mode"}>
          {[
            ["write", Pencil, pt ? "Escrever" : "Write"],
            ["preview", Eye, pt ? "Visualizar" : "Preview"],
            ...(fullscreen && largeScreen
              ? [["sidebyside", Columns2, pt ? "Lado a lado" : "Side by side"]]
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
        <span data-warning={stats.percent > 90 || undefined} style={{ width: `${stats.percent}%` }} />
      </div>
      {showEditor && (
        <div className="md-editor-toolbar" role="toolbar" aria-label={pt ? "Formatação" : "Formatting"}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" aria-label={pt ? "Título" : "Heading"}>
                <Heading size={16} />
                <ChevronDown size={11} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="md-heading-menu" sideOffset={5}>
                {[1, 2, 3, 4, 5, 6].map((level) => (
                  <DropdownMenu.Item key={level} onSelect={() => insertLine(`${"#".repeat(level)} `)}>
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
                <button
                  key={tool}
                  type="button"
                  title={labels[tool]}
                  aria-label={labels[tool]}
                  onClick={() => runTool(tool)}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
          ))}
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
            aria-label={pt ? "Redimensionar painéis" : "Resize panels"}
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
          style={{ width: activeTab === "sidebyside" ? `${100 - split}%` : "100%" }}
        >
          {value.trim() ? (
            <MarkdownContent content={value} lang={lang} />
          ) : (
            <p className="md-editor-empty">
              {pt ? "Nada para visualizar." : "Nothing to preview."}
            </p>
          )}
        </div>
      </div>
      <footer className="md-editor-status">
        <span>
          <Info size={13} />
          <b>Markdown</b>
          <i>{stats.words} {pt ? "palavras" : "words"} · {stats.lines} {pt ? "linhas" : "lines"}</i>
        </span>
        <button type="button" onClick={() => setHelpOpen(true)}>
          <CircleHelp size={15} />
          {pt ? "Ajuda" : "Help"}
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
                aria-label={pt ? "Sair da tela cheia" : "Exit fullscreen"}
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
                <Dialog.Title>{pt ? "Guia de Markdown" : "Markdown guide"}</Dialog.Title>
              </div>
              <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
                <X size={17} />
              </Dialog.Close>
            </header>
            <label>
              <Search size={15} />
              <input
                value={helpSearch}
                onChange={(event) => setHelpSearch(event.target.value)}
                placeholder={pt ? "Buscar recurso…" : "Search features…"}
              />
            </label>
            <div>
              {filteredHelp.map(([syntax, description]) => (
                <article key={syntax}>
                  <code>{syntax}</code>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
