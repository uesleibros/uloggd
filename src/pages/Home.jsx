import usePageMeta from "../../hooks/usePageMeta"
import UsersChoiceCarousel from "../components/UsersChoiceCarousel"

export default function Home() {
	usePageMeta()

	return (
		<div>
			<div className="absolute z-[-1] z-0 top-0 left-0 h-[262px] w-full overflow-hidden">
				<img
					src="/games-background.png"
					alt="Banner"
					className="select-none pointer-events-none absolute z-[-2] inset-0 h-full w-full object-cover"
				/>
				<div id="main-gradient" />
				<div id="gradient" />
			</div>
			<div className="mt-40">
				<h1 className="text-5xl font-bold text-blue-200 mb-5">Descubra, colecione, seus jogos.</h1>
				<div className="max-w-2xl">
				  <p className="text-lg leading-relaxed text-zinc-300">
				    Acompanhe tudo que você já jogou, está jogando ou quer jogar. 
				    Organize sua biblioteca pessoal, crie tierlists e rankings personalizados, 
				    dê notas aos seus jogos favoritos e descubra o que a comunidade está curtindo. 
				    Compare suas classificações com outros jogadores, explore recomendações 
				    baseadas nos seus gostos e mantenha tudo atualizado automaticamente 
				    conforme você joga.
				  </p>
				</div>
			</div>

			<div className="mt-12">
			  <h2 className="text-xl font-semibold text-white mb-4">Favoritos da comunidade</h2>
			  <UsersChoiceCarousel />
			</div>
		</div>
	)
}

