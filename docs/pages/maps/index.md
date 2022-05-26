import Section from '../../components/section'
import MapDemo2d from '../../components/examples/map-demo-2d'

# Intro

```bash
npm install @carbonplan/maps
```

## What it does

We built `@carbonplan/maps` to make it easy to create tiled web maps that render gridded raster data, including data that are multi-dimensional, for example, representing multiple time points or variables. The library contains a set of React components and utilities that, when used together, fetch, select into, and render raster data synchronized with a conventional web map interface.

## How it works

The library loads chunked data in the [Zarr](https://zarr.readthedocs.io/en/stable/) format, renders via WebGL using [`regl`](https://github.com/regl-project/regl), and synchronizes with a map interface powered by [`mapbox-gl-js`](https://github.com/mapbox/mapbox-gl-js).

The `Raster` component handles the fetching and rendering for each raster layer. Additional `mapbox-gl-js`-powered vector layers may be rendered using the `Fill` and `Line` components. In order to keep each of these layers in sync with the map interface, they must be rendered as a child of the same `Map` (which initializes and manages the `mapbox-gl-js` map instance).

There are some specific requirements for the Zarr data, including use of the multi-scale specification, projected in Web Mercator, and that the dataset is global. Read more about this in the [Data](/maps/data) section.

## What it looks like

```jsx
import { Line, Map, Raster } from '@carbonplan/maps'

const TemperatureMap = () => {
  return (
    <Map>
      <Line
        color={primary}
        source={bucket + 'basemaps/land'}
        variable={'land'}
      />
      <Raster
        colormap={colormap}
        clim={[-20, 30]}
        source={bucket + 'v2/demo/2d/tavg'}
        variable={'tavg'}
      />
    </Map>
  )
}
```

<MapDemo2d />

## Read more

Check out the demo ([site](https://maps.demo.carbonplan.org/), [code](https://github.com/carbonplan/maps/tree/main/demo)) which renders monthly temperature and precipitation data, read the [blog post](https://carbonplan.org/blog/maps-library-release) describing our initial release, or read on for more in the docs.

export default ({ children }) => <Section name='intro'>{children}</Section>
