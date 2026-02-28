import {
  Info,
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
  Star,
  HelpCircle,
  Bug,
  Quote,
  Circle,
} from "lucide-react"

export const ALERT_VARIANTS = {
  info: {
    icon: Info,
    color: "text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
  },
  note: {
    icon: FileText,
    color: "text-indigo-400",
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/5",
  },
  tip: {
    icon: Lightbulb,
    color: "text-sky-400",
    border: "border-sky-500/30",
    bg: "bg-sky-500/5",
  },
  important: {
    icon: Star,
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
  },
  danger: {
    icon: AlertCircle,
    color: "text-red-400",
    border: "border-red-500/30",
    bg: "bg-red-500/5",
  },
  success: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
  },
  question: {
    icon: HelpCircle,
    color: "text-cyan-400",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
  },
  example: {
    icon: Quote,
    color: "text-zinc-300",
    border: "border-zinc-500/30",
    bg: "bg-zinc-500/5",
  },
  bug: {
    icon: Bug,
    color: "text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-500/5",
  },
  neutral: {
    icon: Circle,
    color: "text-zinc-400",
    border: "border-zinc-600/30",
    bg: "bg-zinc-600/5",
  },
}
