export const isHeicFile = (file: File): boolean => {
  const lowerName = file.name.toLowerCase()
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    lowerName.endsWith('.heic') ||
    lowerName.endsWith('.heif')
  )
}

export const isSupportedImageFile = (file: File): boolean =>
  file.type.startsWith('image/') || isHeicFile(file)