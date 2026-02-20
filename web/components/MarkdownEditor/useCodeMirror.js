import { useState, useCallback, useRef, useEffect } from "react"
import { EditorView, keymap, placeholder as cmPlaceholder, drawSelection, lineNumbers } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentUnit } from "@codemirror/language"
import { history, historyKeymap, defaultKeymap, indentWithTab } from "@codemirror/commands"
import { cmTheme, markdownHighlightStyle, customDecorations } from "@components/MarkdownEditor/editorConfig"

export function useCodeMirror({ value, onChange, maxLength, placeholder: ph, editorRef, onMentionQuery }) {
	const [container, setContainer] = useState(null)
	const viewRef = useRef(null)
	const onChangeRef = useRef(onChange)
	const onMentionQueryRef = useRef(onMentionQuery)
	const isInternalChange = useRef(false)

	useEffect(() => {
		onChangeRef.current = onChange
		onMentionQueryRef.current = onMentionQuery
	}, [onChange, onMentionQuery])

	useEffect(() => {
		if (!container) return

		const maxLengthFilter = maxLength
			? EditorState.transactionFilter.of(tr => {
					if (!tr.docChanged) return tr
					if (tr.newDoc.length > maxLength) return []
					return tr
				})
			: []

		const updateListener = EditorView.updateListener.of(update => {
			if (update.docChanged) {
				isInternalChange.current = true
				onChangeRef.current(update.state.doc.toString())
			}

			if (update.transactions.some(tr => tr.scrollIntoView)) {
				onMentionQueryRef.current?.(null);
			}

			if (update.selectionSet || update.docChanged) {
				const { from } = update.state.selection.main
				const doc = update.state.doc.toString()
				const textBefore = doc.slice(0, from)
				const match = textBefore.match(/(?:^|[\s\n])@([a-zA-Z0-9_]{0,32})$/)

				if (match) {
					const mentionIndex = from - match[1].length - 1
					const coords = update.view.coordsAtPos(mentionIndex)

					onMentionQueryRef.current?.({
						query: match[1],
						startIndex: mentionIndex,
						position: coords ? { 
							top: coords.top, 
							left: coords.left, 
							bottom: coords.bottom 
						} : null,
					})
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
				history(),
				indentUnit.of("  "),
				keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
				drawSelection(),
				lineNumbers(),
				bracketMatching(),
				EditorView.lineWrapping,
				ph ? cmPlaceholder(ph) : [],
				maxLengthFilter,
				updateListener,
			],
		})

		const view = new EditorView({ state, parent: container })
		viewRef.current = view
		if (editorRef) editorRef.current = view

		return () => {
			view.destroy()
			viewRef.current = null
			if (editorRef) editorRef.current = null
		}
	}, [container, maxLength, ph])

	useEffect(() => {
		if (isInternalChange.current) {
			isInternalChange.current = false
			return
		}

		const view = viewRef.current
		if (!view) return

		const currentDoc = view.state.doc.toString()
		if (value !== currentDoc) {
			view.dispatch({
				changes: { from: 0, to: currentDoc.length, insert: value },
			})
		}
	}, [value])

	return setContainer
}