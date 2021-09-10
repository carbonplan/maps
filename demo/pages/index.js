import { useState } from 'react'
import { Box, useThemeUI } from 'theme-ui'
import { Slider, Dimmer, Toggle, Select, Meta } from '@carbonplan/components'
import { Canvas, Raster, RegionPicker } from '@carbonplan/maps'
import { useColormap, colormaps } from '@carbonplan/colormaps'
import Basemap from '../components/basemap'
import RegionControls from '../components/region-controls'
import style from '../components/style'

const Index = () => {
  const { theme } = useThemeUI()
  const [display, setDisplay] = useState(true)
  const [opacity, setOpacity] = useState(1)
  const [clim, setClim] = useState([-20, 30])
  const [colormapName, setColormapName] = useState('warm')
  const colormap = useColormap(colormapName)
  const [showRegionPicker, setShowRegionPicker] = useState(false)
  const [regionData, setRegionData] = useState({ loading: true })

  return (
    <>
      <Meta />
      <Box sx={{ position: 'absolute', top: 0, bottom: 0, width: '100%' }}>
        <Canvas style={style} zoom={2} center={[0, 0]} debug={false}>
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
            maxZoom={5}
            size={128}
            colormap={colormap}
            clim={clim}
            display={display}
            opacity={opacity}
            mode={'texture'}
            nan={-3.4e38}
            source={
              'https://carbonplan.blob.core.windows.net/carbonplan-scratch/zarr-mapbox-webgl/128/{z}'
            }
            setRegionData={setRegionData}
          />
          <RegionControls
            regionData={regionData}
            showRegionPicker={showRegionPicker}
            setShowRegionPicker={setShowRegionPicker}
          />
        </Canvas>
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
        <Select
          onChange={(e) => setColormapName(e.target.value)}
          defaultValue={'warm'}
          sx={{ width: '200px', position: 'absolute', top: 80, left: 20 }}
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
