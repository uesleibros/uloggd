import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "#hooks/useAuth"
import { useMediaQuery } from "./hooks/useMediaQuery"
import { useEscapeStack } from "./hooks/useEscapeStack"
import { useSplitPane } from "./hooks/useSplitPane"
import { useEditorActions } from "./hooks/useEditorActions"
import { useCodeMirror } from "./hooks/useCodeMirror"
import { KEYBOARD_SHORTCUTS } from "./constants"
import { EditorTabs } from "./components/EditorTabs"
import { EditorToolbar } from "./components/EditorToolbar"
import { EditorStatusBar } from "./components/EditorStatusBar"
import { EditorHelpModal } from "./components/EditorHelpModal"
import { MentionSuggestions } from "./components/MentionSuggestions"
import { MarkdownPreview } from "./MarkdownPreview"
import { SplitHandle } from "./components/SplitHandle"

export function MarkdownEditor({ value = "", onChange, maxLength = 10000, placeholder = "Escreva sobre você..." }) {
  const [tab, setTab] = useState("write")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mention, setMention] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const { user: currentUser } = useAuth()
  const editorViewRef = useRef(null)

  const isLargeScreen = useMediaQuery("(min-width: 1024px)")
  const showSideBySide = isFullscreen && isLargeScreen

  const { position: splitPos, containerRef: splitContainerRef, handleStart: handleSplitStart } = useSplitPane(50)
  const { handleAction, insertAtLineStart } = useEditorActions(editorViewRef, maxLength)

  const stats = useMemo(() => ({
    charCount: value.length,
    charPercent: maxLength ? (value.length / maxLength) * 100 : 0,
    wordCount: value.trim() ? value.trim().split(/\s+/).length : 0,
    lineCount: value.split("\n").length,
  }), [value, maxLength])

  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  const stableOnChange = useCallback((val) => onChangeRef.current(val), [])

  const handleMentionQuery = useCallback((data) => setMention(data), [])

  const setEditorRef = useCodeMirror({
    value,
    onChange: stableOnChange,
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

  const handleInsertHeading = useCallback((level) => {
    insertAtLineStart("#".repeat(level) + " ")
  }, [insertAtLineStart])

  useEscapeStack([
    { active: showHelp, onClose: () => setShowHelp(false) },
    { active: !!mention, onClose: () => setMention(null) },
    { active: isFullscreen, onClose: () => setIsFullscreen(false) },
  ])

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

  useEffect(() => setMention(null), [tab, isFullscreen])

  useEffect(() => {
    const handler = (e) => {
      if (!editorViewRef.current || e.defaultPrevented) return

      const isMod = e.ctrlKey || e.metaKey
      if (!isMod) return

      const key = e.shiftKey ? `ctrl+shift+${e.key.toLowerCase()}` : `ctrl+${e.key.toLowerCase()}`
      const action = KEYBOARD_SHORTCUTS[key]

      if (action) {
        e.preventDefault()
        handleAction(action)
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleAction])

  const showToolbar = tab === "write" || tab === "sidebyside"

  const renderContent = () => (
    <>
      <EditorTabs
        activeTab={tab}
        onTabChange={setTab}
        showSideBySide={showSideBySide}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(f => !f)}
        charCount={stats.charCount}
        maxLength={maxLength}
      />

      {maxLength && (
        <div className="h-[2px] bg-zinc-800/50 flex-shrink-0">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              stats.charPercent > 90 ? "bg-red-500/80" : stats.charPercent > 70 ? "bg-amber-500/60" : "bg-indigo-500/30"
            }`}
            style={{ width: `${Math.min(stats.charPercent, 100)}%` }}
          />
        </div>
      )}

      {showToolbar && <EditorToolbar onAction={handleAction} onInsertHeading={handleInsertHeading} />}

      <div className={isFullscreen ? "flex-1 min-h-0 overflow-hidden flex flex-col" : ""}>
        <div
          ref={splitContainerRef}
          className={`flex flex-row relative w-full ${isFullscreen ? "flex-1 min-h-0" : "h-[250px] sm:h-[300px]"}`}
        >
          <div
            className="relative h-full overflow-hidden"
            style={{
              width: tab === "sidebyside" ? `${splitPos}%` : tab === "preview" ? "0%" : "100%",
              display: tab === "preview" ? "none" : "block",
            }}
          >
            <div ref={setEditorRef} className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto" />
            {mention && currentUser && (
              <MentionSuggestions
                query={mention.query}
                position={mention.position}
                onSelect={handleMentionSelect}
                userId={currentUser.id}
              />
            )}
          </div>

          {tab === "sidebyside" && <SplitHandle onStart={handleSplitStart} />}

          <div
            className="h-full overflow-y-auto"
            style={{
              width: tab === "sidebyside" ? `${100 - splitPos}%` : tab === "preview" ? "100%" : "0%",
              display: tab === "write" ? "none" : "block",
            }}
          >
            <div className="p-3 sm:p-4">
              <MarkdownPreview content={value} />
            </div>
          </div>
        </div>
      </div>

      <EditorStatusBar
        charCount={stats.charCount}
        maxLength={maxLength}
        wordCount={stats.wordCount}
        lineCount={stats.lineCount}
        onShowHelp={() => setShowHelp(true)}
      />
    </>
  )

  return (
    <>
      <EditorHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} zIndex={isFullscreen ? 10002 : 9999} />

      {isFullscreen ? createPortal(
        <>
          <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm" onClick={() => setIsFullscreen(false)} />
          <div
            className="fixed inset-0 z-[10001] flex flex-col bg-zinc-900 sm:inset-4 sm:rounded-2xl sm:border sm:border-zinc-700/50 sm:shadow-2xl sm:shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            {renderContent()}
          </div>
        </>,
        document.body
      ) : (
        <div className="border border-zinc-700 rounded-xl overflow-hidden bg-zinc-900/50">
          {renderContent()}
        </div>
      )}
    </>
  )
}
