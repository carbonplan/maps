import zarr from 'zarr-js'

import { getPyramidMetadata } from './utils'

// return promises for all for consistency
const wrapGet = (getFn) => {
  return (chunkIndices) =>
    new Promise((resolve, reject) => {
      getFn(chunkIndices, (err, out) => (err ? reject(err) : resolve(out)))
    })
}

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

        const getCache = new Map()

        const callGet = async (key, chunkIndices) => {
          let getPromise = getCache.get(key)

          if (!getPromise) {
            const arrayMeta = metadata.metadata[`${key}/.zarray`]
            getPromise = new Promise((resolve, reject) => {
              zarr(window.fetch, version).open(
                `${source}/${key}`,
                (err, get) => (err ? reject(err) : resolve(get)),
                arrayMeta
              )
            })
            getCache.set(key, getPromise)
          }

          const get = await getPromise
          return new Promise((resolve, reject) => {
            get(chunkIndices, (err, out) => (err ? reject(err) : resolve(out)))
          })
        }

        await Promise.all(
          coordinateKeys.map(async (key) => {
            const coordKey = `${levels[0]}/${key}`
            const chunk = await callGet(coordKey, [0])
            coordinates[key] = Array.from(chunk.data)
          })
        )

        loaders = {}
        levels.forEach((level) => {
          const key = `${level}/${variable}`
          loaders[key] = (chunkIndices) => callGet(key, chunkIndices)
        })

        coordinateKeys.forEach((key) => {
          const coordKey = `${levels[0]}/${key}`
          loaders[coordKey] = (chunkIndices) => callGet(coordKey, chunkIndices)
        })
      } catch (e) {
        // Fallback to openGroup
        let rawLoaders
        await new Promise((resolve) =>
          zarr(window.fetch, version).openGroup(source, (err, l, m) => {
            rawLoaders = l
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
          coordinateKeys.map((key) => {
            const coordKey = `${levels[0]}/${key}`
            return new Promise((resolve, reject) => {
              rawLoaders[coordKey]([0], (err, chunk) => {
                if (err) return reject(err)
                coordinates[key] = Array.from(chunk.data)
                resolve()
              })
            })
          })
        )

        loaders = {}
        Object.keys(rawLoaders).forEach((key) => {
          loaders[key] = wrapGet(rawLoaders[key])
        })
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

      const getCache = new Map()

      const callGet = async (key, chunkIndices, meta = null) => {
        let getPromise = getCache.get(key)

        if (!getPromise) {
          getPromise = new Promise((resolve, reject) => {
            zarr(window.fetch, version).open(
              `${source}/${key}`,
              (err, get) => (err ? reject(err) : resolve(get)),
              meta
            )
          })
          getCache.set(key, getPromise)
        }

        const get = await getPromise
        return new Promise((resolve, reject) => {
          get(chunkIndices, (err, out) => (err ? reject(err) : resolve(out)))
        })
      }

      await Promise.all(
        coordinateKeys.map(async (key) => {
          const coordKey = `${levels[0]}/${key}`
          const chunk = await callGet(coordKey, [0])
          coordinates[key] = Array.from(chunk.data)
        })
      )

      loaders = {}
      levels.forEach((level) => {
        const key = `${level}/${variable}`
        const meta = level === 0 ? arrayMetadata : null
        loaders[key] = (chunkIndices) => callGet(key, chunkIndices, meta)
      })

      coordinateKeys.forEach((key) => {
        const coordKey = `${levels[0]}/${key}`
        loaders[coordKey] = (chunkIndices) => callGet(coordKey, chunkIndices)
      })
      break
    default:
      throw new Error(
        `Unexpected Zarr version: ${version}. Must be one of 'v2', 'v3'.`
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
