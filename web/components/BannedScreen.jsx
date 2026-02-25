import { Ban } from "lucide-react"

export default function BannedScreen({ reason }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <Ban className="w-10 h-10 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Conta suspensa</h1>

        <p className="text-zinc-400 mb-6">
          Sua conta foi suspensa por violar os termos de uso da plataforma.
        </p>

        {reason && (
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl mb-6 text-left">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Motivo</p>
            <p className="text-sm text-zinc-300">{reason}</p>
          </div>
        )}

        <p className="text-xs text-zinc-600">
          Se você acredita que isso foi um erro, entre em contato com o suporte.
        </p>
      </div>
    </div>
  )
}