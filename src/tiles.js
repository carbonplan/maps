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
  getAccessors,
  getSelectorHash,
} from './utils'

export const createTiles = (regl, opts) => {
  return new Tiles(opts)

  function Tiles({
    source,
    colormap,
    clim,
    opacity,
    display,
    variable,
    dimensions,
    selector = {},
    uniforms: customUniforms = {},
    frag: customFrag,
    fillValue = -9999,
    mode = 'texture',
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
    this.colormap = regl.texture({
      data: colormap,
      format: 'rgb',
      shape: [255, 1],
    })

    const validModes = ['grid', 'dotgrid', 'texture']
    if (!validModes.includes(mode)) {
      throw Error(
        `mode '${mode}' invalid, must be one of ${validModes.join(', ')}`
      )
    }

    this.ndim = dimensions.length
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
      const emptyTexture = ndarray(new Float32Array(Array(1).fill(fillValue)), [
        1,
        1,
      ])
      initialize = () => regl.texture(emptyTexture)
      this.bands.forEach((k) => (uniforms[k] = regl.prop(k)))
    }

    customUniforms.forEach((k) => (uniforms[k] = regl.this(k)))

    this.initialized = new Promise((resolve) => {
      zarr().openGroup(source, (err, loaders, metadata) => {
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

        levels.map((z) => {
          Array(Math.pow(2, z))
            .fill(0)
            .map((_, x) => {
              Array(Math.pow(2, z))
                .fill(0)
                .map((_, y) => {
                  const key = [x, y, z].join(',')
                  const buffers = {}
                  const data = {}
                  let setReady
                  this.bands.forEach((k) => {
                    buffers[k] = initialize()
                  })
                  this.tiles[key] = {
                    cache: { data: false, buffer: false, selector: null },
                    loading: false,
                    ready: new Promise((resolve) => {
                      setReady = resolve
                    }),
                    setReady: setReady,
                    data: null,
                    buffers: buffers,
                  }
                })
            })
        })

        levels.forEach((z) => {
          this.loaders[z] = loaders[z + '/' + variable]
        })

        if (Object.keys(selector).length > 0) {
          const key = Object.keys(selector)[0]
          loaders['0/' + key]([0], (err, chunk) => {
            const coordinates = Array.from(chunk.data)
            this.coordinates = {}
            this.coordinates[key] = coordinates
            this.accessors = getAccessors(this.bands, selector, coordinates)
            resolve(true)
          })
        } else {
          this.accessors = getAccessors(this.bands, selector)
          resolve(true)
        }
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
              ...tile.buffers,
              level,
              offset,
            })
          })
        }

        return accum
      }, [])
    }

    this.draw = () => {
      if (this.display) {
        this.drawTiles(this.getProps())
        this.renderedTick = this.tick
      } else {
        regl.clear({
          color: [0, 0, 0, 0],
          depth: 1,
        })
      }
    }

    this.updateCamera = ({ center, zoom, viewport, selector }) => {
      const level = zoomToLevel(zoom, this.maxZoom)
      const tile = pointToTile(center.lng, center.lat, level)
      const camera = pointToCamera(center.lng, center.lat, level)

      this.level = level
      this.zoom = zoom
      this.camera = [camera[0], camera[1]]

      this.active = getSiblings(tile, {
        viewport,
        zoom,
        camera: this.camera,
        size: this.size,
      })

      const selectorHash = getSelectorHash(selector)

      Object.keys(this.active).map((key) => {
        if (this.loaders[level] && this.accessors) {
          const tileIndex = keyToTile(key)
          const tile = this.tiles[key]
          const chunk =
            this.ndim > 2
              ? [0, tileIndex[1], tileIndex[0]]
              : [tileIndex[1], tileIndex[0]]
          tile.ready = true
          if (!tile.cache.data) {
            if (!tile.loading) {
              tile.loading = true
              this.loaders[level](chunk, (err, data) => {
                this.bands.forEach((k) => {
                  tile.buffers[k](this.accessors[k](data, selector))
                })
                tile.data = data
                tile.setReady(true)
                tile.cache.data = true
                tile.cache.buffer = true
                tile.cache.selector = selectorHash
                tile.loading = false
                this.redraw()
              })
            }
          }
          if (!(tile.cache.selector == selectorHash) && tile.cache.data) {
            this.bands.forEach((k) => {
              tile.buffers[k](this.accessors[k](tile.data, selector))
            })
            tile.cache.selector = selectorHash
            this.redraw()
          }
        }
      })
    }

    this.queryRegion = async (region) => {
      const tiles = getTilesOfRegion(region, this.level)

      await this.initialized
      await Promise.all(tiles.map((key) => this.tiles[key].ready))

      let results = {},
        coordinateKey,
        coordinateValues
      if (this.ndim > 2) {
        coordinateKey = Object.keys(this.coordinates)[0]
        coordinateValues = Object.values(this.coordinates)[0]
        coordinateValues.forEach((v) => {
          results[v] = []
        })
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
              const data = this.tiles[key].data
              if (this.ndim > 2) {
                coordinateValues.forEach((v, k) => {
                  results[v].push(data.get(k, j, i))
                })
              } else {
                results.push(data.get(j, i))
              }
            }
          }
        }
      })

      const out = { [this.variable]: results }

      if (this.ndim > 2) {
        out.dimensions = [coordinateKey]
        out.coordinates = { [coordinateKey]: coordinateValues }
      }

      return out
    }

    this.updateUniforms = (props) => {
      Object.keys(props).forEach((k) => {
        this[k] = props[k]
      })
    }

    this.updateColormap = ({ colormap }) => {
      this.colormap = regl.texture({
        data: colormap,
        format: 'rgb',
        shape: [255, 1],
      })
    }

    this.redraw = () => {
      if (this.renderedTick !== this.tick) {
        this.draw()
      }
    }

    this.renderedTick = 0
    regl.frame(({ tick }) => {
      this.tick = tick
    })
  }
}
