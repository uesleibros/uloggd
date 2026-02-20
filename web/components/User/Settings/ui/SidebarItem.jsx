export default function SidebarItem({ icon, label, active, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left cursor-pointer ${
        active
          ? "bg-white text-black"
          : danger
            ? "text-red-400 hover:text-red-300 hover:bg-red-500/5"
            : "text-zinc-400 hover:text-white hover:bg-zinc-700/60"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}