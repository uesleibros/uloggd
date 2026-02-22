import { User } from "lucide-react"

export function ErrorState({ username, onClose }) {
  return (
    <div className="px-6 py-10 flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center text-zinc-600">
        <User size={28} strokeWidth={1.5} />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-zinc-300">Usuário não encontrado</p>
        <p className="text-xs text-zinc-500">@{username} não existe ou foi removido</p>
      </div>
      <button
        onClick={onClose}
        className="px-5 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors cursor-pointer"
      >
        Fechar
      </button>
    </div>
  )
}
