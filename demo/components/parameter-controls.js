import { Box, Flex } from 'theme-ui'
import { useCallback } from 'react'
import { Slider, Badge, Toggle, Select, Link } from '@carbonplan/components'
import { colormaps } from '@carbonplan/colormaps'

const sx = {
  label: {
    fontFamily: 'mono',
    letterSpacing: 'mono',
    textTransform: 'uppercase',
    fontSize: [1, 1, 1, 2],
    mt: [3],
  },
}

const CLIM_RANGES = {
  tavg: { max: 30, min: -20 },
  prec: { max: 300, min: 0 },
}

const DEFAULT_COLORMAPS = {
  tavg: 'warm',
  prec: 'cool',
}

const ParameterControls = ({ getters, setters }) => {
  const { display, debug, opacity, clim, month, band, colormapName } = getters
  const {
    setDisplay,
    setDebug,
    setOpacity,
    setClim,
    setMonth,
    setBand,
    setColormapName,
  } = setters

  const handleBandChange = useCallback((e) => {
    const band = e.target.value
    setBand(band)
    setClim([CLIM_RANGES[band].min, CLIM_RANGES[band].max])
    setColormapName(DEFAULT_COLORMAPS[band])
  })

  return (
    <>
      <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
        <Flex
          sx={{
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 4,
          }}
        >
          <Box>
            <Box sx={{ ...sx.label, mt: [0] }}>Tile boundaries</Box>
            <Toggle
              sx={{ float: 'right', mt: [2] }}
              value={debug}
              onClick={() => setDebug((prev) => !prev)}
            />
          </Box>

          <Box>
            <Box sx={{ ...sx.label, mt: [0] }}>Display</Box>
            <Toggle
              sx={{ display: 'block', float: 'right', mt: [2] }}
              value={display}
              onClick={() => setDisplay((prev) => !prev)}
            />
          </Box>
        </Flex>
      </Box>
      <Box sx={{ position: 'absolute', top: 20, left: 20 }}>
        <Box sx={{ ...sx.label, mt: [0] }}>Opacity</Box>
        <Slider
          min={0}
          max={1}
          step={0.01}
          sx={{ width: '175px', display: 'inline-block' }}
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
        />
        <Badge
          sx={{
            bg: 'primary',
            color: 'background',
            display: 'inline-block',
            fontSize: [1, 1, 1, 2],
            height: ['21px', '21px', '21px', '23px'],
            position: 'relative',
            left: [3],
            top: ['3px'],
          }}
        >
          {opacity.toFixed(2)}
        </Badge>
        <Box sx={sx.label}>Minimum</Box>
        <Slider
          min={CLIM_RANGES[band].min}
          max={CLIM_RANGES[band].max}
          step={1}
          sx={{ width: '175px', display: 'inline-block' }}
          value={clim[0]}
          onChange={(e) =>
            setClim((prev) => [parseFloat(e.target.value), prev[1]])
          }
        />
        <Badge
          sx={{
            bg: 'primary',
            color: 'background',
            display: 'inline-block',
            position: 'relative',
            left: [3],
            top: [1],
          }}
        >
          {clim[0].toFixed(0)}
        </Badge>
        <Box sx={sx.label}>Maximum</Box>
        <Slider
          min={CLIM_RANGES[band].min}
          max={CLIM_RANGES[band].max}
          step={1}
          sx={{ width: '175px', display: 'inline-block' }}
          value={clim[1]}
          onChange={(e) =>
            setClim((prev) => [prev[0], parseFloat(e.target.value)])
          }
        />
        <Badge
          sx={{
            bg: 'primary',
            color: 'background',
            display: 'inline-block',
            position: 'relative',
            left: [3],
            top: [1],
          }}
        >
          {clim[1].toFixed(0)}
        </Badge>
        <Box sx={sx.label}>Month</Box>
        <Slider
          min={1}
          max={12}
          step={1}
          sx={{ width: '175px', display: 'inline-block' }}
          value={month}
          onChange={(e) => setMonth(parseFloat(e.target.value))}
        />
        <Badge
          sx={{
            bg: 'primary',
            color: 'background',
            display: 'inline-block',
            position: 'relative',
            left: [3],
            top: [1],
          }}
        >
          {month.toFixed(0)}
        </Badge>

        <Box sx={{ ...sx.label, mt: [4] }}>Band</Box>
        <Select
          sxSelect={{ bg: 'transparent' }}
          size='xs'
          onChange={handleBandChange}
          sx={{ mt: [1] }}
          value={band}
        >
          <option value='tavg'>Temperature</option>
          <option value='prec'>Precipitation</option>
        </Select>

        <Box sx={{ ...sx.label, mt: [4] }}>Colormap</Box>
        <Select
          sxSelect={{ bg: 'transparent' }}
          size='xs'
          onChange={(e) => setColormapName(e.target.value)}
          sx={{ mt: [1] }}
          value={colormapName}
        >
          {colormaps.map((d) => (
            <option key={d.name}>{d.name}</option>
          ))}
        </Select>
        <Box sx={{ ...sx.label, mt: [4] }}>
          <Link href='https://github.com/carbonplan/maps'>CODE ON Github</Link>
        </Box>
      </Box>
    </>
  )
}

export default ParameterControls
