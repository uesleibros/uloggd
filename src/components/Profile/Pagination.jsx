export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  function getPages() {
    const pages = []
    const max = 5

    if (totalPages <= max + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }

    pages.push(1)
    let start = Math.max(2, currentPage - 1)
    let end = Math.min(totalPages - 1, currentPage + 1)

    if (currentPage <= 3) { start = 2; end = Math.min(max, totalPages - 1) }
    else if (currentPage >= totalPages - 2) { start = Math.max(2, totalPages - max + 1); end = totalPages - 1 }

    if (start > 2) pages.push("...")
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages - 1) pages.push("...")
    pages.push(totalPages)
    return pages
  }

  const Arrow = ({ direction, disabled }) => (
    <button
      onClick={() => onPageChange(currentPage + direction)}
      disabled={disabled}
      className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={direction === -1 ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  )

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <Arrow direction={-1} disabled={currentPage === 1} />
      {getPages().map((page, i) =>
        page === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-zinc-600 text-sm">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`min-w-[36px] h-9 px-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
              currentPage === page ? "bg-white text-black" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {page}
          </button>
        )
      )}
      <Arrow direction={1} disabled={currentPage === totalPages} />
    </div>
  )
}