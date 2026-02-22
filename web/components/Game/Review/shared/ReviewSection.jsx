export function ReviewSection({ title, description, children }) {
  return (
    <div className="rounded-xl p-4 sm:p-5 bg-zinc-800/50 border border-zinc-700">
      <h3 className="text-sm font-semibold text-white mb-0.5">{title}</h3>
      {description && <p className="text-xs text-zinc-500 mb-3">{description}</p>}
      {!description && <div className="mb-3" />}
      {children}
    </div>
  )
}