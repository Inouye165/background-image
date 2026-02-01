import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { OptimizedImages } from '../utils/imageProcessor'

vi.mock('../utils/imageProcessor', () => ({
  processImage: vi.fn(),
}))

import { processImage } from '../utils/imageProcessor'
import { useImageOptimizer } from './useImageOptimizer'

const processImageMock = vi.mocked(processImage)

const createOptimizedImages = (): OptimizedImages => ({
  desktop: {
    blob: new Blob([new Uint8Array(10)], { type: 'image/webp' }),
    width: 1920,
    height: 1080,
    size: 2048,
    quality: 0.8,
  },
  mobile: {
    blob: new Blob([new Uint8Array(5)], { type: 'image/webp' }),
    width: 720,
    height: 405,
    size: 1024,
    quality: 0.7,
  },
  original: {
    width: 4000,
    height: 2250,
    size: 4096,
    name: 'sample.jpg',
    type: 'image/jpeg',
  },
  durationMs: 12.5,
})

describe('useImageOptimizer', () => {
  it('processes a supported file and records a log entry', async () => {
    const urlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation(() => 'blob:preview')
    processImageMock.mockResolvedValue(createOptimizedImages())

    const { result } = renderHook(() => useImageOptimizer())
    const file = new File([new Uint8Array(5)], 'sample.jpg', { type: 'image/jpeg' })

    await act(async () => {
      await result.current.handleFileSelection(file)
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.optimized).not.toBeNull()
    expect(result.current.logs.length).toBe(1)
    expect(result.current.logs[0]?.fileName).toBe('sample.jpg')
    expect(urlSpy).toHaveBeenCalledTimes(2)

    urlSpy.mockRestore()
  })

  it('rejects unsupported files with an error state', async () => {
    const { result } = renderHook(() => useImageOptimizer())
    const file = new File([new Uint8Array(5)], 'note.txt', { type: 'text/plain' })

    await act(async () => {
      await result.current.handleFileSelection(file)
    })

    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).toBe(
      'Unsupported file type. Please choose an image file.'
    )
  })
})