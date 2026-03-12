import { useState, useEffect, useRef, useCallback } from "react"
import {
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  RefreshCw,
  Info,
  Link2Off,
} from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"
import { notify } from "@components/UI/Notification"
import { supabase } from "#lib/supabase"
import { useDateTime } from "#hooks/useDateTime"
import { PlayStationIcon } from "#constants/customIcons"

const API_BASE = "/api/psnImport/@me"

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw { status: 401, error: "unauthorized" }
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`,
  }
}

async function apiCall(action, body = {}) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/${action}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw { status: res.status, ...data }
  return data
}

function StatusBadge({ status }) {
  const { t } = useTranslation()

  const config = {
    fetching: { icon: Loader2, text: t("settings.psnImport.status.fetching"), color: "text-blue-400 bg-blue-500/10 border-blue-500/20", spin: true },
    running: { icon: Loader2, text: t("settings.psnImport.status.running"), color: "text-blue-400 bg-blue-500/10 border-blue-500/20", spin: true },
    completed: { icon: CheckCircle2, text: t("settings.psnImport.status.completed"), color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    failed: { icon: XCircle, text: t("settings.psnImport.status.failed"), color: "text-red-400 bg-red-500/10 border-red-500/20" },
    cancelled: { icon: AlertTriangle, text: t("settings.psnImport.status.cancelled"), color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  }

  const c = config[status] || config.failed
  const Icon = c.icon

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${c.color}`}>
      <Icon className={`w-3 h-3 ${c.spin ? "animate-spin" : ""}`} />
      {c.text}
    </span>
  )
}

function ProgressBar({ progress }) {
  return (
    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-[#003791] to-[#0070cc] rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  )
}

function ImportResult({ job }) {
  const { t } = useTranslation()
  const { getTimeAgoFromTimestamp } = useDateTime()

  if (!job || job.status === "running" || job.status === "fetching") return null

  const timeAgo = getTimeAgoFromTimestamp(job.finished_at)

  return (
    <div className="mt-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={job.status} />
          <span className="text-xs text-zinc-500">{job.source_username}</span>
        </div>
        {timeAgo && <span className="text-[10px] text-zinc-600">{timeAgo}</span>}
      </div>

      {(job.status === "completed" || job.status === "cancelled") && (
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          {job.imported > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {t("settings.psnImport.imported", { count: job.imported })}
            </span>
          )}
          {job.skipped > 0 && (
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              {t("settings.psnImport.skipped", { count: job.skipped })}
            </span>
          )}
          {job.failed > 0 && (
            <span className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-red-400" />
              {t("settings.psnImport.failed", { count: job.failed })}
            </span>
          )}
        </div>
      )}

      {job.status === "failed" && job.error && (
        <p className="text-xs text-red-400/80">{job.error}</p>
      )}
    </div>
  )
}

export default function PSNImportSection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [job, setJob] = useState(null)
  const [fetchingStatus, setFetchingStatus] = useState(true)
  const [connection, setConnection] = useState(null)
  const processRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (processRef.current) clearTimeout(processRef.current)
    }
  }, [])

  useEffect(() => {
    if (user?.id) checkConnection()
  }, [user?.id])

  async function checkConnection() {
    try {
      const res = await fetch("/api/psn/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (data.connected) {
        setConnection(data)
      }
    } catch {}
  }

  const processLoop = useCallback(async (jobId) => {
    if (!mountedRef.current) return

    try {
      const data = await apiCall("process", { job_id: jobId })
      if (!mountedRef.current) return

      setJob(data)

      if (data.status === "running") {
        processRef.current = setTimeout(() => processLoop(jobId), 300)
      } else {
        setIsRunning(false)
        setLoading(false)
        if (data.status === "completed") {
          notify(t("settings.psnImport.completed", { count: data.imported }))
        }
      }
    } catch {
      if (!mountedRef.current) return
      setIsRunning(false)
      setLoading(false)
    }
  }, [t])

  const pollFetching = useCallback(async (jobId) => {
    if (!mountedRef.current) return

    try {
      const { job: statusJob } = await apiCall("status")
      if (!mountedRef.current) return

      if (!statusJob) return

      setJob(statusJob)

      if (statusJob.status === "fetching") {
        processRef.current = setTimeout(() => pollFetching(jobId), 2000)
      } else if (statusJob.status === "running") {
        processLoop(jobId)
      } else {
        setIsRunning(false)
        setLoading(false)
      }
    } catch {
      if (!mountedRef.current) return
      setIsRunning(false)
      setLoading(false)
    }
  }, [processLoop])

  useEffect(() => {
    async function checkStatus() {
      try {
        const { job: existingJob } = await apiCall("status")
        if (!mountedRef.current) return

        if (existingJob) {
          setJob(existingJob)
          if (existingJob.status === "fetching") {
            setIsRunning(true)
            pollFetching(existingJob.id)
          } else if (existingJob.status === "running") {
            setIsRunning(true)
            processLoop(existingJob.id)
          }
        }
      } catch {
      } finally {
        if (mountedRef.current) setFetchingStatus(false)
      }
    }

    checkStatus()
  }, [processLoop, pollFetching])

	async function handleImport() {
	  if (loading || isRunning || !connection) return
	
	  setLoading(true)
	  setJob(null)
	
	  try {
	    const data = await apiCall("start", {})
	
	    setJob({
        id: data.job_id,
	      status: data.status,
	      source_username: connection.onlineId,
	      total: data.total || 0,
	      progress: 0,
	      imported: 0,
	      skipped: 0,
	      failed: 0,
	    })
	
	    if (data.status === "fetching") {
	      setIsRunning(true)
	      pollFetching(data.job_id)
	    } else if (data.status === "running") {
	      setIsRunning(true)
	      processLoop(data.job_id)
	    } else if (data.status === "completed") {
	      setLoading(false)
	      notify(t("settings.psnImport.noGames"))
	    } else {
	      setLoading(false)
	    }
	  } catch (e) {
	    setLoading(false)
	    if (e.status === 401) {
	      notify(t("settings.psnImport.notConnected"), "error")
	    } else if (e.status === 409) {
	      notify(t("settings.psnImport.alreadyRunning"), "error")
	    } else {
	      notify(t("settings.psnImport.startError"), "error")
	    }
	  }
	}

  async function handleCancel() {
    if (!job?.id) return

    try {
      await apiCall("cancel", { job_id: job.id })
      if (processRef.current) clearTimeout(processRef.current)
      setIsRunning(false)
      setLoading(false)
      setJob((prev) => prev ? { ...prev, status: "cancelled", finished_at: new Date().toISOString() } : prev)
      notify(t("settings.psnImport.cancelled"))
    } catch {
      notify(t("settings.psnImport.cancelError"), "error")
    }
  }

  function handleRetry() {
    setJob(null)
  }

  if (!connection) {
    return (
      <SettingsSection title={t("settings.psnImport.title")}>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <Link2Off className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-zinc-400">
            <p>{t("settings.psnImport.connectFirst")}</p>
          </div>
        </div>
      </SettingsSection>
    )
  }

  return (
    <SettingsSection title={t("settings.psnImport.title")}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-zinc-400 space-y-1">
            <p>{t("settings.psnImport.description")}</p>
            <p className="text-xs text-zinc-500">{t("settings.psnImport.subtext")}</p>
          </div>
        </div>

        {!fetchingStatus && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <PlayStationIcon className="w-5 h-5 text-[#0070cc] flex-shrink-0" />
              <span className="text-sm text-white font-medium truncate">{connection.onlineId}</span>
              {connection.isPlus && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Plus</span>
              )}
            </div>
            <button
              onClick={handleImport}
              disabled={isRunning || loading}
              className="px-4 py-2 rounded-lg bg-[#003791] hover:bg-[#0050d4] disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
            >
              {loading && !isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{t("settings.psnImport.importButton")}</span>
            </button>
          </div>
        )}

        {isRunning && job && (
          <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-sm text-zinc-300">
                  {job.status === "fetching"
                    ? t("settings.psnImport.fetching")
                    : t("settings.psnImport.importing")
                  }
                </span>
              </div>
              <button
                onClick={handleCancel}
                className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                title={t("settings.psnImport.cancel")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {job.status === "running" && (
              <>
                <ProgressBar progress={job.total > 0 ? (job.progress / job.total) * 100 : 0} />
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    {t("settings.psnImport.imported", { count: job.imported || 0 })}
                    {job.skipped > 0 && ` · ${t("settings.psnImport.skipped", { count: job.skipped })}`}
                  </span>
                  {job.total > 0 && (
                    <span>{job.progress || 0}/{job.total}</span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {!isRunning && job && <ImportResult job={job} />}

        {!isRunning && job && (job.status === "failed" || job.status === "cancelled") && (
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-blue-400 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            {t("settings.psnImport.retry")}
          </button>
        )}

        {fetchingStatus && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        )}
      </div>
    </SettingsSection>
  )
}
