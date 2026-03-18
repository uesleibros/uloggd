import { Newspaper, ExternalLink, X, Sparkles, Clock, ArrowRight } from "lucide-react"
import { useBlogNotification } from "#hooks/useBlogNotification"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"

export default function BlogNotificationModal() {
  const { t } = useTranslation()
  const { newPost, showModal, dismiss, openPost, goToBlog } = useBlogNotification()

  if (!newPost) return null

  const image = newPost.cover_image || newPost.social_image
  const date = new Date(newPost.published_timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })

  return (
    <Modal
      isOpen={showModal}
      onClose={dismiss}
      maxWidth="max-w-md"
      showCloseButton={false}
      closeOnOverlay={false}
    >
      <div className="overflow-hidden">
        {image ? (
          <div className="relative h-48">
            <img
              src={image}
              alt=""
              className="w-full h-full object-cover rounded-t-xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-zinc-900/20 rounded-t-xl" />
            
            <div className="absolute top-4 left-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 rounded-full shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-semibold text-white">{t("blogNotification.badge")}</span>
              </div>
            </div>

            <button
              onClick={dismiss}
              className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full text-white/80 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-xl font-bold text-white line-clamp-2 drop-shadow-lg">
                {newPost.title}
              </h3>
            </div>
          </div>
        ) : (
          <div className="relative p-6 pb-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-semibold text-white">{t("blogNotification.badge")}</span>
              </div>
              
              <button
                onClick={dismiss}
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-xl font-bold text-white mt-4 line-clamp-2">
              {newPost.title}
            </h3>
          </div>
        )}

        <div className="p-6 pt-4">
          {newPost.description && (
            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3 mb-4">
              {newPost.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-zinc-500 mb-6">
            <span className="flex items-center gap-1.5">
              <Newspaper className="w-3.5 h-3.5" />
              {date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {newPost.reading_time_minutes} {t("blog.minRead")}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={dismiss}
              className="flex-1 px-4 py-3 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-xl transition-all cursor-pointer"
            >
              {t("blogNotification.dismiss")}
            </button>
            <button
              onClick={openPost}
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 group"
            >
              {t("blogNotification.read")}
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>

          <button
            onClick={goToBlog}
            className="w-full mt-4 py-2 text-sm text-zinc-500 hover:text-indigo-400 transition-colors cursor-pointer flex items-center justify-center gap-1.5 group"
          >
            {t("blogNotification.viewAll")}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </Modal>
  )
}
