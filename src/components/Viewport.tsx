import { memo } from 'react'
import type { ViewMode } from '../hooks/useImageOptimizer'

interface ViewportProps {
  viewMode: ViewMode
  activeBackgroundUrl: string | null
}

const Viewport = ({ viewMode, activeBackgroundUrl }: ViewportProps) => (
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
)

export default memo(Viewport)