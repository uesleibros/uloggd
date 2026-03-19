import { useState } from "react"
import { useTranslation } from "#hooks/useTranslation"
import { ChevronDown, ChevronUp, User } from "lucide-react"

const GENDER_MAP = {
  0: "Male",
  1: "Female", 
  2: "Other"
}

function CharacterCard({ character, onClick }) {
  return (
    <button
      onClick={() => onClick(character)}
      className="group relative flex flex-col items-center text-center cursor-pointer"
    >
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-zinc-800 ring-2 ring-zinc-700 group-hover:ring-purple-500 transition-all">
        {character.image_url ? (
          <img
            src={character.thumb_url}
            alt={character.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-8 h-8 text-zinc-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      </div>
      <span className="mt-2 text-xs sm:text-sm text-zinc-300 group-hover:text-white transition-colors line-clamp-2 max-w-[80px] sm:max-w-[96px]">
        {character.name}
      </span>
    </button>
  )
}

function CharacterModal({ character, onClose }) {
  if (!character) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-48 sm:h-64 bg-zinc-800">
          {character.image_url ? (
            <img
              src={character.image_url}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-16 h-16 text-zinc-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
        </div>

        <div className="relative -mt-12 px-6 pb-6">
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            {character.name}
          </h3>
          
          {(character.gender !== undefined || character.species) && (
            <div className="flex items-center gap-3 mt-2">
              {character.gender !== undefined && (
                <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">
                  {GENDER_MAP[character.gender] || "Unknown"}
                </span>
              )}
              {character.species && (
                <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">
                  Species: {character.species}
                </span>
              )}
            </div>
          )}

          {character.description && (
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed max-h-40 overflow-y-auto">
              {character.description}
            </p>
          )}

          <button
            onClick={onClose}
            className="mt-6 w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GameCharacters({ characters }) {
  const { t } = useTranslation("game")
  const [expanded, setExpanded] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  
  if (!characters?.length) return null

  const displayedCharacters = expanded ? characters : characters.slice(0, 8)
  const hasMore = characters.length > 8

  return (
    <>
      <div className="border-t border-zinc-800 my-6 sm:my-8" />
      
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
          {t("content.characters.title", "Characters")}
          <span className="text-sm text-zinc-500 font-normal">({characters.length})</span>
        </h2>
      </div>

      <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
        {displayedCharacters.map(character => (
          <CharacterCard 
            key={character.id} 
            character={character}
            onClick={setSelectedCharacter}
          />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors cursor-pointer"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              {t("content.characters.showLess", "Show less")}
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              {t("content.characters.showAll", "Show all {{count}} characters", { count: characters.length })}
            </>
          )}
        </button>
      )}

      {selectedCharacter && (
        <CharacterModal 
          character={selectedCharacter} 
          onClose={() => setSelectedCharacter(null)} 
        />
      )}
    </>
  )
}
