import zarr from 'zarr-js'
import Dataset from './dataset'
import DataArray from './data-array'

const loadZarr = () => {}

export const openZarr = async (uri, variable) => {
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
        const shape =
          metadata.metadata[`${groups[0]}/${variable}/.zarray`]['chunks']

        resolve({ dimensions, groups, shape, loaders })
      }
    })
  })

  const { loaders, dimensions, groups, shape } = result

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

  const dataArrays = groups.reduce((accum, group) => {
    accum[group] = new DataArray({
      dimensions,
      coordinates,
      shape,
      _loader: loaders[`${group}/${variable}`],
    })
    return accum
  }, {})
  return new Dataset({ dataVars: dataArrays, coordinates })
}
