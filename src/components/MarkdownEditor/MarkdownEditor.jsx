import { useState, useRef, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "../../../hooks/useAuth"
import { Pencil, Eye, Columns2, Minimize2, Maximize2, CircleAlert, CircleHelp, GripVertical } from "lucide-react"
import { TOOLBAR } from "./constants"
import { ToolbarIcon } from "./ToolbarIcon"
import { PortalDropdown } from "./PortalDropdown"
import { MentionSuggestions } from "./MentionSuggestions"
import { MarkdownPreview } from "./MarkdownPreview"
import { useCodeMirror } from "./useCodeMirror"
import { EditorHelpModal } from "./EditorHelpModal"

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

export function MarkdownEditor({ value = "", onChange, maxLength = 10000, placeholder = "Escreva sobre você..." }) {
	const [tab, setTab] = useState("write")
	const [headingOpen, setHeadingOpen] = useState(false)
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [splitPos, setSplitPos] = useState(50)
	const { user: currentUser } = useAuth()
	const [mention, setMention] = useState(null)
	const [showHelp, setShowHelp] = useState(false)
	const editorViewRef = useRef(null)
	const splitContainerRef = useRef(null)
	const isDragging = useRef(false)
	const headingBtnRef = useRef(null)

	const isLargeScreen = useMediaQuery("(min-width: 1024px)")
	const showSideBySideOption = isFullscreen && isLargeScreen

	const charCount = value.length
	const charPercent = maxLength ? (charCount / maxLength) * 100 : 0
	const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
	const lineCount = value.split("\n").length

	const handleMentionQuery = useCallback((data) => setMention(data), [])

	const onChangeRef = useRef(onChange)
	useEffect(() => { onChangeRef.current = onChange }, [onChange])
	useEffect(() => { setHeadingOpen(false); setMention(null) }, [tab, isFullscreen])
	const stableOnChange = useCallback((val) => onChangeRef.current(val), [])

	const mainEditorContainer = useCodeMirror({
		value,
		onChange: stableOnChange,
		maxLength,
		placeholder,
		editorRef: editorViewRef,
		onMentionQuery: handleMentionQuery,
	})

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

	useEffect(() => {
		const handler = (e) => {
			if (e.key !== "Escape") return
			if (showHelp) { setShowHelp(false); e.stopPropagation(); return }
			if (mention) { setMention(null); e.stopPropagation(); return }
			if (headingOpen) { setHeadingOpen(false); e.stopPropagation(); return }
			if (isFullscreen) { setIsFullscreen(false); e.stopPropagation(); return }
		}
		document.addEventListener("keydown", handler, true)
		return () => document.removeEventListener("keydown", handler, true)
	}, [isFullscreen, headingOpen, mention, showHelp])

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

	useEffect(() => setHeadingOpen(false), [tab, isFullscreen])

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
				anchor: from,
				head: from + fullInsert.length,
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
			alert: () => insertNewBlock(":::info\nTexto do alerta\n:::"),
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

	const renderEditorContent = () => (
		<>
			<div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800/30 flex-shrink-0">
				<div className="flex items-center min-w-0">
					<button
						onClick={() => setTab("write")}
						className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all cursor-pointer relative ${tab === "write" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
					>
						<span className="flex items-center gap-1 sm:gap-1.5">
							<Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
							<span className="xs:inline">Escrever</span>
						</span>
						{tab === "write" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
					</button>

					<button
						onClick={() => setTab("preview")}
						className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all cursor-pointer relative ${tab === "preview" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
					>
						<span className="flex items-center gap-1 sm:gap-1.5">
							<Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
								<Columns2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
							<Minimize2 className="w-4 h-4" />
						) : (
							<Maximize2 className="w-4 h-4" />
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
				<div
					ref={splitContainerRef}
					className={`flex flex-row relative w-full ${
						isFullscreen ? "flex-1 min-h-0" : "h-[250px] sm:h-[300px]"
					}`}
				>
					<div
						className="relative h-full overflow-hidden"
						style={{
							width: tab === 'sidebyside' ? `${splitPos}%` : (tab === 'preview' ? '0%' : '100%'),
							display: tab === 'preview' ? 'none' : 'block'
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

					{tab === "sidebyside" && (
						<div
							onMouseDown={handleSplitStart}
							onTouchStart={handleSplitStart}
							className="relative flex-shrink-0 w-px bg-zinc-700 hover:bg-indigo-500/70 transition-colors cursor-col-resize group z-10 touch-none"
						>
							<div className="absolute inset-y-0 -left-2 -right-2" />
							<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-10 rounded-full bg-zinc-700/80 group-hover:bg-indigo-500/80 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-lg">
								<GripVertical className="w-3 h-4 text-zinc-300" />
							</div>
						</div>
					)}

					<div
						className="h-full overflow-y-auto"
						style={{
							width: tab === 'sidebyside' ? `${100 - splitPos}%` : (tab === 'preview' ? '100%' : '0%'),
							display: tab === 'write' ? 'none' : 'block',
							borderLeftWidth: tab === 'sidebyside' ? '0px' : '0px'
						}}
					>
						<div className="p-3 sm:p-4">
							<MarkdownPreview content={value} />
						</div>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 border-t border-zinc-800 bg-zinc-800/20 flex-shrink-0 gap-2">
				<div className="flex items-center gap-2 sm:gap-3 min-w-0">
					<span className="text-[10px] sm:text-xs text-zinc-600 flex items-center gap-1 flex-shrink-0">
						<CircleAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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

				<button
					onClick={() => setShowHelp(true)}
					className="text-[10px] sm:text-xs text-zinc-500 hover:text-indigo-400 flex items-center gap-1 transition-colors cursor-pointer hover:bg-indigo-500/10 px-1.5 py-0.5 rounded flex-shrink-0"
					title="Ver guia de formatação"
				>
					<CircleHelp className="w-4 h-4" />
					<span className="hidden sm:inline">Ajuda</span>
				</button>
			</div>
		</>
	)

	const fullscreenContent = (
		<>
			<div
				className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm"
				onClick={(e) => {
					e.stopPropagation()
					setIsFullscreen(false)
				}}
			/>
			<div
				className="fixed inset-0 z-[10001] flex flex-col bg-zinc-900 sm:inset-4 sm:rounded-2xl sm:border sm:border-zinc-700/50 sm:shadow-2xl sm:shadow-black/50"
				onClick={(e) => e.stopPropagation()}
			>
				{renderEditorContent()}
			</div>
		</>
	)

	return (
		<>
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

			<EditorHelpModal 
				isOpen={showHelp} 
				onClose={() => setShowHelp(false)} 
				zIndex={isFullscreen ? 10002 : 9999} 
			/>

			{isFullscreen ? (
				createPortal(fullscreenContent, document.body)
			) : (
				<>
					<div className="border border-zinc-700 rounded-xl overflow-hidden bg-zinc-900/50">
						{renderEditorContent()}
					</div>
				</>
			)}
		</>
	)
}