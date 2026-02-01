import './App.css'
import ControlPanel from './components/ControlPanel'
import Viewport from './components/Viewport'
import { useImageOptimizer } from './hooks/useImageOptimizer'

function App() {
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

  return (
    <div className="app">
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
    </div>
  )
}

export default App
