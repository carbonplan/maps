import Section from '../../components/section'

# Data

The library assumes that the data is stored as a Zarr group, adhering to the conventions encoded in the `ndpyramid` utility for building multi-scale pyramids, including:

- Use of Web Mercator projection
- Use of consistent `pixels_per_tile` across scales
- Use of `coordinates` that extend over full globe (recreates the [map zoom level quadtree](https://docs.mapbox.com/help/glossary/zoom-level/#zoom-level-quadtrees) pattern\)

## Structure

This results in a file structure that would resemble the following for average temperature data:

```
/
 ├── .zmetadata
 ├── 0
 │   ├── tavg
 │       └── 0.0
 ├── 1
 │   ├── tavg
 │       └── 0.0
 │       └── 0.1
 │       └── 1.0
 │       └── 1.1
 ├── 2
...
```

Note the quadrupling of the number of chunks as zoom level increases. This is a trait of the map zoom level quadtree mentioned earlier.

## Multi-scale schema

See an example `.zmetadata['.zattrs']` [value](https://storage.googleapis.com/carbonplan-maps/v2/demo/2d/tavg/.zmetadata) from a pyramid created for a demo:

```json
{
  "multiscales": [
    {
      "datasets": [
        {
          "path": "0",
          "pixels_per_tile": 128
        },
        {
          "path": "1",
          "pixels_per_tile": 128
        }
        ...
      ],
      "metadata": {
        "args": [],
        "method": "pyramid_reproject",
        "version": "0.0.post64"
      },
      "type": "reduce"
    }
  ]
}
```

export default ({ children }) => <Section name='data'>{children}</Section>
