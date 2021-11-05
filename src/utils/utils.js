import zarr from 'zarr-js'
import Dataset from './dataset'
import DataArray from './data-array'

export const openZarrTree = async (uri, variable) => {
  const result = await new Promise((resolve, reject) => {
    zarr().openGroup(uri, (err, loaders, metadata) => {
      if (err) {
        reject(err)
      } else {
        // TODO: remove hardcoded `levels`
        const { levels } =
          metadata.metadata['.zattrs'].multiscales[0].metadata.kwargs
        const groups = Array(levels)
          .fill()
          .map((_, i) => i)
        const dimensions =
          metadata.metadata[`${groups[0]}/${variable}/.zattrs`][
            '_ARRAY_DIMENSIONS'
          ]

        const chunks = [variable, ...dimensions].reduce((accum, v) => {
          accum[v] = metadata.metadata[`${groups[0]}/${v}/.zarray`]['chunks']
          return accum
        }, {})

        resolve({ dimensions, groups, chunks, loaders })
      }
    })
  })

  const { loaders, dimensions, groups, chunks } = result

  const coordinates = {}

  await Promise.all(
    dimensions.map(
      (dimension) =>
        new Promise((resolve) => {
          loaders[`${groups[0]}/${dimension}`]([0], (err, chunk) => {
            coordinates[dimension] = Array.from(chunk.data)
            resolve()
          })
        })
    )
  )

  return groups.reduce((result, group) => {
    const variableArray = new DataArray({
      dimensions,
      coordinates,
      shape: chunks[variable],
      _loader: loaders[`${group}/${variable}`],
    })

    const dataArrays = dimensions.reduce(
      (accum, dimension) => {
        accum[dimension] = new DataArray({
          dimensions,
          coordinates,
          shape: chunks[dimension],
          _loader: loaders[`${group}/${dimension}`],
        })
        return accum
      },
      { [variable]: variableArray }
    )
    result[group] = new Dataset({ dataVars: dataArrays, coordinates })
    return result
  }, {})
}
