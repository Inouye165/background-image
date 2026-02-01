import { memo, useRef } from 'react'
import type { ChangeEvent } from 'react'
import type { OptimizedImages } from '../utils/imageProcessor'
import type { ProcessingLogEntry, ViewMode } from '../hooks/useImageOptimizer'
import StatsDisplay from './StatsDisplay'
import ProcessingLog from './ProcessingLog'

interface ControlPanelProps {
  viewMode: ViewMode
  onChangeViewMode: (mode: ViewMode) => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  status: 'idle' | 'processing' | 'ready' | 'error'
  errorMessage: string | null
  optimized: OptimizedImages | null
  logs: ProcessingLogEntry[]
  onClearLogs: () => void
  defaultImageName: string
}

const VIEW_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: 'full', label: 'Full Screen' },
  { value: 'quarter', label: 'Quarter Screen' },
  { value: 'mobile', label: 'Mobile Frame' },
]

const ControlPanel = ({
  viewMode,
  onChangeViewMode,
  onFileChange,
  status,
  errorMessage,
  optimized,
  logs,
  onClearLogs,
  defaultImageName,
}: ControlPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  return (
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
            onChange={onFileChange}
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
              onClick={() => onChangeViewMode(option.value)}
              role="radio"
              aria-checked={option.value === viewMode}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <StatsDisplay status={status} errorMessage={errorMessage} optimized={optimized} />

      <ProcessingLog entries={logs} onClear={onClearLogs} />
    </aside>
  )
}

export default memo(ControlPanel)