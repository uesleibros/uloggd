import { useState, useRef } from "react"
import { List, Plus } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { ListCard } from "@components/Lists/ListCard"
import Pagination from "@components/UI/Pagination"
import CreateListModal from "@components/Lists/CreateListModal"

function ListsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden animate-pulse border border-zinc-800">
          <div className="h-20 sm:h-24 bg-zinc-800 flex">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex-1 bg-zinc-800 border-r border-zinc-700/30 last:border-0" />
            ))}
          </div>
          <div className="p-3 sm:p-3.5 space-y-2 bg-zinc-800/30">
            <div className="h-4 w-2/3 bg-zinc-700/50 rounded" />
            <div className="h-3 w-1/3 bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ isOwnProfile, username, onCreateClick, t }) {
  return (
    <div className="rounded-xl p-10 sm:p-14 bg-zinc-800/30 border border-zinc-700/50 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        <List className="w-6 h-6 text-zinc-500" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm text-zinc-400 font-medium">
          {isOwnProfile
            ? t("profile.lists.empty.own")
            : t("profile.lists.empty.other", { username })}
        </p>
        {isOwnProfile && (
          <p className="text-sm text-zinc-500">{t("profile.lists.empty.hint")}</p>
        )}
      </div>
      {isOwnProfile && (
        <button
          onClick={onCreateClick}
          className="mt-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("profile.lists.createFirst")}
        </button>
      )}
    </div>
  )
}

export default function ListsSection({
  lists,
  setLists,
  isOwnProfile,
  username,
  loading,
  currentPage,
  totalPages,
  total,
  onPageChange,
}) {
  const { t } = useTranslation()
  const [createOpen, setCreateOpen] = useState(false)
  const sectionRef = useRef(null)

  function handlePageChange(page) {
    onPageChange(page)
    if (sectionRef.current) {
      const y = sectionRef.current.getBoundingClientRect().top + window.scrollY - 24
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  function handleCreated(newList) {
    setLists((prev) => [newList, ...prev])
  }

  return (
    <div className="space-y-6" ref={sectionRef}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <List className="w-5 h-5 text-zinc-400" />
            {t("profile.lists.title")}
          </h2>
          {!loading && total > 0 && (
            <span className="text-sm text-zinc-500 font-normal">{total}</span>
          )}
        </div>

        {isOwnProfile && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border-zinc-700/50"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("profile.lists.create")}</span>
          </button>
        )}
      </div>

      {loading ? (
        <ListsSkeleton />
      ) : lists?.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      ) : (
        <EmptyState
          isOwnProfile={isOwnProfile}
          username={username}
          onCreateClick={() => setCreateOpen(true)}
          t={t}
        />
      )}

      <CreateListModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
