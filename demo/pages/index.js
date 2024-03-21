import { useState } from 'react'
import { Box, useThemeUI } from 'theme-ui'
import { Dimmer, Meta } from '@carbonplan/components'
import { Map, Raster, Fill, Line, RegionPicker } from '@carbonplan/maps'
import { useThemedColormap } from '@carbonplan/colormaps'
import RegionControls from '../components/region-controls'
import ParameterControls from '../components/parameter-controls'

const bucket = 'https://carbonplan-maps.s3.us-west-2.amazonaws.com/'

const Index = () => {
  const { theme } = useThemeUI()
  const [display, setDisplay] = useState(true)
  const [debug, setDebug] = useState(false)
  const [opacity, setOpacity] = useState(1)
  const [clim, setClim] = useState([-20, 30])
  const [time, setTime] = useState(4261.5)
  const [variable, setVariable] = useState('sst')
  const [colormapName, setColormapName] = useState('warm')
  const colormap = useThemedColormap(colormapName)
  const [showRegionPicker, setShowRegionPicker] = useState(false)
  const [regionData, setRegionData] = useState({ loading: true })

  const getters = {
    display,
    debug,
    opacity,
    clim,
    time,
    variable,
    colormapName,
  }
  const setters = {
    setDisplay,
    setDebug,
    setOpacity,
    setClim,
    setTime,
    setVariable,
    setColormapName,
  }
  return (
    <>
      <Meta
        card={'https://images.carbonplan.org/social/maps-demo.png'}
        description={
          'Demo of our library for making interactive multi-dimensional data-driven web maps.'
        }
        title={'@carbonplan/maps'}
      />
      <Box sx={{ position: 'absolute', top: 0, bottom: 0, width: '100%' }}>
        <Map zoom={2} center={[0, 0]} debug={debug}>
          <Fill
            color={theme.rawColors.background}
            source={bucket + 'basemaps/land'}
            variable={'land'}
          />
          <Line
            color={theme.rawColors.primary}
            source={bucket + 'basemaps/land'}
            variable={'land'}
          />
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
            key={variable}
            variable={variable}
            colormap={colormap}
            clim={clim}
            display={display}
            opacity={opacity}
            mode={'texture'}
            source={
              'https://carbonplan-scratch.s3.us-west-2.amazonaws.com/oisst_1_year_3_lvl/pyramid'
            }
            selector={{
              time,
              zlev: 0,
            }}
            regionOptions={{ setData: setRegionData }}
          />
          <RegionControls
            variable={variable}
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
