interface CanvasContext {
  drawImage: (
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number
  ) => void
  imageSmoothingEnabled?: boolean
  imageSmoothingQuality?: 'low' | 'medium' | 'high'
}

interface CanvasSurface {
  width: number
  height: number
  getContext: (type: '2d') => CanvasContext | null
  toBlob: (callback: (blob: Blob | null) => void, type: string, quality?: number) => void
}

export interface ImageProcessorDeps {
  createCanvas: () => CanvasSurface
  loadImage: (file: File) => Promise<LoadedImage>
}

export interface ImageVariantOptions {
  width: number
  quality: number
}

export interface ImageProcessingOptions {
  desktop: ImageVariantOptions
  mobile: ImageVariantOptions
}

export interface OptimizedVariant {
  blob: Blob
  width: number
  height: number
  size: number
  quality: number
}

export interface OptimizedImages {
  desktop: OptimizedVariant
  mobile: OptimizedVariant
  original: {
    width: number
    height: number
    size: number
    name: string
    type: string
  }
  durationMs: number
}

interface LoadedImage {
  source: CanvasImageSource
  width: number
  height: number
}

type HeicConverter = (options: {
  blob: Blob
  toType: string
  quality?: number
}) => Promise<Blob | Blob[]>

let heicConverterPromise: Promise<HeicConverter> | null = null

const DEFAULT_OPTIONS: ImageProcessingOptions = {
  desktop: { width: 1920, quality: 0.8 },
  mobile: { width: 720, quality: 0.7 },
}

const isHeicFile = (file: File): boolean => {
  const lowerName = file.name.toLowerCase()
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    lowerName.endsWith('.heic') ||
    lowerName.endsWith('.heif')
  )
}

const getImageFromBlob = async (blob: Blob): Promise<LoadedImage> => {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob)
      return { source: bitmap, width: bitmap.width, height: bitmap.height }
    } catch (error) {
      console.debug('imageProcessor: createImageBitmap failed', error)
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob)
    const image = new Image()
    let settled = false

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
    }

    const resolveImage = () => {
      if (settled) {
        return
      }
      settled = true
      cleanup()
      const width = image.naturalWidth > 0 ? image.naturalWidth : image.width
      const height = image.naturalHeight > 0 ? image.naturalHeight : image.height
      resolve({ source: image, width, height })
    }

    const rejectImage = () => {
      if (settled) {
        return
      }
      settled = true
      cleanup()
      reject(new Error('Unable to load image for processing.'))
    }

    image.onload = resolveImage
    image.onerror = rejectImage
    image.src = objectUrl

    if ('decode' in image) {
      image
        .decode()
        .then(resolveImage)
        .catch(rejectImage)
    }
  })
}

const loadHeicConverter = async (): Promise<HeicConverter> => {
  if (!heicConverterPromise) {
    heicConverterPromise = import('heic2any').then((module) => module.default)
  }
  return heicConverterPromise
}

const convertHeicToBlob = async (file: File): Promise<Blob> => {
  const startTime = performance.now()
  const converter = await loadHeicConverter()
  const result = await converter({ blob: file, toType: 'image/jpeg', quality: 0.92 })
  const durationMs = performance.now() - startTime
  console.debug('imageProcessor: heic conversion ms', durationMs)
  if (Array.isArray(result)) {
    const [first] = result
    if (!first) {
      throw new Error('HEIC conversion failed.')
    }
    return first
  }
  return result
}

const createDefaultDeps = (): ImageProcessorDeps => ({
  createCanvas: () => document.createElement('canvas'),
  loadImage: async (file: File) => {
    if (isHeicFile(file)) {
      const converted = await convertHeicToBlob(file)
      return getImageFromBlob(converted)
    }

    return getImageFromBlob(file)
  },
})

const toWebPBlob = (
  canvas: CanvasSurface,
  quality: number
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('WebP conversion failed.'))
          return
        }
        resolve(blob)
      },
      'image/webp',
      quality
    )
  })

const applySmoothing = (context: CanvasContext) => {
  if (typeof context.imageSmoothingEnabled === 'boolean') {
    context.imageSmoothingEnabled = true
  }
  if (context.imageSmoothingQuality) {
    context.imageSmoothingQuality = 'high'
  }
}

const renderVariant = async (
  image: LoadedImage,
  targetWidth: number,
  quality: number,
  deps: ImageProcessorDeps
): Promise<OptimizedVariant> => {
  const sourceWidth = image.width
  const sourceHeight = image.height

  if (sourceWidth === 0 || sourceHeight === 0) {
    throw new Error('Source image has invalid dimensions.')
  }

  const clampedWidth = Math.min(sourceWidth, targetWidth)
  const scale = clampedWidth / sourceWidth
  const scaledHeight = Math.round(sourceHeight * scale)

  const canvas = deps.createCanvas()
  canvas.width = clampedWidth
  canvas.height = scaledHeight

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas context is unavailable.')
  }

  applySmoothing(context)

  context.drawImage(image.source, 0, 0, clampedWidth, scaledHeight)

  const blob = await toWebPBlob(canvas, quality)

  return {
    blob,
    width: clampedWidth,
    height: scaledHeight,
    size: blob.size,
    quality,
  }
}

export const processImage = async (
  file: File,
  options?: Partial<ImageProcessingOptions>,
  deps?: ImageProcessorDeps
): Promise<OptimizedImages> => {
  const startTime = performance.now()
  const resolvedDeps = deps ?? createDefaultDeps()
  const mergedOptions: ImageProcessingOptions = {
    desktop: { ...DEFAULT_OPTIONS.desktop, ...options?.desktop },
    mobile: { ...DEFAULT_OPTIONS.mobile, ...options?.mobile },
  }

  const image = await resolvedDeps.loadImage(file)

  const [desktop, mobile] = await Promise.all([
    renderVariant(
      image,
      mergedOptions.desktop.width,
      mergedOptions.desktop.quality,
      resolvedDeps
    ),
    renderVariant(
      image,
      mergedOptions.mobile.width,
      mergedOptions.mobile.quality,
      resolvedDeps
    ),
  ])

  const durationMs = performance.now() - startTime

  console.debug('imageProcessor: original size', file.size)
  console.debug('imageProcessor: desktop size', desktop.size)
  console.debug('imageProcessor: mobile size', mobile.size)
  console.debug('imageProcessor: duration ms', durationMs)

  return {
    desktop,
    mobile,
    original: {
      width: image.width,
      height: image.height,
      size: file.size,
      name: file.name,
      type: file.type,
    },
    durationMs,
  }
}
