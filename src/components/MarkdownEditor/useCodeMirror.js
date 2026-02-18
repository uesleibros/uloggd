import { useRef, useEffect } from "react"
import { EditorView, keymap, placeholder as cmPlaceholder, drawSelection, highlightActiveLine } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentUnit } from "@codemirror/language"
import { history, historyKeymap, defaultKeymap, indentWithTab } from "@codemirror/commands"
import { cmTheme, markdownHighlightStyle, customDecorations } from "./editorConfig"

export function useCodeMirror({ value, onChange, maxLength, placeholder: ph, editorRef, onMentionQuery }) {
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
            } : { bottom: 40, left: 16 },
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
        customDecorations,
        // twemojiExtension removido daqui
        history(),
        indentUnit.of("  "),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        drawSelection(),
        highlightActiveLine(),
        bracketMatching(),
        EditorView.lineWrapping,
        ph ? cmPlaceholder(ph) : [],
        maxLengthFilter,
        updateListener,
      ],
    })

    const view = new EditorView({ state, parent: containerRef.current })

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
