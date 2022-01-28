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

    this.shape = shape
    this.chunks = chunks
    this.dimensions = dimensions
    this.coordinates = coordinates
    this.bands = bands

    this._bufferCache = null
    this._buffers = {}

    this._loading = {}
    this._ready = {}

    bands.forEach((k) => {
      this._buffers[k] = initializeBuffer()
    })

    this.chunkedData = {}

    this._loader = loader
  }

  getBuffers() {
    return this._buffers
  }

  async loadChunks(chunks) {
    const updated = await Promise.all(
      chunks.map(
        (chunk) =>
          new Promise((resolve) => {
            const key = chunk.join('.')
            if (this.chunkedData[key]) {
              resolve(false)
            } else {
              this._loading[key] = true
              this._ready[key] = new Promise((innerResolve) => {
                this._loader(chunk, (err, data) => {
                  this.chunkedData[key] = data
                  this._loading[key] = false
                  innerResolve(true)
                  resolve(true)
                })
              })
            }
          })
      )
    )

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

      let bandData = data
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

        bandData = data.pick(...indices)
      }

      if (bandData.dimension !== 2) {
        throw new Error(
          `Unexpected data dimensions for band: ${band}. Found ${bandData.dimension}, expected 2. Check the selector value.`
        )
      }
      this._buffers[band](bandData)
    })

    this._bufferCache = getSelectorHash(selector)
  }

  isBufferPopulated() {
    return !!this._bufferCache
  }

  isLoading() {
    return Object.keys(this._loading).some((key) => this._loading[key])
  }

  isLoadingChunks(chunks) {
    return chunks.every((chunk) => this._loading[chunk.join('.')])
  }

  async chunksLoaded(chunks) {
    await Promise.all(chunks.map((chunk) => this._ready[chunk.join('.')]))

    return true
  }

  hasLoadedChunks(chunks) {
    return chunks.every((chunk) => this.chunkedData[chunk.join('.')])
  }

  hasPopulatedBuffer(selector) {
    return (
      !!this._bufferCache && this._bufferCache === getSelectorHash(selector)
    )
  }

  getPointValues({ selector, point: [x, y] }) {
    const result = []
    const chunks = getChunks(
      selector,
      this.dimensions,
      this.coordinates,
      this.shape,
      this.chunks,
      this.tileCoordinates[0],
      this.tileCoordinates[1]
    )

    chunks.forEach((chunk) => {
      const key = chunk.join('.')
      const chunkData = this.chunkedData[key]

      if (!chunkData) {
        throw new Error(`Missing data for chunk: ${key}`)
      }

      const combinedIndices = this.chunks.reduce(
        (accum, count, i) => {
          const dimension = this.dimensions[i]
          const chunkOffset = chunk[i] * count

          if (dimension === 'x') {
            return accum.map((prev) => [...prev, x])
          } else if (dimension === 'y') {
            return accum.map((prev) => [...prev, y])
          } else if (selector.hasOwnProperty(dimension)) {
            const selectorValues = Array.isArray(selector[dimension])
              ? selector[dimension]
              : [selector[dimension]]
            const selectorIndices = selectorValues
              .map((value) => this.coordinates[dimension].indexOf(value))
              .filter(
                (index) => chunkOffset <= index && index < chunkOffset + count
              )

            return selectorIndices.reduce((a, index) => {
              return a.concat(accum.map((prev) => [...prev, index]))
            }, [])
          } else {
            let updatedAccum = []

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
        const keys = indices.reduce((accum, el, i) => {
          const coordinates = this.coordinates[this.dimensions[i]]
          const selectorValue = selector[this.dimensions[i]]

          if (
            coordinates &&
            (Array.isArray(selectorValue) || selectorValue == undefined)
          ) {
            accum.push(coordinates[el])
          }

          return accum
        }, [])
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
