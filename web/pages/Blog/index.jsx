import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Newspaper, ExternalLink, Calendar, Clock, Heart } from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import { useTranslation } from "#hooks/useTranslation"

function BlogSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-5 animate-pulse">
          <div className="h-5 w-3/4 bg-zinc-700 rounded mb-3" />
          <div className="h-3 w-full bg-zinc-800 rounded mb-2" />
          <div className="h-3 w-2/3 bg-zinc-800 rounded mb-4" />
          <div className="flex gap-4">
            <div className="h-3 w-20 bg-zinc-800 rounded" />
            <div className="h-3 w-16 bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function BlogPost({ post, t }) {
  const date = new Date(post.published_timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const image = post.cover_image || post.social_image

  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-all hover:bg-zinc-800/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors line-clamp-2">
            {post.title}
          </h2>
          
          {post.description && (
            <p className="mt-2 text-sm text-zinc-400 line-clamp-2">
              {post.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Calendar className="w-3.5 h-3.5" />
              {date}
            </span>
            
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock className="w-3.5 h-3.5" />
              {post.reading_time_minutes} {t("minRead")}
            </span>

            {post.public_reactions_count > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Heart className="w-3.5 h-3.5" />
                {post.public_reactions_count}
              </span>
            )}

            {post.tag_list?.length > 0 && (
              <div className="flex items-center gap-1.5">
                {post.tag_list.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[10px] font-medium bg-zinc-800 text-zinc-400 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {image && (
          <img
            src={image}
            alt=""
            className="w-24 h-24 sm:w-32 sm:h-20 object-cover rounded-lg flex-shrink-0 hidden sm:block"
          />
        )}
      </div>

      <div className="flex items-center gap-1.5 mt-4 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
        {t("readMore")}
        <ExternalLink className="w-3 h-3" />
      </div>
    </a>
  )
}

function EmptyState({ t }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
        <Newspaper className="w-7 h-7 text-zinc-600" />
      </div>
      <h3 className="text-base font-semibold text-zinc-300 mb-1">
        {t("empty.title")}
      </h3>
      <p className="text-sm text-zinc-500 max-w-xs">
        {t("empty.description")}
      </p>
    </div>
  )
}

export default function BlogPage() {
  const { t } = useTranslation("blog")
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  usePageMeta({
    title: `${t("title")} - uloggd`,
    description: t("description"),
  })

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/blog/articles")
        const data = await res.json()
        setPosts(data || [])
      } catch {
        setPosts([])
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  return (
    <div className="py-8 sm:py-12 max-w-3xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("backToHome")}
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Newspaper className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {t("title")}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {loading ? (
        <BlogSkeleton />
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map(post => (
            <BlogPost key={post.id} post={post} t={t} />
          ))}
        </div>
      ) : (
        <EmptyState t={t} />
      )}

      <div className="mt-12 p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
        <p className="text-sm text-zinc-500 text-center">
          {t("poweredBy")}{" "}
          <a
            href="https://dev.to"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline"
          >
            Dev.to
          </a>
        </p>
      </div>
    </div>
  )
}
