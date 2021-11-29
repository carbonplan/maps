import ndarray from 'ndarray'
import Tile from './tile'

const createMockChunk = (chunk) =>
  ndarray(
    Array(5)
      .fill(null)
      .map((_, i) => `${chunk}-${i}`),
    [5, 1, 1]
  )

const assertPending = async (tile, value) => {
  let pending = true
  tile.ready().then(() => {
    pending = false
  })
  await Promise.resolve()

  expect(pending).toEqual(value)
}

describe('Tile', () => {
  let defaults
  let buffer
  beforeEach(() => {
    buffer = jest.fn()
    defaults = {
      key: '0,0,0',
      loader: jest.fn().mockImplementation((chunk, cb) =>
        cb(
          null, // error
          createMockChunk(chunk)
        )
      ),
      shape: [10, 1, 1],
      chunks: [5, 1, 1],
      dimensions: ['year', 'y', 'x'],
      coordinates: { year: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      bands: ['variable'],
      initializeBuffer: jest.fn().mockReturnValue(buffer),
    }
  })

  describe('mutators', () => {
    describe('populateBuffersSync()', () => {
      it('throws an error if chunks for selector have not been loaded', async () => {
        const tile = new Tile(defaults)

        expect(() => tile.populateBuffersSync({ year: 6 })).toThrow(
          'Missing data for chunk: 1.0.0'
        )

        // Load 1st chunk
        await tile.loadChunks([[0, 0, 0]])

        expect(() => tile.populateBuffersSync({ year: 6 })).toThrow(
          'Missing data for chunk: 1.0.0'
        )

        // Load 2nd chunk
        await tile.loadChunks([[1, 0, 0]])

        expect(() => tile.populateBuffersSync({ year: 6 })).not.toThrow()
      })

      it('throws if selector spans across chunks', async () => {
        const tile = new Tile(defaults)

        // Load 1st and 2nd chunks
        await tile.loadChunks([
          [0, 0, 0],
          [1, 0, 0],
        ])

        expect(() => tile.populateBuffersSync({ year: 1 })).not.toThrow()
        expect(() => tile.populateBuffersSync({ year: 6 })).not.toThrow()

        expect(() => tile.populateBuffersSync({ year: [1, 6] })).toThrow(
          "Expected 1 chunk for band 'variable', found 2: 0,0,0, 1,0,0"
        )
      })

      it('populates buffers with data refined by chunk', async () => {
        const tile = new Tile(defaults)

        // Load 2nd chunk
        await tile.loadChunks([[1, 0, 0]])

        tile.populateBuffersSync({ year: 6 })
        expect(buffer).toHaveBeenCalledTimes(1)
        expect(buffer).toHaveBeenCalledWith(
          // year 6 has index 0 in the 2nd chunk
          createMockChunk([1, 0, 0]).pick(0, null, null)
        )

        tile.populateBuffersSync({ year: 7 })

        expect(buffer).toHaveBeenCalledTimes(2)
        expect(buffer).toHaveBeenCalledWith(
          // year 7 has index 1 in the 2nd chunk
          createMockChunk([1, 0, 0]).pick(1, null, null)
        )

        tile.populateBuffersSync({ year: 8 })

        expect(buffer).toHaveBeenCalledTimes(3)
        expect(buffer).toHaveBeenCalledWith(
          // year 8 has index 2 in the 2nd chunk
          createMockChunk([1, 0, 0]).pick(2, null, null)
        )
      })

      it('populates buffers for multiple bands', async () => {
        const tile = new Tile({
          ...defaults,
          initializeBuffer: jest.fn().mockImplementation(() => jest.fn()),
          bands: ['year_1', 'year_2'],
        })
        const buffers = tile.getBuffers()

        await tile.loadChunks([[0, 0, 0]])

        tile.populateBuffersSync({ year: [1, 2] })

        expect(buffers.year_1).toHaveBeenCalledTimes(1)
        expect(buffers.year_1).toHaveBeenCalledWith(
          createMockChunk([0, 0, 0]).pick(0, null, null)
        )

        expect(buffers.year_2).toHaveBeenCalledTimes(1)
        expect(buffers.year_2).toHaveBeenCalledWith(
          createMockChunk([0, 0, 0]).pick(1, null, null)
        )
      })
    })

    describe('loadChunks()', () => {
      it('calls loader for every unloaded chunk', async () => {
        const tile = new Tile(defaults)

        expect(defaults.loader).toHaveBeenCalledTimes(0)

        await tile.loadChunks([
          [0, 0, 0],
          [1, 0, 0],
        ])

        expect(defaults.loader).toHaveBeenCalledTimes(2)
        expect(defaults.loader).toHaveBeenCalledWith(
          [0, 0, 0],
          expect.anything()
        )
        expect(defaults.loader).toHaveBeenCalledWith(
          [1, 0, 0],
          expect.anything()
        )
      })

      it('does not repeat loading for any chunks have been loaded', async () => {
        const tile = new Tile(defaults)

        expect(defaults.loader).toHaveBeenCalledTimes(0)

        await tile.loadChunks([
          [0, 0, 0],
          [1, 0, 0],
        ])
        expect(defaults.loader).toHaveBeenCalledTimes(2)

        await tile.loadChunks([[0, 0, 0]])
        await tile.loadChunks([[1, 0, 0]])
        await tile.loadChunks([
          [0, 0, 0],
          [1, 0, 0],
        ])
        expect(defaults.loader).toHaveBeenCalledTimes(2)

        await tile.loadChunks([[2, 0, 0]])
        expect(defaults.loader).toHaveBeenCalledTimes(3)
      })

      it('returns a boolean reflecting whether any chunks were newly loaded', async () => {
        let result
        const tile = new Tile(defaults)

        result = await tile.loadChunks([[0, 0, 0]])
        expect(result).toBe(true)

        result = await tile.loadChunks([[0, 0, 0]])
        expect(result).toBe(false)

        result = await tile.loadChunks([
          [0, 0, 0],
          [1, 0, 0],
        ])
        expect(result).toBe(true)

        result = await tile.loadChunks([
          [0, 0, 0],
          [1, 0, 0],
        ])
        expect(result).toBe(false)
      })
    })

    describe('populateBuffers()', () => {
      it('calls loadChunks() and then populateBuffersSync()', async () => {
        const tile = new Tile(defaults)
        const populateBuffersSpy = jest.spyOn(tile, 'populateBuffersSync')
        const loadChunksSpy = jest.spyOn(tile, 'loadChunks')

        const result = await tile.populateBuffers([[0, 0, 0]], { year: 1 })

        expect(loadChunksSpy).toHaveBeenCalledTimes(1)
        expect(loadChunksSpy).toHaveBeenCalledWith([[0, 0, 0]])
        expect(populateBuffersSpy).toHaveBeenCalledTimes(1)
        expect(populateBuffersSpy).toHaveBeenCalledWith({ year: 1 })

        expect(result).toBe(true)
      })
    })
  })
  describe('accessors', () => {
    describe('getBuffers()', () => {
      it('returns object containing buffer for each band', () => {
        expect(new Tile(defaults).getBuffers()).toEqual({ variable: buffer })
        expect(
          new Tile({
            ...defaults,
            bands: ['year_1', 'year_2'],
          }).getBuffers()
        ).toEqual({ year_1: buffer, year_2: buffer })
      })
    })

    describe('hasLoadedChunks()', () => {
      it('returns false initially for all chunks', () => {
        const tile = new Tile(defaults)

        expect(tile.hasLoadedChunks([[0, 0, 0]])).toBe(false)
      })

      it('returns true for any loaded chunks', async () => {
        const chunks = [[0, 0, 0]]
        const tile = new Tile(defaults)
        await tile.loadChunks(chunks)

        expect(tile.hasLoadedChunks(chunks)).toBe(true)
      })

      it('returns false for a mix of loaded and unloaded chunks', async () => {
        const chunks = [[0, 0, 0]]
        const tile = new Tile(defaults)
        await tile.loadChunks(chunks)

        expect(tile.hasLoadedChunks([...chunks, [1, 0, 0]])).toBe(false)
      })
    })

    describe('isBufferPopulated()', () => {
      it('returns false initially', () => {
        const tile = new Tile(defaults)

        expect(tile.isBufferPopulated()).toBe(false)
      })

      it('returns true once populateBuffersSync is called', async () => {
        const chunks = [[0, 0, 0]]
        const tile = new Tile(defaults)

        await tile.loadChunks(chunks)

        expect(tile.isBufferPopulated()).toBe(false)

        tile.populateBuffersSync({ year: 1 })

        expect(tile.isBufferPopulated()).toBe(true)
      })
    })

    describe('hasPopulatedBuffer()', () => {
      it('returns false initially', () => {
        const tile = new Tile(defaults)

        expect(tile.hasPopulatedBuffer({})).toBe(false)
      })

      it('returns true once populateBuffersSync is called', async () => {
        const chunks = [[0, 0, 0]]
        const tile = new Tile(defaults)

        await tile.loadChunks(chunks)

        expect(tile.hasPopulatedBuffer({ year: 1 })).toBe(false)

        tile.populateBuffersSync({ year: 1 })

        expect(tile.hasPopulatedBuffer({ year: 1 })).toBe(true)
      })

      it('returns false if selector does not match', async () => {
        const chunks = [[0, 0, 0]]
        const tile = new Tile(defaults)

        await tile.loadChunks(chunks)

        expect(tile.hasPopulatedBuffer({ year: 1 })).toBe(false)

        tile.populateBuffersSync({ year: 1 })

        expect(tile.hasPopulatedBuffer({ year: 2 })).toBe(false)
      })
    })

    describe('ready()', () => {
      it('is pending initially', async () => {
        const tile = new Tile(defaults)

        await assertPending(tile, true)
      })

      it('resolves after first set of chunks are loaded', async () => {
        const tile = new Tile(defaults)
        await tile.loadChunks([[0, 0, 0]])

        await assertPending(tile, false)
      })

      it('reenters pending state when new chunks are loaded', async () => {
        const tile = new Tile(defaults)
        await tile.loadChunks([[0, 0, 0]])

        await assertPending(tile, false)

        tile.loadChunks([[1, 0, 0]])
        await assertPending(tile, true)
      })

      it('resolves again', async () => {
        const tile = new Tile(defaults)
        await tile.loadChunks([[0, 0, 0]])

        await assertPending(tile, false)

        await tile.loadChunks([[1, 0, 0]])
        await assertPending(tile, false)
      })
    })

    describe('getData()', () => {
      it('returns null by default', () => {
        const tile = new Tile(defaults)

        expect(tile.getData()).toBe(null)
      })

      it('returns ndarray with full shape of tile when at least one chunk has been loaded', async () => {
        const tile = new Tile(defaults)

        // Load 1st chunk
        await tile.loadChunks([[0, 0, 0]])
        let result = tile.getData()

        expect(result).toBeDefined()
        expect(result.shape).toEqual(defaults.shape)
        expect(result.data).toHaveLength(10)
        expect(result.data).toEqual([
          '0,0,0-0',
          '0,0,0-1',
          '0,0,0-2',
          '0,0,0-3',
          '0,0,0-4',
          null,
          null,
          null,
          null,
          null,
        ])

        // Load 2nd chunk
        await tile.loadChunks([[1, 0, 0]])
        result = tile.getData()

        expect(result.data).toHaveLength(10)
        expect(result.data).toEqual([
          '0,0,0-0',
          '0,0,0-1',
          '0,0,0-2',
          '0,0,0-3',
          '0,0,0-4',
          '1,0,0-0',
          '1,0,0-1',
          '1,0,0-2',
          '1,0,0-3',
          '1,0,0-4',
        ])
      })
    })
  })
})
