import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import { getBadgeStyles } from "#utils/badgeStyles"
import { formatDateLong } from "#utils/formatDate"

function BadgeModalContent({ badge, showAssignedDate = false, onClose }) {
  const { t } = useTranslation()
  const s = getBadgeStyles(badge.color)

  const title = t(`badges.${badge.id}.title`)
  const description = t(`badges.${badge.id}.description`)

  return (
    <div
      className="overflow-hidden rounded-2xl bg-zinc-900"
      style={{
        border: `1px solid ${s.border}`,
        boxShadow: `${s.glow}, 0 25px 50px -12px rgba(0,0,0,0.25)`,
      }}
    >
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{ background: s.gradient }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/80 to-transparent pointer-events-none" />

        <div className="relative flex flex-col items-center text-center px-6 pt-8 pb-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: s.iconBg,
              border: `1px solid ${s.border}`,
              boxShadow: s.glow,
            }}
          >
            <img
              src={badge.icon_url}
              alt={title}
              className="w-10 h-10 select-none"
              draggable={false}
            />
          </div>

          <h3 className="text-lg font-bold text-white mb-2">
            {title}
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {description}
          </p>

          {showAssignedDate && badge.assigned_at && (
            <p className="text-xs text-zinc-500 mt-3">
              {t("badges.modal.assignedAt", {
                date: formatDateLong(new Date(badge.assigned_at).getTime() / 1000),
              })}
            </p>
          )}
        </div>
      </div>

      <div className="relative border-t border-zinc-800 px-6 py-4">
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer"
        >
          {t("badges.modal.close")}
        </button>
      </div>
    </div>
  )
}

export default function BadgeModal({ badge, isOpen, onClose, showAssignedDate = false }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-xs"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      {badge && (
        <BadgeModalContent
          badge={badge}
          showAssignedDate={showAssignedDate}
          onClose={onClose}
        />
      )}
    </Modal>
  )
}
