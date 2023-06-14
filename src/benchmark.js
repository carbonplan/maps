import { useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'

class Benchmark {
  constructor(id) {
    this.id = id
    this.callbacks = []
  }

  onIdle(cb) {
    this.callbacks.push(cb)
  }

  fireIdle() {
    this.callbacks.forEach((cb) => cb())
    this.callbacks = []
  }
}

const useBenchmark = (active) => {
  const benchmarkId = useRef(uuidv4())
  const benchmarker = useRef(
    active ? new Benchmark(benchmarkId.current) : { fireIdle: () => {} }
  )

  useEffect(() => {
    if (!window._rasters) {
      window._rasters = []
    }

    window._rasters.push(benchmarker.current)

    return () => {
      if (window._rasters) {
        window._rasters = window._rasters.filter(
          (d) => d !== benchmarker.current
        )
      }
    }
  }, [active])

  return { fireIdle: benchmarker.current.fireIdle.bind(benchmarker.current) }
}

export default useBenchmark
