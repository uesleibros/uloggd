export default function SettingsSection({ title, description, children, danger = false }) {
  return (
    <div className={`rounded-xl p-4 sm:p-6 ${
      danger
        ? "bg-red-500/5 border border-red-500/20"
        : "bg-zinc-800/50 border border-zinc-700"
    }`}>
      <h2 className={`text-base font-semibold mb-1 ${danger ? "text-red-400" : "text-white"}`}>
        {title}
      </h2>
      {description && <p className="text-sm text-zinc-500 mb-4 sm:mb-5">{description}</p>}
      {children}
    </div>
  )
}