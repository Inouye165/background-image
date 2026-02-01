import { describe, expect, it } from 'vitest'
import { processImage, type ImageProcessorDeps } from './imageProcessor'

describe('processImage', () => {
  it('creates desktop and mobile variants with expected sizing', async () => {
    const blobSizes = [5120, 2048]
    const canvases: Array<{ width: number; height: number }> = []

    const createCanvas = () => {
      const state = { width: 0, height: 0 }
      canvases.push(state)
      const size = blobSizes[canvases.length - 1]

      return {
        get width() {
          return state.width
        },
        set width(value: number) {
          state.width = value
        },
        get height() {
          return state.height
        },
        set height(value: number) {
          state.height = value
        },
        getContext: () => ({
          drawImage: () => undefined,
        }),
        toBlob: (callback: (blob: Blob | null) => void, type: string) => {
          callback(new Blob([new Uint8Array(size)], { type }))
        },
      }
    }

    const image = new Image()
    Object.defineProperty(image, 'naturalWidth', { value: 4000 })
    Object.defineProperty(image, 'naturalHeight', { value: 2000 })
    image.width = 4000
    image.height = 2000

    const deps: ImageProcessorDeps = {
      createCanvas,
      loadImage: async () => image,
    }

    const file = new File([new Uint8Array(1024)], 'sample.jpg', {
      type: 'image/jpeg',
    })

    const result = await processImage(file, undefined, deps)

    expect(result.desktop.width).toBe(1920)
    expect(result.desktop.height).toBe(960)
    expect(result.mobile.width).toBe(720)
    expect(result.mobile.height).toBe(360)
    expect(result.desktop.size).toBe(blobSizes[0])
    expect(result.mobile.size).toBe(blobSizes[1])
    expect(canvases[0].width).toBe(1920)
    expect(canvases[0].height).toBe(960)
    expect(canvases[1].width).toBe(720)
    expect(canvases[1].height).toBe(360)
  })
})
