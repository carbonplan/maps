import { select } from 'd3-selection'
import { FLOATING_HANDLE, SHOW_RADIUS_GUIDELINE } from '../constants'
import { getPathMaker, project } from './utils'
import {
  area,
  convertArea,
  distance,
  rewind,
  rhumbDestination,
  lineString,
  lineIntersect,
  circle as turfCircle,
  point,
} from '@turf/turf'
import CursorManager from './cursor-manager'

const POLES = [point([0, -90]), point([0, 90])]
const abbreviations = {
  kilometers: 'km',
  miles: 'mi',
}

export default function CircleRenderer({
  id,
  map,
  onIdle = (circle) => {},
  onDrag = (circle) => {},
  initialCenter = { lat: 0, lng: 0 },
  initialRadius = 0,
  maxRadius,
  minRadius,
  units,
}) {
  let circle = null
  let center = initialCenter
  let centerXY = project(map, center)
  let radius = initialRadius

  const svg = select(`#circle-picker-${id}`).style('pointer-events', 'none')
  const svgCircle = select(`#circle-${id}`).style('pointer-events', 'all')
  const svgCircleCutout = select(`#circle-cutout-${id}`)
  const svgHandle = select(`#handle-${id}`).style('pointer-events', 'all')
  const svgGuideline = select(`#radius-guideline-${id}`)
  const svgRadiusTextContainer = select(`#radius-text-container-${id}`)
  const svgRadiusText = select(`#radius-text-${id}`).attr('fill-opacity', 0)

  let guidelineAngle = 90
  if (!SHOW_RADIUS_GUIDELINE) {
    svgGuideline.style('display', 'none')
    svgRadiusTextContainer.style('display', 'none')
  }

  const removers = []

  //// LISTENERS ////

  function addDragHandleListeners() {
    const onMouseMove = (e) => {
      let r = distance(
        map.unproject(e.point).toArray(),
        [center.lng, center.lat],
        { units }
      )
      r = maxRadius ? Math.min(r, maxRadius) : r
      r = minRadius ? Math.max(r, minRadius) : r
      setRadius(r)
      onDrag(circle)

      if (FLOATING_HANDLE) {
        const mouseXY = e.point
        const rise = mouseXY.y - centerXY.y
        const run = mouseXY.x - centerXY.x
        let angle = (Math.atan(rise / run) * 180) / Math.PI
        guidelineAngle = angle + 90 + (run < 0 ? 180 : 0)
        setCircle()
      }
    }

    const onMouseUp = (e) => {
      onIdle(circle)
      setCursor({ draggingHandle: false })
      map.off('mousemove', onMouseMove)
      svgHandle.style('pointer-events', 'all')
      svgCircle.style('pointer-events', 'all')
      svgRadiusText.attr('fill-opacity', 0)
      svgGuideline.attr('stroke-opacity', 0)
    }

    svgHandle.on('mousedown', () => {
      map.on('mousemove', onMouseMove)
      map.once('mouseup', onMouseUp)
      setCursor({ draggingHandle: true })
      svgHandle.style('pointer-events', 'none')
      svgCircle.style('pointer-events', 'none')
      svgRadiusText.attr('fill-opacity', 1)
      svgGuideline.attr('stroke-opacity', 1)
    })

    removers.push(function removeDragHandleListeners() {
      svgHandle.on('mousedown', null)
    })
  }

  function addCircleListeners() {
    let offset
    const mapCanvas = map.getCanvas()

    const onMouseMove = (e) => {
      setCenter(
        {
          lng: e.lngLat.lng - offset.lng,
          lat: e.lngLat.lat - offset.lat,
        },
        {
          x: e.point.x,
          y: e.point.y,
        }
      )
      onDrag(circle)
    }

    const onMouseUp = (e) => {
      onIdle(circle)
      setCursor({ draggingCircle: false })
      map.off('mousemove', onMouseMove)
      svgCircle.style('pointer-events', 'all')
      svgHandle.style('pointer-events', 'all')
    }

    svgCircle.on('mousedown', (e) => {
      const { offsetX: x, offsetY: y } = e
      const lngLat = map.unproject({ x, y })
      offset = {
        lng: lngLat.lng - center.lng,
        lat: lngLat.lat - center.lat,
      }

      setCursor({ draggingCircle: true })
      map.on('mousemove', onMouseMove)
      map.once('mouseup', onMouseUp)
      svgCircle.style('pointer-events', 'none')
      svgHandle.style('pointer-events', 'none')
    })

    svgCircle.on('wheel', (e) => {
      e.preventDefault()
      let newEvent = new e.constructor(e.type, e)
      mapCanvas.dispatchEvent(newEvent)
    })

    removers.push(function removeCircleListeners() {
      svgCircle.on('mousedown', null)
      svgCircle.on('wheel', null)
    })
  }

  function addMapMoveListeners() {
    const onMove = setCircle

    map.on('move', onMove)
    removers.push(function removeMapMoveListeners() {
      map.off('move', onMove)
    })
  }

  //// CIRCLE ////

  function geoCircle(center, radius, inverted = false) {
    const c = turfCircle([center.lng, center.lat], radius, {
      units,
      steps: 64,
      properties: {
        center,
        radius,
        units,
      },
    })

    c.properties.area = convertArea(area(c), 'meters', units)
    c.properties.zoom = map.getZoom()

    if (inverted) {
      return c
    }

    // need to rewind or svg fill is inside-out
    return rewind(c, { reverse: true, mutate: true })
  }

  //// SETTERS ////

  const setCursor = CursorManager(map)

  function setCenter(_center, _point) {
    if (_center && _center !== center) {
      if (nearPoles(_center, radius)) {
        center = { lng: _center.lng, lat: center.lat }
        centerXY = { x: _point.x, y: centerXY.y }
      } else {
        center = _center
        centerXY = _point
      }

      setCircle()
    }
  }

  function resetCenterXY() {
    // reset centerXY value based on latest `map` value
    centerXY = project(map, center, { referencePoint: centerXY })
  }

  function setRadius(_radius) {
    if (_radius && _radius !== radius) {
      if (!nearPoles(center, _radius)) {
        radius = _radius
        setCircle()
      }
    }
  }

  function nearPoles(center, radius) {
    const turfPoint = point([center.lng, center.lat])

    return POLES.some((pole) => distance(turfPoint, pole, { units }) < radius)
  }

  function setCircle() {
    // ensure that centerXY is up-to-date with map
    resetCenterXY()

    const makePath = getPathMaker(map, {
      referencePoint: centerXY,
    })

    // update svg circle
    circle = geoCircle(center, radius)
    const path = makePath(circle)
    svgCircle.attr('d', path)

    // update cutout
    const cutoutCircle = geoCircle(center, radius, true)
    const cutoutPath = makePath(cutoutCircle)
    const { width, height } = svg.node().getBBox()
    svgCircleCutout.attr('d', cutoutPath + ` M0,0H${width}V${height}H0V0z`)

    // update other svg elements
    const handleXY = (() => {
      // by default just render handle based on radius and guideline angle
      let coordinates = rhumbDestination(
        [center.lng, center.lat],
        radius,
        guidelineAngle
      ).geometry.coordinates

      const lineEnd = rhumbDestination(
        [center.lng, center.lat],
        radius * 2,
        guidelineAngle
      )
      const line = lineString([
        [center.lng, center.lat],
        lineEnd.geometry.coordinates,
      ])
      const inter = lineIntersect(line, circle)
      // but prefer rendering using intersection with circle to handle distortions near poles
      if (inter.features.length > 0) {
        coordinates = inter.features[0].geometry.coordinates
      }

      return project(map, coordinates, {
        referencePoint: centerXY,
      })
    })()

    svgHandle.attr('cx', handleXY.x).attr('cy', handleXY.y)

    svgGuideline
      .attr('x1', centerXY.x)
      .attr('y1', centerXY.y)
      .attr('x2', handleXY.x)
      .attr('y2', handleXY.y)

    const translateY = 4

    svgRadiusText
      .text(radius.toFixed(0) + abbreviations[units])
      .attr(
        'transform',
        `rotate(${-1 * guidelineAngle + 90}) ` + `translate(0, ${translateY})`
      )

    const translateX = (() => {
      const { width: textWidth } = svgRadiusText.node().getBBox()
      const coeff = 0.8 * Math.sin((guidelineAngle * Math.PI) / 180)
      return 18 + Math.abs((coeff * textWidth) / 2)
    })()

    svgRadiusTextContainer.attr(
      'transform',
      `rotate(${guidelineAngle - 90}, ${handleXY.x}, ${handleXY.y}) ` +
        `translate(${handleXY.x + translateX}, ${handleXY.y})`
    )
  }

  //// INIT ////

  addDragHandleListeners()
  addCircleListeners()
  addMapMoveListeners()
  setCircle()
  onIdle(circle)

  //// INTERFACE ////

  return {
    remove: () => {
      removers.reverse().forEach((remove) => remove())
      onIdle(null)
    },
  }
}
