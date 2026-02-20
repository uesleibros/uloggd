import { EditorView, ViewPlugin, Decoration } from "@codemirror/view"
import { HighlightStyle } from "@codemirror/language"
import { tags } from "@lezer/highlight"

export const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: "#f0f6fc", fontWeight: "600" },
  { tag: tags.heading2, color: "#f0f6fc", fontWeight: "600" },
  { tag: tags.heading3, color: "#f0f6fc", fontWeight: "600" },
  { tag: tags.heading4, color: "#f0f6fc", fontWeight: "600" },
  { tag: tags.heading5, color: "#f0f6fc", fontWeight: "600" },
  { tag: tags.heading6, color: "#848d97", fontWeight: "600" },
  { tag: tags.strong, color: "#f0f6fc", fontWeight: "600" },
  { tag: tags.emphasis, color: "#f0f6fc", fontStyle: "italic" },
  { tag: tags.strikethrough, color: "#848d97", textDecoration: "line-through" },
  { tag: tags.link, color: "#4493f8" },
  { tag: tags.url, color: "#4493f8" },
  { tag: tags.processingInstruction, color: "#f0f6fc" },
  { tag: tags.meta, color: "#4493f8" },
  { tag: tags.monospace, color: "#f0f6fc", backgroundColor: "rgba(110,118,129,0.4)", borderRadius: "6px", padding: "0.2em 0.4em", fontSize: "85%" },
  { tag: tags.list, color: "#f0f6fc" },
  { tag: tags.quote, color: "#848d97" },
  { tag: tags.labelName, color: "#4493f8" },
  { tag: tags.contentSeparator, color: "#3d444d" },
  { tag: tags.angleBracket, color: "#848d97" },
  { tag: tags.tagName, color: "#7ee787" },
  { tag: tags.attributeName, color: "#d2a8ff" },
  { tag: tags.attributeValue, color: "#a5d6ff" },
  { tag: tags.string, color: "#a5d6ff" },
  { tag: tags.comment, color: "#848d97", fontStyle: "italic" },
])

const mentionAtMark = Decoration.mark({ class: "cm-mention-at" })
const mentionUserMark = Decoration.mark({ class: "cm-mention-user" })
const spoilerMark = Decoration.mark({ class: "cm-spoiler-syntax" })
const gameSyntaxMark = Decoration.mark({ class: "cm-game-syntax" })

export const customDecorations = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = this.build(view)
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.build(update.view)
      }
    }
    build(view) {
      const widgets = []
      const doc = view.state.doc.toString()

      const mentionRegex = /(?:^|[\s\n])(@)([a-zA-Z0-9_]{2,32})(?=[\s\n.,!?;:]|$)/g
      let match
      while ((match = mentionRegex.exec(doc)) !== null) {
        const offset = match[0].startsWith("@") ? 0 : 1
        const atStart = match.index + offset
        const atEnd = atStart + 1
        const userStart = atEnd
        const userEnd = userStart + match[2].length
        widgets.push(mentionAtMark.range(atStart, atEnd))
        widgets.push(mentionUserMark.range(userStart, userEnd))
      }

      const spoilerRegex = /\|\|(.+?)\|\|/g
      while ((match = spoilerRegex.exec(doc)) !== null) {
        widgets.push(spoilerMark.range(match.index, match.index + match[0].length))
      }

      const gameRegex = /!game(?::(?:mini|grid|grid-auto))?\(([^)\n]+)\)/g
      while ((match = gameRegex.exec(doc)) !== null) {
        widgets.push(gameSyntaxMark.range(match.index, match.index + match[0].length))
      }

      return Decoration.set(widgets, true)
    }
  },
  { decorations: (v) => v.decorations }
)

export const cmTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "#e6edf3",
    fontSize: "14px",
    height: "100%",
  },
  "&.cm-focused": {
    outline: "none",
  },
  "@components/MarkdownEditor/.cm-scroller": {
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
    fontSize: "13.6px",
    lineHeight: "1.45",
    padding: "16px",
    overflow: "auto",
  },
  "@components/MarkdownEditor/.cm-content": {
    caretColor: "#e6edf3",
    padding: "0",
  },
  "@components/MarkdownEditor/.cm-line": {
    padding: "0",
  },
  "@components/MarkdownEditor/.cm-cursor": {
    borderLeftColor: "#e6edf3",
    borderLeftWidth: "1px",
  },
  "@components/MarkdownEditor/.cm-selectionBackground": {
    backgroundColor: "rgba(56, 139, 253, 0.4) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(56, 139, 253, 0.4) !important",
  },
  "@components/MarkdownEditor/.cm-activeLine": {
    backgroundColor: "transparent",
  },
  "@components/MarkdownEditor/.cm-activeLineGutter": {
    backgroundColor: "transparent",
  },
  "@components/MarkdownEditor/.cm-gutters": {
    display: "none",
  },
  "@components/MarkdownEditor/.cm-placeholder": {
    color: "#656d76",
    fontStyle: "normal",
  },
  "@components/MarkdownEditor/.cm-panels": {
    backgroundColor: "#0d1117",
    color: "#e6edf3",
  },
  "@components/MarkdownEditor/.cm-foldGutter": {
    display: "none",
  },
  "@components/MarkdownEditor/.cm-mention-at": {
    color: "#818cf8",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderRadius: "3px 0 0 3px",
    padding: "1px 0 1px 3px",
  },
  "@components/MarkdownEditor/.cm-mention-user": {
    color: "#818cf8",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderRadius: "0 3px 3px 0",
    padding: "1px 3px 1px 0",
  },
  "@components/MarkdownEditor/.cm-spoiler-syntax": {
    color: "#6e7681",
    backgroundColor: "rgba(110, 118, 129, 0.2)",
    borderRadius: "3px",
  },
  "@components/MarkdownEditor/.cm-game-syntax": {
    color: "#fbbf24",
    fontWeight: "bold",
  },
})
