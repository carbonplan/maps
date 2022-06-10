import zarr from 'zarr-js'
import ndarray from 'ndarray'
import { distance } from '@turf/turf'

import { vert, frag } from './shaders'
import {
  zoomToLevel,
  keyToTile,
  pointToCamera,
  pointToTile,
  getPositions,
  getSiblings,
  getKeysToRender,
  getAdjustedOffset,
  getOverlappingAncestor,
  cameraToPoint,
  getTilesOfRegion,
  getPyramidMetadata,
  getBands,
  setObjectValues,
  getChunks,
  getSelectorHash,
} from './utils'
import { DEFAULT_FILL_VALUES } from './constants'
import Tile from './tile'

export const createTiles = (regl, opts) => {
  return new Tiles(opts)

  function Tiles({
    source,
    colormap,
    clim,
    opacity,
    display,
    variable,
    selector = {},
    uniforms: customUniforms = {},
    frag: customFrag,
    fillValue,
    mode = 'texture',
    setLoading,
    clearLoading,
    invalidate,
    invalidateRegion,
    setMetadata,
  }) {
    this.tiles = {}
    this.loaders = {}
    this.active = {}
    this.display = display
    this.clim = clim
    this.opacity = opacity
    this.selector = selector
    this.variable = variable
    this.fillValue = fillValue
    this.invalidate = invalidate
    this.viewport = { viewportHeight: 0, viewportWidth: 0 }
    this._loading = false
    this.setLoading = setLoading
    this.clearLoading = clearLoading

    this.colormap = regl.texture({
      data: colormap,
      format: 'rgb',
      shape: [colormap.length, 1],
    })

    const validModes = ['grid', 'dotgrid', 'texture']
    if (!validModes.includes(mode)) {
      throw Error(
        `mode '${mode}' invalid, must be one of ${validModes.join(', ')}`
      )
    }

    this.bands = getBands(variable, selector)

    customUniforms = Object.keys(customUniforms)

    let primitive,
      initialize,
      attributes = {},
      uniforms = {}

    if (mode === 'grid' || mode === 'dotgrid') {
      primitive = 'points'
      initialize = () => regl.buffer()
      this.bands.forEach((k) => (attributes[k] = regl.prop(k)))
      uniforms = {}
    }

    if (mode === 'texture') {
      primitive = 'triangles'
      this.bands.forEach((k) => (uniforms[k] = regl.prop(k)))
    }

    customUniforms.forEach((k) => (uniforms[k] = regl.this(k)))

    this.initialized = new Promise((resolve) => {
      const loadingID = this.setLoading('metadata')
      zarr().openGroup(source, (err, loaders, metadata) => {
        if (setMetadata) setMetadata(metadata)
        const { levels, maxZoom, tileSize } = getPyramidMetadata(metadata)
        this.maxZoom = maxZoom
        const position = getPositions(tileSize, mode)
        this.position = regl.buffer(position)
        this.size = tileSize
        if (mode === 'grid' || mode === 'dotgrid') {
          this.count = position.length
        }
        if (mode === 'texture') {
          this.count = 6
        }

        const attrs = metadata.metadata[`${levels[0]}/${variable}/.zattrs`]
        const array = metadata.metadata[`${levels[0]}/${variable}/.zarray`]

        this.dimensions = attrs['_ARRAY_DIMENSIONS']
        this.shape = array['shape']
        this.chunks = array['chunks']

        this.fillValue =
          fillValue ??
          array['fill_value'] ??
          DEFAULT_FILL_VALUES[array['dtype']]

        if (mode === 'texture') {
          const emptyTexture = ndarray(
            new Float32Array(Array(1).fill(this.fillValue)),
            [1, 1]
          )
          initialize = () => regl.texture(emptyTexture)
        }

        this.ndim = this.dimensions.length

        this.coordinates = {}
        Promise.all(
          Object.keys(selector).map(
            (key) =>
              new Promise((innerResolve) => {
                loaders[`${levels[0]}/${key}`]([0], (err, chunk) => {
                  const coordinates = Array.from(chunk.data)
                  this.coordinates[key] = coordinates
                  innerResolve()
                })
              })
          )
        ).then(() => {
          levels.forEach((z) => {
            const loader = loaders[z + '/' + variable]
            this.loaders[z] = loader
            Array(Math.pow(2, z))
              .fill(0)
              .map((_, x) => {
                Array(Math.pow(2, z))
                  .fill(0)
                  .map((_, y) => {
                    const key = [x, y, z].join(',')
                    this.tiles[key] = new Tile({
                      key,
                      loader,
                      shape: this.shape,
                      chunks: this.chunks,
                      dimensions: this.dimensions,
                      coordinates: this.coordinates,
                      bands: this.bands,
                      initializeBuffer: initialize,
                    })
                  })
              })
          })

          resolve(true)
          this.clearLoading(loadingID)
          this.invalidate()
        })
      })
    })

    this.drawTiles = regl({
      vert: vert(mode, this.bands),

      frag: frag(mode, this.bands, customFrag, customUniforms),

      attributes: {
        position: regl.this('position'),
        ...attributes,
      },

      uniforms: {
        viewportWidth: regl.context('viewportWidth'),
        viewportHeight: regl.context('viewportHeight'),
        pixelRatio: regl.context('pixelRatio'),
        colormap: regl.this('colormap'),
        camera: regl.this('camera'),
        size: regl.this('size'),
        zoom: regl.this('zoom'),
        globalLevel: regl.this('level'),
        level: regl.prop('level'),
        offset: regl.prop('offset'),
        clim: regl.this('clim'),
        opacity: regl.this('opacity'),
        fillValue: regl.this('fillValue'),
        ...uniforms,
      },

      blend: {
        enable: true,
        func: {
          src: 'one',
          srcAlpha: 'one',
          dstRGB: 'one minus src alpha',
          dstAlpha: 'one minus src alpha',
        },
      },

      depth: { enable: false },

      count: regl.this('count'),

      primitive: primitive,
    })

    this.getProps = () => {
      const adjustedActive = Object.keys(this.tiles)
        .filter((key) => this.active[key])
        .reduce((accum, key) => {
          const keysToRender = getKeysToRender(key, this.tiles, this.maxZoom)
          keysToRender.forEach((keyToRender) => {
            const offsets = this.active[key]

            offsets.forEach((offset) => {
              const adjustedOffset = getAdjustedOffset(offset, keyToRender)
              if (!accum[keyToRender]) {
                accum[keyToRender] = []
              }

              const alreadySeenOffset = accum[keyToRender].find(
                (prev) =>
                  prev[0] === adjustedOffset[0] && prev[1] === adjustedOffset[1]
              )
              if (!alreadySeenOffset) {
                accum[keyToRender].push(adjustedOffset)
              }
            })
          })

          return accum
        }, {})

      const activeKeys = Object.keys(adjustedActive)

      return activeKeys.reduce((accum, key) => {
        if (!getOverlappingAncestor(key, activeKeys)) {
          const [, , level] = keyToTile(key)
          const tile = this.tiles[key]
          const offsets = adjustedActive[key]

          offsets.forEach((offset) => {
            accum.push({
              ...tile.getBuffers(),
              level,
              offset,
            })
          })
        }

        return accum
      }, [])
    }

    regl.frame(({ viewportHeight, viewportWidth }) => {
      if (
        this.viewport.viewportHeight !== viewportHeight ||
        this.viewport.viewportWidth !== viewportWidth
      ) {
        this.viewport = { viewportHeight, viewportWidth }
        this.invalidate()
      }
    })

    this.draw = () => {
      this.drawTiles(this.getProps())
    }

    this.updateCamera = ({ center, zoom }) => {
      const level = zoomToLevel(zoom, this.maxZoom)
      const tile = pointToTile(center.lng, center.lat, level)
      const camera = pointToCamera(center.lng, center.lat, level)

      this.level = level
      this.zoom = zoom
      this.camera = [camera[0], camera[1]]

      this.active = getSiblings(tile, {
        viewport: this.viewport,
        zoom,
        camera: this.camera,
        size: this.size,
      })

      if (this.size && Object.keys(this.active).length === 0) {
        this.clearLoading(null, { forceClear: true })
      }

      Promise.all(
        Object.keys(this.active).map(
          (key) =>
            new Promise((resolve) => {
              if (this.loaders[level]) {
                const tileIndex = keyToTile(key)
                const tile = this.tiles[key]

                const chunks = getChunks(
                  this.selector,
                  this.dimensions,
                  this.coordinates,
                  this.shape,
                  this.chunks,
                  tileIndex[0],
                  tileIndex[1]
                )
                const initialHash = getSelectorHash(this.selector)

                if (tile.hasPopulatedBuffer(this.selector)) {
                  resolve(false)
                  return
                }

                if (tile.isLoadingChunks(chunks)) {
                  // If tile is already loading all chunks...
                  tile.chunksLoaded(chunks).then(() => {
                    // ...wait for ready state and populate buffers if selector is still relevant.
                    if (initialHash === getSelectorHash(this.selector)) {
                      tile.populateBuffersSync(this.selector)
                      this.invalidate()
                      resolve(false)
                    } else {
                      resolve(false)
                    }
                  })
                } else {
                  // Otherwise, immediately kick off fetch or populate buffers.
                  if (tile.hasLoadedChunks(chunks)) {
                    tile.populateBuffersSync(this.selector)
                    this.invalidate()
                    resolve(false)
                  } else {
                    const loadingID = this.setLoading('chunk')
                    tile
                      .populateBuffers(chunks, this.selector)
                      .then((dataUpdated) => {
                        this.invalidate()
                        resolve(dataUpdated)
                        this.clearLoading(loadingID)
                      })
                  }
                }
              }
            })
        )
      ).then((results) => {
        if (results.some(Boolean)) {
          invalidateRegion()
        }
      })
    }

    this.queryRegion = async (region, selector) => {
      await this.initialized

      const tiles = getTilesOfRegion(region, this.level)

      await Promise.all(
        tiles.map(async (key) => {
          const tileIndex = keyToTile(key)
          const chunks = getChunks(
            selector,
            this.dimensions,
            this.coordinates,
            this.shape,
            this.chunks,
            tileIndex[0],
            tileIndex[1]
          )

          if (!this.tiles[key].hasLoadedChunks(chunks)) {
            const loadingID = this.setLoading('chunk')
            await this.tiles[key].loadChunks(chunks)
            this.clearLoading(loadingID)
          }
        })
      )

      let results,
        lat = [],
        lon = []
      const resultDim =
        this.ndim -
        Object.keys(selector).filter((k) => !Array.isArray(selector[k])).length
      if (resultDim > 2) {
        results = {}
      } else {
        results = []
      }

      tiles.map((key) => {
        const [x, y, z] = keyToTile(key)
        const { center, radius, units } = region.properties
        for (let i = 0; i < this.size; i++) {
          for (let j = 0; j < this.size; j++) {
            const pointCoords = cameraToPoint(
              x + i / this.size,
              y + j / this.size,
              z
            )
            const distanceToCenter = distance(
              [center.lng, center.lat],
              pointCoords,
              {
                units,
              }
            )
            if (distanceToCenter < radius) {
              lon.push(pointCoords[0])
              lat.push(pointCoords[1])

              const valuesToSet = this.tiles[key].getPointValues({
                selector,
                point: [i, j],
              })

              valuesToSet.forEach(({ keys, value }) => {
                if (keys.length > 0) {
                  setObjectValues(results, keys, value)
                } else {
                  results.push(value)
                }
              })
            }
          }
        }
      })

      const out = { [this.variable]: results }

      if (this.ndim > 2) {
        out.dimensions = this.dimensions.map((d) => {
          if (d === 'x') {
            return 'lon'
          } else if (d === 'y') {
            return 'lat'
          } else {
            return d
          }
        })

        out.coordinates = this.dimensions.reduce(
          (coords, d) => {
            if (d !== 'x' && d !== 'y') {
              if (selector.hasOwnProperty(d)) {
                coords[d] = Array.isArray(selector[d])
                  ? selector[d]
                  : [selector[d]]
              } else {
                coords[d] = this.coordinates[d]
              }
            }

            return coords
          },
          { lat, lon }
        )
      } else {
        out.dimensions = ['lat', 'lon']
        out.coordinates = { lat, lon }
      }

      return out
    }

    this.updateSelector = ({ selector }) => {
      this.selector = selector
      this.invalidate()
    }

    this.updateUniforms = (props) => {
      Object.keys(props).forEach((k) => {
        this[k] = props[k]
      })
      if (!this.display) {
        this.opacity = 0
      }
      this.invalidate()
    }

    this.updateColormap = ({ colormap }) => {
      this.colormap = regl.texture({
        data: colormap,
        format: 'rgb',
        shape: [colormap.length, 1],
      })
      this.invalidate()
    }
  }
}
