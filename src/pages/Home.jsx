export default function Home() {
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
				    <span className="text-white font-semibold">uloggd</span> é um agregador 
				    de tierlists que utiliza o{" "}
				    <a 
				      className="text-white underline underline-offset-2 transition hover:text-blue-300" 
				      href="https://backloggd.com/"
				      target="_blank"
				    >
				      Backloggd
				    </a>{" "}
				    como fonte de dados. Sincronize sua biblioteca, crie rankings personalizados 
				    e compare suas classificações com outros usuários tudo atualizado 
				    automaticamente conforme você joga.
				  </p>
				</div>
			</div>
		</div>
	)
}
