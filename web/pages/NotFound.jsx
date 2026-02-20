import { Link } from "react-router-dom"

export default function NotFound() {
	return (
		<div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
			<h1 className="text-9xl font-bold text-white">404</h1>
			<p className="mt-4 text-zinc-400">
				Essa página não existe ou foi movida.
			</p>

			<Link
				to="/"
				className="mt-6 rounded-md border border-zinc-400 bg-zinc-800 px-4 py-2 text-sm text-white transition hover:bg-zinc-700"
			>
				Voltar para a home
			</Link>
		</div>
	)
}