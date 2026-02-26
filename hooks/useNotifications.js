import { useState, useEffect, useRef, useSyncExternalStore, useCallback } from "react"
import { supabase } from "#lib/supabase"
import { useAuth } from "#hooks/useAuth"

const POLL_INTERVAL = 30000

let unreadCount = 0
let listeners = new Set()
let pollInterval = null
let activeUserId = null

function notify() {
	listeners.forEach(fn => fn())
}

function getSnapshot() {
	return unreadCount
}

async function fetchCount() {
	if (document.hidden || !activeUserId) return

	const { data: { session } } = await supabase.auth.getSession()
	if (!session?.access_token) return

	try {
		const r = await fetch("/api/notifications/@me/count", {
			headers: {
				Authorization: `Bearer ${session.access_token}`,
			},
		})
		const data = await r.json()
		const newCount = data.count || 0
		
		if (newCount !== unreadCount) {
			unreadCount = newCount
			notify()
		}
	} catch {}
}

function handleVisibility() {
	if (!document.hidden) fetchCount()
}

function startPolling(userId) {
	if (pollInterval) return
	
	activeUserId = userId
	fetchCount()
	pollInterval = setInterval(fetchCount, POLL_INTERVAL)
	document.addEventListener("visibilitychange", handleVisibility)
}

function stopPolling() {
	if (pollInterval) {
		clearInterval(pollInterval)
		pollInterval = null
	}
	document.removeEventListener("visibilitychange", handleVisibility)
	activeUserId = null
	unreadCount = 0
	notify()
}

function subscribe(callback) {
	listeners.add(callback)
	return () => listeners.delete(callback)
}

export function useNotifications() {
	const { user } = useAuth()
	const count = useSyncExternalStore(subscribe, getSnapshot)

	useEffect(() => {
		if (!user?.id) {
			stopPolling()
			return
		}

		startPolling(user.id)

		return () => {
			if (listeners.size <= 1) {
				stopPolling()
			}
		}
	}, [user?.id])

	const refetch = useCallback(() => {
		fetchCount()
	}, [])

	return { unreadCount: count, refetch }
}