import { useEffect, useState } from 'react'

import { useRegion } from './region/context'
import { useMapbox } from './mapbox'

export const useRecenterRegion = () => {
  const [value, setValue] = useState({ recenterRegion: () => {} })
  const { map } = useMapbox()
  const { region } = useRegion()

  const center = region?.properties?.center

  useEffect(() => {
    setValue({ recenterRegion: () => map.easeTo({ center }) })
  }, [center])

  return value
}

export default useRecenterRegion
