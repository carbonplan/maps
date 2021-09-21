import { useState } from 'react'
import { Box, useThemeUI } from 'theme-ui'
import { Dimmer, Meta } from '@carbonplan/components'
import { Map, Raster, RegionPicker } from '@carbonplan/maps'
import { useColormap } from '@carbonplan/colormaps'
import Basemap from '../components/basemap'
import RegionControls from '../components/region-controls'
import ParameterControls from '../components/parameter-controls'
import style from '../components/style'

const Index = () => {
  const { theme } = useThemeUI()
  const [display, setDisplay] = useState(true)
  const [opacity, setOpacity] = useState(1)
  const [clim, setClim] = useState([-20, 30])
  const [month, setMonth] = useState(1)
  const [band, setBand] = useState('tavg')
  const [colormapName, setColormapName] = useState('warm')
  const colormap = useColormap(colormapName)
  const [showRegionPicker, setShowRegionPicker] = useState(false)
  const [regionData, setRegionData] = useState({ loading: true })

  const getters = { display, opacity, clim, month, band, colormapName }
  const setters = {
    setDisplay,
    setOpacity,
    setClim,
    setMonth,
    setBand,
    setColormapName,
  }

  return (
    <>
      <Meta />
      <Box sx={{ position: 'absolute', top: 0, bottom: 0, width: '100%' }}>
        <Map style={style} zoom={2} center={[0, 0]} debug={false}>
          <Basemap />
          {showRegionPicker && (
            <RegionPicker
              color={theme.colors.primary}
              backgroundColor={theme.colors.background}
              fontFamily={theme.fonts.mono}
              fontSize={'14px'}
              maxRadius={2000}
            />
          )}
          <Raster
            colormap={colormap}
            clim={clim}
            display={display}
            opacity={opacity}
            mode={'texture'}
            source={
              'https://storage.googleapis.com/carbonplan-share/testing/maps/4d/tavg-prec-month'
            }
            variable={'climate'}
            dimensions={['band', 'month', 'y', 'x']}
            selector={{ month, band }}
            setRegionData={setRegionData}
          />
          <RegionControls
            band={band}
            month={month}
            regionData={regionData}
            showRegionPicker={showRegionPicker}
            setShowRegionPicker={setShowRegionPicker}
          />
        </Map>
        <ParameterControls getters={getters} setters={setters} />
        <Dimmer
          sx={{
            display: ['initial', 'initial', 'initial', 'initial'],
            position: 'absolute',
            color: 'primary',
            right: [13],
            bottom: [17, 17, 15, 15],
          }}
        />
      </Box>
    </>
  )
}

export default Index
