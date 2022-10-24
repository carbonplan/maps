<img
  src='https://carbonplan-assets.s3.amazonaws.com/monogram/dark-small.png'
  height='48'
/>

# carbonplan / maps

**interactive data-driven webmaps — [demo](https://maps.demo.carbonplan.org)**

[![GitHub][github-badge]][github]
[![Build Status]][actions]
![MIT License][]
![NPM Version][]

[github]: https://github.com/carbonplan/maps
[github-badge]: https://badgen.net/badge/-/github?icon=github&label
[build status]: https://github.com/carbonplan/maps/actions/workflows/main.yml/badge.svg
[actions]: https://github.com/carbonplan/maps/actions/workflows/main.yml
[mit license]: https://badgen.net/badge/license/MIT/blue
[npm version]: https://badgen.net/npm/v/@carbonplan/maps

## background

There are many approaches to making web maps, and many different data sources and use cases.

One common case for us at CarbonPlan is rendering gridded _raster_ data on a map. These data are multi-dimensional, for example, representing multiple time points or variables. We want high performance and flexibility in rendering. We also want to use the same file formats from our analysis.

We're building `@carbonplan/maps` to address these needs! We'll be releasing early and often so we can use it ourselves, but it's very much in progress, so expect lots of major version bumps and breaking changes.

Check out the demo ([site](https://maps.demo.carbonplan.org), [code](https://github.com/carbonplan/maps/tree/main/demo)) which renders monthly temperature and precipitation data, or read on for more info on the library.

## design

The core library wraps lower-level WebGL technologies to expose simple map-building components. For tiled maps, we combine [`mapbox-gl-js`](https://github.com/mapbox/mapbox-gl-js) and [`regl`](https://github.com/regl-project/regl). We use `mapbox-gl-js` for rendering vector layers and providing basic controls, and we use `regl` to performantly render data-driven layers. Behind the scenes, the library does some synchronization and simple state management to keep everything smooth and reactive.

We assume raster data is stored in the [`zarr`](https://github.com/zarr-developers/zarr-python) format, an emerging standard for chunked, compressed, multi-dimensional binary data that's become popular in the scientific Python community. For tiled maps, we also leverage the [`ndpyramid`](https://github.com/carbonplan/ndpyramid) tool for building multi-scale pyramids. Check out [this Jupyter Notebook](https://github.com/carbonplan/ndpyramid/blob/main/notebooks/demo.ipynb) for an example of creating the required Zarr dataset. Our `Raster` component makes it easy to render these data.

## examples

First, here's a simple map that renders a global temperature dataset at one month. The underlying dataset is a version of [`WorldClim`](https://www.worldclim.org/data/worldclim21.html) stored as a `zarr` pyramid with 6 levels of increasing resolution. We specify the `variable` we want to show and the dataset's `dimensions`, and all other metadata is inferred the dataset.

```jsx
import { Map, Raster } from '@carbonplan/maps'
import { useColormap } from '@carbonplan/colormaps'

const TemperatureMap = () => {
  const colormap = useColormap('warm')

  return (
    <Map>
      <Raster
        colormap={colormap}
        clim={[-20, 30]}
        source={
          'https://storage.googleapis.com/carbonplan-scratch/map-tests/processed/temp'
        }
        variable={'temperature'}
        dimensions={['y', 'x']}
      />
    </Map>
  )
}
```

With the same component we can render an annual dataset with a different temperature for each month, showing one month at a time via a `selector`. In this example, the selected month `4` can be static, or it can come from `react` state and the map will dynamically update!

```jsx
<Map>
  <Raster
    colormap={colormap}
    clim={[-20, 30]}
    source={
      'https://storage.googleapis.com/carbonplan-scratch/map-tests/processed/temp-month'
    }
    variable={'temperature'}
    dimensions={['month', 'y', 'x']}
    selector={{ month: 4 }}
  />
</Map>
```

Finally, if we want to render multiple arrays at once (and do math on them), we can specify a list for our `selector`. This loads all the selected arrays onto the GPU at once and lets us write custom fragment shaders that combine them (in this case, just averaging two months). While this requires writing shader code, it's a powerful and flexible way to do fast raster math for multi-dimensional maps.

```jsx
<Map>
  <Raster
    colormap={colormap}
    clim={[-20, 30]}
    fillValue={-3.4e38}
    source={
      'https://storage.googleapis.com/carbonplan-scratch/map-tests/processed/temp-month'
    }
    variable={'temperature'}
    dimensions={['month', 'y', 'x']}
    selector={{ month: [1, 2] }}
    frag={`
      float rescaled = ((month_1 + month_2) / 2.0 - clim.x)/(clim.y - clim.x);
      vec4 c = texture2D(colormap, vec2(rescaled, 1.0));
      gl_FragColor = vec4(c.x, c.y, c.z, opacity);
      gl_FragColor.rgb *= gl_FragColor.a;
    `}
  />
</Map>
```

More docs are coming soon!

## thanks

We owe enormous credit to existing open source libraries in the ecosystem, in particular `mapbox-gl-js` and `leaflet`. We've also taken inspiration from the design of `react-three-fiber` in terms of how to wrap a rendering library with `react`.

## license

All the original code in this repository is [MIT](https://choosealicense.com/licenses/mit/) licensed. The library contains code from [mapbox-gl-js version 1.13](https://github.com/mapbox/mapbox-gl-js/tree/v1.13.1) ([3-Clause BSD licensed](https://choosealicense.com/licenses/bsd-3-clause/)). We request that you please provide attribution if reusing any of our digital content (graphics, logo, copy, etc.).

## about us

CarbonPlan is a non-profit organization that uses data and science for climate action. We aim to improve the transparency and scientific integrity of climate solutions with open data and tools. Find out more at [carbonplan.org](https://carbonplan.org/) or get in touch by [opening an issue](https://github.com/carbonplan/maps/issues/new) or [sending us an email](mailto:hello@carbonplan.org).
