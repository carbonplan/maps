import {
  getBandInformation,
  getChunks,
  keyToTile,
  getSelectorHash,
} from './utils'


function findDifference(array1, array2) {
    const fillValue1 = 3.4028234663852886e38
    const fillValue2 = 9.969209968386869e36

    for (let i = 0; i < array1.length; i++) {
        const value1 = array1[i];
        if (value1 !== fillValue1 && value1 !== fillValue2) {
            array1[i]  = array1[i] - array2[i]
        }
    }

    return array1;
}

class Tile {
  constructor({
    key,
    loader,
    shape,
    chunks,
    chunksDif,
    dimensions,
    coordinates,
    bands,
    initializeBuffer,
    initializeBufferDif,
  }) {
    this.key = key
    this.tileCoordinates = keyToTile(key)

    this.shape = shape
    this.chunks = chunks
    this.chunksDif = chunksDif
    this.dimensions = dimensions
    this.coordinates = coordinates
    this.bands = bands

    this._bufferCache = null
    this._buffers = {}

    this._loading = {}
    this._ready = {}

    // diff variables
    this._bufferCacheDif = null
    this._buffersDif = {}

    this._loadingDif = {}
    this._readyDif = {}

    bands.forEach((k) => {
      this._buffers[k] = initializeBuffer()
    })
    bands.forEach((k) => {
      this._buffersDif[k] = initializeBufferDif()
    })

    this.chunkedData = {}
    this.chunkedDataDif = {}

    this._loader = loader
  }


  getBuffers() {
    return this._buffers
  }

  async loadChunks(chunks, chunksDif) {
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

    const updatedDif = await Promise.all(
      chunksDif.map(
        (chunkDif) =>
          new Promise((resolve) => {
            const keyDif = chunkDif.join('.')
            if (this.chunkedDataDif[keyDif]) {
              resolve(false)
            } else {
              this._loading[keyDif] = true
              this._ready[keyDif] = new Promise((innerResolveDif) => {
                this._loader(chunkDif, (err, dataDif) => {
                  this.chunkedDataDif[keyDif] = dataDif
                  this._loading[keyDif] = false
                  innerResolveDif(true)
                  resolve(true)
                })
              })
            }
          })
      )
    )

    return updated.some(Boolean)
  }

  async populateBuffers(chunks, chunksDif, selector) {
    const updated = await this.loadChunks(chunks, chunksDif)

    this.populateBuffersSync(selector)

    return updated
  }

  populateBuffersSync(selector) {
    const bandInformation = getBandInformation(selector)

    this.bands.forEach((band) => {
      const info = bandInformation[band] || selector
        // selector = {month:1, band: "prec"}
      const chunks = getChunks(
        info,
        this.dimensions,  // ["band", "month", "y", "x"]
        this.coordinates, // [band["prec","tavg"], month[1,2,...,12]]
        this.shape,   // [2,12,128,128]
        this.chunks,  // [2,12,128,128]
        this.tileCoordinates[0], // tileCoordinates = [2,2,2]
        this.tileCoordinates[1]
      )
      const chunksDif = getChunks(
        info,
        this.dimensions,  // ["band", "month", "y", "x"]
        this.coordinates, // [band["prec","tavg"], month[1,2,...,12]]
        this.shape,   // [2,12,128,128]
        this.chunksDif,  // [2,12,128,128]
        this.tileCoordinates[0], // tileCoordinates = [2,2,2]
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
      let data = this.chunkedData[chunkKey]

      const chunkDif = chunksDif[0]
      const chunkKeyDif = chunkDif.join('.')
      let dataDif = this.chunkedDataDif[chunkKeyDif]

      let newdata = data

      // map difference between two datasets
      if (typeof dataDif === 'undefined') {
          // Variable is undefined, temporarily set to 0
          data.data = findDifference(data.data, newdata.data)
          console.log('Variable is undefined');
      } else {
          // Variable is defined, set to true differrence
          data.data = findDifference(data.data, dataDif.data)
          console.log("new data =", data)
          console.log('Variable is defined');
      }

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

  async chunksLoaded(chunks, chunksDif) {
    await Promise.all(chunks.map((chunk) => this._ready[chunk.join('.')]))
    await Promise.all(chunksDif.map((chunkDif) => this._readyDif[chunkDif.join('.')]))
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

          if (['x', 'lon'].includes(dimension)) {
            return accum.map((prev) => [...prev, x])
          } else if (['y', 'lat'].includes(dimension)) {
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
          ['x', 'lon', 'y', 'lat'].includes(this.dimensions[i])
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
