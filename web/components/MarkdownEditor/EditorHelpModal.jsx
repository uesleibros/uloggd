import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import {
	Info, Search, X, Command,
	Type, Heading, List, Link, Code,
	AlertTriangle, Gamepad2, AtSign, Layout, Monitor, Smartphone,
} from "lucide-react"
import Modal from "@components/UI/Modal"
import { MarkdownPreview } from "@components/MarkdownEditor/MarkdownPreview"

const SECTIONS = [
	{ id: "texto", label: "Texto", icon: Type },
	{ id: "titulos", label: "Títulos", icon: Heading },
	{ id: "listas", label: "Listas", icon: List },
	{ id: "links", label: "Links e Mídia", icon: Link },
	{ id: "blocos", label: "Blocos", icon: Code },
	{ id: "alertas", label: "Alertas", icon: AlertTriangle },
	{ id: "jogos", label: "Jogos", icon: Gamepad2 },
	{ id: "social", label: "Social e Spoilers", icon: AtSign },
	{ id: "layout", label: "Layout", icon: Layout },
]

const FEATURES = [
	{ section: "texto", syntax: "**texto**", description: "Texto em negrito.", example: "**isso fica em negrito**", preview: "**isso fica em negrito**" },
	{ section: "texto", syntax: "*texto*", description: "Texto em itálico.", example: "*isso fica em itálico*", preview: "*isso fica em itálico*" },
	{ section: "texto", syntax: "~~texto~~", description: "Texto riscado (tachado).", example: "~~texto riscado~~", preview: "~~texto riscado~~" },
	{ section: "texto", syntax: "`código`", description: "Código inline.", example: "`console.log('oi')`", preview: "`console.log('oi')`" },
	{ section: "titulos", syntax: "# a ######", description: "Títulos de H1 (maior) até H6 (menor). Quanto mais #, menor o título.", example: "# Título Grande\n## Subtítulo\n### Menor ainda" },
	{ section: "listas", syntax: "- item", description: "Lista não ordenada (com bolinhas).", example: "- Primeiro item\n- Segundo item\n- Terceiro item", preview: "- Primeiro\n- Segundo\n- Terceiro" },
	{ section: "listas", syntax: "1. item", description: "Lista ordenada (numerada).", example: "1. Primeiro\n2. Segundo\n3. Terceiro", preview: "1. Primeiro\n2. Segundo\n3. Terceiro" },
	{ section: "listas", syntax: "- [ ] / - [x]", description: "Checklist com itens marcáveis.", example: "- [ ] Pendente\n- [x] Concluído", preview: "- [ ] Pendente\n- [x] Concluído" },
	{ section: "links", syntax: "[texto](url)", description: "Cria um link clicável.", example: "[Clique aqui](https://exemplo.com)", preview: "[Clique aqui](https://exemplo.com)" },
	{ section: "links", syntax: "![alt](url)", description: "Insere uma imagem.", example: "![Logo](https://exemplo.com/img.png)" },
	{ section: "links", syntax: '<img src="..." width="..." />', description: "Imagem com tamanho customizado.", example: '<img src="https://exemplo.com/img.png" alt="desc" width="400" />' },
	{ section: "links", syntax: "URL do YouTube", description: "Cole um link do YouTube e ele vira um player automaticamente.", example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
	{ section: "blocos", syntax: "```código```", description: "Bloco de código com múltiplas linhas.", example: "```\nfunction oi() {\n  return 'olá'\n}\n```" },
	{ section: "blocos", syntax: "> texto", description: "Citação / blockquote.", example: "> Isso é uma citação", preview: "> Isso é uma citação" },
	{ section: "blocos", syntax: "---", description: "Linha horizontal separadora.", preview: "---" },
	{ section: "blocos", syntax: "| Col | Col |", description: "Tabela com colunas e linhas.", example: "| Nome | Nota |\n| --- | --- |\n| Jogo A | 10 |", preview: "| Nome | Nota |\n| --- | --- |\n| Jogo A | 10 |" },
	{ section: "alertas", syntax: ":::info", description: "Bloco informativo neutro.", example: ":::info\nInformação importante\n:::" },
	{ section: "alertas", syntax: ":::note", description: "Nota complementar ou observação.", example: ":::note\nIsso é apenas uma nota.\n:::" },
	{ section: "alertas", syntax: ":::tip", description: "Dica útil para o leitor.", example: ":::tip\nUse arma de gelo contra inimigos de fogo.\n:::" },
	{ section: "alertas", syntax: ":::important", description: "Informação importante que merece destaque.", example: ":::important\nIsso é muito relevante.\n:::" },
	{ section: "alertas", syntax: ":::warning", description: "Aviso importante.", example: ":::warning\nCuidado com esta área.\n:::" },
	{ section: "alertas", syntax: ":::danger", description: "Alerta crítico ou perigoso.", example: ":::danger\nEssa escolha é irreversível.\n:::" },
	{ section: "alertas", syntax: ":::success", description: "Mensagem de sucesso ou conclusão.", example: ":::success\nMissão concluída!\n:::" },
	{ section: "alertas", syntax: ":::question", description: "Pergunta ou reflexão destacada.", example: ":::question\nVocê já tentou essa abordagem?\n:::" },
	{ section: "alertas", syntax: ":::example", description: "Exemplo prático ou demonstração.", example: ":::example\nVeja este caso aplicado.\n:::" },
	{ section: "alertas", syntax: ":::bug", description: "Problema conhecido ou comportamento inesperado.", example: ":::bug\nExiste um erro nessa versão.\n:::" },
	{ section: "alertas", syntax: ":::neutral", description: "Observação neutra sem ênfase emocional.", example: ":::neutral\nApenas uma observação geral.\n:::" },
	{ section: "jogos", syntax: "!game(slug)", description: "Exibe um card detalhado de um jogo. O slug pode ser encontrado na URL da página do jogo.", example: "!game(the-last-of-us)" },
	{ section: "jogos", syntax: "!game:mini(slug)", description: "Versão compacta do card de jogo, ideal para listas.", example: "!game:mini(celeste)" },
	{ section: "jogos", syntax: "!game:grid(slug1, slug2+, ...)", description: "Vitrine de jogos em carrossel manual. Adicione + no final do slug para destacar como favorito.", example: "!game:grid(celeste, hollow-knight+)" },
	{ section: "jogos", syntax: "!game:grid-auto(slug1, slug2+, ...)", description: "Vitrine de jogos com carrossel automático infinito. Também suporta + para favoritos.", example: "!game:grid-auto(celeste, hollow-knight+, hades)" },
	{ section: "social", syntax: "@usuario", description: "Menciona um usuário. Digite @ para ver sugestões de pessoas que você segue.", example: "@username" },
	{ section: "social", syntax: "||texto||", description: "Esconde o texto como spoiler. O usuário precisa clicar para revelar.", example: "O assassino é ||o mordomo||" },
	{ section: "social", syntax: "<spoilerimg />", description: "Insere uma imagem com desfoque de spoiler.", example: '<spoilerimg src="https://exemplo.com/img.png" alt="desc" width="400" />' },
	{ section: "layout", syntax: "<center>...</center>", description: "Centraliza o conteúdo (texto ou imagens).", example: "<center>Texto centralizado</center>", preview: "<center>Texto centralizado</center>" },
	{ section: "layout", syntax: "<desktop>...</desktop>", description: "Conteúdo visível apenas no desktop.", example: "<desktop>\nIsso só aparece no PC\n</desktop>" },
	{ section: "layout", syntax: "<mobile>...</mobile>", description: "Conteúdo visível apenas no celular.", example: "<mobile>\nIsso só aparece no celular\n</mobile>" },
]

function escapeRegex(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function Highlight({ text, query }) {
	if (!query.trim()) return <>{text}</>
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
	const [showPreview, setShowPreview] = useState(false)

	return (
		<div
			ref={itemRef}
			className={`rounded-lg border p-4 transition-all ${
				isActive ? "border-indigo-500/60 bg-indigo-500/5" : "border-zinc-800 bg-zinc-900/40"
			}`}
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
						{showPreview ? "Código" : "Preview"}
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
	const [search, setSearch] = useState("")
	const [activeSection, setActiveSection] = useState(SECTIONS[0].id)
	const [activeIndex, setActiveIndex] = useState(-1)
	const contentRef = useRef(null)
	const searchRef = useRef(null)
	const sectionRefs = useRef({})
	const mobileNavRef = useRef(null)
	const navBtnRefs = useRef({})
	const itemRefs = useRef([])
	const isScrollingTo = useRef(false)

	useEffect(() => {
		if (!isOpen) {
			setSearch("")
			setActiveSection(SECTIONS[0].id)
			setActiveIndex(-1)
		}
	}, [isOpen])

	useEffect(() => {
		if (isOpen && searchRef.current) {
			setTimeout(() => searchRef.current?.focus(), 100)
		}
	}, [isOpen])

	const filtered = useMemo(() => {
		if (!search.trim()) return FEATURES
		const q = search.toLowerCase()
		return FEATURES.filter(
			f =>
				f.syntax.toLowerCase().includes(q) ||
				f.description.toLowerCase().includes(q) ||
				(f.example || "").toLowerCase().includes(q)
		)
	}, [search])

	const visibleSections = useMemo(() => {
		const ids = new Set(filtered.map(f => f.section))
		return SECTIONS.filter(s => ids.has(s.id))
	}, [filtered])

	useEffect(() => {
		setActiveIndex(search.trim() ? 0 : -1)
	}, [search])

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
		if (!el || !contentRef.current) return
		isScrollingTo.current = true
		setActiveSection(id)
		const container = contentRef.current
		const top = el.offsetTop - container.offsetTop - 8
		container.scrollTo({ top, behavior: "smooth" })
		setTimeout(() => { isScrollingTo.current = false }, 500)
	}, [])

	const handleScroll = useCallback(() => {
		if (isScrollingTo.current || !contentRef.current || search.trim()) return
		const container = contentRef.current
		const scrollTop = container.scrollTop + 24

		let current = visibleSections[0]?.id
		for (const section of visibleSections) {
			const el = sectionRefs.current[section.id]
			if (el && el.offsetTop - container.offsetTop <= scrollTop) {
				current = section.id
			}
		}
		if (current) setActiveSection(current)
	}, [visibleSections, search])

	const handleKeyDown = useCallback((e) => {
		if (e.key === "ArrowDown") {
			e.preventDefault()
			if (search.trim() && filtered.length > 0) {
				setActiveIndex(prev => (prev + 1) % filtered.length)
			}
		} else if (e.key === "ArrowUp") {
			e.preventDefault()
			if (search.trim() && filtered.length > 0) {
				setActiveIndex(prev => (prev - 1 + filtered.length) % filtered.length)
			}
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
			onClose={onClose}
			title={
				<span className="flex items-center gap-2">
					<Info className="w-5 h-5 text-indigo-400" />
					Guia de Formatação
				</span>
			}
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
						placeholder="Buscar formatação..."
						className="w-full pl-9 pr-9 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
					/>
					{search ? (
						<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
							<span className="text-[10px] text-zinc-600 tabular-nums">
								{filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
							</span>
							<button
								onClick={() => setSearch("")}
								className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
							>
								<X className="w-4 h-4" />
							</button>
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
				<div
					ref={mobileNavRef}
					className="flex sm:hidden overflow-x-auto border-b border-zinc-800 px-2 py-1.5 gap-1 flex-shrink-0 scrollbar-hide"
				>
					{SECTIONS.map(({ id, label, icon: Icon }) => (
						<button
							key={id}
							ref={(el) => { navBtnRefs.current[id] = el }}
							onClick={() => scrollToSection(id)}
							className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
								activeSection === id
									? "text-indigo-400 bg-indigo-500/15 font-medium"
									: "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
							}`}
						>
							<Icon className="w-3 h-3 flex-shrink-0" />
							{label}
						</button>
					))}
				</div>
			)}

			<div className="flex flex-1 min-h-0 overflow-hidden">
				{!search && (
					<nav className="w-44 flex-shrink-0 border-r border-zinc-800 overflow-y-auto py-2 hidden sm:block">
						{SECTIONS.map(({ id, label, icon: Icon }) => (
							<button
								key={id}
								onClick={() => scrollToSection(id)}
								className={`w-full text-left px-3 py-2 text-[13px] transition-all cursor-pointer relative flex items-center gap-2 ${
									activeSection === id
										? "text-indigo-400 bg-indigo-500/10 font-medium"
										: "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
								}`}
							>
								{activeSection === id && (
									<div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-indigo-400 rounded-r" />
								)}
								<Icon className="w-3.5 h-3.5 flex-shrink-0" />
								{label}
							</button>
						))}
					</nav>
				)}

				<div
					ref={contentRef}
					onScroll={handleScroll}
					className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6"
				>
					{visibleSections.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-600">
							<Search className="w-8 h-8" />
							<p className="text-sm">Nenhum resultado para "<span className="text-zinc-400">{search}</span>"</p>
						</div>
					) : (
						visibleSections.map(section => (
							<div
								key={section.id}
								ref={(el) => { sectionRefs.current[section.id] = el }}
							>
								<h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-8 mb-4 first:mt-0 flex items-center gap-2">
									<section.icon className="w-3.5 h-3.5" />
									{section.label}
								</h4>
								<div className="space-y-3">
									{filtered
										.filter(f => f.section === section.id)
										.map((item, i) => {
											const idx = globalIndex++
											return (
												<FeatureItem
													key={i}
													{...item}
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
				<p className="text-xs text-zinc-500">
					<span className="text-zinc-400">Ctrl+B</span> negrito · 
					<span className="text-zinc-400">Ctrl+I</span> itálico · 
					<span className="text-zinc-400">Ctrl+K</span> link · 
					<span className="text-zinc-400">Ctrl+Shift+C</span> bloco · 
					<span className="text-zinc-400">Tab</span> indentação
				</p>
				{search.trim() && filtered.length > 0 && (
					<span className="text-[10px] text-zinc-600 tabular-nums">
						{Math.max(activeIndex + 1, 1)}/{filtered.length}
					</span>
				)}
			</div>
		</Modal>
	)
}