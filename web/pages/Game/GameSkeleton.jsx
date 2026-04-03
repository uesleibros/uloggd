import PageBanner from "@components/Layout/PageBanner"

function Bone({ className }) {
  return <div className={`bg-zinc-800/70 rounded-lg animate-pulse ${className}`} />
}

export function GameSkeleton() {
  return (
    <div className="min-h-screen">
      <PageBanner height="game" />
      <div className="mx-auto pt-[22vw] sm:pt-[20vw] md:pt-32 pb-20">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
          <div className="flex-shrink-0 lg:w-64">
            <div className="flex flex-row lg:flex-col gap-4 lg:gap-0">
              <div className="w-32 h-48 sm:w-48 sm:h-72 lg:w-64 lg:h-96 rounded-xl bg-zinc-800/60 animate-pulse flex-shrink-0" />
              <div className="flex-1 lg:hidden space-y-3 pt-1">
                <Bone className="h-7 w-48" />
                <Bone className="h-4 w-32" />
                <div className="flex gap-4 mt-2">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div className="w-11 h-11 rounded-full bg-zinc-800/70 animate-pulse" />
                      <Bone className="h-3 w-8" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="hidden lg:block mt-8 space-y-5">
              <div className="space-y-2">
                <Bone className="h-4 w-24" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Bone key={i} className="h-8 w-8 rounded-lg" />
                  ))}
                </div>
              </div>
              <div className="border-t border-zinc-800/60 pt-5 space-y-2">
                <Bone className="h-4 w-20" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Bone key={i} className="h-7 w-16 rounded-md" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="hidden lg:block">
              <Bone className="h-10 w-80" />
              <Bone className="h-4 w-40 mt-3 mb-6" />
              <div className="flex gap-6 mb-6">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="w-14 h-14 rounded-full bg-zinc-800/70 animate-pulse" />
                    <Bone className="h-3 w-10" />
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:block space-y-2 mb-6">
              <Bone className="h-11 w-full rounded-xl" />
              <Bone className="h-11 w-full rounded-xl" />
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl px-4 py-4 animate-pulse"
                >
                  <Bone className="h-6 w-12 mb-2" />
                  <Bone className="h-3 w-16" />
                </div>
              ))}
            </div>

            <div className="py-6 border-t border-zinc-800/60">
              <Bone className="h-5 w-20 mb-4" />
              <div className="space-y-2.5">
                {Array.from({ length: 4 }, (_, i) => (
                  <Bone
                    key={i}
                    className="h-4"
                    style={{ width: `${90 - i * 12}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="py-6 border-t border-zinc-800/60">
              <Bone className="h-5 w-32 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="flex gap-2">
                    <Bone className="h-4 w-24 flex-shrink-0" />
                    <Bone className="h-4 w-40" />
                  </div>
                ))}
              </div>
            </div>

            <div className="py-6 border-t border-zinc-800/60">
              <Bone className="h-5 w-36 mb-4" />
              <div className="space-y-3">
                {[70, 85, 100].map((w, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <Bone className="h-4 w-20" />
                      <Bone className="h-4 w-12" />
                    </div>
                    <div className="h-3 bg-zinc-800/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-700/50 animate-pulse"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-6 border-t border-zinc-800/60">
              <div className="flex items-center gap-2 mb-4">
                <Bone className="h-5 w-32" />
                <Bone className="h-5 w-8 rounded-full" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="aspect-video bg-zinc-800/50 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
