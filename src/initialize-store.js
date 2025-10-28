import zarr from 'zarr-js'

import { getPyramidMetadata } from './utils'

const createLoader = ({ callGet, variable }) => {
  return {
    load: ({ level, chunk }) => callGet(`${level}/${variable}`, chunk),
  }
}

const initializeStore = async (
  source,
  version,
  variable,
  coordinateKeys,
  metadataCache = {}
) => {
  let metadata
  let dimensions
  let shape
  let chunks
  let fill_value
  let dtype
  let levels, maxZoom, tileSize, crs
  let loader
  const coordinates = {}
  const cacheKey = `${source}-${version}`

  switch (version) {
    case 'v2':
      try {
        let zmetadata
        if (metadataCache[cacheKey]) {
          zmetadata = metadataCache[cacheKey]
        } else {
          zmetadata = await fetch(`${source}/.zmetadata`).then((res) =>
            res.json()
          )
          metadataCache[cacheKey] = zmetadata
        }
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

        loader = createLoader({
          callGet,
          variable,
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

        loader = createLoader({
          callGet: (key, chunkIndices) =>
            new Promise((resolve, reject) => {
              rawLoaders[key](chunkIndices, (err, out) => {
                if (err) return reject(err)
                resolve(out)
              })
            }),
          variable,
        })
      }

      break
    case 'v3':
      if (metadataCache[cacheKey]) {
        metadata = metadataCache[cacheKey]
      } else {
        metadata = await fetch(`${source}/zarr.json`).then((res) => res.json())
        metadataCache[cacheKey] = metadata
      }
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

      const getChunk = (key, chunkIndices) => {
        const meta = key.startsWith(`${levels[0]}/${variable}`)
          ? arrayMetadata
          : null
        return callGet(key, chunkIndices, meta)
      }

      loader = createLoader({
        callGet: getChunk,
        variable,
      })
      break
    default:
      throw new Error(
        `Unexpected Zarr version: ${version}. Must be one of 'v2', 'v3'.`
      )
  }

  return {
    metadata,
    loader,
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
