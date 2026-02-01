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
  original: string
  desktop: string
  mobile: string
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
  const [viewMode, setViewMode] = useState<ViewMode>('full')
  const [optimized, setOptimized] = useState<OptimizedImages | null>(null)
  const [previewUrls, setPreviewUrls] = useState<PreviewUrls | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>(
    'idle'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    return () => {
      if (previewUrls) {
        URL.revokeObjectURL(previewUrls.original)
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

      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      setStatus('processing')
      setErrorMessage(null)

      const originalUrl = URL.createObjectURL(file)

      try {
        const processed = await processImage(file)

        if (requestIdRef.current !== requestId) {
          URL.revokeObjectURL(originalUrl)
          return
        }

        const desktopUrl = URL.createObjectURL(processed.desktop.blob)
        const mobileUrl = URL.createObjectURL(processed.mobile.blob)

        setOptimized(processed)
        setPreviewUrls({ original: originalUrl, desktop: desktopUrl, mobile: mobileUrl })
        setStatus('ready')
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          URL.revokeObjectURL(originalUrl)
          return
        }
        const message =
          error instanceof Error ? error.message : 'Unable to process the selected image.'
        setErrorMessage(message)
        setStatus('error')
        URL.revokeObjectURL(originalUrl)
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
              accept="image/*"
              onChange={handleFileChange}
            />
          </label>
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
      </aside>
    </div>
  )
}

export default App
