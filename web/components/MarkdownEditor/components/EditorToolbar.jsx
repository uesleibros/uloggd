import { useRef } from "react"
import { TOOLBAR_ITEMS } from "../constants"
import { ToolbarButton } from "./ToolbarButton"
import { HeadingDropdown } from "./HeadingDropdown"

export function EditorToolbar({ onAction, onInsertHeading }) {
  const headingBtnRef = useRef(null)

  return (
    <div className="flex items-center gap-0.5 px-1.5 sm:px-2 py-1 sm:py-1.5 border-b border-zinc-800 bg-zinc-800/20 overflow-x-auto scrollbar-hide flex-shrink-0">
      {TOOLBAR_ITEMS.map((item, index) => {
        if (item === "divider") {
          return <div key={`divider-${index}`} className="w-px h-5 bg-zinc-700/60 mx-0.5 sm:mx-1 flex-shrink-0" />
        }

        if (item === "heading") {
          return (
            <HeadingDropdown
              key={item}
              buttonRef={headingBtnRef}
              onSelect={onInsertHeading}
            />
          )
        }

        return (
          <ToolbarButton
            key={item}
            type={item}
            onClick={() => onAction(item)}
          />
        )
      })}
    </div>
  )
}
