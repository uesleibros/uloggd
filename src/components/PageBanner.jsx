export default function PageBanner({
  image,
  fallbackGradient = "from-indigo-900/30 via-zinc-900 to-zinc-900",
  height = "home",
}) {
  const heightClasses = {
    home: "h-[262px]",
    profile: "aspect-[16/7] sm:aspect-[16/5] md:aspect-auto md:h-[280px]",
    game: "aspect-[16/7] sm:aspect-[16/5] md:aspect-auto md:h-[262px]",
  }

  return (
    <div className={`absolute z-[-1] top-0 left-0 w-full overflow-hidden ${heightClasses[height]}`}>
      {image ? (
        <img
          src={image}
          alt="Banner"
          className="select-none pointer-events-none absolute z-[-2] inset-0 h-full w-full object-cover object-center"
          draggable={false}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient}`} />
      )}
      <div id="main-gradient" />
      <div id="gradient" />
    </div>
  )
}