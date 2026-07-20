"use client";

import {
  Bold,
  Eye,
  EyeOff,
  Gamepad2,
  Heading2,
  Info,
  Italic,
  Link2,
  List,
  Pencil,
  Quote,
  Strikethrough,
} from "lucide-react";
import { useRef, useState } from "react";
import { MarkdownContent } from "./markdown-content";

type Wrap = { before: string; after?: string; placeholder: string };

export function MarkdownEditor({
  value,
  onChange,
  name,
  maxLength = 2000,
  rows = 7,
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
  const [tab, setTab] = useState<"write" | "preview">("write");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  function apply({ before, after = before, placeholder: fallback }: Wrap) {
    const area = areaRef.current;
    if (!area) return;
    const start = area.selectionStart ?? value.length;
    const end = area.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || fallback;
    const next =
      value.slice(0, start) + before + selected + after + value.slice(end);
    if (next.length > maxLength) return;
    onChange(next);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  }

  function applyLinePrefix(prefix: string, fallback: string) {
    const area = areaRef.current;
    if (!area) return;
    const start = area.selectionStart ?? value.length;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const insertion = value.slice(lineStart, start).trim()
      ? `\n${prefix}${fallback}`
      : prefix;
    const next = value.slice(0, start) + insertion + value.slice(start);
    if (next.length > maxLength) return;
    onChange(next);
    requestAnimationFrame(() => {
      area.focus();
      const caret = start + insertion.length;
      area.setSelectionRange(caret, caret);
    });
  }

  const tools: Array<{
    key: string;
    icon: React.ComponentType<{ size?: number }>;
    label: string;
  }> = [
    { key: "bold", icon: Bold, label: pt ? "Negrito" : "Bold" },
    { key: "italic", icon: Italic, label: pt ? "Itálico" : "Italic" },
    {
      key: "strike",
      icon: Strikethrough,
      label: pt ? "Riscado" : "Strikethrough",
    },
    { key: "heading", icon: Heading2, label: pt ? "Título" : "Heading" },
    { key: "link", icon: Link2, label: "Link" },
    { key: "list", icon: List, label: pt ? "Lista" : "List" },
    { key: "quote", icon: Quote, label: pt ? "Citação" : "Quote" },
    { key: "spoiler", icon: EyeOff, label: "Spoiler" },
    { key: "alert", icon: Info, label: pt ? "Destaque" : "Callout" },
    { key: "game", icon: Gamepad2, label: pt ? "Jogo" : "Game" },
  ];

  function runTool(key: string) {
    const text = pt ? "texto" : "text";
    switch (key) {
      case "bold":
        return apply({ before: "**", placeholder: text });
      case "italic":
        return apply({ before: "*", placeholder: text });
      case "strike":
        return apply({ before: "~~", placeholder: text });
      case "heading":
        return applyLinePrefix("## ", "");
      case "link":
        return apply({ before: "[", after: "](https://)", placeholder: text });
      case "list":
        return applyLinePrefix("- ", "");
      case "quote":
        return applyLinePrefix("> ", "");
      case "spoiler":
        return apply({ before: "||", placeholder: "spoiler" });
      case "alert":
        return apply({
          before: "\n:::info\n",
          after: "\n:::\n",
          placeholder: pt ? "algo importante" : "something important",
        });
      case "game":
        return apply({
          before: "!game(",
          after: ")",
          placeholder: "slug-do-jogo",
        });
    }
  }

  return (
    <div className="md-editor">
      <div className="md-editor-bar">
        <div
          className="md-editor-tools"
          role="toolbar"
          aria-label={pt ? "Formatação" : "Formatting"}
          data-disabled={tab === "preview" || undefined}
        >
          {tools.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              title={label}
              aria-label={label}
              tabIndex={tab === "preview" ? -1 : undefined}
              onClick={() => runTool(key)}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
        <div className="md-editor-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "write"}
            data-active={tab === "write" || undefined}
            onClick={() => setTab("write")}
          >
            <Pencil size={13} /> {pt ? "Escrever" : "Write"}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "preview"}
            data-active={tab === "preview" || undefined}
            onClick={() => setTab("preview")}
          >
            <Eye size={13} /> {pt ? "Visualizar" : "Preview"}
          </button>
        </div>
      </div>
      {tab === "write" ? (
        <textarea
          ref={areaRef}
          name={name}
          value={value}
          maxLength={maxLength}
          rows={rows}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <>
          {name && <input type="hidden" name={name} value={value} />}
          <div className="md-editor-preview">
            {value.trim() ? (
              <MarkdownContent content={value} lang={lang} />
            ) : (
              <p className="md-editor-empty">
                {pt ? "Nada para visualizar." : "Nothing to preview."}
              </p>
            )}
          </div>
        </>
      )}
      <footer className="md-editor-status">
        <small>
          {pt
            ? "Markdown: **negrito**, ||spoiler||, @usuário, !game(slug), :::info"
            : "Markdown: **bold**, ||spoiler||, @user, !game(slug), :::info"}
        </small>
        <small>
          {value.length}/{maxLength}
        </small>
      </footer>
    </div>
  );
}
