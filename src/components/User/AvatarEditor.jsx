import { useState, useEffect, useRef } from "react"
import { UserRound, Camera, Pencil, Trash2, Upload, Globe, AlertCircle, Check } from "lucide-react"
import { notify } from "../UI/Notification"
import ImageCropModal from "../UI/ImageCropModal"

const AVATAR_ASPECT = 1
const MAX_FILE_SIZE = 10 * 1024 * 1024

export default function AvatarEditor({ currentAvatar, onSave, saving = false }) {
	const [mode, setMode] = useState(null)
	const [urlInput, setUrlInput] = useState("")
	const [urlError, setUrlError] = useState("")
	const [urlLoading, setUrlLoading] = useState(false)
	const [cropSrc, setCropSrc] = useState(null)
	const [preview, setPreview] = useState(currentAvatar || null)
	const [pendingBlob, setPendingBlob] = useState(null)
	const fileRef = useRef(null)
	const previewUrlRef = useRef(null)

	const canRemove = currentAvatar || pendingBlob
	const hasChanges = pendingBlob !== null || (preview === null && currentAvatar !== null)

	useEffect(() => {
		return () => {
			if (previewUrlRef.current) {
				URL.revokeObjectURL(previewUrlRef.current)
			}
		}
	}, [])

	useEffect(() => {
		if (previewUrlRef.current) {
			URL.revokeObjectURL(previewUrlRef.current)
			previewUrlRef.current = null
		}
		setPreview(currentAvatar)
		setPendingBlob(null)
		setMode(null)
	}, [currentAvatar])

	function handleFileSelect(e) {
		const file = e.target.files?.[0]
		if (!file) return

		if (!file.type.startsWith("image/")) {
			notify("Selecione um arquivo de imagem válido.", "error")
			return
		}

		if (file.size > MAX_FILE_SIZE) {
			notify("A imagem deve ter no máximo 10MB.", "error")
			return
		}

		const reader = new FileReader()
		reader.onload = () => setCropSrc(reader.result)
		reader.onerror = () => notify("Erro ao ler o arquivo.", "error")
		reader.readAsDataURL(file)
		e.target.value = ""
	}

	async function handleUrlSubmit() {
		if (!urlInput.trim()) return

		setUrlError("")
		setUrlLoading(true)

		try {
			const res = await fetch(urlInput.trim(), { mode: "cors" })
			if (!res.ok) throw new Error()

			const contentType = res.headers.get("content-type")
			if (!contentType?.startsWith("image/")) {
				setUrlError("A URL não aponta para uma imagem válida.")
				setUrlLoading(false)
				return
			}

			const blob = await res.blob()

			if (blob.size > MAX_FILE_SIZE) {
				setUrlError("A imagem é muito grande (máximo 10MB).")
				setUrlLoading(false)
				return
			}

			const reader = new FileReader()
			reader.onload = () => {
				setCropSrc(reader.result)
				setUrlLoading(false)
				setMode(null)
			}
			reader.onerror = () => {
				setUrlError("Erro ao processar a imagem.")
				setUrlLoading(false)
			}
			reader.readAsDataURL(blob)
		} catch {
			setUrlError("Não foi possível carregar a imagem desta URL.")
			setUrlLoading(false)
		}
	}

	function handleCropComplete({ blob, url }) {
		if (previewUrlRef.current) {
			URL.revokeObjectURL(previewUrlRef.current)
		}
		previewUrlRef.current = url

		setPreview(url)
		setPendingBlob(blob)
		setCropSrc(null)
		setMode(null)
	}

	function handleSave() {
		if (!pendingBlob) return

		if (pendingBlob.size > 5 * 1024 * 1024) {
			notify("A imagem processada é muito grande. Tente uma imagem menor.", "error")
			return
		}

		const reader = new FileReader()
		reader.onload = () => onSave(reader.result)
		reader.onerror = () => notify("Erro ao processar a imagem.", "error")
		reader.readAsDataURL(pendingBlob)
	}

	function handleRemove() {
		if (previewUrlRef.current) {
			URL.revokeObjectURL(previewUrlRef.current)
			previewUrlRef.current = null
		}

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
							<UserRound className="w-8 h-8 text-zinc-500" strokeWidth={1.5} />
						</div>
					)}

					<button
						type="button"
						onClick={() => setMode("choose")}
						className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 cursor-pointer"
					>
						<Camera className="w-5 h-5 text-white" strokeWidth={1.5} />
					</button>
				</div>

				{preview && !mode && (
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setMode("choose")}
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors cursor-pointer"
						>
							<Pencil className="w-3.5 h-3.5" />
							Alterar
						</button>
						{canRemove && (
							<button
								type="button"
								onClick={handleRemove}
								className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-zinc-700 hover:border-red-500/30 rounded-lg transition-colors cursor-pointer"
							>
								<Trash2 className="w-3.5 h-3.5" />
								Remover
							</button>
						)}
					</div>
				)}

				{!preview && !mode && (
					<button
						type="button"
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
							type="button"
							onClick={() => fileRef.current?.click()}
							className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer"
						>
							<Upload className="w-5 h-5 text-zinc-400" />
							<span className="text-sm text-zinc-300">Enviar arquivo</span>
						</button>
						<button
							type="button"
							onClick={() => setMode("url")}
							className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer"
						>
							<Globe className="w-5 h-5 text-zinc-400" />
							<span className="text-sm text-zinc-300">Colar URL</span>
						</button>
					</div>

					<button
						type="button"
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
							type="button"
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
							<AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
							{urlError}
						</p>
					)}

					<button
						type="button"
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
						type="button"
						onClick={() => {
							if (previewUrlRef.current) {
								URL.revokeObjectURL(previewUrlRef.current)
								previewUrlRef.current = null
							}
							setPreview(currentAvatar)
							setPendingBlob(null)
						}}
						className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
					>
						Descartar
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={saving}
						className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{saving ? (
							<div className="w-4 h-4 border-2 border-emerald-300 border-t-white rounded-full animate-spin" />
						) : (
							<Check className="w-4 h-4" />
						)}
						Salvar alterações
					</button>
				</div>
			)}

			<ImageCropModal
				isOpen={!!cropSrc}
				imageSrc={cropSrc || ""}
				aspect={AVATAR_ASPECT}
				title="Recortar avatar"
				circularCrop
				onCrop={handleCropComplete}
				onClose={() => setCropSrc(null)}
			/>
		</div>
	)
}
