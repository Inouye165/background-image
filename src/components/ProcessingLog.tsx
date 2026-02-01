import { memo } from 'react'
import type { ProcessingLogEntry } from '../hooks/useImageOptimizer'
import { formatBytes } from '../utils/format'

interface ProcessingLogProps {
  entries: ProcessingLogEntry[]
  onClear: () => void
}

const ProcessingLog = ({ entries, onClear }: ProcessingLogProps) => (
  <div className="panel__section panel__section--logs">
    <div className="panel__row">
      <p className="panel__label">Processing log</p>
      <button
        type="button"
        className="toggle"
        onClick={onClear}
        disabled={entries.length === 0}
      >
        Clear
      </button>
    </div>
    {entries.length === 0 ? (
      <p className="panel__hint">No entries yet.</p>
    ) : (
      <ul className="log-list">
        {entries.map((entry) => (
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
)

export default memo(ProcessingLog)