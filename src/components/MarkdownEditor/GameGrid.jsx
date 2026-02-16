import DragScrollRow from "../UI/DragScrollRow"
import { GameCard } from "./GameCard"

export function GameGrid({ slugs }) {
  const slugList = slugs.split(",").map(s => s.trim()).filter(Boolean)

  if (slugList.length === 0) return null

  return (
    <div className="my-6">
      <DragScrollRow className="gap-3 pb-4 pt-2 px-1">
        {slugList.map(slug => (
          <GameCard key={slug} slug={slug} variant="cover" />
        ))}
      </DragScrollRow>
    </div>
  )
}