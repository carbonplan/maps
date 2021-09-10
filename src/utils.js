import { point, rhumbBearing, rhumbDestination } from '@turf/turf'

const d2r = Math.PI / 180

const clip = (v, max) => {
  let result
  if (v < 0) {
    result = v + max + 1
  } else if (v > max) {
    result = v - max - 1
  } else {
    result = v
  }

  return Math.min(Math.max(result, 0), max)
}

export const keyToTile = (key) => {
  return key.split(',').map((d) => parseInt(d))
}

export const tileToKey = (tile) => {
  return tile.join(',')
}

export const pointToTile = (lon, lat, z) => {
  const z2 = Math.pow(2, z)
  let tile = pointToCamera(lon, lat, z)
  tile[0] = Math.floor(tile[0])
  tile[1] = Math.min(Math.floor(tile[1]), z2 - 1)

  return tile
}

export const pointToCamera = (lon, lat, z) => {
  let sin = Math.sin(lat * d2r),
    z2 = Math.pow(2, z),
    x = z2 * (lon / 360 + 0.5),
    y = z2 * (0.5 - (0.25 * Math.log((1 + sin) / (1 - sin))) / Math.PI)

  x = x % z2
  y = Math.max(Math.min(y, z2), 0)
  if (x < 0) x = x + z2
  return [x, y, z]
}

export const cameraToPoint = (x, y, z) => {
  const z2 = Math.pow(2, z)

  const lon = 360 * (x / z2) - 180

  const y2 = 180 - (y / z2) * 360
  const lat = (360 / Math.PI) * Math.atan(Math.exp((y2 * Math.PI) / 180)) - 90

  return [lon, lat]
}

export const zoomToLevel = (zoom, maxZoom) => {
  if (maxZoom) return Math.min(Math.max(0, Math.floor(zoom)), maxZoom)
  return Math.max(0, Math.floor(zoom))
}

const getOffsets = (length, tileSize, camera) => {
  const siblingCount = (length - tileSize) / tileSize

  // Do not add offset for very small fraction of tile
  if (Math.abs(siblingCount) < 0.001) {
    return [0, 0]
  }

  const cameraOffset = camera - Math.floor(camera)
  const prev = siblingCount / 2 + 0.5 - cameraOffset
  const next = siblingCount - prev

  return [-1 * Math.ceil(prev), Math.ceil(next)]
}

export const getSiblings = (tile, { viewport, zoom, size, camera }) => {
  const [tileX, tileY, tileZ] = tile
  const { viewportHeight, viewportWidth } = viewport
  const [cameraX, cameraY] = camera

  const magnification = Math.pow(2, zoom - tileZ)
  const scale = (window.devicePixelRatio * 512) / size
  const tileSize = size * scale * magnification

  const deltaX = getOffsets(viewportWidth, tileSize, cameraX)
  const deltaY = getOffsets(viewportHeight, tileSize, cameraY)

  let offsets = []
  for (let x = deltaX[0]; x <= deltaX[1]; x++) {
    for (let y = deltaY[0]; y <= deltaY[1]; y++) {
      offsets.push([tileX + x, tileY + y, tileZ])
    }
  }

  const max = Math.pow(2, tileZ) - 1
  return offsets.reduce((accum, offset) => {
    const [x, y, z] = offset
    const tile = [clip(x, max), clip(y, max), z]
    const key = tileToKey(tile)

    if (!accum[key]) {
      accum[key] = []
    }

    accum[key].push(offset)

    return accum
  }, {})
}

export const getKeysToRender = (targetKey, tiles, maxZoom) => {
  const ancestor = getAncestorToRender(targetKey, tiles)

  if (ancestor) {
    return [ancestor]
  }

  const descendants = getDescendantsToRender(targetKey, tiles, maxZoom)
  if (descendants.length) {
    return descendants
  }

  return [targetKey]
}

export const getAncestorToRender = (targetKey, tiles) => {
  let [x, y, z] = keyToTile(targetKey)
  while (z >= 0) {
    const key = tileToKey([x, y, z])
    if (tiles[key].cacheIndex) {
      return key
    }
    z--
    x = Math.floor(x / 2)
    y = Math.floor(y / 2)
  }
}

export const getDescendantsToRender = (targetKey, tiles, maxZoom) => {
  let [initialX, initialY, initialZ] = keyToTile(targetKey)
  let [x, y, z] = [initialX, initialY, initialZ]
  let coverage = 0
  let descendants = []
  while (z <= maxZoom) {
    const delta = z - initialZ
    const keys = []
    for (let deltaX = 0; deltaX <= delta; deltaX++) {
      for (let deltaY = 0; deltaY <= delta; deltaY++) {
        keys.push(tileToKey([x + deltaX, y + deltaY, z]))
      }
    }

    const coveringKeys = keys.filter((key) => tiles[key].cacheIndex)
    const currentCoverage = coveringKeys.length / keys.length

    if (coverage === 1) {
      return keys
    } else if (currentCoverage > coverage) {
      descendants = keys
    }

    z++
    x = x * 2
    y = y * 2
  }

  return descendants
}

export const getOverlappingAncestor = (key, renderedKeys) => {
  const [aX, aY, aZ] = keyToTile(key)
  const child = { x: aX, y: aY, z: aZ }

  return renderedKeys.find((parentKey) => {
    const [bX, bY, bZ] = keyToTile(parentKey)
    const parent = { x: bX, y: bY, z: bZ }

    if (child.z <= parent.z) {
      return false
    } else {
      const factor = Math.pow(2, child.z - parent.z)

      return (
        Math.floor(child.x / factor) === parent.x &&
        Math.floor(child.y / factor) === parent.y
      )
    }
  })
}

export const getAdjustedOffset = (offset, renderedKey) => {
  const [renderedX, renderedY, renderedLevel] = keyToTile(renderedKey)
  const [offsetX, offsetY, level] = offset

  // Overall factor to scale offset by
  const factor = Math.pow(2, level - renderedLevel)

  // Factor used to calculate adjustment when rendering a descendant tile
  const descendantFactor =
    renderedLevel > level ? Math.pow(2, renderedLevel - level) : 1

  return [
    Math.floor(offsetX / factor) + (renderedX % descendantFactor),
    Math.floor(offsetY / factor) + (renderedY % descendantFactor),
  ]
}

export const getTilesOfRegion = (region, level) => {
  const { center, radius, units } = region.properties
  const centralTile = pointToTile(center.lng, center.lat, level)

  const tiles = new Set([tileToKey(centralTile)])

  region.geometry.coordinates[0].forEach(([lng, lat]) => {
    // Add tile along edge of region
    const edgeTile = pointToTile(lng, lat, level)
    tiles.add(tileToKey(edgeTile))

    // Add any intermediate tiles if edge is > 1 tile away from center
    const maxDiff = Math.max(
      Math.abs(edgeTile[0] - centralTile[0]),
      Math.abs(edgeTile[1] - centralTile[1])
    )
    if (maxDiff > 1) {
      const centerPoint = point([center.lng, center.lat])
      const bearing = rhumbBearing(centerPoint, point([lng, lat]))

      for (let i = 1; i < maxDiff; i++) {
        const intermediatePoint = rhumbDestination(
          centerPoint,
          (i * radius) / maxDiff,
          bearing,
          { units }
        )
        const intermediateTile = pointToTile(
          intermediatePoint.geometry.coordinates[0],
          intermediatePoint.geometry.coordinates[1],
          level
        )
        tiles.add(tileToKey(intermediateTile))
      }
    }
  })

  return Array.from(tiles)
}

export const getCacheKeyForIndex = (index) => {
  if (index.length === 0) {
    return 1
  } else {
    return index.join(',')
  }
}
