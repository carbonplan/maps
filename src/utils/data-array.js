import ndarray from 'ndarray'

class DataArray {
  constructor({ rawData, data, dimensions, coordinates, shape }) {
    this.dimensions = dimensions
    this.coordinates = coordinates
    this.ndim = dimensions.length
    if (rawData) {
      this.data = ndarray(rawData, shape)
      this.shape = shape
    } else {
      this.data = data
      this.shape = data.shape
    }
  }

  indexSelect(selector) {
    const result = this.dimensions.reduce(
      ({ indexes, coordinates }, dimension) => {
        let filteredCoordinates
        const { [dimension]: dimensionCoordinates, ...remainingCoordinates } =
          coordinates

        if (!dimensionCoordinates || dimensionCoordinates.length === 0) {
          indexes.push(null)
          filteredCoordinates = coordinates
        } else {
          indexes.push(selector[dimension])
          filteredCoordinates = remainingCoordinates
        }

        return { indexes, coordinates: filteredCoordinates }
      },
      { indexes: [], coordinates: this.coordinates }
    )

    const { indexes, coordinates } = result
    const data = this.data.pick(...indexes)
    return new DataArray({ data, dimensions: this.dimensions, coordinates })
  }

  select(selector) {
    const indexSelector = Object.keys(selector).reduce((accum, dimension) => {
      const selectorValue = selector[dimension]
      const index = this.coordinates[dimension].indexOf(selectorValue)
      accum[dimension] = index
      return accum
    }, {})

    return this.indexSelect(indexSelector)
  }
}

export default DataArray
