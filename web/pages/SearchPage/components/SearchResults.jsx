import { GameResult } from "./GameResult"
import { UserResult } from "./UserResult"
import { ListResult } from "./ListResult"
import { SearchEmpty, SearchLoading } from "./SearchEmpty"
import Pagination from "@components/UI/Pagination"

const COMPONENTS = {
  games: GameResult,
  users: UserResult,
  lists: ListResult,
}

const PROP_NAMES = {
  games: "game",
  users: "user",
  lists: "list",
}

const LAYOUTS = {
  games: "space-y-3",
  users: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2",
  lists: "space-y-3",
}

export function SearchResults({
  results,
  loading,
  activeTab,
  query,
  page,
  totalPages,
  onPageChange,
}) {
  if (loading) return <SearchLoading />
  if (results.length === 0) return <SearchEmpty query={query} activeTab={activeTab} />

  const ResultComponent = COMPONENTS[activeTab]
  const propName = PROP_NAMES[activeTab]

  return (
    <>
      <div className={LAYOUTS[activeTab]}>
        {results.map((item) => (
          <ResultComponent key={item.id || item.slug} {...{ [propName]: item }} />
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  )
}