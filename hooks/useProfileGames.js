import { useState, useEffect, useCallback } from "react"

const EMPTY_COUNTS = {
	total: 0,
	playing: 0,
	played: 0,
	backlog: 0,
	wishlist: 0,
	dropped: 0,
	shelved: 0,
	liked: 0,
	rated: 0,
}

const LIMIT = 24

export function useProfileGames(profileId, onCountsUpdate) {
	const [games, setGames] = useState([])
	const [counts, setCounts] = useState(EMPTY_COUNTS)
	const [loading, setLoading] = useState(true)
	const [activeTab, setActiveTab] = useState("playing")
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)

	const fetchGames = useCallback(async (filter, pageNum) => {
		if (!profileId) return
		setLoading(true)

		try {
			const res = await fetch("/api/userGames/profileGames", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: profileId, filter, page: pageNum, limit: LIMIT }),
			})

			if (!res.ok) throw new Error()
			const data = await res.json()

			const newCounts = { ...EMPTY_COUNTS, ...data.counts }
			setCounts(newCounts)
			onCountsUpdate?.(newCounts)
			setTotalPages(data.totalPages || 1)

			const slugs = data.games?.map(g => g.slug) || []
			if (slugs.length === 0) {
				setGames([])
				return
			}

			const batchRes = await fetch("/api/igdb/gamesBatch", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ slugs }),
			})

			if (batchRes.ok) {
				const igdbGames = await batchRes.json()
				const merged = data.games.map(g => ({
					...igdbGames[g.slug],
					...g,
				})).filter(g => g.name)
				setGames(merged)
			} else {
				setGames([])
			}
		} catch {
			setGames([])
		} finally {
			setLoading(false)
		}
	}, [profileId, onCountsUpdate])

	useEffect(() => {
		fetchGames(activeTab, page)
	}, [fetchGames, activeTab, page])

	const handleTabChange = useCallback((tab) => {
		setActiveTab(tab)
		setPage(1)
	}, [])

	const handlePageChange = useCallback((newPage) => {
		setPage(newPage)
	}, [])

	return {
		games,
		counts,
		loading,
		activeTab,
		page,
		totalPages,
		handleTabChange,
		handlePageChange,
	}
}