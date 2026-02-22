import { ReviewSection } from "../shared/ReviewSection"

const TODAY = new Date().toISOString().split("T")[0]
const MIN_DATE = "2000-01-01"

export function DatesTab({ startedOn, setStartedOn, finishedOn, setFinishedOn }) {
  const startError = startedOn && (startedOn < MIN_DATE || startedOn > TODAY)
    ? (startedOn > TODAY ? "Data no futuro" : "Data muito antiga")
    : null
  const finishError = finishedOn && (finishedOn < MIN_DATE || finishedOn > TODAY)
    ? (finishedOn > TODAY ? "Data no futuro" : "Data muito antiga")
    : null
  const orderError = startedOn && finishedOn && finishedOn < startedOn
    ? "Término antes do início"
    : null

  return (
    <ReviewSection title="Período" description="Quando você começou e terminou de jogar?">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-zinc-400 mb-1.5 block">Começou em</label>
          <input
            type="date"
            value={startedOn}
            onChange={(e) => setStartedOn(e.target.value)}
            max={TODAY}
            min={MIN_DATE}
            className={`w-full px-3 py-2.5 bg-zinc-900/50 border rounded-lg text-sm text-white focus:outline-none transition-colors cursor-pointer [color-scheme:dark] ${
              startError ? "border-red-500/50" : "border-zinc-700/50 focus:border-zinc-500"
            }`}
          />
          {startError && <p className="text-xs text-red-400 mt-1">{startError}</p>}
        </div>
        <div>
          <label className="text-sm text-zinc-400 mb-1.5 block">Terminou em</label>
          <input
            type="date"
            value={finishedOn}
            onChange={(e) => setFinishedOn(e.target.value)}
            max={TODAY}
            min={startedOn || MIN_DATE}
            className={`w-full px-3 py-2.5 bg-zinc-900/50 border rounded-lg text-sm text-white focus:outline-none transition-colors cursor-pointer [color-scheme:dark] ${
              finishError || orderError ? "border-red-500/50" : "border-zinc-700/50 focus:border-zinc-500"
            }`}
          />
          {finishError && <p className="text-xs text-red-400 mt-1">{finishError}</p>}
          {!finishError && orderError && <p className="text-xs text-red-400 mt-1">{orderError}</p>}
        </div>
      </div>
    </ReviewSection>
  )
}