import usePageMeta from "../../hooks/usePageMeta"
import PageBanner from "../components/Layout/PageBanner"
import { Link } from "react-router-dom"

const BADGE_DEFINITIONS = [
  {
    id: "verified",
    title: "Verificado",
    description: "Este selo confirma a autenticidade de figuras públicas, criadores de conteúdo, estúdios de jogos e parceiros oficiais. É a garantia de que o perfil é quem diz ser.",
    howToGet: "Concedido pela equipe do uloggd mediante solicitação e comprovação de identidade.",
    src: "/badges/verified.png",
    color: "from-purple-500/20 to-indigo-500/20",
    borderColor: "border-purple-500/30",
    glowColor: "shadow-purple-500/10",
    iconBg: "bg-purple-500/10",
    textColor: "text-purple-200"
  },
  {
    id: "developer",
    title: "Desenvolvedor",
    description: "Membros da equipe de engenharia e desenvolvimento do uloggd. São os responsáveis por construir a plataforma, corrigir bugs e lançar novas funcionalidades.",
    howToGet: "Exclusivo para membros da equipe técnica do uloggd.",
    src: "/badges/developer.png",
    color: "from-pink-300/20 to-rose-300/20",
    borderColor: "border-pink-300/30",
    glowColor: "shadow-pink-300/10",
    iconBg: "bg-pink-300/10",
    textColor: "text-pink-200"
  },
  {
    id: "moderator",
    title: "Moderador",
    description: "Guardiões da comunidade. Têm autoridade para gerenciar conteúdo, resolver disputas e garantir que as diretrizes do uloggd sejam seguidas por todos.",
    howToGet: "Concedido a membros de confiança convidados para a equipe de staff.",
    src: "/badges/moderator.png",
    color: "from-amber-500/20 to-teal-500/20",
    borderColor: "border-amber-500/30",
    glowColor: "shadow-amber-500/10",
    iconBg: "bg-amber-500/10",
    textColor: "text-amber-200"
  },
  {
    id: "trainee_moderator",
    title: "Moderador Estagiário",
    description: "Novos membros da equipe de moderação em fase de treinamento e avaliação. Possuem permissões limitadas enquanto aprendem os processos internos.",
    howToGet: "O primeiro passo para se tornar um moderador oficial.",
    src: "/badges/trainee_moderator.png",
    color: "from-sky-500/20 to-cyan-500/20",
    borderColor: "border-sky-500/30",
    glowColor: "shadow-sky-500/10",
    iconBg: "bg-sky-500/10",
    textColor: "text-sky-200"
  },
]

function BadgeCard({ badge }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border ${badge.borderColor} bg-zinc-900/50 p-6 md:p-8 transition-all duration-300 hover:bg-zinc-900/80`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${badge.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      
      <div className="relative flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center">
        <div className="flex-shrink-0">
          <div className={`w-20 h-20 rounded-full ${badge.iconBg} border ${badge.borderColor} flex items-center justify-center shadow-lg ${badge.glowColor}`}>
            <img
              src={badge.src}
              alt={badge.title}
              className="w-10 h-10 select-none drop-shadow-md"
              draggable={false}
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`text-xl font-bold text-white mb-2 group-hover:${badge.textColor} transition-colors`}>
            {badge.title}
          </h3>
          <p className="text-zinc-400 leading-relaxed mb-4">
            {badge.description}
          </p>
          
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.662-1.171 1.025-3.071 1.025-4.242 0-1.172-1.025-1.172-2.687 0-3.662zm-3.113 4.525a4.483 4.483 0 01-2.227-1.852c-.636-1.413-.42-3.279.982-4.507 1.89-1.574 4.936-1.574 6.826 0 1.402 1.228 1.618 3.094.982 4.507a4.483 4.483 0 01-2.227 1.852M7.156 12c-5.374.87-4.052 8.5-4.052 8.5h17.25s1.322-7.63-4.052-8.5M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
            </svg>
            <p className="text-xs text-zinc-500 font-medium">
              <span className="uppercase tracking-wider text-zinc-600 mr-1.5">Como obter:</span>
              {badge.howToGet}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Badges() {
  usePageMeta({
    title: "Insígnias e Verificação - uloggd",
    description: "Entenda o significado de cada selo e insígnia na plataforma uloggd."
  })

  return (
    <div>
      <PageBanner height="home" />

      <div className="mx-auto max-w-4xl px-4 pt-32 pb-20">
        <div className="mb-12 md:text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Insígnias do uloggd
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            As insígnias ajudam você a identificar contas autênticas e entender o papel de cada membro na nossa comunidade.
          </p>
        </div>

        <div className="grid gap-6">
          {BADGE_DEFINITIONS.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>

        <div className="mt-16 pt-10 border-t border-zinc-800 md:text-center">
          <h2 className="text-xl font-semibold text-white mb-3">Dúvidas?</h2>
          <p className="text-zinc-400 mb-6">
            Se você acredita que sua conta é elegível para uma verificação ou tem interesse em contribuir com a comunidade.
          </p>
          <Link 
            to="/contact" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-medium"
          >
            Entre em contato
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}