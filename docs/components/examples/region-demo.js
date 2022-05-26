import { useThemeUI, Box, Flex } from 'theme-ui'
import { useState } from 'react'
import { Map, Raster, Fill, Line, RegionPicker } from '@carbonplan/maps'
import { useThemedColormap } from '@carbonplan/colormaps'
import { Code } from '@carbonplan/prism'
import { Toggle } from '@carbonplan/components'
import Zoom from './zoom'

const bucket = 'https://storage.googleapis.com/carbonplan-maps/'

const formatData = (data) => {
  if (!data) {
    return String(data)
  }

  if (!data.value) {
    return String(data)
  }

  return `
{
  value: {
  coordinates: {
    lat: (${data.value.coordinates.lat.length}) [${data.value.coordinates.lat
    .slice(0, 2)
    .join(', ')}, ...],
    lon: (${data.value.coordinates.lon.length}) [${data.value.coordinates.lon
    .slice(0, 2)
    .join(', ')}, ...],
  },
  dimensions: ['lat', 'lon'],
  tavg: (${data.value.tavg.length}) [${data.value.tavg
    .slice(0, 2)
    .join(', ')}, ...],
}
`
}

const RegionDemo = ({ showToggle = false, showData = false }) => {
  const { theme } = useThemeUI()
  const [data, setData] = useState(null)
  const [toggled, setToggled] = useState(!showToggle)
  const colormap = useThemedColormap('warm')

  return (
    <Box>
      <Box
        as='figure'
        sx={{
          my: [6, 6, 6, 7],
          width: '100%',
          height: ['300px', '400px', '400px', '500px'],
          border: 'solid',
          borderColor: 'muted',
          borderWidth: '1px',
          borderRadius: '1px',
        }}
      >
        <Map>
          {toggled && (
            <RegionPicker
              color={theme.colors.primary}
              backgroundColor={theme.colors.background}
              fontFamily={theme.fonts.mono}
              fontSize={'14px'}
              maxRadius={2000}
            />
          )}
          <Fill
            color={theme.rawColors.background}
            source={bucket + 'basemaps/ocean'}
            variable={'ocean'}
          />
          <Line
            color={theme.rawColors.primary}
            source={bucket + 'basemaps/land'}
            variable={'land'}
          />
          <Raster
            colormap={colormap}
            clim={[-20, 30]}
            source={bucket + 'v2/demo/2d/tavg'}
            variable={'tavg'}
            regionOptions={{ setData }}
          />

          {showToggle && (
            <Box sx={{ position: 'absolute', bottom: 0, float: 'left', m: 2 }}>
              <Flex sx={{ gap: 3 }}>
                <Toggle
                  sx={{ display: 'block' }}
                  value={toggled}
                  onClick={() => setToggled((prev) => !prev)}
                />
                <Box
                  sx={{
                    fontFamily: 'mono',
                    letterSpacing: 'mono',
                    textTransform: 'uppercase',
                    color: 'primary',
                  }}
                >
                  Region picker
                </Box>
              </Flex>
            </Box>
          )}

          <Zoom />
        </Map>
      </Box>
      {showData && <Code>{formatData(data)}</Code>}
    </Box>
  )
}

export default RegionDemo
