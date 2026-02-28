import { AlertCircle } from "lucide-react"

export function ErrorCard({ slug }) {
  return (
    <div className="my-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 max-w-max">
      <AlertCircle className="w-4 h-4" />
      404: <span className="font-mono">{slug}</span>
    </div>
  )
}
