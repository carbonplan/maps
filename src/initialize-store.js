import zarr from 'zarr-js'

import { getPyramidMetadata } from './utils'

const initializeStore = async (source, sourceDif, version, variable, coordinateKeys) => {
  let metadata, metadataDif
  let loaders, loadersDif
  let dimensions, dimensionsDif
  let shape, shapeDif
  let chunks, chunksDif
  let fill_value, fill_valueDif
  let dtype, dtypeDif
  let levels, maxZoom, tileSize, crs
  let levelsDif

  const coordinates = {}
  const coordinatesDif = {}
  switch (version) {
    case 'v2':
      await new Promise((resolve) =>
        zarr(window.fetch, version).openGroup(sourceDif, (err, l, m) => {
          loadersDif = l
          metadataDif = m
          resolve()
        })
      )
      ;({ levels, maxZoom, tileSize, crs } = getPyramidMetadata(
        metadataDif.metadata['.zattrs'].multiscales
      ))

      const zattrsDif = metadataDif.metadata[`${levels[0]}/${variable}/.zattrs`]
      const zarrayDif = metadataDif.metadata[`${levels[0]}/${variable}/.zarray`]
      dimensionsDif = zattrsDif['_ARRAY_DIMENSIONS']
      shapeDif = zarrayDif.shape
      chunksDif = zarrayDif.chunks
      fill_valueDif = zarrayDif.fill_value
      dtype = zarrayDif.dtype

      await Promise.all(
        coordinateKeys.map(
          (key) =>
            new Promise((resolve) => {
              loadersDif[`${levels[0]}/${key}`]([0], (err, chunk) => {
                coordinatesDif[key] = Array.from(chunk.data)
                resolve()
              })
            })
        )
      )

      // --- original zarr fetch ---
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
    metadataDif,
    loadersDif,
    dimensionsDif,
    shapeDif,
    chunksDif,
    fill_valueDif,
    coordinatesDif,
    levelsDif,
  }
}

export default initializeStore
