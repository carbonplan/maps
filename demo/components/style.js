const style = {
  version: 8,
  glyphs: `https://storage.googleapis.com/carbonplan-data/tiles/glyphs/{fontstack}/{range}.pbf`,
  sources: {
    basemap: {
      type: 'vector',
      tiles: [
        `https://storage.googleapis.com/carbonplan-research/articles/offset-project-fire/basemap/{z}/{x}/{y}.pbf`,
      ],
      maxzoom: 5,
    },
  },
  layers: [],
}

export default style
