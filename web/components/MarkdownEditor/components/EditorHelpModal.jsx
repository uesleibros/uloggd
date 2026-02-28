import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Info, Search, X, Command } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import { MarkdownPreview } from "../MarkdownPreview"
import { HELP_SECTIONS, HELP_FEATURES } from "../constants"

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function Highlight({ text, query }) {
  if (!query.trim() || !text) return <>{text}</>
  const regex = new RegExp(`(${escapeRegex(query)})`, "gi")
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-indigo-500/30 text-indigo-300 rounded-sm px-0.5">{part}</mark>
          : part
      )}
    </>
  )
}

function FeatureItem({ syntax, description, example, preview, query, isActive, itemRef }) {
  const { t } = useTranslation("editor.help")
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div
      ref={itemRef}
      className={`rounded-lg border p-4 transition-all ${isActive ? "border-indigo-500/60 bg-indigo-500/5" : "border-zinc-800 bg-zinc-900/40"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <code className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
            <Highlight text={syntax} query={query} />
          </code>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            <Highlight text={description} query={query} />
          </p>
        </div>
        {preview && (
          <button
            onClick={() => setShowPreview(p => !p)}
            className={`flex-shrink-0 text-[10px] px-2 py-1 rounded-md border transition-all cursor-pointer ${
              showPreview
                ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
                : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
            }`}
          >
            {showPreview ? t("code") : t("preview")}
          </button>
        )}
      </div>

      {example && !showPreview && (
        <pre className="text-xs bg-black/30 border border-zinc-800 rounded-md p-2.5 mt-3 text-zinc-500 font-mono whitespace-pre-wrap overflow-x-auto">
          <Highlight text={example} query={query} />
        </pre>
      )}

      {preview && showPreview && (
        <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950/50 p-3 text-sm [&_.markdown-body]:text-sm [&_p]:mb-0 [&_hr]:my-2 [&_table]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_blockquote]:my-0">
          <MarkdownPreview content={preview} />
        </div>
      )}
    </div>
  )
}

export function EditorHelpModal({ isOpen, onClose, zIndex }) {
  const { t } = useTranslation("editor.help")
  const [search, setSearch] = useState("")
  const [activeSection, setActiveSection] = useState(HELP_SECTIONS[0].id)
  const [activeIndex, setActiveIndex] = useState(-1)
  const contentRef = useRef(null)
  const searchRef = useRef(null)
  const sectionRefs = useRef({})
  const mobileNavRef = useRef(null)
  const navBtnRefs = useRef({})
  const itemRefs = useRef([])
  const isScrollingTo = useRef(false)

  const featuresWithTranslations = useMemo(() => {
    return HELP_FEATURES.map(f => ({
      ...f,
      description: t(`features.${f.id}.description`),
      example: t(`features.${f.id}.example`, { defaultValue: "" }) || "",
      preview: t(`features.${f.id}.preview`, { defaultValue: "" }) || "",
    }))
  }, [t])

  useEffect(() => {
    if (!isOpen) {
      setSearch("")
      setActiveSection(HELP_SECTIONS[0].id)
      setActiveIndex(-1)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [isOpen])

  const filtered = useMemo(() => {
    if (!search.trim()) return featuresWithTranslations
    const q = search.toLowerCase()
    return featuresWithTranslations.filter(f =>
      f.syntax.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      (f.example || "").toLowerCase().includes(q)
    )
  }, [search, featuresWithTranslations])

  const visibleSections = useMemo(() => {
    const ids = new Set(filtered.map(f => f.section))
    return HELP_SECTIONS.filter(s => ids.has(s.id))
  }, [filtered])

  useEffect(() => setActiveIndex(search.trim() ? 0 : -1), [search])

  useEffect(() => {
    if (activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex].scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [activeIndex])

  useEffect(() => {
    const btn = navBtnRefs.current[activeSection]
    if (!btn || !mobileNavRef.current) return
    const nav = mobileNavRef.current
    const left = btn.offsetLeft - nav.offsetWidth / 2 + btn.offsetWidth / 2
    nav.scrollTo({ left, behavior: "smooth" })
  }, [activeSection])

  const scrollToSection = useCallback((id) => {
    const el = sectionRefs.current[id]
    const container = contentRef.current
    if (!el || !container) return
    
    isScrollingTo.current = true
    setActiveSection(id)
    
    const containerRect = container.getBoundingClientRect()
    const elRect = el.getBoundingClientRect()
    const offset = elRect.top - containerRect.top + container.scrollTop - 16
    
    container.scrollTo({ 
      top: offset, 
      behavior: "smooth" 
    })
    
    setTimeout(() => { isScrollingTo.current = false }, 500)
  }, [])

  const handleScroll = useCallback(() => {
    if (isScrollingTo.current || !contentRef.current || search.trim()) return
    
    const container = contentRef.current
    const containerRect = container.getBoundingClientRect()

    let current = visibleSections[0]?.id
    
    for (const section of visibleSections) {
      const el = sectionRefs.current[section.id]
      if (!el) continue
      
      const elRect = el.getBoundingClientRect()
      if (elRect.top <= containerRect.top + 50) {
        current = section.id
      }
    }
    
    if (current && current !== activeSection) {
      setActiveSection(current)
    }
  }, [visibleSections, search, activeSection])

  const handleKeyDown = useCallback((e) => {
    if (!search.trim() || filtered.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1) % filtered.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex(prev => (prev - 1 + filtered.length) % filtered.length)
    }
  }, [search, filtered])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen])

  itemRefs.current = []
  let globalIndex = 0

  return (
    <Modal
      isOpen={isOpen}
      noScroll={true}
      onClose={onClose}
      title={<span className="flex items-center gap-2"><Info className="w-5 h-5 text-indigo-400" />{t("title")}</span>}
      maxWidth="max-w-3xl"
      zIndex={zIndex}
    >
      <div className="px-4 pt-3 pb-2 border-b border-zinc-800 flex-shrink-0">
        <div className="relative">
          <Command className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-9 pr-9 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
          />
          {search ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-[10px] text-zinc-600 tabular-nums">{t("results", { count: filtered.length })}</span>
              <button onClick={() => setSearch("")} className="text-zinc-500 hover:text-white transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 font-mono">Ctrl</kbd>
              <kbd className="text-[10px] text-zinc-600 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 font-mono">K</kbd>
            </div>
          )}
        </div>
      </div>

      {!search && (
        <div ref={mobileNavRef} className="flex sm:hidden overflow-x-auto border-b border-zinc-800 px-2 py-1.5 gap-1 flex-shrink-0 scrollbar-hide">
          {HELP_SECTIONS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              ref={(el) => { navBtnRefs.current[id] = el }}
              onClick={() => scrollToSection(id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                activeSection === id ? "text-indigo-400 bg-indigo-500/15 font-medium" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              <Icon className="w-3 h-3 flex-shrink-0" />{t(`sections.${id}`)}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!search && (
          <nav className="w-44 flex-shrink-0 border-r border-zinc-800 overflow-y-auto py-2 hidden sm:block">
            {HELP_SECTIONS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={`w-full text-left px-3 py-2 text-[13px] transition-all cursor-pointer relative flex items-center gap-2 ${
                  activeSection === id ? "text-indigo-400 bg-indigo-500/10 font-medium" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                }`}
              >
                {activeSection === id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-indigo-400 rounded-r" />}
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />{t(`sections.${id}`)}
              </button>
            ))}
          </nav>
        )}

        <div ref={contentRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
          {visibleSections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-600">
              <Search className="w-8 h-8" />
              <p className="text-sm">{t("noResults")} "<span className="text-zinc-400">{search}</span>"</p>
            </div>
          ) : (
            visibleSections.map(section => (
              <div key={section.id} ref={(el) => { sectionRefs.current[section.id] = el }}>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-8 mb-4 first:mt-0 flex items-center gap-2">
                  <section.icon className="w-3.5 h-3.5" />{t(`sections.${section.id}`)}
                </h4>
                <div className="space-y-3">
                  {filtered.filter(f => f.section === section.id).map((item, i) => {
                    const idx = globalIndex++
                    return (
                      <FeatureItem
                        key={item.id}
                        syntax={item.syntax}
                        description={item.description}
                        example={item.example}
                        preview={item.preview}
                        query={search}
                        isActive={idx === activeIndex}
                        itemRef={(el) => { itemRefs.current[idx] = el }}
                      />
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-3 bg-zinc-900/50 border-t border-zinc-800 rounded-b-xl flex items-center justify-between flex-shrink-0">
        <p className="text-xs text-zinc-500" dangerouslySetInnerHTML={{ __html: t("shortcuts") }} />
        {search.trim() && filtered.length > 0 && <span className="text-[10px] text-zinc-600 tabular-nums">{Math.max(activeIndex + 1, 1)}/{filtered.length}</span>}
      </div>
    </Modal>
  )
}
