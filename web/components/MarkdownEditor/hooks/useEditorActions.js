import { useCallback } from "react"

export function useEditorActions(editorRef, maxLength) {
  const canInsert = useCallback((length) => {
    if (!maxLength) return true
    const view = editorRef.current
    if (!view) return false
    return view.state.doc.length + length <= maxLength
  }, [maxLength])

  const insertText = useCallback((before, after = "", placeholder = "") => {
    const view = editorRef.current
    if (!view) return

    const { from, to } = view.state.selection.main
    const selected = view.state.sliceDoc(from, to)
    const insert = selected || placeholder
    const fullInsert = before + insert + after

    if (!canInsert(fullInsert.length - (to - from))) return

    view.dispatch({
      changes: { from, to, insert: fullInsert },
      selection: { anchor: from, head: from + fullInsert.length },
    })
    view.focus()
  }, [canInsert])

  const insertAtLineStart = useCallback((prefix) => {
    const view = editorRef.current
    if (!view) return

    const { from } = view.state.selection.main
    const line = view.state.doc.lineAt(from)

    if (!canInsert(prefix.length)) return

    view.dispatch({
      changes: { from: line.from, to: line.from, insert: prefix },
      selection: { anchor: from + prefix.length },
    })
    view.focus()
  }, [canInsert])

  const insertNewBlock = useCallback((block) => {
    const view = editorRef.current
    if (!view) return

    const { from } = view.state.selection.main
    const doc = view.state.doc.toString()
    const needsNewline = from > 0 && doc[from - 1] !== "\n"
    const prefix = needsNewline ? "\n\n" : from === 0 ? "" : "\n"
    const fullBlock = prefix + block + "\n"

    if (!canInsert(fullBlock.length)) return

    view.dispatch({
      changes: { from, to: from, insert: fullBlock },
      selection: { anchor: from + fullBlock.length },
    })
    view.focus()
  }, [canInsert])

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
    alert: () => insertNewBlock(":::info\nTexto do alerta\n:::"),
    spoiler: () => insertText("||", "||", "texto escondido"),
    spoilerimage: () => insertNewBlock('<spoilerimg src="https://url-da-imagem.com" alt="descrição" width="400" />'),
    hr: () => insertNewBlock("---"),
    mention: () => insertText("@", "", "username"),
    desktop: () => insertNewBlock("<desktop>\n\nconteúdo para desktop\n\n</desktop>"),
    mobile: () => insertNewBlock("<mobile>\n\nconteúdo para mobile\n\n</mobile>"),
    center: () => insertNewBlock("<center>\n\nconteúdo centralizado\n\n</center>"),
    table: () => insertNewBlock("| Coluna 1 | Coluna 2 | Coluna 3 |\n| --- | --- | --- |\n| dado | dado | dado |"),
  }

  const handleAction = useCallback((key) => {
    actions[key]?.()
  }, [insertText, insertAtLineStart, insertNewBlock])

  return { handleAction, insertAtLineStart }
}
