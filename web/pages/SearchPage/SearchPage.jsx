import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import usePageMeta from "#hooks/usePageMeta"
import { useTranslation } from "#hooks/useTranslation"
import { useSearch } from "./hooks/useSearch"
import { SearchHeader } from "./components/SearchHeader"
import { SearchTabs } from "./components/SearchTabs"
import { SearchFilters } from "./components/SearchFilters"
import { SearchResults } from "./components/SearchResults"

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useTranslation()
  const initialQuery = searchParams.get("q") || ""
  const initialTab = searchParams.get("tab") || "games"

  const {
    query,
    setQuery,
    debouncedQuery,
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    page,
    setPage,
    results,
    counts,
    totalPages,
    loading,
  } = useSearch(initialQuery, initialTab)

  usePageMeta({
    title: query ? t("search.meta.title", { query }) : t("search.meta.titleDefault"),
    description: t("search.meta.description"),
  })

  useEffect(() => {
    const params = {}
    if (debouncedQuery) params.q = debouncedQuery
    if (activeTab !== "games") params.tab = activeTab
    setSearchParams(params, { replace: true })
  }, [debouncedQuery, activeTab, setSearchParams])

  const currentResults = results[activeTab] || []
  const currentCount = counts[activeTab] || 0
  const currentTotalPages = totalPages[activeTab] || 0

  return (
    <div className="min-h-screen">
      <SearchHeader
        query={query}
        onChange={setQuery}
        onClear={() => setQuery("")}
        totalResults={currentCount}
        loading={loading}
        activeTab={activeTab}
      />

      <div className="py-8">
        <SearchTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          counts={counts}
        />

        {(debouncedQuery || currentResults.length > 0) && (
          <SearchFilters
            activeTab={activeTab}
            filters={filters}
            onChange={setFilters}
            totalResults={currentCount}
          />
        )}

        <SearchResults
          results={currentResults}
          loading={loading}
          activeTab={activeTab}
          query={debouncedQuery}
          page={page}
          totalPages={currentTotalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  )

}
