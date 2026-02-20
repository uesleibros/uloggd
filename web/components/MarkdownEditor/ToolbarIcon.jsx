import {
  Heading,
  Bold,
  Italic,
  Strikethrough,
  Link2,
  Image,
  ImagePlus,
  Youtube,
  Code,
  FileCode2,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  EyeOff,
  ImageOff,
  Minus,
  AtSign,
  AlertCircle,
  AlignCenter,
  Table,
  Monitor,
  Smartphone,
} from "lucide-react"

export function ToolbarIcon({ type }) {
  const icons = {
    heading: <Heading className="w-4 h-4" strokeWidth={2} />,
    bold: <Bold className="w-4 h-4" strokeWidth={2} />,
    italic: <Italic className="w-4 h-4" strokeWidth={2} />,
    strikethrough: <Strikethrough className="w-4 h-4" strokeWidth={2} />,

    link: <Link2 className="w-4 h-4" strokeWidth={2} />,
    image: <Image className="w-4 h-4" strokeWidth={2} />,
    imagesize: <ImagePlus className="w-4 h-4" strokeWidth={2} />,
    youtube: <Youtube className="w-4 h-4" strokeWidth={2} />,

    code: <Code className="w-4 h-4" strokeWidth={2} />,
    codeblock: <FileCode2 className="w-4 h-4" strokeWidth={2} />,

    ul: <List className="w-4 h-4" strokeWidth={2} />,
    ol: <ListOrdered className="w-4 h-4" strokeWidth={2} />,
    checklist: <CheckSquare className="w-4 h-4" strokeWidth={2} />,

    quote: <Quote className="w-4 h-4" strokeWidth={2} />,
    spoiler: <EyeOff className="w-4 h-4" strokeWidth={2} />,
    spoilerimage: <ImageOff className="w-4 h-4" strokeWidth={2} />,

    hr: <Minus className="w-4 h-4" strokeWidth={2} />,
    mention: <AtSign className="w-4 h-4" strokeWidth={2} />,
    alert: <AlertCircle className="w-4 h-4" strokeWidth={2} />,
    center: <AlignCenter className="w-4 h-4" strokeWidth={2} />,
    table: <Table className="w-4 h-4" strokeWidth={2} />,

    desktop: <Monitor className="w-4 h-4" strokeWidth={2} />,
    mobile: <Smartphone className="w-4 h-4" strokeWidth={2} />,
  }

  return icons[type] || null
}