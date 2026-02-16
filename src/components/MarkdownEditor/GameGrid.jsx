import DragScrollRow from "../UI/DragScrollRow"
import { GameCard } from "./GameCard"

export function GameGrid({ slugs }) {
  const slugList = slugs.split(",").map(s => {
    const raw = s.trim()
    const isFavorite = raw.endsWith("+")
    const slug = isFavorite ? raw.slice(0, -1) : raw
    return { slug, isFavorite }
  }).filter(item => item.slug)

  if (slugList.length === 0) return null

  return (
    <div className="my-2">
      <DragScrollRow className="gap-3 pb-4 pt-4 px-1 items-end">
        {slugList.map(({ slug, isFavorite }) => (
          <GameCard 
            key={slug} 
            slug={slug} 
            variant="cover" 
            isFavorite={isFavorite}
          />
        ))}
      </DragScrollRow>
    </div>
  )
}