import { useState, useEffect, useRef } from "react"
import { notify } from "../UI/Notification"
import ImageCropModal from "../UI/ImageCropModal"

const AVATAR_ASPECT = 1

export default function AvatarEditor({ currentAvatar, onSave, saving = false }) {
	const [mode, setMode] = useState(null)
	const [urlInput, setUrlInput] = useState("")
	const [urlError, setUrlError] = useState("")
	const [urlLoading, setUrlLoading] = useState(false)
	const [cropSrc, setCropSrc] = useState(null)
	const [preview, setPreview] = useState(currentAvatar || null)
	const [pendingBlob, setPendingBlob] = useState(null)
	const fileRef = useRef(null)

	const canRemove = currentAvatar || pendingBlob
	const hasChanges = pendingBlob !== null || (preview === null && currentAvatar !== null)

	useEffect(() => {
		setPreview(currentAvatar)
		setPendingBlob(null)
		setMode(null)
	}, [currentAvatar])

	useEffect(() => {
		if (!cropSrc) return

		function blockEvents(e) {
			const cropModal = document.querySelector("[data-crop-modal]")
			if (cropModal && !cropModal.contains(e.target)) {
				e.stopPropagation()
			}
		}

		document.addEventListener("mousedown", blockEvents, true)
		document.addEventListener("mouseup", blockEvents, true)
		document.addEventListener("click", blockEvents, true)

		return () => {
			document.removeEventListener("mousedown", blockEvents, true)
			document.removeEventListener("mouseup", blockEvents, true)
			document.removeEventListener("click", blockEvents, true)
		}
	}, [cropSrc])

	function handleFileSelect(e) {
		const file = e.target.files?.[0]
		if (!file) return
		if (!file.type.startsWith("image/")) return
		if (file.size > 10 * 1024 * 1024) return

		const reader = new FileReader()
		reader.onload = () => setCropSrc(reader.result)
		reader.readAsDataURL(file)
		e.target.value = ""
	}

	async function handleUrlSubmit() {
		if (!urlInput.trim()) return

		setUrlError("")
		setUrlLoading(true)

		try {
			const res = await fetch(urlInput.trim())
			if (!res.ok) throw new Error()

			const contentType = res.headers.get("content-type")
			if (!contentType?.startsWith("image/")) {
				setUrlError("A URL não aponta para uma imagem válida.")
				setUrlLoading(false)
				return
			}

			const blob = await res.blob()
			const reader = new FileReader()
			reader.onload = () => {
				setCropSrc(reader.result)
				setUrlLoading(false)
				setMode(null)
			}
			reader.readAsDataURL(blob)
		} catch {
			setUrlError("Não foi possível carregar a imagem desta URL.")
			setUrlLoading(false)
		}
	}

	function handleCropComplete({ blob, url }) {
		setPreview(url)
		setPendingBlob(blob)
		setCropSrc(null)
	}

	function handleSave() {
		if (!pendingBlob) return

		const reader = new FileReader()
		reader.onload = () => onSave(reader.result)
		reader.readAsDataURL(pendingBlob)
	}

	function handleRemove() {
		setPreview(null)
		setPendingBlob(null)
		setMode(null)

		if (currentAvatar) {
			onSave(null)
		} else {
			notify("Alteração descartada.", "info")
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-col items-center gap-4">
				<div className="relative group">
					{preview ? (
						<img
							src={preview}
							alt="Avatar"
							className="w-24 h-24 rounded-full border-2 border-zinc-700 select-none object-cover"
							draggable={false}
						/>
					) : (
						<div className="w-24 h-24 rounded-full border-2 border-zinc-700 bg-zinc-800/50 flex items-center justify-center">
							<svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
							</svg>
						</div>
					)}

					<button
						onClick={() => setMode("choose")}
						className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 cursor-pointer"
					>
						<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
						</svg>
					</button>
				</div>

				{preview && !mode && (
					<div className="flex items-center gap-2">
						<button
							onClick={() => setMode("choose")}
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors cursor-pointer"
						>
							<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
							</svg>
							Alterar
						</button>
						{canRemove && (
							<button
								onClick={handleRemove}
								className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-zinc-700 hover:border-red-500/30 rounded-lg transition-colors cursor-pointer"
							>
								<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
								</svg>
								Remover
							</button>
						)}
					</div>
				)}

				{!preview && !mode && (
					<button
						onClick={() => setMode("choose")}
						className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
					>
						Clique para adicionar um avatar
					</button>
				)}
			</div>

			{mode === "choose" && (
				<div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 sm:p-4 space-y-3">
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
						<button
							onClick={() => fileRef.current?.click()}
							className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer"
						>
							<svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
							</svg>
							<span className="text-sm text-zinc-300">Enviar arquivo</span>
						</button>
						<button
							onClick={() => setMode("url")}
							className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer"
						>
							<svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
							</svg>
							<span className="text-sm text-zinc-300">Colar URL</span>
						</button>
					</div>

					<button
						onClick={() => setMode(null)}
						className="w-full text-xs text-zinc-500 hover:text-zinc-400 transition-colors cursor-pointer py-1.5"
					>
						Cancelar
					</button>

					<input
						ref={fileRef}
						type="file"
						accept="image/*"
						onChange={handleFileSelect}
						className="hidden"
					/>
				</div>
			)}

			{mode === "url" && (
				<div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 sm:p-4 space-y-3">
					<div className="flex flex-col sm:flex-row gap-2">
						<input
							type="text"
							value={urlInput}
							onChange={(e) => { setUrlInput(e.target.value); setUrlError("") }}
							placeholder="https://exemplo.com/imagem.jpg"
							className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
							autoFocus
							onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit() }}
						/>
						<button
							onClick={handleUrlSubmit}
							disabled={!urlInput.trim() || urlLoading}
							className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:w-auto w-full"
						>
							{urlLoading ? (
								<div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />
							) : (
								"Carregar"
							)}
						</button>
					</div>

					{urlError && (
						<p className="text-xs text-red-400 flex items-center gap-1.5">
							<svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							{urlError}
						</p>
					)}

					<button
						onClick={() => { setMode("choose"); setUrlInput(""); setUrlError("") }}
						className="w-full text-xs text-zinc-500 hover:text-zinc-400 transition-colors cursor-pointer py-1.5"
					>
						Voltar
					</button>
				</div>
			)}

			{hasChanges && (
				<div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 pt-2">
					<button
						onClick={() => { setPreview(currentAvatar); setPendingBlob(null) }}
						className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
					>
						Descartar
					</button>
					<button
						onClick={handleSave}
						disabled={saving}
						className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{saving ? (
							<div className="w-4 h-4 border-2 border-emerald-300 border-t-white rounded-full animate-spin" />
						) : (
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						)}
						Salvar alterações
					</button>
				</div>
			)}

			{cropSrc && (
				<ImageCropModal
					imageSrc={cropSrc}
					aspect={AVATAR_ASPECT}
					title="Recortar avatar"
					circularCrop
					onCrop={handleCropComplete}
					onClose={() => setCropSrc(null)}
				/>
			)}
		</div>
	)
}