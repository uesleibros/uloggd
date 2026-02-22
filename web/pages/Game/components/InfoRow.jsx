export function InfoRow({ label, children }) {
  if (!children) return null
  return (
    <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-2">
      <span className="text-sm text-zinc-500 sm:w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-zinc-300">{children}</span>
    </div>
  )
}