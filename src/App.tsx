import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import './App.css'
import { processImage, type OptimizedImages } from './utils/imageProcessor'

type ViewMode = 'full' | 'quarter' | 'mobile'

interface PreviewUrls {
  desktop: string
  mobile: string
}

interface ProcessingLogEntry {
  id: string
  fileName: string
  fileSize: number
  durationMs: number
  desktopSize: number
  mobileSize: number
  timestamp: number
}

const VIEW_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: 'full', label: 'Full Screen' },
  { value: 'quarter', label: 'Quarter Screen' },
  { value: 'mobile', label: 'Mobile Frame' },
]

const formatBytes = (value: number): string => {
  if (value < 1024) {
    return `${value} B`
  }
  const kb = value / 1024
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`
  }
  return `${(kb / 1024).toFixed(2)} MB`
}

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('full')
  const [optimized, setOptimized] = useState<OptimizedImages | null>(null)
  const [previewUrls, setPreviewUrls] = useState<PreviewUrls | null>(null)
  const [logs, setLogs] = useState<ProcessingLogEntry[]>(() => {
    try {
      const stored = localStorage.getItem('background-optimizer:logs')
      if (stored) {
        return JSON.parse(stored) as ProcessingLogEntry[]
      }
    } catch {
      return []
    }
    return []
  })
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>(
    'idle'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const defaultImageName = 'IMG_0701.HEIC'
  const logStorageKey = 'background-optimizer:logs'

  useEffect(() => {
    try {
      localStorage.setItem(logStorageKey, JSON.stringify(logs))
    } catch {
      // Storage might be unavailable (private mode / blocked), keep in-memory logs.
    }
  }, [logs])

  useEffect(() => {
    return () => {
      if (previewUrls) {
        URL.revokeObjectURL(previewUrls.desktop)
        URL.revokeObjectURL(previewUrls.mobile)
      }
    }
  }, [previewUrls])

  const activeBackgroundUrl = useMemo(() => {
    if (!previewUrls) {
      return null
    }
    if (viewMode === 'mobile') {
      return previewUrls.mobile
    }
    return previewUrls.desktop
  }, [previewUrls, viewMode])

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      const lowerName = file.name.toLowerCase()
      const isHeic =
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        lowerName.endsWith('.heic') ||
        lowerName.endsWith('.heif')

      if (!file.type.startsWith('image/') && !isHeic) {
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
          id: crypto.randomUUID(),
          fileName: file.name,
          fileSize: file.size,
          durationMs: processed.durationMs,
          desktopSize: processed.desktop.size,
          mobileSize: processed.mobile.size,
          timestamp: Date.now(),
        }

        setLogs((current) => [entry, ...current].slice(0, 20))

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
    []
  )

  return (
    <div className="app">
      <main className="preview">
        <div className={`viewport viewport--${viewMode}`}>
          <div
            className="viewport__image"
            style={
              activeBackgroundUrl
                ? { backgroundImage: `url(${activeBackgroundUrl})` }
                : undefined
            }
          />
          {!activeBackgroundUrl && (
            <div className="viewport__placeholder">
              <p>Upload a background image to preview optimizations.</p>
            </div>
          )}
        </div>
      </main>

      <aside className="panel" aria-live="polite">
        <header className="panel__header">
          <p className="panel__eyebrow">Background Optimizer</p>
          <h1>Client-side WebP conversions</h1>
          <p className="panel__subtitle">
            Generate desktop and mobile backgrounds with safe bandwidth usage.
          </p>
        </header>

        <div className="panel__section">
          <label className="file-input" htmlFor="background-file">
            <span>Choose image</span>
            <input
              id="background-file"
              type="file"
              accept="image/*,.heic,.heif"
              onChange={handleFileChange}
              ref={fileInputRef}
            />
          </label>
          <button
            type="button"
            className="toggle"
            onClick={() => fileInputRef.current?.click()}
            autoFocus
          >
            Use default: {defaultImageName}
          </button>
          <p className="panel__hint">
            Recommended: high-resolution JPG or PNG for best WebP compression.
          </p>
        </div>

        <div className="panel__section">
          <p className="panel__label">Preview mode</p>
          <div className="toggle-group" role="radiogroup">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  option.value === viewMode ? 'toggle toggle--active' : 'toggle'
                }
                onClick={() => setViewMode(option.value)}
                role="radio"
                aria-checked={option.value === viewMode}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel__section panel__section--stats">
          <p className="panel__label">Optimization summary</p>
          {status === 'processing' && <p className="status">Processing…</p>}
          {status === 'error' && errorMessage && (
            <p className="status status--error">{errorMessage}</p>
          )}
          {optimized && previewUrls && (
            <ul className="stats">
              <li>
                <span>Original</span>
                <span>{formatBytes(optimized.original.size)}</span>
              </li>
              <li>
                <span>Desktop WebP</span>
                <span>{formatBytes(optimized.desktop.size)}</span>
              </li>
              <li>
                <span>Mobile WebP</span>
                <span>{formatBytes(optimized.mobile.size)}</span>
              </li>
              <li>
                <span>Processing time</span>
                <span>{optimized.durationMs.toFixed(1)} ms</span>
              </li>
            </ul>
          )}
        </div>

        <div className="panel__section panel__section--logs">
          <div className="panel__row">
            <p className="panel__label">Processing log</p>
            <button
              type="button"
              className="toggle"
              onClick={() => setLogs([])}
              disabled={logs.length === 0}
            >
              Clear
            </button>
          </div>
          {logs.length === 0 ? (
            <p className="panel__hint">No entries yet.</p>
          ) : (
            <ul className="log-list">
              {logs.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <p className="log-title">{entry.fileName}</p>
                    <p className="log-meta">
                      {new Date(entry.timestamp).toLocaleTimeString()} •{' '}
                      {formatBytes(entry.fileSize)}
                    </p>
                  </div>
                  <div className="log-metrics">
                    <span>{entry.durationMs.toFixed(1)} ms</span>
                    <span>{formatBytes(entry.desktopSize)}</span>
                    <span>{formatBytes(entry.mobileSize)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}

export default App
