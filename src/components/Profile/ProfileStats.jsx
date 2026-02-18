function StatCard({ value, label }) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-300 mt-1">{label}</div>
    </div>
  )
}

function SocialCount({ value, label, onClick }) {
  return (
    <button onClick={onClick} className="text-sm hover:opacity-80 transition-opacity cursor-pointer">
      <span className="font-semibold text-white">{value}</span>
      <span className="text-zinc-500 ml-1">{label}</span>
    </button>
  )
}

export default function ProfileStats({ counts, followersCount, followingCount, memberSince, onFollowersClick, onFollowingClick }) {
  return (
    <>
      <div className="flex items-center gap-3 sm:gap-5 mt-3 flex-wrap">
        <SocialCount value={followersCount} label="seguidores" onClick={onFollowersClick} />
        <SocialCount value={followingCount} label="seguindo" onClick={onFollowingClick} />
        {memberSince && (
          <span className="text-xs sm:text-sm text-zinc-600 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {memberSince}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <StatCard value={counts.playing} label="Jogando" />
        <StatCard value={counts.completed} label="Zerados" />
        <StatCard value={counts.backlog} label="Backlog" />
        <StatCard value={counts.rated} label="Avaliados" />
      </div>
    </>
  )
}