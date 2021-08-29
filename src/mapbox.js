import React, {
  createContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useContext,
} from 'react'
import mapboxgl from 'mapbox-gl'

export const MapboxContext = createContext(null)

export const useMapbox = () => {
  return useContext(MapboxContext)
}

const Mapbox = ({
  style,
  containerStyle,
  center,
  zoom,
  minZoom,
  debug,
  children,
}) => {
  const map = useRef()
  const [ready, setReady] = useState()

  const ref = useCallback((node) => {
    if (node !== null) {
      map.current = new mapboxgl.Map({
        container: node,
        style: style || {version: 8, sources: {}, layers: []},
        minZoom: minZoom,
      })
      if (center) map.current.setCenter(center)
      if (zoom) map.current.setZoom(zoom)
      if (debug) map.current.showTileBoundaries = true
      map.current.on('styledata', () => {
        setReady(true)
      })
    }
  }, [])

  useEffect(() => {
    return () => {
      if (map.current) map.current.remove()
      setReady(false)
    }
  }, [])

  return (
    <MapboxContext.Provider
      value={{
        map: map.current,
      }}
    >
      <div
        style={{
          top: '0px',
          bottom: '0px',
          position: 'absolute',
          width: '100%',
          ...containerStyle,
        }}
        ref={ref}
      />
      {ready && children}
    </MapboxContext.Provider>
  )
}

export default Mapbox
