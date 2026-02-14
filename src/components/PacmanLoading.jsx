export default function PacmanLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="flex items-center overflow-hidden w-40 justify-center">
        <div
          className="w-7 h-7 bg-yellow-400 rounded-full flex-shrink-0"
          style={{ animation: 'pacman-chomp 0.35s ease-in-out infinite' }}
        />

        <div className="flex items-center gap-3 ml-1 flex-shrink-0">
          {[0, 250, 500, 750].map((delay) => (
            <div
              key={delay}
              className="w-[6px] h-[6px] rounded-full bg-yellow-200 flex-shrink-0"
              style={{ animation: `pacman-dot-move 1s linear infinite ${delay}ms` }}
            />
          ))}
        </div>
      </div>

      <span className="text-sm text-zinc-500">Carregando...</span>
    </div>
  )
}