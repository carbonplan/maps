import zarr from 'zarr-js'
import ndarray from 'ndarray'
import { distance } from '@turf/turf'

import { vert, frag } from './shaders'
import {
  zoomToLevel,
  keyToTile,
  pointToCamera,
  pointToTile,
  getSiblings,
  getKeysToRender,
  getAdjustedOffset,
  getOverlappingAncestor,
  cameraToPoint,
  getTilesOfRegion,
  getPyramidMetadata,
} from './utils'

export const createTiles = (regl, opts) => {
  return new Tiles(opts)

  function Tiles({
    size,
    source,
    colormap,
    clim,
    opacity,
    display,
    variable,
    dimensions,
    select,
    uniforms: customUniforms = {},
    frag: customFrag,
    nan = -9999,
    mode = 'texture',
  }) {
    this.tiles = {}
    this.loaders = {}
    this.active = {}
    this.size = size
    this.display = display
    this.clim = clim
    this.opacity = opacity
    this.select = select
    this.nan = nan
    this.colormap = regl.texture({
      data: colormap,
      format: 'rgb',
      shape: [255, 1],
    })
    this._tilesData = {}

    const validModes = ['grid', 'dotgrid', 'texture']
    if (!validModes.includes(mode)) {
      throw Error(
        `mode '${mode}' invalid, must be one of ${validModes.join(', ')}`
      )
    }

    // figure out variables based on dimensions and select
    const variables = ['value']
    this.variables = variables
    this.ndim = 2

    customUniforms = Object.keys(customUniforms)

    let position = []
    let count,
      primitive,
      initialize,
      attributes = {},
      uniforms = {}

    if (mode === 'grid' || mode === 'dotgrid') {
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          position.push([j + 0.5, i + 0.5])
        }
      }
      primitive = 'points'
      count = position.length
      initialize = () => regl.buffer()
      variables.forEach((k) => (attributes[k] = regl.prop(k)))
      uniforms = {}
    }

    if (mode === 'texture') {
      position = [
        0.0,
        0.0,
        0.0,
        size,
        size,
        0.0,
        size,
        0.0,
        0.0,
        size,
        size,
        size,
      ]
      primitive = 'triangles'
      count = 6
      const emptyTexture = ndarray(new Float32Array(Array(1).fill(nan)), [1, 1])
      initialize = () => regl.texture(emptyTexture)
      variables.forEach((k) => (uniforms[k] = regl.prop(k)))
    }

    customUniforms.forEach((k) => (uniforms[k] = regl.this(k)))

    this.position = regl.buffer(position)

    this._tilesData.initialized = new Promise((resolve) => {
      zarr().openGroup(source, (err, loaders, metadata) => {
        const { levels, maxZoom } = getPyramidMetadata(metadata)
        this.maxZoom = maxZoom
        levels.map((z) => {
          Array(Math.pow(2, z))
            .fill(0)
            .map((_, x) => {
              Array(Math.pow(2, z))
                .fill(0)
                .map((_, y) => {
                  const key = [x, y, z].join(',')
                  const buffers = {}
                  this.variables.forEach((k) => {
                    buffers[k] = initialize()
                  })
                  this.tiles[key] = {
                    cached: false,
                    loading: false,
                    ready: false,
                    ...buffers,
                  }

                  let resolver
                  const values = new Promise((resolve) => {
                    resolver = resolve
                  })
                  this._tilesData[key] = {
                    values,
                    resolve: resolver,
                  }
                })
            })
        })
        levels.forEach((z) => {
          this.loaders[z] = loaders[z + '/' + variable]
        })
        resolve(true)
      })
    })

    this.drawTiles = regl({
      vert: vert(mode, variables),

      frag: frag(mode, variables, customFrag, customUniforms),

      attributes: {
        position: regl.this('position'),
        value: regl.prop('value'),
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
        nan: regl.this('nan'),
        value: regl.prop('value'),
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

      count: count,

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
              ...tile,
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

    this.updateCamera = ({ center, zoom, viewport }) => {
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

      Object.keys(this.active).map((key) => {
        if (this.loaders[level]) {
          const tileIndex = keyToTile(key)
          const tile = this.tiles[key]
          const tileData = this._tilesData[key]

          const accessor =
            this.ndim > 2 ? (d, i) => d.pick(i, null, null) : (d) => d
          const chunk =
            this.ndim > 2
              ? [0, tileIndex[1], tileIndex[0]]
              : [tileIndex[1], tileIndex[0]]
          tile.ready = true
          if (!tile.cached) {
            if (!tile.loading) {
              tile.loading = true
              this.loaders[level](chunk, (err, data) => {
                this.variables.forEach((k, i) => {
                  tile[k](accessor(data, i))
                })
                tileData.resolve(data)
                tile.cached = true
                tile.loading = false
                this.redraw()
              })
            }
          }
        }
      })
    }

    this.queryRegion = async (region) => {
      const tiles = getTilesOfRegion(region, this.level)
      const results = this.variables.reduce((accum, v) => {
        accum[v] = []
        return accum
      }, {})

      await this._tilesData.initialized

      const tilesData = await Promise.all(
        tiles.map((tileKey) => this._tilesData[tileKey].values)
      )

      tiles.map((tileKey, index) => {
        const [x, y, z] = keyToTile(tileKey)
        const { center, radius, units } = region.properties
        const accessor =
          this.ndim > 2
            ? (d, i, j, v) => d.get(v, j, i)
            : (d, i, j) => d.get(j, i)

        for (let i = 0; i < this.size; i++) {
          for (let j = 0; j < this.size; j++) {
            const pointCoords = cameraToPoint(x + i / size, y + j / size, z)
            const distanceToCenter = distance(
              [center.lng, center.lat],
              pointCoords,
              {
                units,
              }
            )
            if (distanceToCenter < radius) {
              const data = tilesData[index]

              this.variables.map((v, idx) => {
                results[v].push(accessor(data, i, j, idx))
              })
            }
          }
        }
      })

      return results
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
