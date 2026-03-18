import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Newspaper, ExternalLink, Calendar, Clock, Heart } from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import { useTranslation } from "#hooks/useTranslation"

function BlogSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-zinc-800/30 border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
          <div className="h-44 sm:h-48 bg-zinc-700" />
          <div className="p-5">
            <div className="h-5 w-3/4 bg-zinc-700 rounded mb-3" />
            <div className="h-3 w-full bg-zinc-800 rounded mb-2" />
            <div className="h-3 w-2/3 bg-zinc-800 rounded mb-4" />
            <div className="flex gap-4">
              <div className="h-3 w-20 bg-zinc-800 rounded" />
              <div className="h-3 w-16 bg-zinc-800 rounded" />
            </div>
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
      className="group block bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden transition-all hover:bg-zinc-800/30"
    >
      {image && (
        <div className="relative w-full h-44 sm:h-48 overflow-hidden">
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent" />
          
          {post.tag_list?.length > 0 && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              {post.tag_list.slice(0, 2).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 text-[10px] font-medium bg-black/50 backdrop-blur-sm text-white rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3">
            <h2 className="text-lg sm:text-xl font-bold text-white line-clamp-2 drop-shadow-lg">
              {post.title}
            </h2>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5">
        {!image && (
          <h2 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors line-clamp-2 mb-2">
            {post.title}
          </h2>
        )}

        {post.description && (
          <p className="text-sm text-zinc-400 line-clamp-2">
            {post.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3 flex-wrap">
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
          </div>

          <div className="flex items-center gap-1 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
            {t("readMore")}
            <ExternalLink className="w-3 h-3" />
          </div>
        </div>
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
