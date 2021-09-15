import { useState } from 'react'
import { Box, useThemeUI } from 'theme-ui'
import { Slider, Dimmer, Toggle, Select, Meta } from '@carbonplan/components'
import { Map, Raster, RegionPicker } from '@carbonplan/maps'
import { useColormap, colormaps } from '@carbonplan/colormaps'
import Basemap from '../components/basemap'
import RegionControls from '../components/region-controls'
import style from '../components/style'

const Index = () => {
  const { theme } = useThemeUI()
  const [display, setDisplay] = useState(true)
  const [opacity, setOpacity] = useState(1)
  const [clim, setClim] = useState([-20, 30])
  const [month, setMonth] = useState(1)
  const [year, setYear] = useState(2011)
  const [colormapName, setColormapName] = useState('fire')
  const colormap = useColormap(colormapName)
  const [showRegionPicker, setShowRegionPicker] = useState(false)
  const [regionData, setRegionData] = useState({ loading: true })

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
              fontFamily={theme.fonts.monospace}
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
              'https://storage.googleapis.com/carbonplan-scratch/map-tests/processed/temp'
            }
            variable={'temperature'}
            dimensions={['y', 'x']}
            setRegionData={setRegionData}
          />
          <RegionControls
            regionData={regionData}
            showRegionPicker={showRegionPicker}
            setShowRegionPicker={setShowRegionPicker}
          />
        </Map>
        <Toggle
          sx={{ position: 'absolute', top: 20, right: 20 }}
          value={display}
          onClick={() => setDisplay((prev) => !prev)}
        />
        <Slider
          min={0}
          max={1}
          step={0.01}
          sx={{ width: '200px', position: 'absolute', top: 20, left: 20 }}
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
        />
        <Slider
          min={-20}
          max={30}
          step={1}
          sx={{ width: '200px', position: 'absolute', top: 40, left: 20 }}
          value={clim[0]}
          onChange={(e) =>
            setClim((prev) => [parseFloat(e.target.value), prev[1]])
          }
        />
        <Slider
          min={-20}
          max={30}
          step={1}
          sx={{ width: '200px', position: 'absolute', top: 60, left: 20 }}
          value={clim[1]}
          onChange={(e) =>
            setClim((prev) => [prev[0], parseFloat(e.target.value)])
          }
        />
        <Slider
          min={1}
          max={12}
          step={1}
          sx={{ width: '200px', position: 'absolute', top: 80, left: 20 }}
          value={month}
          onChange={(e) => setMonth(parseFloat(e.target.value))}
        />
        <Slider
          min={2001}
          max={2020}
          step={1}
          sx={{ width: '200px', position: 'absolute', top: 100, left: 20 }}
          value={year}
          onChange={(e) => setYear(parseFloat(e.target.value))}
        />
        <Select
          onChange={(e) => setColormapName(e.target.value)}
          defaultValue={'warm'}
          sx={{ width: '200px', position: 'absolute', top: 120, left: 20 }}
        >
          {colormaps.map((d) => (
            <option key={d.name}>{d.name}</option>
          ))}
        </Select>
        <Dimmer
          sx={{
            display: ['none', 'none', 'initial', 'initial'],
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
