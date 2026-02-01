import { memo } from 'react'
import type { OptimizedImages, OptimizedVariant } from '../utils/imageProcessor'
import { formatBytes } from '../utils/format'

interface StatsDisplayProps {
  status: 'idle' | 'processing' | 'ready' | 'error'
  errorMessage: string | null
  optimized: OptimizedImages | null
}

const renderVariantSize = (variant: OptimizedVariant): string =>
  formatBytes(variant.size)

const StatsDisplay = ({ status, errorMessage, optimized }: StatsDisplayProps) => (
  <div className="panel__section panel__section--stats">
    <p className="panel__label">Optimization summary</p>
    {status === 'processing' && <p className="status">Processing…</p>}
    {status === 'error' && errorMessage && (
      <p className="status status--error">{errorMessage}</p>
    )}
    {optimized && (
      <ul className="stats">
        <li>
          <span>Original</span>
          <span>{formatBytes(optimized.original.size)}</span>
        </li>
        <li>
          <span>Desktop WebP</span>
          <span>{renderVariantSize(optimized.desktop)}</span>
        </li>
        <li>
          <span>Mobile WebP</span>
          <span>{renderVariantSize(optimized.mobile)}</span>
        </li>
        <li>
          <span>Processing time</span>
          <span>{optimized.durationMs.toFixed(1)} ms</span>
        </li>
      </ul>
    )}
  </div>
)

export default memo(StatsDisplay)