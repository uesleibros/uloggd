import { useState } from "react"
import { ToolbarButton } from "./ToolbarButton"
import { PortalDropdown } from "./PortalDropdown"
import { HEADING_LEVELS } from "../constants"

const HEADING_SIZES = {
  1: "text-lg",
  2: "text-base",
  3: "text-sm",
  4: "text-xs",
  5: "text-xs",
  6: "text-xs",
}

export function HeadingDropdown({ buttonRef, onSelect }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ToolbarButton
        type="heading"
        onClick={() => setOpen(prev => !prev)}
        isActive={open}
        buttonRef={buttonRef}
      />
      <PortalDropdown anchorRef={buttonRef} open={open} onClose={() => setOpen(false)}>
        <div role="menu">
          {HEADING_LEVELS.map(level => (
            <button
              key={level}
              role="menuitem"
              onClick={() => { onSelect(level); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-700 transition-colors cursor-pointer flex items-center gap-2"
            >
              <span className={`text-zinc-300 font-semibold ${HEADING_SIZES[level]}`}>H{level}</span>
              <span className="text-xs text-zinc-500">{"#".repeat(level)} Título</span>
            </button>
          ))}
        </div>
      </PortalDropdown>
    </>
  )
}
