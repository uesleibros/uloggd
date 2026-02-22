import { EditorView, ViewPlugin, Decoration } from "@codemirror/view"
import { HighlightStyle } from "@codemirror/language"
import { tags } from "@lezer/highlight"

const COLORS = {
  text: "#f0f6fc",
  textMuted: "#848d97",
  link: "#4493f8",
  accent: "#818cf8",
  selection: "rgba(148, 163, 184, 0.22)",
  selectionFocused: "rgba(148, 163, 184, 0.28)",
}

export const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: COLORS.text, fontWeight: "600" },
  { tag: tags.heading2, color: COLORS.text, fontWeight: "600" },
  { tag: tags.heading3, color: COLORS.text, fontWeight: "600" },
  { tag: tags.heading4, color: COLORS.text, fontWeight: "600" },
  { tag: tags.heading5, color: COLORS.text, fontWeight: "600" },
  { tag: tags.heading6, color: COLORS.textMuted, fontWeight: "600" },
  { tag: tags.strong, color: COLORS.text, fontWeight: "600" },
  { tag: tags.emphasis, color: COLORS.text, fontStyle: "italic" },
  { tag: tags.strikethrough, color: COLORS.textMuted, textDecoration: "line-through" },
  { tag: tags.link, color: COLORS.link },
  { tag: tags.url, color: COLORS.link },
  { tag: tags.processingInstruction, color: COLORS.text },
  { tag: tags.meta, color: COLORS.link },
  { tag: tags.monospace, color: COLORS.text, backgroundColor: "rgba(110,118,129,0.4)", borderRadius: "6px", padding: "0.2em 0.4em", fontSize: "85%" },
  { tag: tags.list, color: COLORS.text },
  { tag: tags.quote, color: COLORS.textMuted },
  { tag: tags.labelName, color: COLORS.link },
  { tag: tags.contentSeparator, color: "#3d444d" },
  { tag: tags.angleBracket, color: COLORS.textMuted },
  { tag: tags.tagName, color: "#7ee787" },
  { tag: tags.attributeName, color: "#d2a8ff" },
  { tag: tags.attributeValue, color: "#a5d6ff" },
  { tag: tags.string, color: "#a5d6ff" },
  { tag: tags.comment, color: COLORS.textMuted, fontStyle: "italic" },
])

const decorationMarks = {
  mentionAt: Decoration.mark({ class: "cm-mention-at" }),
  mentionUser: Decoration.mark({ class: "cm-mention-user" }),
  spoiler: Decoration.mark({ class: "cm-spoiler-syntax" }),
  game: Decoration.mark({ class: "cm-game-syntax" }),
  alertSyntax: Decoration.mark({ class: "cm-alert-syntax" }),
  alertType: Decoration.mark({ class: "cm-alert-type" }),
}

const DECORATION_PATTERNS = [
  { regex: /(?:^|[\s\n])(@)([a-zA-Z0-9_]{2,32})(?=[\s\n.,!?;:]|$)/g, handler: (match, widgets) => {
    const offset = match[0].startsWith("@") ? 0 : 1
    const atStart = match.index + offset
    widgets.push(decorationMarks.mentionAt.range(atStart, atStart + 1))
    widgets.push(decorationMarks.mentionUser.range(atStart + 1, atStart + 1 + match[2].length))
  }},
  { regex: /\|\|(.+?)\|\|/g, handler: (match, widgets) => {
    widgets.push(decorationMarks.spoiler.range(match.index, match.index + match[0].length))
  }},
  { regex: /!game(?::(?:mini|grid|grid-auto))?\(([^)\n]+)\)/g, handler: (match, widgets) => {
    widgets.push(decorationMarks.game.range(match.index, match.index + match[0].length))
  }},
  { regex: /^:::(\w+).*$/gm, handler: (match, widgets) => {
    widgets.push(decorationMarks.alertSyntax.range(match.index, match.index + 3))
    widgets.push(decorationMarks.alertType.range(match.index + 3, match.index + 3 + match[1].length))
  }},
  { regex: /^:::$/gm, handler: (match, widgets) => {
    widgets.push(decorationMarks.alertSyntax.range(match.index, match.index + 3))
  }},
]

export const customDecorations = ViewPlugin.fromClass(
  class {
    constructor(view) { this.decorations = this.build(view) }
    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.build(update.view)
      }
    }
    build(view) {
      const widgets = []
      const doc = view.state.doc.toString()

      for (const { regex, handler } of DECORATION_PATTERNS) {
        let match
        while ((match = regex.exec(doc)) !== null) {
          handler(match, widgets)
        }
      }

      return Decoration.set(widgets, true)
    }
  },
  { decorations: (v) => v.decorations }
)

export const cmTheme = EditorView.theme({
  "&": { backgroundColor: "transparent", color: "#e5e7eb", fontSize: "14px", height: "100%" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: "13.5px", lineHeight: "1.6", padding: "16px" },
  ".cm-content": { caretColor: COLORS.accent },
  "&.cm-focused .cm-cursor": { borderLeftColor: COLORS.accent, borderLeftWidth: "2px" },
  ".cm-selectionBackground": { backgroundColor: `${COLORS.selection} !important` },
  "&.cm-focused .cm-selectionBackground": { backgroundColor: `${COLORS.selectionFocused} !important` },
  ".cm-content ::selection": { backgroundColor: COLORS.selectionFocused },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-gutters": { backgroundColor: "transparent", borderRight: "1px solid rgba(255,255,255,0.04)" },
  ".cm-lineNumbers .cm-gutterElement": { color: "#52525b", padding: "0 10px 0 6px", fontSize: "12px", minWidth: "2.2em" },
  ".cm-activeLineGutter": { color: "#a1a1aa" },
  ".cm-placeholder": { color: "#52525b" },
  ".cm-mention-at": { color: COLORS.accent, backgroundColor: "rgba(99, 102, 241, 0.1)", borderRadius: "3px 0 0 3px", padding: "1px 0 1px 3px" },
  ".cm-mention-user": { color: COLORS.accent, backgroundColor: "rgba(99, 102, 241, 0.1)", borderRadius: "0 3px 3px 0", padding: "1px 3px 1px 0" },
  ".cm-spoiler-syntax": { color: "#6e7681", backgroundColor: "rgba(110, 118, 129, 0.2)", borderRadius: "3px" },
  ".cm-game-syntax": { color: "#fbbf24", fontWeight: "bold" },
  ".cm-alert-syntax": { color: "#64748b", fontWeight: "600" },
  ".cm-alert-type": { color: COLORS.accent, fontWeight: "600" },
})
