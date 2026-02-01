interface CanvasContext {
  drawImage: (
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number
  ) => void
}

interface CanvasSurface {
  width: number
  height: number
  getContext: (type: '2d') => CanvasContext | null
  toBlob: (callback: (blob: Blob | null) => void, type: string, quality?: number) => void
}

export interface ImageProcessorDeps {
  createCanvas: () => CanvasSurface
  loadImage: (file: File) => Promise<HTMLImageElement>
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

const DEFAULT_OPTIONS: ImageProcessingOptions = {
  desktop: { width: 1920, quality: 0.8 },
  mobile: { width: 720, quality: 0.7 },
}

const createDefaultDeps = (): ImageProcessorDeps => ({
  createCanvas: () => document.createElement('canvas'),
  loadImage: (file: File) =>
    new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file)
      const image = new Image()
      image.onload = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(image)
      }
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Unable to load image for processing.'))
      }
      image.src = objectUrl
    }),
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

const renderVariant = async (
  image: HTMLImageElement,
  targetWidth: number,
  quality: number,
  deps: ImageProcessorDeps
): Promise<OptimizedVariant> => {
  const sourceWidth = image.naturalWidth > 0 ? image.naturalWidth : image.width
  const sourceHeight = image.naturalHeight > 0 ? image.naturalHeight : image.height

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

  context.drawImage(image, 0, 0, clampedWidth, scaledHeight)

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

  const desktop = await renderVariant(
    image,
    mergedOptions.desktop.width,
    mergedOptions.desktop.quality,
    resolvedDeps
  )
  const mobile = await renderVariant(
    image,
    mergedOptions.mobile.width,
    mergedOptions.mobile.quality,
    resolvedDeps
  )

  const durationMs = performance.now() - startTime

  console.debug('imageProcessor: original size', file.size)
  console.debug('imageProcessor: desktop size', desktop.size)
  console.debug('imageProcessor: mobile size', mobile.size)
  console.debug('imageProcessor: duration ms', durationMs)

  return {
    desktop,
    mobile,
    original: {
      width: image.naturalWidth > 0 ? image.naturalWidth : image.width,
      height: image.naturalHeight > 0 ? image.naturalHeight : image.height,
      size: file.size,
      name: file.name,
      type: file.type,
    },
    durationMs,
  }
}
