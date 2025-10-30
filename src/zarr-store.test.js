jest.mock('zarr-js', () => {
  const handlers = new Map()
  const openMock = jest.fn((url, callback) => {
    const handler = handlers.get(url)
    if (!handler) {
      callback(new Error(`Missing handler for URL: ${url}`))
      return
    }
    callback(null, handler)
  })

  const factory = jest.fn(() => ({ open: openMock }))

  factory.__set = (url, handler) => handlers.set(url, handler)
  factory.__clear = () => {
    handlers.clear()
    openMock.mockClear()
    factory.mockClear()
  }
  factory.__openMock = openMock

  return factory
})

import zarr from 'zarr-js'
import ZarrStore from './zarr-store'

const mockJsonResponse = (value) =>
  Promise.resolve({
    json: () => Promise.resolve(value),
  })

const createV2Metadata = () => ({
  metadata: {
    '.zattrs': {
      multiscales: [
        {
          datasets: [
            { path: '0', pixels_per_tile: 256, crs: 'EPSG:3857' },
            { path: '1', pixels_per_tile: 256, crs: 'EPSG:3857' },
          ],
        },
      ],
    },
    '0/temp/.zattrs': {
      _ARRAY_DIMENSIONS: ['time', 'y', 'x'],
    },
    '0/temp/.zarray': {
      shape: [2, 256, 256],
      chunks: [1, 256, 256],
      fill_value: -9999,
      dtype: '<f4',
    },
  },
})

const createV3Metadata = () => ({
  attributes: {
    multiscales: [
      {
        datasets: [
          { path: '0', pixels_per_tile: 256, crs: 'EPSG:3857' },
          { path: '1', pixels_per_tile: 256, crs: 'EPSG:3857' },
        ],
      },
    ],
  },
})

const createV3ArrayMetadata = () => ({
  attributes: {
    _ARRAY_DIMENSIONS: ['time', 'y', 'x'],
  },
  shape: [2, 256, 256],
  chunk_grid: {
    configuration: {
      chunk_shape: [1, 256, 256],
    },
  },
  codecs: [{ name: 'gzip' }],
  fill_value: 0,
  data_type: '<f4',
})

const registerChunk = (url, values) => {
  const handler = jest.fn((chunkIndices, callback) => {
    callback(null, { data: new Float32Array(values) })
  })
  zarr.__set(url, handler)
  return handler
}

describe('ZarrStore', () => {
  const originalGlobalFetch = global.fetch
  const hasWindow = typeof window !== 'undefined'
  const originalWindowFetch = hasWindow ? window.fetch : undefined

  let fetchMock
  let createdWindow

  beforeEach(() => {
    createdWindow = false
    fetchMock = jest.fn()

    global.fetch = fetchMock

    if (!hasWindow) {
      global.window = {}
      createdWindow = true
    }
    window.fetch = fetchMock

    zarr.__clear()
    ZarrStore._cache.clear()
  })

  afterEach(() => {
    if (originalGlobalFetch !== undefined) {
      global.fetch = originalGlobalFetch
    } else {
      delete global.fetch
    }

    if (createdWindow) {
      delete global.window
    } else if (hasWindow) {
      if (originalWindowFetch !== undefined) {
        window.fetch = originalWindowFetch
      } else {
        delete window.fetch
      }
    }
  })

  it('loads v2 metadata and coordinates while reusing cached metadata', async () => {
    const source = 'https://example.com/v2'
    const coordinateValues = [2000, 2001]

    const zmetadata = createV2Metadata()
    registerChunk(`${source}/0/time`, coordinateValues)

    fetchMock.mockResolvedValueOnce(mockJsonResponse(zmetadata))

    const store = new ZarrStore({
      source,
      version: 'v2',
      variable: 'temp',
      coordinateKeys: ['time'],
    })

    await expect(store.initialized()).resolves.toBe(true)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(`${source}/.zmetadata`)

    expect(store.describe()).toEqual({
      metadata: { metadata: zmetadata.metadata },
      dimensions: ['time', 'y', 'x'],
      shape: [2, 256, 256],
      chunks: [1, 256, 256],
      fill_value: -9999,
      dtype: '<f4',
      coordinates: { time: coordinateValues },
      levels: [0, 1],
      maxZoom: 1,
      tileSize: 256,
      crs: 'EPSG:3857',
    })

    fetchMock.mockClear()

    const secondStore = new ZarrStore({
      source,
      version: 'v2',
      variable: 'temp',
      coordinateKeys: ['time'],
    })

    await expect(secondStore.initialized()).resolves.toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads v3 metadata and array metadata using cached responses', async () => {
    const source = 'https://example.com/v3'
    const metadata = createV3Metadata()
    const arrayMetadata = createV3ArrayMetadata()

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse(metadata))
      .mockResolvedValueOnce(mockJsonResponse(arrayMetadata))

    const store = new ZarrStore({
      source,
      version: 'v3',
      variable: 'temp',
    })

    await expect(store.initialized()).resolves.toBe(true)

    expect(fetchMock).toHaveBeenNthCalledWith(1, `${source}/zarr.json`)
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${source}/0/temp/zarr.json`)

    expect(store.describe()).toEqual({
      metadata,
      dimensions: ['time', 'y', 'x'],
      shape: [2, 256, 256],
      chunks: [1, 256, 256],
      fill_value: 0,
      dtype: '<f4',
      coordinates: {},
      levels: [0, 1],
      maxZoom: 1,
      tileSize: 256,
      crs: 'EPSG:3857',
    })

    fetchMock.mockClear()

    const secondStore = new ZarrStore({
      source,
      version: 'v3',
      variable: 'temp',
    })

    await expect(secondStore.initialized()).resolves.toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires source and variable options', () => {
    expect(() => new ZarrStore({ variable: 'temp' })).toThrow(
      'source is a required parameter'
    )
    expect(() => new ZarrStore({ source: 'https://example.com' })).toThrow(
      'variable is a required parameter'
    )
  })

  it('reuses cached getter functions when requesting the same chunk key', async () => {
    const source = 'https://example.com/v2'
    const zmetadata = createV2Metadata()
    const chunkValues = [1, 2, 3, 4]

    fetchMock.mockResolvedValueOnce(mockJsonResponse(zmetadata))
    const chunkHandler = registerChunk(`${source}/0/temp`, chunkValues)

    const store = new ZarrStore({
      source,
      version: 'v2',
      variable: 'temp',
    })

    await expect(store.initialized()).resolves.toBe(true)

    const firstChunk = await store.getChunk('0/temp', [0, 0])
    expect(firstChunk.data).toEqual(new Float32Array(chunkValues))

    const secondChunk = await store.getChunk('0/temp', [0, 1])
    expect(secondChunk.data).toEqual(new Float32Array(chunkValues))

    expect(zarr).toHaveBeenCalledTimes(1)
    expect(zarr.__openMock).toHaveBeenCalledTimes(1)
    expect(zarr.__openMock).toHaveBeenCalledWith(
      `${source}/0/temp`,
      expect.any(Function),
      expect.anything()
    )
    expect(chunkHandler).toHaveBeenCalledTimes(2)
    expect(chunkHandler).toHaveBeenNthCalledWith(
      1,
      [0, 0],
      expect.any(Function)
    )
    expect(chunkHandler).toHaveBeenNthCalledWith(
      2,
      [0, 1],
      expect.any(Function)
    )
  })
})
