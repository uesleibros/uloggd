import { Palette } from "lucide-react"
import SettingsSection from "../ui/SettingsSection"

export default function ThemeSection() {
  return (
    <SettingsSection title="Tema">
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center text-zinc-600">
          <Palette className="w-6 h-6" />
        </div>
        <p className="text-sm text-zinc-500">Configurações de aparência em breve.</p>
      </div>
    </SettingsSection>
  )
}