import ndarray from 'ndarray'

class Tile {
  constructor({
    key,
    buffers,
    loader,
    shape,
    chunks,
    dimensions,
    coordinates,
    bands,
    initializeBuffer,
  }) {
    this.key = key

    this.loading = false
    this.shape = shape
    this.chunks = chunks
    this.dimensions = dimensions
    this.coordinates = coordinates
    this.buffers = {}

    bands.forEach((k) => {
      this.buffers[k] = initializeBuffer()
    })

    this.chunkedData = {}
    this._cache = null

    this._data = {
      chunksCache: null,
      value: null,
    }
    this._loader = loader
    this._ready = false
    this.resetReady()
  }

  ready() {
    return this._ready
  }

  async loadChunks(chunks) {
    this.loading = true
    const data = await Promise.all(
      chunks.map(
        (chunk) =>
          new Promise((resolve) => {
            const key = chunk.join('.')
            if (this.chunkedData[key]) {
              resolve(this.chunkedData[key])
            } else {
              this._loader(chunk, (err, data) => {
                this.chunkedData[key] = data
                resolve(data)
              })
            }
          })
      )
    )
    this.setReady(true)
    this.loading = false

    return this.getData()
  }

  async loadBuffers(chunks, selector) {
    await this.loadChunks(chunks)
  }

  getBufferCache() {
    return this._cache
  }

  setBufferCache(cacheKey) {
    this._cache = cacheKey
  }

  getDataCache() {
    return this._data.chunksCache
  }

  getData() {
    const keys = Object.keys(this.chunkedData)
    const cacheKey = keys.join(',')

    if (this._data.chunksCache === cacheKey) {
      return this._data.value
    }

    const size = this.shape.reduce((product, el) => product * el, 1)
    const data = ndarray(new Float32Array(size), this.shape)
    keys.forEach((key) => {
      const chunk = key.split('.')
      const chunkData = this.chunkedData[key]
      const result = this.chunks.reduce(
        (accum, count, i) => {
          const chunkOffset = ['x', 'y'].includes(this.dimensions[i])
            ? 0
            : chunk[i] * count
          let updatedAccum = []
          for (let j = 0; j < count; j++) {
            const index = chunkOffset + j
            updatedAccum = updatedAccum.concat(
              accum.map((prev) => [...prev, index])
            )
          }
          return updatedAccum
        },
        [[]]
      )

      result.forEach((indices) => {
        const chunkIndices = indices.map((el, i) =>
          ['x', 'y'].includes(this.dimensions[i])
            ? el
            : el - chunk[i] * this.chunks[i]
        )
        const value = chunkData.get(...chunkIndices)
        data.set(...indices, value)
      })
    })

    this._data.chunksCache = cacheKey
    this._data.value = data

    return data
  }

  setReady() {
    this._resolver(true)
  }

  resetReady() {
    this._ready = new Promise((resolve) => {
      this._resolver = resolve
    })
  }
}

export default Tile