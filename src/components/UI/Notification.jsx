import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"

let notifyFn = null

export function notify(message, type = "success", duration = 4000) {
  if (notifyFn) notifyFn({ message, type, duration, id: Date.now() })
}

const ICONS = {
  success: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
}

const STYLES = {
  success: {
    container: "border-emerald-500/30 bg-emerald-500/5",
    icon: "text-emerald-400 bg-emerald-500/10",
    text: "text-emerald-300",
    progress: "bg-emerald-500",
  },
  error: {
    container: "border-red-500/30 bg-red-500/5",
    icon: "text-red-400 bg-red-500/10",
    text: "text-red-300",
    progress: "bg-red-500",
  },
  info: {
    container: "border-blue-500/30 bg-blue-500/5",
    icon: "text-blue-400 bg-blue-500/10",
    text: "text-blue-300",
    progress: "bg-blue-500",
  },
  warning: {
    container: "border-amber-500/30 bg-amber-500/5",
    icon: "text-amber-400 bg-amber-500/10",
    text: "text-amber-300",
    progress: "bg-amber-500",
  },
}

function NotificationItem({ notification, onDismiss }) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [progress, setProgress] = useState(100)

  const style = STYLES[notification.type] || STYLES.info
  const icon = ICONS[notification.type] || ICONS.info

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => onDismiss(notification.id), 300)
  }, [notification.id, onDismiss])

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true))
    })
  }, [])

  useEffect(() => {
    const duration = notification.duration
    const interval = 16
    const step = (interval / duration) * 100
    let current = 100

    const timer = setInterval(() => {
      current -= step
      if (current <= 0) {
        clearInterval(timer)
        setProgress(0)
        dismiss()
      } else {
        setProgress(current)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [notification.duration, dismiss])

  return (
    <div
      className={`
        w-full max-w-sm overflow-hidden rounded-lg border backdrop-blur-md
        shadow-lg shadow-black/20
        transition-all duration-300 ease-out
        ${style.container}
        ${visible && !exiting
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 -translate-y-3 scale-95"
        }
      `}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${style.icon}`}>
          {icon}
        </div>

        <p className={`flex-1 text-sm font-medium leading-snug pt-1 ${style.text}`}>
          {notification.message}
        </p>

        <button
          onClick={dismiss}
          className="flex-shrink-0 p-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer rounded-md hover:bg-zinc-700/50"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="h-0.5 w-full bg-zinc-800/50">
        <div
          className={`h-full ${style.progress} transition-none`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default function NotificationContainer() {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    notifyFn = (notification) => {
      setNotifications(prev => {
        const next = [...prev, notification]
        return next.slice(-5)
      })
    }
    return () => { notifyFn = null }
  }, [])

  const dismiss = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  if (notifications.length === 0) return null

  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {notifications.map(n => (
        <div key={n.id} className="pointer-events-auto">
          <NotificationItem notification={n} onDismiss={dismiss} />
        </div>
      ))}
    </div>,
    document.body
  )
}