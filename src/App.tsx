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

  import ControlPanel from './components/ControlPanel'
  import Viewport from './components/Viewport'
  import { useImageOptimizer } from './hooks/useImageOptimizer'
      if (stored) {
        return JSON.parse(stored) as ProcessingLogEntry[]
    const {
      viewMode,
      setViewMode,
      optimized,
      activeBackgroundUrl,
      status,
      errorMessage,
      logs,
      handleFileChange,
      clearLogs,
      defaultImageName,
    } = useImageOptimizer()
                ? { backgroundImage: `url(${activeBackgroundUrl})` }
                : undefined
            }
        <Viewport viewMode={viewMode} activeBackgroundUrl={activeBackgroundUrl} />
        <ControlPanel
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          onFileChange={handleFileChange}
          status={status}
          errorMessage={errorMessage}
          optimized={optimized}
          logs={logs}
          onClearLogs={clearLogs}
          defaultImageName={defaultImageName}
        />
      if (stored) {
