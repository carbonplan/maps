import { openArray } from 'zarr'
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
  getValuesToSet,
  setObjectValues,
} from './utils'

const initializeData = async (variable, selector) => {
  const store = 'https://storage.googleapis.com/carbonplan-share'
  const path = 'maps-demo/4d/tavg-prec-month'

  const metadata = await fetch(`${store}/${path}/.zmetadata`)
  const parsed = await metadata.json()
  const { levels, maxZoom, tileSize } = getPyramidMetadata(parsed)
  const dimensions =
    parsed.metadata[`${levels[0]}/${variable}/.zattrs`]['_ARRAY_DIMENSIONS']

  const loaders = {}
  for (const level of levels) {
    const z = await openArray({
      store,
      path: `${path}/${level}/${variable}`,
      mode: 'r',
    })

    loaders[level] = async (chunk) => {
      const data = await z.get(chunk)

      console.log(chunk, data.data)
      return data.data
    }
  }

  let coordinates = {}
  if (selector) {
    // fetch coordinate data
    await Promise.all(
      Object.keys(selector).map((key) =>
        (async () => {
          const keyPath = `${levels[0]}/${key}`
          const z = await openArray({
            store,
            path: `${path}/${keyPath}`,
            mode: 'r',
          })

          try {
            const raw = await z.getRaw()
            coordinates[key] = Array.from(raw.data)
          } catch (e) {
            console.warn(e)
            // TODO: remove hardcoded `band` coordinates from demo data (requires handling strings in zarr.js)
            coordinates[key] = ['tavg', 'prec']
          }
        })()
      )
    )
  }

  return { levels, maxZoom, tileSize, loaders, dimensions, coordinates }
}

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

    initializeData(variable, selector).then(
      ({ levels, maxZoom, tileSize, dimensions, loaders, coordinates }) => {
        const position = getPositions(tileSize, mode)
        this.position = regl.buffer(position)
        this.size = tileSize
        this.maxZoom = maxZoom
        this.dimensions = dimensions
        this.ndim = this.dimensions.length
        this.loaders = loaders
        this.coordinates = coordinates
        this.accessors = getAccessors(
          this.dimensions,
          this.bands,
          selector,
          this.coordinates
        )

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
      }
    )

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

      Object.keys(this.active).map(async (key) => {
        if (this.loaders[level] && this.accessors) {
          const tileIndex = keyToTile(key)
          const tile = this.tiles[key]
          const chunk = Array(this.ndim - 2)
            .fill(0)
            .concat([tileIndex[1], tileIndex[0]])

          tile.ready = true
          if (!tile.cache.data) {
            if (!tile.loading) {
              tile.loading = true
              const data = await this.loaders[level](chunk)
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

      let results,
        lat = [],
        lon = []
      if (this.ndim > 2) {
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
              const data = this.tiles[key].data

              lon.push(pointCoords[0])
              lat.push(pointCoords[1])

              if (this.ndim > 2) {
                const valuesToSet = getValuesToSet(
                  data,
                  i,
                  j,
                  this.dimensions,
                  this.coordinates
                )

                valuesToSet.forEach(({ keys, value }) => {
                  setObjectValues(results, keys, value)
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
        out.dimensions = [...Object.keys(this.coordinates), 'lat', 'lon']
        out.coordinates = { ...this.coordinates, lat, lon }
      } else {
        out.dimensions = ['lat', 'lon']
        out.coordinates = { lat, lon }
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
