import PageBanner from "@components/Layout/PageBanner"

export default function ProfileSkeleton() {
  return (
    <div>
      <PageBanner height="profile" />

      <div className="pt-[22vw] sm:pt-[20vw] md:pt-36 pb-16">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="flex-shrink-0 flex justify-center md:justify-start">
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full bg-zinc-800 animate-pulse border-4 border-zinc-900" />
          </div>

          <div className="flex-1 sm:mt-12 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="h-8 w-44 bg-zinc-800 rounded-lg animate-pulse" />
                  <div className="flex gap-1.5">
                    <div className="h-6 w-6 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-6 w-6 bg-zinc-800 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 bg-zinc-800 rounded-md animate-pulse" />
                  <div className="h-5 w-20 bg-zinc-800 rounded-md animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="h-9 w-24 bg-zinc-800 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 mt-6">
          <div className="lg:w-[300px] lg:flex-shrink-0">
            <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-zinc-700/50">
                {[0, 1].map((i) => (
                  <div key={i} className="py-4 px-3 flex flex-col items-center">
                    <div className="h-6 w-10 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-zinc-800/60 rounded animate-pulse mt-2" />
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-700/50" />

              <div className="p-4 space-y-2.5">
                <div className="h-3 w-20 bg-zinc-800/60 rounded animate-pulse" />
                <div className="space-y-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2">
                      <div className="h-4 w-16 bg-zinc-800/50 rounded animate-pulse" />
                      <div className="h-4 w-8 bg-zinc-800/50 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-700/50" />

              <div className="px-4 py-3 flex items-center gap-2">
                <div className="w-3.5 h-3.5 bg-zinc-800/60 rounded animate-pulse flex-shrink-0" />
                <div className="h-3 w-28 bg-zinc-800/60 rounded animate-pulse" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 border-b border-zinc-700/50 pb-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-8 bg-zinc-800/50 rounded-lg animate-pulse"
                  style={{ width: [72, 64, 56, 68, 56][i] }}
                />
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <div className="h-4 w-full bg-zinc-800/40 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-zinc-800/40 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-zinc-800/40 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
