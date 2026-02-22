import {
  Heading, Bold, Italic, Strikethrough, Link2, Image, ImagePlus, Youtube,
  Code, FileCode2, List, ListOrdered, CheckSquare, Quote, EyeOff, ImageOff,
  Minus, AtSign, AlertCircle, AlignCenter, Table, Monitor, Smartphone,
} from "lucide-react"

const ICON_MAP = {
  heading: Heading,
  bold: Bold,
  italic: Italic,
  strikethrough: Strikethrough,
  link: Link2,
  image: Image,
  imagesize: ImagePlus,
  youtube: Youtube,
  code: Code,
  codeblock: FileCode2,
  ul: List,
  ol: ListOrdered,
  checklist: CheckSquare,
  quote: Quote,
  spoiler: EyeOff,
  spoilerimage: ImageOff,
  hr: Minus,
  mention: AtSign,
  alert: AlertCircle,
  center: AlignCenter,
  table: Table,
  desktop: Monitor,
  mobile: Smartphone,
}

export function ToolbarIcon({ type }) {
  const Icon = ICON_MAP[type]
  return Icon ? <Icon className="w-4 h-4" strokeWidth={2} /> : null
}
