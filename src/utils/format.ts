export const formatBytes = (value: number): string => {
  if (value < 1024) {
    return `${value} B`
  }
  const kb = value / 1024
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`
  }
  return `${(kb / 1024).toFixed(2)} MB`
}