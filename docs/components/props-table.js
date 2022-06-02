import { Box } from 'theme-ui'
import { Table } from '@carbonplan/components'
import componentProps from './component-props.json'

const sx = {
  heading: {
    textTransform: 'uppercase',
    letterSpacing: 'smallcaps',
    fontFamily: 'heading',
    fontSize: [2, 2, 2, 3],
  },
}

const getRows = (keys, props) => {
  return keys.map((key) => {
    const { tsType, description } = props[key]
    return [
      key,
      description,
      <Box as='span' variant='styles.inlineCode'>
        {tsType.raw ?? tsType.name}
      </Box>,
    ]
  })
}

const PropsTable = ({ name }) => {
  const { props } = Object.values(componentProps).find(
    (d) => d.displayName === name
  )
  const propNames = Object.keys(props)
  const requiredProps = propNames.filter((k) => props[k].required)
  const optionalProps = propNames.filter((k) => !props[k].required)

  return (
    <Table
      columns={[6, 7, 7, 7]}
      start={[[1], [1, 3, 3, 3], [1, 5, 5, 6]]}
      width={[
        [6, 2, 2, 2],
        [6, 2, 2, 3],
        [6, 2, 2, 2],
      ]}
      index={false}
      data={[
        [
          <Box sx={sx.heading}>Prop</Box>,
          <Box sx={sx.heading}>Description</Box>,
          <Box sx={sx.heading}>Type</Box>,
        ],
        ...getRows(requiredProps, props),
        [<em>optional props</em>],
        ...getRows(optionalProps, props),
      ]}
    />
  )
}

export default PropsTable
