import zarr from 'zarr-js'
import { getPyramidMetadata } from './utils'

class ZarrStore {
  constructor({ source, version = 'v2', variable, coordinateKeys = [] }) {
    if (!source) {
      throw new Error('source is a required parameter')
    }
    if (!variable) {
      throw new Error('variable is a required parameter')
    }
    this.source = source
    this.version = version
    this.variable = variable
    this.coordinateKeys = coordinateKeys
    this.metadata = null
    this.arrayMetadata = null
    this.dimensions = null
    this.shape = null
    this.chunks = null
    this.fill_value = null
    this.dtype = null
    this.levels = []
    this.maxZoom = null
    this.tileSize = null
    this.crs = null
    this.coordinates = {}
    this.loader = null
    this._chunkHandles = new Map()

    this.initialized = this._initialize()
  }

  async _initialize() {
    if (this.version === 'v2') {
      await this._loadV2()
    } else if (this.version === 'v3') {
      await this._loadV3()
    } else {
      throw new Error(
        `Unexpected Zarr version: ${this.version}. Must be one of 'v2', 'v3'.`
      )
    }

    this.loader = {
      load: ({ level, chunk }) =>
        this.getChunk(`${level}/${this.variable}`, chunk),
    }

    if (this.coordinateKeys.length) {
      await Promise.all(
        this.coordinateKeys.map((key) =>
          this.getChunk(`${this.levels[0]}/${key}`, [0]).then((chunk) => {
            this.coordinates[key] = Array.from(chunk.data)
          })
        )
      )
    }

    return this
  }

  cleanup() {
    this._chunkHandles.clear()
    this.loader = null
    this.coordinates = {}
  }

  describe() {
    return {
      metadata: this.metadata,
      loader: this.loader,
      dimensions: this.dimensions,
      shape: this.shape,
      chunks: this.chunks,
      fill_value: this.fill_value,
      dtype: this.dtype,
      coordinates: this.coordinates,
      levels: this.levels,
      maxZoom: this.maxZoom,
      tileSize: this.tileSize,
      crs: this.crs,
    }
  }

  async getChunk(key, chunkIndices) {
    let handle = this._chunkHandles.get(key)

    if (!handle) {
      let meta = null
      if (this.version === 'v2') {
        meta = this.metadata?.metadata?.[`${key}/.zarray`] || null
      } else if (this.version === 'v3') {
        meta = key.startsWith(`${this.levels[0]}/${this.variable}`)
          ? this.arrayMetadata
          : null
      }

      handle = new Promise((resolve, reject) => {
        zarr(window.fetch, this.version).open(
          `${this.source}/${key}`,
          (err, get) => (err ? reject(err) : resolve(get)),
          meta
        )
      }).catch((err) => {
        this._chunkHandles.delete(key)
        throw err
      })
      this._chunkHandles.set(key, handle)
    }

    const get = await handle
    return new Promise((resolve, reject) => {
      get(chunkIndices, (err, out) => (err ? reject(err) : resolve(out)))
    })
  }

  async _loadV2() {
    const cacheKey = `${this.version}:${this.source}`
    let zmetadata = ZarrStore._cache.get(cacheKey)
    if (!zmetadata) {
      zmetadata = await fetch(`${this.source}/.zmetadata`).then((res) =>
        res.json()
      )
      ZarrStore._cache.set(cacheKey, zmetadata)
    }

    this.metadata = { metadata: zmetadata.metadata }

    const pyramid = getPyramidMetadata(
      zmetadata.metadata['.zattrs'].multiscales
    )
    this.levels = pyramid.levels
    this.maxZoom = pyramid.maxZoom
    this.tileSize = pyramid.tileSize
    this.crs = pyramid.crs

    const basePath = `${this.levels[0]}/${this.variable}`
    const zattrs = this.metadata.metadata[`${basePath}/.zattrs`]
    const zarray = this.metadata.metadata[`${basePath}/.zarray`]

    this.dimensions = zattrs['_ARRAY_DIMENSIONS']
    this.shape = zarray.shape
    this.chunks = zarray.chunks
    this.fill_value = zarray.fill_value
    this.dtype = zarray.dtype
  }

  async _loadV3() {
    const metadataCacheKey = `${this.version}:${this.source}`
    let metadata = ZarrStore._cache.get(metadataCacheKey)
    if (!metadata) {
      metadata = await fetch(`${this.source}/zarr.json`).then((res) =>
        res.json()
      )
      ZarrStore._cache.set(metadataCacheKey, metadata)
    }
    this.metadata = metadata

    const pyramid = getPyramidMetadata(this.metadata.attributes.multiscales)
    this.levels = pyramid.levels
    this.maxZoom = pyramid.maxZoom
    this.tileSize = pyramid.tileSize
    this.crs = pyramid.crs

    const arrayKey = `${this.levels[0]}/${this.variable}`
    const arrayCacheKey = `${this.version}:${this.source}/${arrayKey}`
    let arrayMetadata = ZarrStore._cache.get(arrayCacheKey)
    if (!arrayMetadata) {
      arrayMetadata = await fetch(`${this.source}/${arrayKey}/zarr.json`).then(
        (res) => res.json()
      )
      ZarrStore._cache.set(arrayCacheKey, arrayMetadata)
    }
    this.arrayMetadata = arrayMetadata

    this.dimensions = this.arrayMetadata.attributes['_ARRAY_DIMENSIONS']
    this.shape = this.arrayMetadata.shape
    const isSharded = this.arrayMetadata.codecs[0].name === 'sharding_indexed'
    this.chunks = isSharded
      ? this.arrayMetadata.codecs[0].configuration.chunk_shape
      : this.arrayMetadata.chunk_grid.configuration.chunk_shape
    this.fill_value = this.arrayMetadata.fill_value
    this.dtype = this.arrayMetadata.data_type || null
  }
}

ZarrStore._cache = new Map()

export default ZarrStore
