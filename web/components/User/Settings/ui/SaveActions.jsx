import { Check, Loader2 } from "lucide-react"

export default function SaveActions({ onSave, onReset, saving, isDirty }) {
  return (
    <div className="flex justify-end items-center gap-3 mt-3">
      {isDirty && (
        <button
          onClick={onReset}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Resetar
        </button>
      )}
      <button
        onClick={onSave}
        disabled={!isDirty || saving}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
          !isDirty || saving
            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
            : "bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer shadow-lg shadow-indigo-500/20"
        }`}
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Salvar
      </button>
    </div>
  )
}