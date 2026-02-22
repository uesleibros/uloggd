export function AgeRatings({ ratings }) {
  if (!ratings?.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2 max-w-sm">
      {ratings.map((rating, i) => (
        <div
          key={i}
          className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 flex flex-col items-center space-y-2"
        >
          <img
            className="w-5 h-5 object-contain select-none"
            src={`https://www.igdb.com/icons/rating_icons/${rating.category}/${rating.category}_${rating.rating}.png`}
            alt={`${rating.category.toUpperCase()} rated ${rating.rating.toUpperCase()}`}
            onError={(e) => {
              e.target.style.display = "none"
            }}
          />
        </div>
      ))}
    </div>
  )
}