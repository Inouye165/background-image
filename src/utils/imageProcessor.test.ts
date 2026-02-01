import { describe, expect, it } from 'vitest'
import { processImage, type ImageProcessorDeps } from './imageProcessor'

describe('processImage', () => {
  it('creates desktop and mobile variants with expected sizing', async () => {
    const blobSizeByWidth = new Map<number, number>([
      [1920, 5120],
      [720, 2048],
    ])
    const canvases: Array<{ width: number; height: number }> = []
    const drawCalls: Array<{ width: number; height: number }> = []

    const createCanvas = () => {
      const state = { width: 0, height: 0 }
      canvases.push(state)

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
          drawImage: () => {
            drawCalls.push({ width: state.width, height: state.height })
          },
        }),
        toBlob: (callback: (blob: Blob | null) => void, type: string) => {
          const size = blobSizeByWidth.get(state.width) ?? 1024
          callback(new Blob([new Uint8Array(size)], { type }))
        },
      }
    }

    const deps: ImageProcessorDeps = {
      createCanvas,
      loadImage: async () => ({
        source: new Image(),
        width: 4000,
        height: 2000,
      }),
    }

    const file = new File([new Uint8Array(1024)], 'sample.jpg', {
      type: 'image/jpeg',
    })

    const result = await processImage(file, undefined, deps)

    expect(result.desktop.width).toBe(1920)
    expect(result.desktop.height).toBe(960)
    expect(result.mobile.width).toBe(720)
    expect(result.mobile.height).toBe(360)
    expect(result.desktop.size).toBe(5120)
    expect(result.mobile.size).toBe(2048)
    expect(drawCalls.some((call) => call.width === 1920)).toBe(true)
    expect(drawCalls.some((call) => call.width === 720)).toBe(true)
    expect(drawCalls.length).toBeGreaterThanOrEqual(4)
  })
})
