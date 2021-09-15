import { Box, IconButton } from 'theme-ui'
import { useRecenterRegion } from '@carbonplan/maps'

const AverageDisplay = ({ data: { loading, value } }) => {
  if (loading) {
    return 'loading...'
  }

  if (!Array.isArray(value.temperature)) {
    throw new Error('Value not present')
  }

  const filteredData = value.temperature.filter(
    (d) => d !== -3.3999999521443642e38
  )
  if (filteredData.length === 0) {
    return 'no data available'
  } else {
    const average =
      filteredData.reduce((a, b) => a + b, 0) / filteredData.length
    return `average value: ${average.toFixed(2)}ºC`
  }
}

const RegionControls = ({
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
        sx={{ stroke: showRegionPicker ? 'primary' : 'secondary' }}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
          width='24'
          height='24'
          strokeWidth='1.75'
          fill='none'
        >
          <circle cx='12' cy='12' r='10' />
          <circle cx='10' cy='10' r='3' />
          <line x1='12' x2='17' y1='12' y2='17' />
        </svg>
      </IconButton>
      {showRegionPicker && (
        <IconButton
          aria-label='Recenter map'
          onClick={recenterRegion}
          sx={{ stroke: 'primary' }}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            width='24'
            height='24'
            strokeWidth='1.75'
            fill='none'
          >
            <circle cx='12' cy='12' r='10' />
            <circle cx='12' cy='12' r='2' />
          </svg>
        </IconButton>
      )}
      {showRegionPicker && <AverageDisplay data={regionData} />}
    </Box>
  )
}

export default RegionControls
