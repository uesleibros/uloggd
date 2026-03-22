export default function PageBanner({
  image,
  fallbackGradient = "from-indigo-900/30 via-zinc-900 to-zinc-900",
  height = "home",
  transparentBase = false,
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
      
      {transparentBase ? (
        <>
          <div 
            className="absolute top-0 left-0 right-0 h-[262px] z-[-1]"
            style={{ background: "linear-gradient(0deg, transparent 2%, rgba(0,0,0,0.5) 109%)" }}
          />
          <div 
            className="absolute bottom-[-1px] left-0 right-0 h-[80%] z-[-1]"
            style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 100%)" }}
          />
        </>
      ) : (
        <>
          <div id="main-gradient" />
          <div id="gradient" />
        </>
      )}
    </div>
  )
}
