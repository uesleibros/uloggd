export function MiniCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-sm my-2 animate-pulse">
      <div className="w-12 h-16 bg-zinc-800 rounded flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-3/4" />
        <div className="h-3 bg-zinc-800 rounded w-1/2" />
      </div>
    </div>
  )
}

export function DefaultCardSkeleton() {
  return (
    <div className="my-6 relative w-full min-w-2xl max-w-2xl overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex gap-4 select-none">
      <div className="w-20 h-28 sm:w-24 sm:h-32 bg-zinc-800 rounded-lg shrink-0 animate-pulse" />
      <div className="flex-1 space-y-3 py-1">
        <div className="h-5 bg-zinc-800 rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-zinc-800/50 rounded w-1/3 animate-pulse" />
        <div className="h-12 bg-zinc-800/30 rounded w-full mt-2 animate-pulse" />
      </div>
    </div>
  )
}
