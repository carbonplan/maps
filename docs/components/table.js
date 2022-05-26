import { Box } from 'theme-ui'

const Table = ({ children }) => {
  return (
    <Box
      sx={{
        '& table': {
          borderCollapse: 'collapse',
          width: '100%',
        },
        '& tr': {
          verticalAlign: 'baseline',
          mb: ['2px'],
        },
        '& th': {
          verticalAlign: 'baseline',
          textAlign: 'left',
          textTransform: 'uppercase',
          letterSpacing: 'smallcaps',
          fontFamily: 'heading',
          fontSize: [2, 2, 2, 3],
          pt: [3, 3, 3, '20px'],
          pb: [3, 3, 3, '20px'],
        },
        '& td': {
          verticalAlign: 'baseline',
          borderStyle: 'solid',
          borderWidth: '0px',
          borderTopWidth: '1px',
          borderBottomWidth: '1px',
          borderColor: 'muted',
          fontSize: [2, 2, 2, 3],
          fontFamily: 'faux',
          letterSpacing: 'faux',
          pt: [3, 3, 3, '20px'],
          pb: [3, 3, 3, '20px'],
        },
        '& td:first-of-type': {
          pr: [3, 3, 3, '20px'],
        },
      }}
    >
      {children}
    </Box>
  )
}

export default Table
