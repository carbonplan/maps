import {
  getBandInformation,
  getChunks,
  keyToTile,
  getSelectorHash,
} from './utils'

class Tile {
  constructor({
    key,
    loader,
    shape,
    chunks,
    dimensions,
    coordinates,
    bands,
    initializeBuffer,
  }) {
    this.key = key
    this.tileCoordinates = keyToTile(key)

    this.loading = false
    this.shape = shape
    this.chunks = chunks
    this.dimensions = dimensions
    this.coordinates = coordinates
    this.bands = bands

    this._bufferCache = null
    this._buffers = {}

    bands.forEach((k) => {
      this._buffers[k] = initializeBuffer()
    })

    this.chunkedData = {}

    this._data = {
      chunkKeys: [],
      value: null,
    }
    this._loader = loader
    this._ready = false
    this._resetReady()
  }

  ready() {
    return this._ready
  }

  _setReady() {
    this._resolver(true)
  }

  _resetReady() {
    this._ready = new Promise((resolve) => {
      this._resolver = resolve
    })
  }

  getBuffers() {
    return this._buffers
  }

  async loadChunks(chunks) {
    this.loading = true
    this._resetReady()
    const updated = await Promise.all(
      chunks.map(
        (chunk) =>
          new Promise((resolve) => {
            const key = chunk.join('.')
            if (this.chunkedData[key]) {
              resolve(false)
            } else {
              this._loader(chunk, (err, data) => {
                this.chunkedData[key] = data
                resolve(true)
              })
            }
          })
      )
    )
    this._setReady(true)
    this.loading = false

    return updated.some(Boolean)
  }

  async populateBuffers(chunks, selector) {
    const updated = await this.loadChunks(chunks)

    this.populateBuffersSync(selector)

    return updated
  }

  populateBuffersSync(selector) {
    const bandInformation = getBandInformation(selector)

    this.bands.forEach((band) => {
      const info = bandInformation[band] || selector
      const chunks = getChunks(
        info,
        this.dimensions,
        this.coordinates,
        this.shape,
        this.chunks,
        this.tileCoordinates[0],
        this.tileCoordinates[1]
      )

      if (chunks.length !== 1) {
        throw new Error(
          `Expected 1 chunk for band '${band}', found ${
            chunks.length
          }: ${chunks.join(', ')}`
        )
      }
      const chunk = chunks[0]
      const chunkKey = chunk.join('.')
      const data = this.chunkedData[chunkKey]

      if (!data) {
        throw new Error(`Missing data for chunk: ${chunkKey}`)
      }
      if (info) {
        const indices = this.dimensions
          .map((d) => (['x', 'y'].includes(d) ? null : d))
          .map((d, i) => {
            if (info[d] === undefined) {
              return null
            } else {
              const value = info[d]
              return (
                this.coordinates[d].findIndex(
                  (coordinate) => coordinate === value
                ) % this.chunks[i]
              )
            }
          })

        this._buffers[band](data.pick(...indices))
      } else {
        this._buffers[band](data)
      }
    })

    this._bufferCache = getSelectorHash(selector)
  }

  isBufferPopulated() {
    return !!this._bufferCache
  }

  hasLoadedChunks(chunks) {
    return chunks.every((chunk) => this.chunkedData[chunk.join('.')])
  }

  hasPopulatedBuffer(selector) {
    return (
      !!this._bufferCache && this._bufferCache === getSelectorHash(selector)
    )
  }

  getData({ x, y }) {
    const result = []

    Object.keys(this.chunkedData).forEach((key) => {
      const chunk = key.split('.')
      const chunkData = this.chunkedData[key]
      const combinedIndices = this.chunks.reduce(
        (accum, count, i) => {
          if (this.dimensions[i] === 'x') {
            return accum.map((prev) => [...prev, x])
          } else if (this.dimensions[i] === 'y') {
            return accum.map((prev) => [...prev, y])
          } else {
            let updatedAccum = []

            const chunkOffset = chunk[i] * count
            for (let j = 0; j < count; j++) {
              const index = chunkOffset + j
              updatedAccum = updatedAccum.concat(
                accum.map((prev) => [...prev, index])
              )
            }

            return updatedAccum
          }
        },
        [[]]
      )

      combinedIndices.forEach((indices) => {
        const keys = indices
          .filter((el, i) => this.coordinates[this.dimensions[i]])
          .map((el, i) => this.coordinates[this.dimensions[i]][el])
        const chunkIndices = indices.map((el, i) =>
          ['x', 'y'].includes(this.dimensions[i])
            ? el
            : el - chunk[i] * this.chunks[i]
        )
        result.push({
          keys,
          value: chunkData.get(...chunkIndices),
        })
      })
    })

    return result
  }
}

export default Tile
