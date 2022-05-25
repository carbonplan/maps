import { useThemeUI, Box, Flex } from 'theme-ui'
import { useState } from 'react'
import { Badge } from '@carbonplan/components'
import { Map, Raster, Fill, Line } from '@carbonplan/maps'
import { useThemedColormap } from '@carbonplan/colormaps'
import Zoom from './zoom'

const bucket = 'https://storage.googleapis.com/carbonplan-maps/'

const LoadingDemo = ({ map = true, raster = false }) => {
  const { theme } = useThemeUI()
  const colormap = useThemedColormap('warm')
  const [loading, setLoading] = useState(false)
  const [metadataLoading, setMetadataLoading] = useState(false)
  const [chunkLoading, setChunkLoading] = useState(false)

  const loadingProps = {
    setLoading,
    setMetadataLoading,
    setChunkLoading,
  }
  let mapProps = {}
  let rasterProps = {}
  if (map) {
    mapProps = loadingProps
  } else if (raster) {
    rasterProps = loadingProps
  }

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
        <Map {...mapProps}>
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
            {...rasterProps}
          />
          <Flex
            sx={{
              position: 'absolute',
              bottom: 0,
              flexDirection: 'column',
              m: 2,
              fontFamily: 'mono',
              letterSpacing: '0.05em',
              //   textTransform: 'uppercase',
            }}
          >
            <Box>
              loading: <Badge>{String(loading)}</Badge>
            </Box>
            <Box>
              metadata loading: <Badge>{String(metadataLoading)}</Badge>
            </Box>
            <Box>
              chunk loading: <Badge>{String(chunkLoading)}</Badge>
            </Box>
          </Flex>
          <Zoom />
        </Map>
      </Box>
    </Box>
  )
}

export default LoadingDemo
