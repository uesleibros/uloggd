import { Info } from "lucide-react"
import Modal from "@components/UI/Modal"

function FeatureItem({ syntax, description, example }) {
	return (
		<div className="py-3 border-b border-zinc-700/50 last:border-0">
			<div className="flex items-baseline justify-between mb-1">
				<code className="text-sm font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
					{syntax}
				</code>
			</div>
			<p className="text-sm text-zinc-400 mb-2">{description}</p>
			{example && (
				<div className="text-xs bg-zinc-900/50 border border-zinc-700/50 rounded p-2 text-zinc-500 font-mono whitespace-pre-wrap">
					{example}
				</div>
			)}
		</div>
	)
}

function HelpIcon() {
	return (
		<span className="flex items-center gap-2">
			<Info className="w-5 h-5 text-indigo-400" />
			Guia de Formatação
		</span>
	)
}

export function EditorHelpModal({ isOpen, onClose, zIndex }) {
	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={<HelpIcon />}
			maxWidth="max-w-md"
			zIndex={zIndex}
		>
			<div className="overflow-y-auto p-4 flex-1">
				<FeatureItem 
					syntax=":::tipo ... :::" 
					description="Cria blocos de alerta coloridos. Tipos suportados: note, tip, important, warning, caution."
					example={":::warning\nCuidado com este chefe!\n:::"}
				/>
				<FeatureItem 
					syntax="!game(slug)" 
					description="Exibe um card detalhado de um jogo. O slug pode ser encontrado na URL da página do jogo."
					example="!game(the-last-of-us)"
				/>
				<FeatureItem 
					syntax="!game:mini(slug)" 
					description="Versão compacta do card de jogo, ideal para listas."
					example="!game:mini(celeste)"
				/>
				<FeatureItem 
					syntax="!game:grid(slug1, slug2+, ...)" 
					description="Vitrine de jogos em carrossel manual. Adicione + no final do slug para destacar como favorito."
					example="!game:grid(celeste, hollow-knight+)"
				/>
				<FeatureItem 
					syntax="!game:grid-auto(slug1, slug2+, ...)" 
					description="Vitrine de jogos com carrossel automático infinito. Também suporta + para favoritos."
					example="!game:grid-auto(celeste, hollow-knight+, hades)"
				/>
				<FeatureItem 
					syntax="@usuario" 
					description="Menciona um usuário. Digite @ para ver sugestões de pessoas que você segue."
					example="@uloggd"
				/>
				<FeatureItem 
					syntax="||texto||" 
					description="Esconde o texto como spoiler. O usuário precisa clicar para revelar."
					example="O assassino é ||o mordomo||"
				/>
				<FeatureItem 
					syntax="<spoilerimg />" 
					description="Insere uma imagem com desfoque de spoiler."
					example='<spoilerimg src="@components/MarkdownEditor/..." />'
				/>
				<FeatureItem 
					syntax="<center>...</center>" 
					description="Centraliza o conteúdo (texto ou imagens)."
					example="<center>Texto centralizado</center>"
				/>
			</div>
			
			<div className="p-3 bg-zinc-900/50 border-t border-zinc-700 rounded-b-xl text-center flex-shrink-0">
				<p className="text-xs text-zinc-500">
					Também suportamos Markdown padrão (negrito, itálico, listas, etc).
				</p>
			</div>
		</Modal>
	)
}