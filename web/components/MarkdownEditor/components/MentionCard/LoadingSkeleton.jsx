export function LoadingSkeleton() {
  return (
    <>
      <div className="h-28 bg-gradient-to-br from-zinc-800 to-zinc-900 animate-pulse" />
      <div className="px-5 -mt-10 relative">
        <div className="w-20 h-20 rounded-full bg-zinc-700 border-4 border-zinc-900 animate-pulse" />
      </div>
      <div className="px-5 pt-3 pb-5 space-y-3">
        <div className="h-6 w-36 bg-zinc-800 rounded-md animate-pulse" />
        <div className="h-3.5 w-48 bg-zinc-800/60 rounded animate-pulse" />
        <div className="h-3.5 w-32 bg-zinc-800/40 rounded animate-pulse" />
        <div className="h-10 w-full bg-zinc-800 rounded-lg animate-pulse mt-4" />
      </div>
    </>
  )
}
