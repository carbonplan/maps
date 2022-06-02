import Section from '../../components/section'
import LoadingDemo from '../../components/examples/loading-demo'
import PropsTable from '../../components/props-table'

# Map

The `Map` component is responsible for initializing the `mapbox-gl-js` instance and making this available to any map layers rendered within it.

## Props

<PropsTable name='Map' />

## Loading

You may use any combination of the loading callback props to track the loading state of raster layers rendered as children of a `Map`. The last value passed to each of the three callbacks, `setLoading`, `setMetadataLoading`, and `setChunkLoading` are overlaid on the map below.

<LoadingDemo />

export default ({ children }) => <Section name='map'>{children}</Section>
