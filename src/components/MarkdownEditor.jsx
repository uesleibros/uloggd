import { useState, useRef, useCallback, useEffect, useMemo, memo } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "../../hooks/useAuth"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
import { defaultSchema } from "rehype-sanitize"
import UserBadges from "./UserBadges"
import { EditorView, keymap, placeholder as cmPlaceholder, drawSelection, highlightActiveLine, lineNumbers } from "@codemirror/view"
import { EditorState, Compartment } from "@codemirror/state"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { syntaxHighlighting, HighlightStyle, defaultHighlightStyle, bracketMatching } from "@codemirror/language"
import { tags } from "@lezer/highlight"
import { history, historyKeymap, defaultKeymap } from "@codemirror/commands"

const customSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "details", "summary", "iframe", "img", "spoiler", "spoilerimg", "div", "center", "mention"],
  attributes: {
    ...defaultSchema.attributes,
    img: ["src", "alt", "width", "height", "loading", "style"],
    spoilerimg: ["src", "alt", "width", "height"],
    iframe: ["src", "title", "allow", "allowfullscreen", "class", "className"],
    details: ["class", "className"],
    summary: ["class", "className"],
    div: [...(defaultSchema.attributes?.div || []), "class", "className", "style", "align"],
    p: ["style", "align"],
    h1: ["style", "align"],
    h2: ["style", "align"],
    h3: ["style", "align"],
    h4: ["style", "align"],
    h5: ["style", "align"],
    h6: ["style", "align"],
    center: [],
    mention: [],
    spoiler: [],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ["https"],
  },
}

const TOOLBAR = [
  { key: "heading", tooltip: "Título", group: "text" },
  { key: "bold", tooltip: "Negrito (Ctrl+B)", group: "text" },
  { key: "italic", tooltip: "Itálico (Ctrl+I)", group: "text" },
  { key: "strikethrough", tooltip: "Riscado", group: "text" },
  { key: "divider1" },
  { key: "link", tooltip: "Link (Ctrl+K)", group: "insert" },
  { key: "image", tooltip: "Imagem", group: "insert" },
  { key: "imagesize", tooltip: "Imagem com tamanho", group: "insert" },
  { key: "youtube", tooltip: "Vídeo do YouTube", group: "insert" },
  { key: "divider2" },
  { key: "code", tooltip: "Código inline", group: "insert" },
  { key: "codeblock", tooltip: "Bloco de código", group: "insert" },
  { key: "divider3" },
  { key: "ul", tooltip: "Lista", group: "list" },
  { key: "ol", tooltip: "Lista numerada", group: "list" },
  { key: "checklist", tooltip: "Checklist", group: "list" },
  { key: "divider4" },
  { key: "quote", tooltip: "Citação", group: "block" },
  { key: "spoiler", tooltip: "Spoiler texto", group: "block" },
  { key: "spoilerimage", tooltip: "Imagem com spoiler", group: "block" },
  { key: "hr", tooltip: "Separador", group: "block" },
  { key: "center", tooltip: "Centralizar", group: "block" },
  { key: "mention", tooltip: "Mencionar usuário", group: "block" },
  { key: "table", tooltip: "Tabela", group: "block" },
]

const markdownHighlightStyle = HighlightStyle.define([
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

const cmTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "#e6edf3",
    fontSize: "14px",
    height: "100%",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
    fontSize: "13.6px",
    lineHeight: "1.45",
    padding: "16px",
    overflow: "auto",
  },
  ".cm-content": {
    caretColor: "#e6edf3",
    padding: "0",
  },
  ".cm-line": {
    padding: "0",
  },
  ".cm-cursor": {
    borderLeftColor: "#e6edf3",
    borderLeftWidth: "1px",
  },
  ".cm-selectionBackground": {
    backgroundColor: "rgba(56, 139, 253, 0.4) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(56, 139, 253, 0.4) !important",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
  },
  ".cm-gutters": {
    display: "none",
  },
  ".cm-placeholder": {
    color: "#656d76",
    fontStyle: "normal",
  },
  ".cm-panels": {
    backgroundColor: "#0d1117",
    color: "#e6edf3",
  },
  ".cm-foldGutter": {
    display: "none",
  },
})

function ToolbarIcon({ type }) {
  const icons = {
    heading: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M4 4v16M20 4v16M4 12h16" strokeLinecap="round" />
      </svg>
    ),
    bold: <span className="font-bold text-sm leading-none">B</span>,
    italic: <span className="italic text-sm font-serif leading-none">I</span>,
    strikethrough: <span className="line-through text-sm leading-none">S</span>,
    link: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
    image: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
      </svg>
    ),
    imagesize: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-3-3m0 0h3m-3 0v3" strokeWidth={2} />
      </svg>
    ),
    youtube: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    code: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    codeblock: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    ul: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
    ol: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.242 5.992h12m-12 6.003h12m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H5.24m-1.92 2.577a1.125 1.125 0 11-1.087 0m.912 4.828v-.998h1.125m-1.125.998h1.125m-1.125 0a.75.75 0 01-.262-.073" />
      </svg>
    ),
    checklist: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    quote: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
      </svg>
    ),
    spoiler: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      </svg>
    ),
    spoilerimage: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" strokeWidth={2} />
      </svg>
    ),
    hr: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" d="M3 12h18" />
      </svg>
    ),
    mention: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25" />
      </svg>
    ),
    center: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" d="M3 6h18M7 12h10M5 18h14" />
      </svg>
    ),
    table: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" strokeLinecap="round" />
      </svg>
    ),
  }
  return icons[type] || null
}

function PortalDropdown({ anchorRef, open, onClose, children }) {
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open || !anchorRef.current) return
    const update = () => {
      const rect = anchorRef.current.getBoundingClientRect()
      const dropdownWidth = 160
      let left = rect.left
      if (left + dropdownWidth > window.innerWidth - 8) left = window.innerWidth - dropdownWidth - 8
      if (left < 8) left = 8
      setPos({ top: rect.bottom + 4, left })
    }
    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (anchorRef.current?.contains(e.target)) return
      onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, onClose, anchorRef])

  if (!open) return null

  return createPortal(
    <div
      className="fixed z-[9999] bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl shadow-black/50 py-1 min-w-[150px]"
      style={{ top: pos.top, left: pos.left }}
    >
      {children}
    </div>,
    document.body
  )
}

function SpoilerText({ children }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <span
      onClick={(e) => { e.stopPropagation(); setRevealed(true) }}
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 cursor-pointer transition-all duration-300 ${
        revealed ? "bg-zinc-700/40 text-zinc-300" : "bg-zinc-700 hover:bg-zinc-600 select-none"
      }`}
      title={revealed ? "" : "Clique para revelar"}
    >
      {!revealed && (
        <svg className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
      )}
      <span className={revealed ? "" : "text-transparent text-sm"}>
        {revealed ? children : "Spoiler"}
      </span>
    </span>
  )
}

function SpoilerImage({ src, alt, width, height }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div
      className={`relative inline-block my-3 rounded-xl overflow-hidden border transition-all duration-300 max-w-full ${revealed ? "border-zinc-700" : "border-zinc-600 hover:border-zinc-500 cursor-pointer"}`}
      onClick={() => setRevealed(true)}
    >
      <img
        src={src}
        alt={alt || ""}
        width={width}
        height={height}
        className={`max-w-full block transition-all duration-500 ${revealed ? "blur-0 scale-100" : "blur-3xl scale-110 brightness-50"}`}
        loading="lazy"
        onError={(e) => { e.target.onerror = null; e.target.className = "hidden" }}
      />
      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-all duration-300 ${revealed ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl px-5 py-3 flex flex-col items-center gap-2 border border-zinc-700/50 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-300">Spoiler</span>
          <span className="text-xs text-zinc-500">Clique para revelar</span>
        </div>
      </div>
    </div>
  )
}

function MentionCard({ username, onClose }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => { requestAnimationFrame(() => setMounted(true)) })
  }, [])

  const handleClose = useCallback(() => {
    setMounted(false)
    setTimeout(onClose, 150)
  }, [onClose])

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
      signal: controller.signal,
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { setProfile(data); setLoading(false) })
      .catch(err => { if (err.name !== "AbortError") { setError(true); setLoading(false) } })
    return () => controller.abort()
  }, [username])

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") handleClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleClose])

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const originalPadding = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = "hidden"
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.paddingRight = originalPadding
    }
  }, [])

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-150 ${mounted ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className={`relative bg-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-sm shadow-2xl shadow-black/50 overflow-hidden transition-all duration-150 ${mounted ? "scale-100 translate-y-0" : "scale-95 translate-y-2"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={handleClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-zinc-400 hover:text-white hover:bg-black/60 transition-all cursor-pointer">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {loading ? (
          <>
            <div className="h-28 bg-gradient-to-br from-zinc-800 to-zinc-900 animate-pulse" />
            <div className="px-5 -mt-10 relative"><div className="w-20 h-20 rounded-full bg-zinc-700 border-4 border-zinc-900 animate-pulse" /></div>
            <div className="px-5 pt-3 pb-5 space-y-3">
              <div className="h-6 w-36 bg-zinc-800 rounded-md animate-pulse" />
              <div className="h-3.5 w-48 bg-zinc-800/60 rounded animate-pulse" />
              <div className="h-3.5 w-32 bg-zinc-800/40 rounded animate-pulse" />
              <div className="h-10 w-full bg-zinc-800 rounded-lg animate-pulse mt-4" />
            </div>
          </>
        ) : error ? (
          <div className="px-6 py-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
              <svg className="w-7 h-7 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-zinc-300">Usuário não encontrado</p>
              <p className="text-xs text-zinc-500">@{username} não existe ou foi removido</p>
            </div>
            <button onClick={handleClose} className="px-5 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors cursor-pointer">Fechar</button>
          </div>
        ) : (
          <>
            <div className="h-28 relative overflow-hidden">
              {profile.banner ? (
                <img src={profile.banner} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 via-zinc-800 to-zinc-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
            </div>
            <div className="px-5 -mt-10 relative">
              <img src={profile.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} alt={profile.username} className="w-20 h-20 rounded-full border-4 border-zinc-900 bg-zinc-800 select-none object-cover shadow-xl" draggable={false} />
            </div>
            <div className="px-5 pt-3 pb-5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white truncate">{profile.username}</h3>
                <UserBadges user={profile} size="lg" />
              </div>
              {profile.created_at && (
                <p className="text-xs text-zinc-600 mt-2.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  Membro desde {new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </p>
              )}
              <a href={`/u/${profile.username}`} className="mt-4 w-full px-4 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group">
                Ver perfil completo
                <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

function Mention({ username }) {
  const [showCard, setShowCard] = useState(false)
  return (
    <>
      <span
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCard(true) }}
        className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded text-sm font-medium transition-colors cursor-pointer no-underline"
      >
        @{username}
      </span>
      {showCard && <MentionCard username={username} onClose={() => setShowCard(false)} />}
    </>
  )
}

const remarkPlugins = [remarkGfm]
const rehypePlugins = [rehypeRaw, [rehypeSanitize, customSchema]]

const markdownComponents = {
  h1: ({ children }) => <h1 className="text-2xl sm:text-3xl font-bold text-white mt-6 mb-3 pb-2 border-b border-zinc-700">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl sm:text-2xl font-bold text-white mt-5 mb-2 pb-1.5 border-b border-zinc-800">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg sm:text-xl font-semibold text-white mt-4 mb-2">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base sm:text-lg font-semibold text-zinc-200 mt-3 mb-1.5">{children}</h4>,
  h5: ({ children }) => <h5 className="text-sm sm:text-base font-semibold text-zinc-300 mt-3 mb-1">{children}</h5>,
  h6: ({ children }) => <h6 className="text-xs sm:text-sm font-semibold text-zinc-400 mt-2 mb-1">{children}</h6>,
  p: ({ children }) => {
    const childArray = Array.isArray(children) ? children : [children]
    if (childArray.length === 1) {
      const child = childArray[0]
      const href = typeof child === "string" ? child : child?.props?.href
      if (href && typeof href === "string") {
        const ytMatch = href.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)
        if (ytMatch) {
          return (
            <div className="my-4 aspect-video rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800 shadow-lg">
              <iframe src={`https://www.youtube-nocookie.com/embed/${ytMatch[1]}`} title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
            </div>
          )
        }
      }
    }
    return <p className="text-sm text-zinc-300 leading-relaxed mb-3">{children}</p>
  },
  a: ({ href, children }) => {
    const ytMatch = href?.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)
    if (ytMatch) {
      return (
        <div className="my-4 aspect-video rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800 shadow-lg">
          <iframe src={`https://www.youtube-nocookie.com/embed/${ytMatch[1]}`} title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
        </div>
      )
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">{children}</a>
  },
  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
  del: ({ children }) => <del className="text-zinc-500 line-through">{children}</del>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-indigo-500/50 bg-indigo-500/5 pl-4 py-2 my-3 rounded-r-lg">{children}</blockquote>,
  spoiler: ({ children }) => <SpoilerText>{children}</SpoilerText>,
  spoilerimg: ({ src, alt, width, height }) => <SpoilerImage src={src} alt={alt} width={width} height={height} />,
  details: ({ children }) => <details className="my-3 bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden group">{children}</details>,
  summary: ({ children }) => (
    <summary className="px-4 py-3 text-sm font-medium text-zinc-300 hover:text-white cursor-pointer select-none transition-colors hover:bg-zinc-700/30 flex items-center gap-2">
      <svg className="w-4 h-4 text-zinc-500 transition-transform group-open:rotate-90 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
      {children}
    </summary>
  ),
  code: ({ inline, className, children }) => {
    if (inline) return <code className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-pink-400 font-mono">{children}</code>
    return (
      <pre className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 sm:p-4 my-3 overflow-x-auto">
        <code className={`text-xs sm:text-sm text-zinc-300 font-mono ${className || ""}`}>{children}</code>
      </pre>
    )
  },
  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-sm text-zinc-300">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-sm text-zinc-300">{children}</ol>,
  li: ({ children, checked }) => {
    if (checked !== null && checked !== undefined) {
      return (
        <li className="flex items-start gap-2 list-none">
          <input type="checkbox" checked={checked} readOnly className="mt-1 accent-indigo-500 pointer-events-none" />
          <span className={checked ? "text-zinc-500 line-through" : "text-zinc-300"}>{children}</span>
        </li>
      )
    }
    return <li>{children}</li>
  },
  hr: () => <hr className="my-6 border-zinc-700" />,
  img: ({ src, alt, width, height }) => (
    <img
      src={src}
      alt={alt || ""}
      className="max-w-full rounded-lg my-3 border border-zinc-700"
      style={{ width: width ? `min(${width}px, 100%)` : undefined, height: height ? `${height}px` : undefined }}
      loading="lazy"
      onError={(e) => { e.target.onerror = null; e.target.className = "hidden" }}
    />
  ),
  div: ({ align, children }) => {
    const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : ""
    return <div className={alignClass}>{children}</div>
  },
  mention: ({ children }) => <Mention username={children} />,
  center: ({ children }) => <div className="text-center">{children}</div>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 -mx-1">
      <table className="w-full text-sm border-collapse border border-zinc-700 rounded-lg overflow-hidden">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-800/80">{children}</thead>,
  th: ({ children }) => <th className="px-3 sm:px-4 py-2 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider border border-zinc-700">{children}</th>,
  td: ({ children }) => <td className="px-3 sm:px-4 py-2 text-sm text-zinc-400 border border-zinc-700">{children}</td>,
  tr: ({ children }) => <tr className="hover:bg-zinc-800/30 transition-colors">{children}</tr>,
}

export const MarkdownPreview = memo(function MarkdownPreview({ content }) {
  const processedContent = useMemo(() => {
    return content
      .replace(
        /(```[\s\S]*?```|`[^`\n]+`)|\|\|(.+?)\|\|/g,
        (match, code, spoiler) => {
          if (code) return code
          return `<spoiler>${spoiler}</spoiler>`
        }
      )
      .replace(
        /<spoilerimg\s+src="([^"]+)"(?:\s+alt="([^"]*)")?(?:\s+width="([^"]*)")?(?:\s+height="([^"]*)")?\s*\/?>/g,
        (match, src, alt, width, height) => {
          const attrs = [`src="${src}"`]
          if (alt) attrs.push(`alt="${alt}"`)
          if (width) attrs.push(`width="${width}"`)
          if (height) attrs.push(`height="${height}"`)
          return `<spoilerimg ${attrs.join(" ")} />`
        }
      )
      .replace(
        /(```[\s\S]*?```|`[^`\n]+`|\[.*?\]\(.*?\)|https?:\/\/\S+)|(?<![a-zA-Z0-9])@([a-zA-Z0-9_]{2,32})(?![a-zA-Z0-9_])/g,
        (match, skip, username) => {
          if (skip) return skip
          if (!username) return match
          return `<mention>${username}</mention>`
        }
      )
  }, [content])

  if (!processedContent.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-600">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm">Nada para visualizar</p>
      </div>
    )
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={markdownComponents}>
        {processedContent}
      </ReactMarkdown>
    </div>
  )
})

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const handler = (e) => setMatches(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [query])
  return matches
}

const followingCache = new Map()

function MentionSuggestions({ query, position, onSelect, userId, editorContainerRef }) {
  const [users, setUsers] = useState(() => followingCache.get(userId) || [])
  const [loading, setLoading] = useState(!followingCache.has(userId))
  const containerRef = useRef(null)
  const [placement, setPlacement] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (followingCache.has(userId)) return
    setLoading(true)
    fetch("/api/user/followers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, type: "following" }),
    })
      .then(r => r.json())
      .then(data => {
        followingCache.set(userId, data || [])
        setUsers(data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [userId])

  useEffect(() => {
    if (!containerRef.current || !editorContainerRef?.current) return

    const editorRect = editorContainerRef.current.getBoundingClientRect()
    const menuHeight = containerRef.current.offsetHeight || 200
    const isMobile = window.innerWidth < 640

    const cursorTop = editorRect.top + (editorRect.height - position.bottom)
    const cursorLeft = editorRect.left + position.left

    const spaceBelow = window.innerHeight - cursorTop - 30
    const spaceAbove = cursorTop - editorRect.top

    const showBelow = spaceBelow >= menuHeight || spaceBelow > spaceAbove

    let top, left, width

    if (showBelow) {
      top = cursorTop + 24
    } else {
      top = cursorTop - menuHeight - 8
    }

    if (isMobile) {
      left = 12
      width = window.innerWidth - 24
    } else {
      const menuWidth = 224
      left = Math.min(cursorLeft, window.innerWidth - menuWidth - 16)
      left = Math.max(left, 16)
      width = menuWidth
    }

    top = Math.max(top, 8)
    top = Math.min(top, window.innerHeight - menuHeight - 8)

    setPlacement({ top, left, width })
  }, [position, users, loading, editorContainerRef])

  const filtered = query ? users.filter(u => u.username?.toLowerCase().includes(query.toLowerCase())) : users

  if (!loading && filtered.length === 0) return null

  return createPortal(
    <div
      ref={containerRef}
      className="fixed z-[9999] bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl shadow-black/50 py-1 max-h-48 overflow-y-auto"
      style={{ top: placement.top, left: placement.left, width: placement.width }}
    >
      {loading ? (
        <div className="px-3 py-4 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
        </div>
      ) : (
        filtered.slice(0, 8).map(u => (
          <button
            key={u.id}
            onMouseDown={(e) => { e.preventDefault(); onSelect(u.username) }}
            className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-zinc-700/70 active:bg-zinc-700 transition-colors cursor-pointer text-left"
          >
            <img src={u.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} alt="" className="w-6 h-6 rounded-full bg-zinc-700 object-cover flex-shrink-0" />
            <span className="text-sm text-zinc-300 truncate">{u.username}</span>
          </button>
        ))
      )}
    </div>,
    document.body
  )
}

function useCodeMirror({ value, onChange, maxLength, placeholder: ph, editorRef, onMentionQuery }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const onMentionQueryRef = useRef(onMentionQuery)
  const isExternalUpdate = useRef(false)

  useEffect(() => {
    onChangeRef.current = onChange
    onMentionQueryRef.current = onMentionQuery
  }, [onChange, onMentionQuery])

  useEffect(() => {
    if (!containerRef.current || viewRef.current) return

    const maxLengthFilter = maxLength
      ? EditorState.transactionFilter.of(tr => {
          if (!tr.docChanged) return tr
          if (tr.newDoc.length > maxLength) return []
          return tr
        })
      : []

    const updateListener = EditorView.updateListener.of(update => {
      if (update.docChanged && !isExternalUpdate.current) {
        onChangeRef.current(update.state.doc.toString())
      }
      
      if (update.selectionSet || update.docChanged) {
        const { from } = update.state.selection.main
        const doc = update.state.doc.toString()
        const textBefore = doc.slice(0, from)
        const match = textBefore.match(/(?:^|[\s\n])@([a-zA-Z0-9_]{0,32})$/)
        
        if (match) {
          const coords = update.view.coordsAtPos(from)
          const editorRect = update.view.dom.getBoundingClientRect()
          onMentionQueryRef.current?.({
            query: match[1],
            startIndex: from - match[1].length - 1,
            position: coords ? {
              bottom: editorRect.bottom - coords.top + 8,
              left: coords.left - editorRect.left,
            } : { bottom: 40, left: 16 }
          })
        } else {
          onMentionQueryRef.current?.(null)
        }
      }
    })

    const state = EditorState.create({
      doc: value,
      extensions: [
        cmTheme,
        syntaxHighlighting(markdownHighlightStyle),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        drawSelection(),
        highlightActiveLine(),
        bracketMatching(),
        EditorView.lineWrapping,
        ph ? cmPlaceholder(ph) : [],
        maxLengthFilter,
        updateListener,
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view
    if (editorRef) editorRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
      if (editorRef) editorRef.current = null
    }
  }, [maxLength, ph])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentDoc = view.state.doc.toString()
    if (currentDoc !== value) {
      isExternalUpdate.current = true
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      })
      isExternalUpdate.current = false
    }
  }, [value])

  return containerRef
}

export function MarkdownEditor({ value = "", onChange, maxLength = 10000, placeholder = "Escreva sobre você..." }) {
  const [tab, setTab] = useState("write")
  const [headingOpen, setHeadingOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [splitPos, setSplitPos] = useState(50)
  const { user: currentUser } = useAuth()
  const [mention, setMention] = useState(null)
  const editorViewRef = useRef(null)
  const splitContainerRef = useRef(null)
  const isDragging = useRef(false)
  const previewSideRef = useRef(null)
  const headingBtnRef = useRef(null)

  const isLargeScreen = useMediaQuery("(min-width: 1024px)")
  const showSideBySideOption = isFullscreen && isLargeScreen

  const charCount = value.length
  const charPercent = maxLength ? (charCount / maxLength) * 100 : 0
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const lineCount = value.split("\n").length

  const handleMentionQuery = useCallback((data) => {
    setMention(data)
  }, [])

  const mainEditorContainer = useCodeMirror({
    value,
    onChange,
    maxLength,
    placeholder,
    editorRef: editorViewRef,
    onMentionQuery: handleMentionQuery,
  })

  const handleMentionSelect = useCallback((username) => {
    if (!mention) return
    const view = editorViewRef.current
    if (!view) return

    const insertText = "@" + username + " "
    view.dispatch({
      changes: { from: mention.startIndex, to: view.state.selection.main.from, insert: insertText },
      selection: { anchor: mention.startIndex + insertText.length },
    })
    view.focus()
    setMention(null)
  }, [mention])

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Escape") return
      if (mention) { setMention(null); return }
      if (headingOpen) { setHeadingOpen(false); return }
      if (isFullscreen) setIsFullscreen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [isFullscreen, headingOpen, mention])

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [isFullscreen])

  useEffect(() => {
    if (!isFullscreen && tab === "sidebyside") setTab("write")
  }, [isFullscreen, tab])

  useEffect(() => {
    if (!isLargeScreen && tab === "sidebyside") setTab("write")
  }, [isLargeScreen, tab])

  useEffect(() => {
    setHeadingOpen(false)
  }, [tab, isFullscreen])

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging.current || !splitContainerRef.current) return
      e.preventDefault()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const rect = splitContainerRef.current.getBoundingClientRect()
      const pos = ((clientX - rect.left) / rect.width) * 100
      setSplitPos(Math.min(Math.max(pos, 20), 80))
    }
    const handleEnd = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleEnd)
    window.addEventListener("touchmove", handleMove, { passive: false })
    window.addEventListener("touchend", handleEnd)
    return () => {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleEnd)
      window.removeEventListener("touchmove", handleMove)
      window.removeEventListener("touchend", handleEnd)
    }
  }, [])

  const handleSplitStart = useCallback((e) => {
    isDragging.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    e.preventDefault()
  }, [])

  const insertText = useCallback((before, after = "", ph = "") => {
    const view = editorViewRef.current
    if (!view) return
    const { from, to } = view.state.selection.main
    const selected = view.state.sliceDoc(from, to)
    const insert = selected || ph
    const fullInsert = before + insert + after

    if (maxLength && (view.state.doc.length - (to - from) + fullInsert.length) > maxLength) return

    view.dispatch({
      changes: { from, to, insert: fullInsert },
      selection: {
        anchor: selected ? from + fullInsert.length : from + before.length,
        head: selected ? from + fullInsert.length : from + before.length + insert.length,
      },
    })
    view.focus()
  }, [maxLength])

  const insertAtLineStart = useCallback((prefix) => {
    const view = editorViewRef.current
    if (!view) return
    const { from } = view.state.selection.main
    const line = view.state.doc.lineAt(from)

    if (maxLength && view.state.doc.length + prefix.length > maxLength) return

    view.dispatch({
      changes: { from: line.from, to: line.from, insert: prefix },
      selection: { anchor: from + prefix.length },
    })
    view.focus()
  }, [maxLength])

  const insertNewBlock = useCallback((block) => {
    const view = editorViewRef.current
    if (!view) return
    const { from } = view.state.selection.main
    const doc = view.state.doc.toString()
    const needsNewline = from > 0 && doc[from - 1] !== "\n"
    const prefix = needsNewline ? "\n\n" : from === 0 ? "" : "\n"
    const fullBlock = prefix + block + "\n"

    if (maxLength && view.state.doc.length + fullBlock.length > maxLength) return

    view.dispatch({
      changes: { from, to: from, insert: fullBlock },
      selection: { anchor: from + fullBlock.length },
    })
    view.focus()
  }, [maxLength])

  const handleAction = useCallback((key) => {
    const actions = {
      bold: () => insertText("**", "**", "texto em negrito"),
      italic: () => insertText("*", "*", "texto em itálico"),
      strikethrough: () => insertText("~~", "~~", "texto riscado"),
      link: () => insertText("[", "](https://)", "texto do link"),
      image: () => insertText("![", "](https://url-da-imagem.com)", "descrição"),
      imagesize: () => insertNewBlock('<img src="https://url-da-imagem.com" alt="descrição" width="400" />'),
      youtube: () => insertNewBlock("https://www.youtube.com/watch?v=VIDEO_ID"),
      code: () => insertText("`", "`", "código"),
      codeblock: () => insertNewBlock("```\ncódigo aqui\n```"),
      ul: () => insertAtLineStart("- "),
      ol: () => insertAtLineStart("1. "),
      checklist: () => insertAtLineStart("- [ ] "),
      quote: () => insertAtLineStart("> "),
      spoiler: () => insertText("||", "||", "texto escondido"),
      spoilerimage: () => insertNewBlock('<spoilerimg src="https://url-da-imagem.com" alt="descrição" width="400" />'),
      hr: () => insertNewBlock("---"),
      mention: () => insertText("@", "", "username"),
      center: () => insertNewBlock("<center>\n\nconteúdo centralizado\n\n</center>"),
      table: () => insertNewBlock("| Coluna 1 | Coluna 2 | Coluna 3 |\n| --- | --- | --- |\n| dado | dado | dado |"),
    }
    actions[key]?.()
  }, [insertText, insertAtLineStart, insertNewBlock])

  const showToolbar = tab === "write" || tab === "sidebyside"

  const renderToolbar = () => (
    <div className="flex items-center gap-0.5 px-1.5 sm:px-2 py-1 sm:py-1.5 border-b border-zinc-800 bg-zinc-800/20 overflow-x-auto scrollbar-hide flex-shrink-0">
      {TOOLBAR.map(item => {
        if (item.key.startsWith("divider")) {
          return <div key={item.key} className="w-px h-5 bg-zinc-700/60 mx-0.5 sm:mx-1 flex-shrink-0" />
        }
        if (item.key === "heading") {
          return (
            <button
              key={item.key}
              ref={headingBtnRef}
              onClick={() => setHeadingOpen(prev => !prev)}
              title={item.tooltip}
              aria-label={item.tooltip}
              className="p-1.5 sm:p-2 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-700/50 transition-all cursor-pointer flex-shrink-0 active:scale-90"
            >
              <ToolbarIcon type={item.key} />
            </button>
          )
        }
        return (
          <button
            key={item.key}
            onClick={() => handleAction(item.key)}
            title={item.tooltip}
            aria-label={item.tooltip}
            className="p-1.5 sm:p-2 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-700/50 transition-all cursor-pointer flex-shrink-0 active:scale-90"
          >
            <ToolbarIcon type={item.key} />
          </button>
        )
      })}
    </div>
  )

  return (
    <>
      {isFullscreen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsFullscreen(false)} />
      )}

      <PortalDropdown anchorRef={headingBtnRef} open={headingOpen} onClose={() => setHeadingOpen(false)}>
        <div role="menu">
          {[1, 2, 3, 4, 5, 6].map(level => (
            <button
              key={level}
              role="menuitem"
              onClick={() => { insertAtLineStart("#".repeat(level) + " "); setHeadingOpen(false) }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-700 transition-colors cursor-pointer flex items-center gap-2"
            >
              <span className={`text-zinc-300 font-semibold ${level === 1 ? "text-lg" : level === 2 ? "text-base" : level === 3 ? "text-sm" : "text-xs"}`}>
                H{level}
              </span>
              <span className="text-xs text-zinc-500">{"#".repeat(level)} Título</span>
            </button>
          ))}
        </div>
      </PortalDropdown>

      <div
        className={
          isFullscreen
            ? "fixed inset-0 z-50 flex flex-col bg-zinc-900 sm:inset-4 sm:rounded-2xl sm:border sm:border-zinc-700/50 sm:shadow-2xl sm:shadow-black/50"
            : "border border-zinc-700 rounded-xl overflow-hidden bg-zinc-900/50"
        }
      >
        <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800/30 flex-shrink-0">
          <div className="flex items-center min-w-0">
            <button
              onClick={() => setTab("write")}
              className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all cursor-pointer relative ${tab === "write" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <span className="flex items-center gap-1 sm:gap-1.5">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                </svg>
                <span className="xs:inline">Escrever</span>
              </span>
              {tab === "write" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
            </button>

            <button
              onClick={() => setTab("preview")}
              className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all cursor-pointer relative ${tab === "preview" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <span className="flex items-center gap-1 sm:gap-1.5">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                <span className="xs:inline">Visualizar</span>
              </span>
              {tab === "preview" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
            </button>

            {showSideBySideOption && (
              <button
                onClick={() => setTab("sidebyside")}
                className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all cursor-pointer relative ${tab === "sidebyside" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 3v18" strokeLinecap="round" />
                  </svg>
                  <span className="hidden sm:inline">Lado a lado</span>
                </span>
                {tab === "sidebyside" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 pr-2 sm:pr-3 flex-shrink-0">
            {maxLength && (
              <span className={`text-xs tabular-nums hidden sm:inline ${charPercent > 90 ? "text-red-400" : charPercent > 70 ? "text-amber-400" : "text-zinc-600"}`}>
                {charCount.toLocaleString()}/{maxLength.toLocaleString()}
              </span>
            )}
            <button
              onClick={() => setIsFullscreen(f => !f)}
              title={isFullscreen ? "Sair da tela cheia (Esc)" : "Tela cheia"}
              aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-700/50 transition-all cursor-pointer active:scale-90"
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {maxLength && (
          <div className="h-[2px] bg-zinc-800/50 flex-shrink-0">
            <div
              className={`h-full transition-all duration-500 ease-out ${charPercent > 90 ? "bg-red-500/80" : charPercent > 70 ? "bg-amber-500/60" : "bg-indigo-500/30"}`}
              style={{ width: `${Math.min(charPercent, 100)}%` }}
            />
          </div>
        )}

        {showToolbar && renderToolbar()}

        <div className={isFullscreen ? "flex-1 min-h-0 overflow-hidden flex flex-col" : ""}>
          <div className={`relative ${tab === "write" ? (isFullscreen ? "flex-1 min-h-0" : "h-[250px] sm:h-[300px]") : "hidden"}`}>
            <div
              ref={mainEditorContainer}
              className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
            />
            {mention && currentUser && (
              <MentionSuggestions
                query={mention.query}
                position={mention.position}
                onSelect={handleMentionSelect}
                userId={currentUser.id}
                editorContainerRef={mainEditorContainer}
              />
            )}
          </div>

          {tab === "preview" && (
            <div className={`p-3 sm:p-4 overflow-y-auto ${isFullscreen ? "flex-1 min-h-0" : "min-h-[250px] sm:min-h-[300px]"}`}>
              <MarkdownPreview content={value} />
            </div>
          )}

          {tab === "sidebyside" && (
            <div ref={splitContainerRef} className="flex flex-1 min-h-0">
              <div
                className="relative h-full overflow-hidden"
                style={{ width: `${splitPos}%` }}
              >
                <div
                  ref={mainEditorContainer}
                  className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
                />
                {mention && currentUser && (
                  <MentionSuggestions
                    query={mention.query}
                    position={mention.position}
                    onSelect={handleMentionSelect}
                    userId={currentUser.id}
                  />
                )}
              </div>
              <div
                onMouseDown={handleSplitStart}
                onTouchStart={handleSplitStart}
                className="relative flex-shrink-0 touch-none cursor-col-resize group z-10"
              >
                <div className="w-px h-full bg-zinc-700 group-hover:bg-indigo-500/70 transition-colors" />
                <div className="absolute inset-y-0 -left-2 -right-2" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-10 rounded-full bg-zinc-700/80 group-hover:bg-indigo-500/80 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-lg">
                  <svg className="w-1.5 h-4 text-zinc-300" viewBox="0 0 6 16" fill="currentColor">
                    <circle cx="1.5" cy="3" r="1" />
                    <circle cx="4.5" cy="3" r="1" />
                    <circle cx="1.5" cy="8" r="1" />
                    <circle cx="4.5" cy="8" r="1" />
                    <circle cx="1.5" cy="13" r="1" />
                    <circle cx="4.5" cy="13" r="1" />
                  </svg>
                </div>
              </div>
              <div
                ref={previewSideRef}
                className="h-full overflow-y-auto"
                style={{ width: `${100 - splitPos}%` }}
              >
                <div className="p-3 sm:p-4">
                  <MarkdownPreview content={value} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 border-t border-zinc-800 bg-zinc-800/20 flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-[10px] sm:text-xs text-zinc-600 flex items-center gap-1 flex-shrink-0">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <span className="hidden sm:inline">Markdown suportado</span>
              <span className="sm:hidden">MD</span>
            </span>
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-600">
              <span className="tabular-nums">{wordCount} {wordCount === 1 ? "palavra" : "palavras"}</span>
              <span className="text-zinc-700">·</span>
              <span className="tabular-nums">{lineCount} {lineCount === 1 ? "linha" : "linhas"}</span>
            </div>
            {maxLength && (
              <span className={`text-[10px] tabular-nums sm:hidden flex-shrink-0 ${charPercent > 90 ? "text-red-400" : charPercent > 70 ? "text-amber-400" : "text-zinc-600"}`}>
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
