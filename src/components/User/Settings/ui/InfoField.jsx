export default function InfoField({ label, value, icon }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 border-b border-zinc-700/50 last:border-0 gap-1 sm:gap-0">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-zinc-600">{icon}</span>}
        <span className="text-sm text-zinc-400">{label}</span>
      </div>
      <span className="text-sm text-zinc-200 font-medium pl-6.5 sm:pl-0">{value || "—"}</span>
    </div>
  )
}