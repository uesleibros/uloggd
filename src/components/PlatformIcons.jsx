export default function PlatformIcons({ icons, max = 4, size = "w-3" }) {
  if (!icons?.length) return null

  return (
    <div className="flex items-center gap-2">
      {icons.slice(0, max).map(p => (
        <img
          key={p.name}
          src={p.icon}
          alt={p.name}
          title={p.name}
          className={`${size} brightness-0 invert select-none object-contain`}
        />
      ))}
      {icons.length > max && (
        <span className="text-xs font-bold text-zinc-500">
          +{icons.length - max}
        </span>
      )}
    </div>
  )
}