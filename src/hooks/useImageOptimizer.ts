import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { processImage, type OptimizedImages } from '../utils/imageProcessor'
import { isSupportedImageFile } from '../utils/fileTypes'

export type ViewMode = 'full' | 'quarter' | 'mobile'

export interface PreviewUrls {
  desktop: string
  mobile: string
}

export interface ProcessingLogEntry {
  id: string
  fileName: string
  fileSize: number
  durationMs: number
  desktopSize: number
  mobileSize: number
  timestamp: number
}

export type OptimizerStatus = 'idle' | 'processing' | 'ready' | 'error'

interface UseImageOptimizerState {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  optimized: OptimizedImages | null
  previewUrls: PreviewUrls | null
  activeBackgroundUrl: string | null
  status: OptimizerStatus
  errorMessage: string | null
  logs: ProcessingLogEntry[]
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  handleFileSelection: (file: File) => Promise<void>
  clearLogs: () => void
  defaultImageName: string
}

const logStorageKey = 'background-optimizer:logs'
const maxLogEntries = 20

const parseStoredLogs = (value: string | null): ProcessingLogEntry[] => {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (entry): entry is ProcessingLogEntry =>
          typeof entry === 'object' &&
          entry !== null &&
          'fileName' in entry &&
          'durationMs' in entry &&
          'timestamp' in entry
      )
    }
  } catch {
    return []
  }

  return []
}

const createLogId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}

export const useImageOptimizer = (): UseImageOptimizerState => {
  const [viewMode, setViewMode] = useState<ViewMode>('full')
  const [optimized, setOptimized] = useState<OptimizedImages | null>(null)
  const [previewUrls, setPreviewUrls] = useState<PreviewUrls | null>(null)
  const [status, setStatus] = useState<OptimizerStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [logs, setLogs] = useState<ProcessingLogEntry[]>(() =>
    parseStoredLogs(localStorage.getItem(logStorageKey))
  )
  const requestIdRef = useRef(0)
  const defaultImageName = 'IMG_0701.HEIC'

  useEffect(() => {
    return () => {
      if (previewUrls) {
        URL.revokeObjectURL(previewUrls.desktop)
        URL.revokeObjectURL(previewUrls.mobile)
      }
    }
  }, [previewUrls])

  useEffect(() => {
    try {
      localStorage.setItem(logStorageKey, JSON.stringify(logs))
    } catch {
      // Local storage can be unavailable in restricted browser contexts.
    }
  }, [logs])

  const activeBackgroundUrl = useMemo(() => {
    if (!previewUrls) {
      return null
    }
    return viewMode === 'mobile' ? previewUrls.mobile : previewUrls.desktop
  }, [previewUrls, viewMode])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const handleFileSelection = useCallback(
    async (file: File) => {
      if (!isSupportedImageFile(file)) {
        setErrorMessage('Unsupported file type. Please choose an image file.')
        setStatus('error')
        return
      }

      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      setStatus('processing')
      setErrorMessage(null)

      try {
        const processed = await processImage(file)

        if (requestIdRef.current !== requestId) {
          return
        }

        const desktopUrl = URL.createObjectURL(processed.desktop.blob)
        const mobileUrl = URL.createObjectURL(processed.mobile.blob)

        setOptimized(processed)
        setPreviewUrls({ desktop: desktopUrl, mobile: mobileUrl })
        setStatus('ready')

        const entry: ProcessingLogEntry = {
          id: createLogId(),
          fileName: file.name,
          fileSize: file.size,
          durationMs: processed.durationMs,
          desktopSize: processed.desktop.size,
          mobileSize: processed.mobile.size,
          timestamp: Date.now(),
        }

        setLogs((current) => [entry, ...current].slice(0, maxLogEntries))

        if (file.name.toLowerCase() === defaultImageName.toLowerCase()) {
          console.debug('imageProcessor: default file duration ms', processed.durationMs)
        }
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return
        }
        const message =
          error instanceof Error ? error.message : 'Unable to process the selected image.'
        setErrorMessage(message)
        setStatus('error')
      }
    },
    [defaultImageName]
  )

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }
      await handleFileSelection(file)
    },
    [handleFileSelection]
  )

  return {
    viewMode,
    setViewMode,
    optimized,
    previewUrls,
    activeBackgroundUrl,
    status,
    errorMessage,
    logs,
    handleFileChange,
    handleFileSelection,
    clearLogs,
    defaultImageName,
  }
}