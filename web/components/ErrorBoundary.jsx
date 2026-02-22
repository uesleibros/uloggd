import { Component } from "react"

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary:", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
          <h1 className="text-xl font-bold text-white">Algo deu errado</h1>
          <p className="text-sm text-zinc-400 text-center max-w-md">
            {this.state.error?.message}
          </p>
          <pre className="text-xs text-red-400 max-w-2xl overflow-auto max-h-40 bg-zinc-900 p-4 rounded">
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Recarregar página
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
