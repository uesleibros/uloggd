import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

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
        <div className="text-xs bg-zinc-900/50 border border-zinc-700/50 rounded p-2 text-zinc-500 font-mono">
          {example}
        </div>
      )}
    </div>
  )
}

export function EditorHelpModal({ onClose }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
    const handleKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${mounted ? "opacity-100" : "opacity-0"}`} />
      
      <div 
        className={`relative w-full max-w-md bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl flex flex-col max-h-[85vh] transition-all duration-200 ${mounted ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Guia de Formatação
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <FeatureItem 
            syntax="!game(slug)" 
            description="Exibe um card detalhado de um jogo. O slug pode ser encontrado na URL da página do jogo."
            example="!game(the-last-of-us)"
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
            example='<spoilerimg src="..." />'
          />
          <FeatureItem 
            syntax="<center>...</center>" 
            description="Centraliza o conteúdo (texto ou imagens)."
            example="<center>Texto centralizado</center>"
          />
          <FeatureItem 
            syntax="![alt](url)" 
            description="Insere uma imagem padrão."
            example="![Capa](https://site.com/img.jpg)"
          />
        </div>
        
        <div className="p-3 bg-zinc-900/50 border-t border-zinc-700 rounded-b-xl text-center">
          <p className="text-xs text-zinc-500">
            Também suportamos Markdown padrão (negrito, itálico, listas, etc).
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}