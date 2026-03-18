import { Newspaper, ExternalLink, X, Sparkles } from "lucide-react"
import { useBlogNotification } from "#hooks/useBlogNotification"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"

export default function BlogNotificationModal() {
  const { t } = useTranslation()
  const { newPost, showModal, dismiss, openPost, goToBlog } = useBlogNotification()

  if (!newPost) return null

  const image = newPost.cover_image || newPost.social_image

  return (
    <Modal
      isOpen={showModal}
      onClose={dismiss}
      maxWidth="max-w-md"
      showCloseButton={false}
      closeOnOverlay={false}
    >
      <div className="relative overflow-hidden">
        {image && (
          <div className="relative h-40 -mx-px -mt-px">
            <img
              src={image}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
          </div>
        )}

        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className={`p-6 ${image ? "-mt-12 relative z-10" : ""}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-medium text-indigo-400">{t("blogNotification.badge")}</span>
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
            {newPost.title}
          </h3>

          {newPost.description && (
            <p className="text-sm text-zinc-400 line-clamp-3 mb-4">
              {newPost.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-6">
            <Newspaper className="w-3.5 h-3.5" />
            <span>{newPost.reading_time_minutes} {t("blog.minRead")}</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={dismiss}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
            >
              {t("blogNotification.dismiss")}
            </button>
            <button
              onClick={openPost}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {t("blogNotification.read")}
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={goToBlog}
            className="w-full mt-3 text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            {t("blogNotification.viewAll")}
          </button>
        </div>
      </div>
    </Modal>
  )
}
