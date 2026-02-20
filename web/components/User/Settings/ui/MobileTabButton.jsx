export default function MobileTabButton({ icon, label, active, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer flex-shrink-0 ${
        active
          ? "bg-white text-black"
          : danger
            ? "text-red-400"
            : "text-zinc-400"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}