import PageBanner from "@components/Layout/PageBanner"

export function GameSkeleton() {
  return (
    <div>
      <PageBanner height="game" />
      <div className="mx-auto pt-[22vw] sm:pt-[20vw] md:pt-32 pb-16">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="flex-shrink-0 flex flex-row md:flex-col gap-4 md:gap-0">
            <div className="w-32 h-48 sm:w-48 sm:h-72 md:w-64 md:h-96 rounded-lg bg-zinc-800 animate-pulse flex-shrink-0" />
            <div className="flex-1 md:hidden space-y-3 pt-1">
              <div className="h-7 w-48 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="flex gap-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-11 h-11 rounded-full bg-zinc-800 animate-pulse" />
                    <div className="h-3 w-8 bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden md:block flex-shrink-0">
            <div className="mt-6 space-y-3">
              <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="h-10 w-10 bg-zinc-800 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="hidden md:block">
              <div className="h-10 w-80 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse mt-3 mb-6" />
              <div className="flex gap-6 mb-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-14 h-14 rounded-full bg-zinc-800 animate-pulse" />
                    <div className="h-3 w-10 bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-zinc-800/50 border border-zinc-700 animate-pulse mb-6">
              <div className="px-5 py-4 border-b border-zinc-700/50 flex justify-between">
                <div className="h-4 w-32 bg-zinc-700 rounded" />
                <div className="h-6 w-16 bg-zinc-700 rounded-lg" />
              </div>
              <div className="p-5 flex gap-5">
                <div className="h-9 w-36 bg-zinc-700 rounded" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-24 bg-zinc-700 rounded" />
                  <div className="h-3 w-48 bg-zinc-700 rounded" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 h-[72px] animate-pulse" />
              ))}
            </div>

            <div className="h-px bg-zinc-700 my-6" />

            <div className="space-y-3">
              <div className="h-5 w-20 bg-zinc-800 rounded animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="h-4 bg-zinc-800 rounded animate-pulse"
                    style={{ width: `${85 - i * 10}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex gap-2">
                  <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse flex-shrink-0" />
                  <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>

            <div className="h-px bg-zinc-700 my-6" />

            <div className="space-y-3">
              <div className="h-5 w-36 bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-full bg-zinc-800/50 rounded animate-pulse" />
              <div className="space-y-2.5">
                {[75, 90, 100].map((w, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-4 w-10 bg-zinc-800 rounded animate-pulse" />
                    </div>
                    <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-700 animate-pulse"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-zinc-700 my-6" />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-44 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-20 bg-zinc-800/50 rounded animate-pulse" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="aspect-video bg-zinc-800 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}