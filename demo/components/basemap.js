import { useEffect } from 'react'
import { useThemeUI } from 'theme-ui'
import { useMapbox } from '@carbonplan/maps'

const Basemap = ({ inverted }) => {
  const { map } = useMapbox()
  const {
    theme: { rawColors: colors },
  } = useThemeUI()
  const { primary, background, muted, hinted } = colors

  useEffect(() => {
    if (!map.getLayer('land-line')) {
      map.addLayer({
        id: 'land-line',
        type: 'line',
        source: 'basemap',
        'source-layer': 'ne_10m_land',
        layout: { visibility: 'visible' },
        paint: {
          'line-blur': 0.4,
          'line-color': primary,
          'line-opacity': 1,
          'line-width': 1.5,
        },
      })
    }
    if (!map.getLayer('land-fill')) {
      map.addLayer({
        id: 'land-fill',
        type: 'fill',
        source: 'basemap',
        'source-layer': 'ne_10m_land',
        layout: { visibility: 'visible' },
        paint: {
          'fill-color': background,
          'fill-opacity': inverted ? 1 : 0,
        },
      })
    }
  }, [])

  useEffect(() => {
    if (map.getLayer('land-line')) {
      map.setPaintProperty('land-line', 'line-color', primary)
    }
    if (map.getLayer('land-fill')) {
      map.setPaintProperty('land-fill', 'fill-color', background)
    }
  }, [colors])

  return null
}

export default Basemap
