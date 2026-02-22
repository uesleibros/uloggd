import { Component } from "react"

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    if (error?.message?.includes("removeChild")) return null
    return { error }
  }

  componentDidCatch(error, info) {
    if (error?.message?.includes("removeChild")) return
    console.error("ErrorBoundary:", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      const isDev = import.meta.env.DEV

      return (
        <div className="fixed inset-0 z-[9999] bg-zinc-950 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-6 max-w-md w-full text-center">
            <img
              src="/problem.png"
              alt="Erro"
              draggable={false}
              className="w-24 h-24 sm:w-32 sm:h-32 object-contain pixelated select-none animate-bounce"
              style={{ imageRendering: "pixelated" }}
            />

            <div className="flex flex-col gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Algo deu muito errado!
              </h1>
              <p className="text-sm sm:text-base text-zinc-400">
                Parece que algo quebrou por aqui. Tenta recarregar a página.
              </p>
            </div>

            {isDev && (
              <div className="w-full flex flex-col gap-2">
                <p className="text-xs text-red-400 font-mono break-all">
                  {this.state.error?.message}
                </p>
                <pre className="text-[10px] sm:text-xs text-red-400/60 font-mono max-h-32 overflow-auto text-left bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 w-full">
                  {this.state.error?.stack}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-white text-zinc-900 font-semibold text-sm rounded-lg hover:bg-zinc-200 active:scale-95 transition-all"
              >
                Recarregar
              </button>
              <button
                onClick={() => {
                  this.setState({ error: null })
                  window.history.back()
                }}
                className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-medium text-sm rounded-lg hover:bg-zinc-700 active:scale-95 transition-all"
              >
                Voltar
              </button>
            </div>

            <p className="text-[11px] text-zinc-600">
              Se o problema persistir, tenta limpar o cache do navegador.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
