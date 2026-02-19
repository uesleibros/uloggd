import BackloggdSection from "../sections/BackloggdSection"

export default function IntegrationsTab() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Integrações</h2>
      <p className="text-sm text-zinc-500 mt-1 mb-6">Importe seus dados de outras plataformas.</p>

      <BackloggdSection />
    </div>
  )
}