import { Box, IconButton } from 'theme-ui'
import { useRecenterRegion } from '@carbonplan/maps'
import { XCircle } from '@carbonplan/icons'

const AverageDisplay = ({ band, month, data: { loading, value } }) => {
  if (loading) {
    return 'loading...'
  }

  if (!value.tavg || !value.tavg[month]) {
    throw new Error('Value not present')
  }

  const activeData = value.tavg[month]

  let result
  const filteredData = activeData.filter((d) => d !== -3.3999999521443642e38)
  if (filteredData.length === 0) {
    result = 'no data in region'
  } else {
    const average =
      filteredData.reduce((a, b) => a + b, 0) / filteredData.length
    if (band === 'prec') {
      result = `Average: ${average.toFixed(2)}`
    } else {
      result = `Average: ${average.toFixed(2)}ºC`
    }
  }

  return (
    <Box
      sx={{
        ml: [2],
        mt: ['-1px'],
        fontFamily: 'mono',
        letterSpacing: 'mono',
        textTransform: 'uppercase',
      }}
    >
      {result}
    </Box>
  )
}

const RegionControls = ({
  band,
  month,
  regionData,
  showRegionPicker,
  setShowRegionPicker,
}) => {
  const { recenterRegion } = useRecenterRegion()

  return (
    <Box
      sx={{
        display: ['none', 'none', 'flex', 'flex'],
        alignItems: 'center',
        position: 'absolute',
        color: 'primary',
        left: [13],
        bottom: [17, 17, 15, 15],
      }}
    >
      <IconButton
        aria-label='Circle filter'
        onClick={() => setShowRegionPicker(!showRegionPicker)}
        sx={{ stroke: 'primary', cursor: 'pointer', width: 34, height: 34 }}
      >
        {!showRegionPicker && (
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            width='34'
            height='34'
            strokeWidth='1.75'
            fill='none'
          >
            <circle cx='12' cy='12' r='10' />
            <circle cx='10' cy='10' r='3' />
            <line x1='12' x2='17' y1='12' y2='17' />
          </svg>
        )}
        {showRegionPicker && (
          <XCircle sx={{ strokeWidth: 1.75, width: 24, height: 24 }} />
        )}
      </IconButton>
      {showRegionPicker && (
        <IconButton
          aria-label='Recenter map'
          onClick={recenterRegion}
          sx={{ stroke: 'primary', cursor: 'pointer', width: 34, height: 34 }}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            width='34'
            height='34'
            strokeWidth='1.75'
            fill='none'
          >
            <circle cx='12' cy='12' r='10' />
            <circle cx='12' cy='12' r='2' />
          </svg>
        </IconButton>
      )}
      {showRegionPicker && (
        <AverageDisplay data={regionData} band={band} month={month} />
      )}
    </Box>
  )
}

export default RegionControls
