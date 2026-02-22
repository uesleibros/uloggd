import { useState } from "react"

export function VideoGrid({ videos }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? videos : videos.slice(0, 4)

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {visible.map((v) => (
          <div
            key={v.video_id}
            className="relative z-0 aspect-video rounded-lg overflow-hidden bg-zinc-800"
          >
            <iframe
              src={`https://www.youtube.com/embed/${v.video_id}`}
              title={v.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        ))}
      </div>
      {videos.length > 4 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 cursor-pointer text-sm text-zinc-500 hover:text-white transition-colors"
        >
          {showAll ? "Mostrar menos" : `Ver todos (${videos.length})`}
        </button>
      )}
    </>
  )
}