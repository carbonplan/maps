import { useEffect, useRef, useState } from 'react'
import { useLoadingContext } from './loading/context'
import { useMapbox } from './mapbox'

class MapBenchmarker {
  constructor() {
    this.callbacks = []
  }

  onIdle(cb) {
    this.callbacks.push(cb)
  }

  fireIdle() {
    this.callbacks.forEach((cb) => cb())
  }
}

const Benchmarker = () => {
  const { loading } = useLoadingContext()
  const { map } = useMapbox()

  // initialize combined idle trackers: mapbox *not* idle by default
  // and raster idle based on loading tracking value
  const [, setIdlers] = useState({ mapbox: false, rasters: !loading })

  const benchmarker = useRef(new MapBenchmarker(map))

  useEffect(() => {
    if (!window._map) {
      window._map = benchmarker.current
    }

    const mapboxCb = () => {
      setIdlers((prev) => {
        if (prev.mapbox) {
          return prev
        } else {
          if (prev.rasters) {
            benchmarker.current.fireIdle()
          }
          return { ...prev, mapbox: true }
        }
      })
    }
    map.on('idle', mapboxCb)

    return () => {
      map.off('idle', mapboxCb)
      window._map = null
    }
  }, [])

  useEffect(() => {
    setIdlers((prev) => {
      const updatedRasters = !loading
      if (prev.rasters === updatedRasters) {
        return prev
      } else {
        if (updatedRasters && prev.mapbox) {
          benchmarker.current.fireIdle()
        }
        return { ...prev, rasters: updatedRasters }
      }
    })
  }, [loading])

  return null
}

export default Benchmarker
