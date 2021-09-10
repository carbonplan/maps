import zarr from 'zarr-js'
import pupa from 'pupa'
import xhr from 'xhr-request'
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
  getCacheKeyForIndex,
} from './utils'

export const createTiles = (regl, opts) => {
  return new Tiles(opts)

  function Tiles({
    size,
    source,
    maxZoom,
    colormap,
    clim,
    opacity,
    display,
    uniforms: customUniforms = {},
    frag: customFrag,
    ndim = 2,
    nan = -9999,
    mode = 'texture',
    variables = ['value'],
    activeIndex = [],
  }) {
    this.tiles = {}
    this.loaders = {}
    this.active = {}
    this.size = size
    this.display = display
    this.maxZoom = maxZoom
    this.clim = clim
    this.opacity = opacity
    this.variables = variables
    this.activeIndex = activeIndex
    this.ndim = ndim
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

    const levels = Array(maxZoom + 1)
      .fill()
      .map((_, i) => i)

    const uris = levels.map((d) => pupa(source, { z: d }))

    this._tilesData.initialized = new Promise((resolve) => {
      zarr(xhr).openList(uris, (err, loaders) => {
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
                    cacheIndex: null,
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
        loaders.map((d, i) => (this.loaders[i] = d))
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

    this.updateCamera = ({ activeIndex, center, zoom, viewport }) => {
      const level = zoomToLevel(zoom, this.maxZoom)
      const tile = pointToTile(center.lng, center.lat, level)
      const camera = pointToCamera(center.lng, center.lat, level)

      this.level = level
      this.activeIndex = activeIndex
      this.zoom = zoom
      this.camera = [camera[0], camera[1]]
      // const ndim = 2 + this.activeIndex.length + (this.variables.length > 1 ? 1 : 0)

      this.active = getSiblings(tile, {
        viewport,
        zoom,
        camera: this.camera,
        size: this.size,
      })
      const activeCacheKey = getCacheKeyForIndex(this.activeIndex)

      Object.keys(this.active).map((key) => {
        if (this.loaders[level]) {
          const tileIndex = keyToTile(key)
          const tile = this.tiles[key]
          const tileData = this._tilesData[key]

          // console.log({ cache: tile.cacheIndex, active: activeCacheKey })
          tile.ready = true
          if (tile.cacheIndex !== activeCacheKey) {
            if (tile.cacheIndex) {
              // Load data to buffer from _tilesData
              tileData.values.then((data) => {
                const variableData = this.getVariableData(data)
                for (const variable in variableData) {
                  tile[variable](variableData[variable])
                }
              })
            } else if (!tile.loading) {
              const chunk =
                this.ndim > 2
                  ? [0, tileIndex[1], tileIndex[0]]
                  : [tileIndex[1], tileIndex[0]]

              tile.loading = true
              // Load data
              this.loaders[level](chunk, (err, data) => {
                const variableData = this.getVariableData(data)
                for (const variable in variableData) {
                  tile[variable](variableData[variable])
                }

                tileData.resolve(data)
                tile.cacheIndex = activeCacheKey
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
              const variableData = this.getVariableData(tilesData[index])
              for (const variable in variableData) {
                results[variable].push(variableData[variable].get(j, i))
              }
            }
          }
        }
      })

      return results
    }

    this.getVariableData = (data) => {
      const accessor =
        this.ndim > 2
          ? (d, ...position) => d.pick(...position, null, null)
          : (d) => d

      let indexes = [...this.activeIndex]
      if (this.variables.length > 1) {
        indexes.push(i)
      }

      const result = {}
      this.variables.forEach((k, i) => {
        let indexes = [...this.activeIndex]
        // console.log(indexes)
        if (this.variables.length > 1) {
          indexes.push(i)
        }
        result[k] = accessor(data, ...indexes)
      })

      return result
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
