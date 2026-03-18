import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "uloggd:last_seen_post"

export function useBlogNotification() {
  const [newPost, setNewPost] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    async function checkNewPosts() {
      try {
        const res = await fetch("/api/blog/articles")
        const posts = await res.json()

        if (!posts?.length) return

        const latestPost = posts[0]
        const lastSeenId = localStorage.getItem(STORAGE_KEY)

        if (!lastSeenId || lastSeenId !== String(latestPost.id)) {
          setNewPost(latestPost)
          setShowModal(true)
        }
      } catch {}
    }

    checkNewPosts()
  }, [])

  const dismiss = useCallback(() => {
    if (newPost) {
      localStorage.setItem(STORAGE_KEY, String(newPost.id))
    }
    setShowModal(false)
  }, [newPost])

  const openPost = useCallback(() => {
    if (newPost) {
      localStorage.setItem(STORAGE_KEY, String(newPost.id))
      window.open(newPost.url, "_blank")
    }
    setShowModal(false)
  }, [newPost])

  const goToBlog = useCallback(() => {
    if (newPost) {
      localStorage.setItem(STORAGE_KEY, String(newPost.id))
    }
    setShowModal(false)
    window.location.href = "/blog"
  }, [newPost])

  return {
    newPost,
    showModal,
    dismiss,
    openPost,
    goToBlog
  }
}
