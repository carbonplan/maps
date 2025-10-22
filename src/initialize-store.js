import zarr from 'zarr-js'

import { getPyramidMetadata } from './utils'

const initializeStore = async (source, version, variable, coordinateKeys) => {
  let metadata
  let loaders
  let dimensions
  let shape
  let chunks
  let fill_value
  let dtype
  let levels, maxZoom, tileSize, crs
  const coordinates = {}
  switch (version) {
    case 'v2':
      try {
        // Fetch consolidated metadata directly
        const zmetadata = await fetch(`${source}/.zmetadata`).then((res) =>
          res.json()
        )
        metadata = { metadata: zmetadata.metadata }
        const rootAttrs = zmetadata.metadata['.zattrs']
        ;({ levels, maxZoom, tileSize, crs } = getPyramidMetadata(
          rootAttrs.multiscales
        ))

        const zattrs = metadata.metadata[`${levels[0]}/${variable}/.zattrs`]
        const zarray = metadata.metadata[`${levels[0]}/${variable}/.zarray`]
        dimensions = zattrs['_ARRAY_DIMENSIONS']
        shape = zarray.shape
        chunks = zarray.chunks
        fill_value = zarray.fill_value
        dtype = zarray.dtype

        const loadersCache = {}

        const loadLevel = (key) => {
          if (loadersCache[key]) {
            return Promise.resolve(loadersCache[key])
          }

          const promise = new Promise((resolve) => {
            const arrayMeta = metadata.metadata[`${key}/.zarray`]
            zarr(window.fetch, version).open(
              `${source}/${key}`,
              (err, get) => {
                loadersCache[key] = get
                resolve(get)
              },
              arrayMeta
            )
          })

          loadersCache[key] = promise
          return promise
        }

        await Promise.all(
          coordinateKeys.map((key) => {
            const coordKey = `${levels[0]}/${key}`
            return loadLevel(coordKey).then(
              (get) =>
                new Promise((resolve) => {
                  get([0], (err, chunk) => {
                    coordinates[key] = Array.from(chunk.data)
                    resolve()
                  })
                })
            )
          })
        )

        loaders = {}
        levels.forEach((level) => {
          const key = `${level}/${variable}`
          loaders[key] = (...args) => {
            return loadLevel(key).then((loader) => loader(...args))
          }
        })

        coordinateKeys.forEach((key) => {
          loaders[`${levels[0]}/${key}`] = loadersCache[`${levels[0]}/${key}`]
        })
      } catch (e) {
        // Fallback to openGroup
        await new Promise((resolve) =>
          zarr(window.fetch, version).openGroup(source, (err, l, m) => {
            loaders = l
            metadata = m
            resolve()
          })
        )
        ;({ levels, maxZoom, tileSize, crs } = getPyramidMetadata(
          metadata.metadata['.zattrs'].multiscales
        ))

        const zattrs = metadata.metadata[`${levels[0]}/${variable}/.zattrs`]
        const zarray = metadata.metadata[`${levels[0]}/${variable}/.zarray`]
        dimensions = zattrs['_ARRAY_DIMENSIONS']
        shape = zarray.shape
        chunks = zarray.chunks
        fill_value = zarray.fill_value
        dtype = zarray.dtype

        await Promise.all(
          coordinateKeys.map(
            (key) =>
              new Promise((resolve) => {
                loaders[`${levels[0]}/${key}`]([0], (err, chunk) => {
                  coordinates[key] = Array.from(chunk.data)
                  resolve()
                })
              })
          )
        )
      }

      break
    case 'v3':
      metadata = await fetch(`${source}/zarr.json`).then((res) => res.json())
      ;({ levels, maxZoom, tileSize, crs } = getPyramidMetadata(
        metadata.attributes.multiscales
      ))

      const arrayMetadata = await fetch(
        `${source}/${levels[0]}/${variable}/zarr.json`
      ).then((res) => res.json())

      dimensions = arrayMetadata.attributes['_ARRAY_DIMENSIONS']
      shape = arrayMetadata.shape
      const isSharded = arrayMetadata.codecs[0].name == 'sharding_indexed'
      chunks = isSharded
        ? arrayMetadata.codecs[0].configuration.chunk_shape
        : arrayMetadata.chunk_grid.configuration.chunk_shape
      fill_value = arrayMetadata.fill_value
      // dtype = arrayMetadata.data_type

      loaders = {}
      await Promise.all([
        ...levels.map(
          (level) =>
            new Promise((resolve) => {
              zarr(window.fetch, version).open(
                `${source}/${level}/${variable}`,
                (err, get) => {
                  loaders[`${level}/${variable}`] = get
                  resolve()
                },
                level === 0 ? arrayMetadata : null
              )
            })
        ),
        ...coordinateKeys.map(
          (key) =>
            new Promise((resolve) => {
              zarr(window.fetch, version).open(
                `${source}/${levels[0]}/${key}`,
                (err, get) => {
                  get([0], (err, chunk) => {
                    coordinates[key] = Array.from(chunk.data)
                    resolve()
                  })
                }
              )
            })
        ),
      ])
      break
    default:
      throw new Error(
        `Unexpected Zarr version: ${version}. Must be one of 'v1', 'v2'.`
      )
  }

  return {
    metadata,
    loaders,
    dimensions,
    shape,
    chunks,
    fill_value,
    dtype,
    coordinates,
    levels,
    maxZoom,
    tileSize,
    crs,
  }
}

export default initializeStore
