import { useState, useRef } from "react"
import { LayoutGrid, Plus } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import Pagination from "@components/UI/Pagination"
import CreateTierlistModal from "@components/Tierlist/CreateTierlistModal"
import { TierlistCard } from "@components/Tierlist/TierlistCard"

function TierlistsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden animate-pulse border border-zinc-800">
          <div className="h-24 sm:h-28 bg-zinc-800" />
          <div className="p-3 sm:p-3.5 space-y-2 bg-zinc-800/30">
            <div className="h-4 w-2/3 bg-zinc-700/50 rounded" />
            <div className="h-3 w-full bg-zinc-800 rounded" />
            <div className="h-3 w-1/4 bg-zinc-800 rounded" />
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
        <LayoutGrid className="w-6 h-6 text-zinc-500" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm text-zinc-400 font-medium">
          {isOwnProfile ? t("empty.own") : t("empty.other", { username })}
        </p>
        {isOwnProfile && (
          <p className="text-sm text-zinc-500">{t("empty.hint")}</p>
        )}
      </div>
      {isOwnProfile && (
        <button
          onClick={onCreateClick}
          className="mt-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("createFirst")}
        </button>
      )}
    </div>
  )
}

export default function TierlistsSection({
  tierlists,
  setTierlists,
  isOwnProfile,
  username,
  loading,
  currentPage,
  totalPages,
  total,
  onPageChange,
}) {
  const { t } = useTranslation("tierlist.section")
  const [createOpen, setCreateOpen] = useState(false)
  const sectionRef = useRef(null)

  function handlePageChange(page) {
    onPageChange(page)
    if (sectionRef.current) {
      const y = sectionRef.current.getBoundingClientRect().top + window.scrollY - 24
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  function handleCreated(newTierlist) {
    setTierlists((prev) => [newTierlist, ...prev])
  }

  return (
    <div className="space-y-6" ref={sectionRef}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-zinc-400" />
            {t("title")}
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
            <span className="hidden sm:inline">{t("create")}</span>
          </button>
        )}
      </div>

      {loading ? (
        <TierlistsSkeleton />
      ) : tierlists?.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tierlists.map((tierlist) => (
              <TierlistCard key={tierlist.id} tierlist={tierlist} />
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

      <CreateTierlistModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}