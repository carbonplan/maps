import { useEffect, useRef } from 'react'

import { useRegion } from './region/context'
import { useMapbox } from './mapbox'

export const useRecenterRegion = () => {
  const recenter = useRef(() => {})
  const { map } = useMapbox()

  const { region } = useRegion()
  const center = region?.properties?.center

  useEffect(() => {
    recenter.current = () => map.easeTo({ center })
  }, [center])

  return { recenterRegion: recenter.current }
}

export default useRecenterRegion
