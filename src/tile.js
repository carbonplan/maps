import ndarray from 'ndarray'
import { getBandInformation, getChunks, keyToTile } from './utils'

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
    this.buffers = {}
    this.bands = bands

    bands.forEach((k) => {
      this.buffers[k] = initializeBuffer()
    })

    this.chunkedData = {}
    this._cache = null

    this._data = {
      chunkKeys: [],
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
    this.setReady(true)
    this.loading = false

    return updated.some(Boolean)
  }

  async populateBuffers(chunks, selector, cacheKey) {
    const updated = await this.loadChunks(chunks)

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
      const chunk = chunks[0]
      const chunkKey = chunk.join('.')
      const data = this.chunkedData[chunkKey]

      if (!data) {
        throw new Error(`Missing data for chunk: ${chunkKey}`)
      }
      if (info) {
        const indexes = this.dimensions
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

        this.buffers[band](data.pick(...indexes))
      } else {
        this.buffers[band](data)
      }
    })

    this.setBufferCache(cacheKey)
    return updated
  }

  getBufferCache() {
    return this._cache
  }

  setBufferCache(cacheKey) {
    this._cache = cacheKey
  }

  getData() {
    const keys = Object.keys(this.chunkedData)
    const keysToAdd = keys.filter((key) => !this._data.chunkKeys.includes(key))

    if (keysToAdd.length === 0) {
      return this._data.value
    }

    let data = this._data.value
    if (!data) {
      const size = this.shape.reduce((product, el) => product * el, 1)
      data = ndarray(new Float32Array(size), this.shape)
    }

    keysToAdd.forEach((key) => {
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

    this._data.chunkKeys = keys
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
