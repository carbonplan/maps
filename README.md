<img
  src='https://carbonplan-assets.s3.amazonaws.com/monogram/dark-small.png'
  height='48'
/>

# carbonplan / maps

**interactive data-driven webmaps**

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

There are many existing approaches to making web maps, and also many different data sources and use cases. 

One need we encounter frequently at CarbonPlan is wanting to render gridded _raster_ data on a map, where the data come from some scientific or analytical workflow. Often these data are also multi-dimensional, for example, maps that vary in time, or that represent multiple variables. We want this rendering to be as performant as possible, while supporting a lot of flexibility in how data is rendered. We also want to work with the same file formats we use while doing analysis.

We're building `@carbonplan/maps` to address these needs! We'll be releasing early and often so we can test it ourselves, but it's very much in progress, so expect lots of major version bumps and breaking changes.

## design

The core library is a `react` wrapper that combines `mapbox-gl-js` and `regl`. We use `mapbox-gl-js` for rendering traditional map layers and providing basic controls, whereas we use `regl` to performantly render data-driven layers. When it comes to rendering data, we provide some simple options out of the box, but also make it easy to plug in custom fragment shaders. For complex rendering needs, we have found it easier to write shader code directly, rather than developing new abstractions.

Behind the scenes, the library does some synchronization and simple state management to keep everything smooth and reactive.

For traditional map layers, you can render vector tiles via `mapbox`. Rather than try to wrap all of `mapbox`, we simply expose a few key hooks that make it easy to build `mapbox` layers yourself.

For raster data layers, we assume data is stored in the [`zarr`](https://github.com/zarr-developers/zarr-python) format, an emerging standard for chunked, compressed, multi-dimensional binary data that's become popular in the scientific Python community.

## example

Here's a simple map that renders a global temperature dataset. The underyling dataset is a version of the [`WorldClim`](https://www.worldclim.org/data/worldclim21.html) dataset stored as a `zarr` pyramid with 5 levels of increasing resolution.

```
import { Canvas, Raster } from '@carbonplan/maps'
import { useColormap } from '@carbonplan/colormaps'

const colormap = useColormap('warm')

<Canvas>
  <Raster
    maxZoom={5}
    size={128}
    colormap={colormap}
    clim={[-20,30]}
    nan={-3.4e38}
    source={
      'https://carbonplan.blob.core.windows.net/carbonplan-scratch/zarr-mapbox-webgl/128/{z}'
    }
  />
</Canvas>

```

## usage

The library offers several components and hooks to faclitate map building.

`Canvas`

`Raster`

For lower level control, you might also find these useful

`Mapbox`

`useMapbox`

`useControls`

`Regl`

`useRegl`

## thanks

We owe enormous credit to existing libraries in the ecosystem, in particular `mapbox-gl-js` and `leaflet`. We've also taken inspiration from the design of `react-three-fiber` in terms of how to wrap a rendering library with `react`.
