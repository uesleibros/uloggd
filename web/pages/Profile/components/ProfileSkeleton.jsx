import PageBanner from "@components/Layout/PageBanner"

export default function ProfileSkeleton() {
  return (
    <div>
      <PageBanner height="profile" />
      <div className="pt-[22vw] sm:pt-[20vw] md:pt-36 pb-16">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full bg-zinc-800 animate-pulse border-4 border-zinc-900" />
          </div>
          <div className="flex-1 space-y-4 pt-2">
            <div className="h-8 w-52 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
            <div className="flex gap-6 mt-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 h-[72px] animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}