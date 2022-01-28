import ndarray from 'ndarray'
import Tile from './tile'

const createMockChunk = (chunk) =>
  ndarray(
    Array(5)
      .fill(null)
      .map((_, i) => `${chunk}-${i}`),
    [5, 1, 1]
  )

const assertPending = async (tile, chunks, value) => {
  let pending = true
  tile.chunksLoaded(chunks).then(() => {
    pending = false
  })

  // simulate nested promises
  await Promise.all([Promise.all([Promise.resolve()])])

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

    describe('chunksLoaded()', () => {
      const chunk1 = [0, 0, 0]
      const chunk2 = [1, 0, 0]
      let tile
      let resolvers

      beforeEach(() => {
        resolvers = []
        const loader = jest.fn().mockImplementation((chunk, cb) =>
          new Promise((resolve) => {
            resolvers.push(resolve)
          }).then(() => {
            cb(
              null, // error
              createMockChunk(chunk)
            )
          })
        )
        tile = new Tile({ ...defaults, loader })
      })

      it('always resolves for an empty array of chunks', async () => {
        await assertPending(tile, [], false)
      })

      it('resolves after first set of chunks are loaded', async () => {
        const promise = tile.loadChunks([chunk1])
        await assertPending(tile, [chunk1], true)

        resolvers[0]()
        await promise

        await assertPending(tile, [chunk1], false)
      })

      it('reenters pending state when new chunks are loaded', async () => {
        const promise1 = tile.loadChunks([chunk1])
        resolvers[0]()
        await promise1

        await assertPending(tile, [chunk1], false)

        const promise2 = tile.loadChunks([chunk2])
        await assertPending(tile, [chunk1, chunk2], true)

        resolvers[1]()
        await promise2

        await assertPending(tile, [chunk1, chunk2], false)
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

    describe('getPointValues()', () => {
      it('throws when requesting data for chunk not yet loaded', () => {
        const tile = new Tile(defaults)

        expect(() =>
          tile.getPointValues({ selector: { year: 1 }, point: [0, 0] })
        ).toThrow('Missing data for chunk: 0.0.0')
      })

      it('handles single selector values', async () => {
        const tile = new Tile(defaults)

        // Load 1st chunk
        await tile.loadChunks([[0, 0, 0]])

        const result = tile.getPointValues({
          selector: { year: 1 },
          point: [0, 0],
        })

        expect(result).toHaveLength(1)
        expect(result).toEqual([{ keys: [], value: '0,0,0-0' }])
      })

      it('handles array selector values', async () => {
        const tile = new Tile(defaults)

        // Load 1st chunk
        await tile.loadChunks([[0, 0, 0]])

        // Still includes keys when selector value has length 1
        expect(
          tile.getPointValues({
            selector: { year: [1] },
            point: [0, 0],
          })
        ).toEqual([{ keys: [1], value: '0,0,0-0' }])
        // Also includes keys when selector value has length > 1
        expect(
          tile.getPointValues({
            selector: { year: [1, 2, 3, 4, 5] },
            point: [0, 0],
          })
        ).toEqual([
          { keys: [1], value: '0,0,0-0' },
          { keys: [2], value: '0,0,0-1' },
          { keys: [3], value: '0,0,0-2' },
          { keys: [4], value: '0,0,0-3' },
          { keys: [5], value: '0,0,0-4' },
        ])
      })

      it('combines chunks when multiple are loaded', async () => {
        const tile = new Tile(defaults)

        // Load 1st chunk
        await tile.loadChunks([[0, 0, 0]])
        // Load 2nd chunk
        await tile.loadChunks([[1, 0, 0]])
        const result = tile.getPointValues({
          selector: { year: [1, 6] },
          point: [0, 0],
        })

        expect(result).toHaveLength(2)
        expect(result).toEqual([
          { keys: [1], value: '0,0,0-0' },
          { keys: [6], value: '1,0,0-0' },
        ])
      })

      it('handles empty selectors', async () => {
        const selector = {}
        const tile = new Tile({
          ...defaults,
          loader: jest.fn().mockImplementation((chunk, cb) =>
            cb(
              null, // error
              ndarray([1, 2, 3, 4], [4, 1, 1])
            )
          ),
          shape: [4, 1, 1],
          chunks: [4, 1, 1],
          dimensions: ['band', 'y', 'x'],
          coordinates: { band: ['a', 'b', 'c', 'd'] },
        })

        await tile.loadChunks([[0, 0, 0]])

        expect(tile.getPointValues({ selector, point: [0, 0] })).toEqual([
          { keys: ['a'], value: 1 },
          { keys: ['b'], value: 2 },
          { keys: ['c'], value: 3 },
          { keys: ['d'], value: 4 },
        ])
      })

      it('handles empty selectors over multiple chunks', async () => {
        const tile = new Tile(defaults)

        // Load 1st chunk
        await tile.loadChunks([[0, 0, 0]])
        // Load 2nd chunk
        await tile.loadChunks([[1, 0, 0]])
        const result = tile.getPointValues({ selector: {}, point: [0, 0] })

        expect(result).toHaveLength(10)
        expect(result).toEqual([
          { keys: [1], value: '0,0,0-0' },
          { keys: [2], value: '0,0,0-1' },
          { keys: [3], value: '0,0,0-2' },
          { keys: [4], value: '0,0,0-3' },
          { keys: [5], value: '0,0,0-4' },
          { keys: [6], value: '1,0,0-0' },
          { keys: [7], value: '1,0,0-1' },
          { keys: [8], value: '1,0,0-2' },
          { keys: [9], value: '1,0,0-3' },
          { keys: [10], value: '1,0,0-4' },
        ])
      })

      it('returns values at specified x, y indices', async () => {
        const selector = {}
        const tile = new Tile({
          ...defaults,
          loader: jest.fn().mockImplementation((chunk, cb) =>
            cb(
              null, // error
              ndarray([1, 2, 3, 4], [2, 2])
            )
          ),
          shape: [2, 2],
          chunks: [2, 2],
          dimensions: ['y', 'x'],
          coordinates: {},
        })

        await tile.loadChunks([[0, 0]])

        expect(tile.getPointValues({ selector, point: [0, 0] })).toEqual([
          { keys: [], value: 1 },
        ])
        expect(tile.getPointValues({ selector, point: [1, 0] })).toEqual([
          { keys: [], value: 2 },
        ])
        expect(tile.getPointValues({ selector, point: [0, 1] })).toEqual([
          { keys: [], value: 3 },
        ])
        expect(tile.getPointValues({ selector, point: [1, 1] })).toEqual([
          { keys: [], value: 4 },
        ])
      })
    })
  })
})
