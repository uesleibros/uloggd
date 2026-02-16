import DragScrollRow from "../UI/DragScrollRow"
import { GameCard } from "./GameCard"

export function GameGrid({ slugs, autoScroll = false }) {
  const slugList = slugs.split(",").map(s => {
    const raw = s.trim()
    const isFavorite = raw.endsWith("+")
    const slug = isFavorite ? raw.slice(0, -1) : raw
    return { slug, isFavorite }
  }).filter(item => item.slug)

  if (slugList.length === 0) return null

  const items = autoScroll ? [...slugList, ...slugList, ...slugList] : slugList

  return (
    <div className="my-2">
      <DragScrollRow
        className={`gap-3 pb-4 pt-4 px-1 items-end ${autoScroll ? "overflow-x-hidden" : ""}`}
        autoScroll={autoScroll}
        autoScrollSpeed={0.04}
        loop={autoScroll}
      >
        {items.map(({ slug, isFavorite }, i) => (
          <GameCard 
            key={`${slug}-${i}`} 
            slug={slug} 
            variant="cover" 
            isFavorite={isFavorite}
          />
        ))}
      </DragScrollRow>
    </div>
  )
}