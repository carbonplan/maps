import Section from '../../components/section'
import Table from '../../components/table'

# Fill

The `Fill` component renders a Mapbox map layer of `type: 'fill'` using vector tiles from the provided `source`.

## Props

<Table>

| Prop             | Description                                                | Default |
| ---------------- | ---------------------------------------------------------- | ------- |
| source           | URL pointing to vector tileset                             |         |
| variable         | Name of `source-layer`                                     |         |
| color            | Fill color                                                 |         |
| _optional props_ |                                                            |         |
| opacity          | Fill opacity                                               | 1       |
| maxZoom          | Maximum zoom for layer                                     | 5       |
| id               | Key that triggers addition of source to `mapbox-gl-js` map |         |

</Table>

export default ({ children }) => <Section name='fill'>{children}</Section>
