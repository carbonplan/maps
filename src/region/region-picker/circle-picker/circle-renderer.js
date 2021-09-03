import { select } from 'd3-selection'
import { FLOATING_HANDLE, SHOW_RADIUS_GUIDELINE } from '../constants'
import { getPathMaker } from './utils'
import {
  distance,
  rewind,
  rhumbDestination,
  lineString,
  lineIntersect,
  circle as turfCircle,
} from '@turf/turf'
import CursorManager from './cursor-manager'

const abbreviations = {
  kilometers: 'km',
  miles: 'mi',
}

export default function CircleRenderer({
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
  let radius = initialRadius

  const svg = select('#circle-picker').style('pointer-events', 'none')
  const svgCircle = select('#circle').style('pointer-events', 'all')
  const svgCircleCenter = select('#circle-center')
  const svgCircleMask = select('#circle-mask-cutout')
  const svgHandle = select('#handle').style('pointer-events', 'all')
  const svgGuideline = select('#radius-guideline')
  const svgRadiusTextContainer = select('#radius-text-container')
  const svgRadiusText = select('#radius-text').attr('fill-opacity', 0)
  const svgCircleXY = select('#circle-xy')

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
        const centerXY = map.project(center)
        const mouseXY = e.point
        const rise = mouseXY.y - centerXY.y
        const run = mouseXY.x - centerXY.x
        let angle = (Math.atan(rise / run) * 180) / Math.PI
        guidelineAngle = angle + 90 + (run < 0 ? 180 : 0)
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
      setCenter({
        lng: e.lngLat.lng - offset.lng,
        lat: e.lngLat.lat - offset.lat,
      })
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

  function geoCircle(center, radius) {
    const c = turfCircle([center.lng, center.lat], radius, {
      units,
      steps: 64,
      properties: {
        center,
        radius,
        units,
      },
    })

    // need to rewind or svg fill is inside-out
    return rewind(c, { reverse: true, mutate: true })
  }

  //// SETTERS ////

  const setCursor = CursorManager(map)

  function setCenter(_center) {
    if (_center && _center !== center) {
      center = _center
      setCircle()
    }
  }

  function setRadius(_radius) {
    if (_radius && _radius !== radius) {
      radius = _radius
      setCircle()
    }
  }

  function setCircle() {
    circle = geoCircle(center, radius)

    // update svg circle and mask
    const makePath = getPathMaker(map)
    const path = makePath(circle)
    svgCircle.attr('d', path)
    svgCircleMask.attr('d', path)

    // update other svg elements
    const centerXY = map.project(center)

    const handleXY = (() => {
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

      return map.project(inter.features[0].geometry.coordinates)
    })()

    svgCircleCenter.attr('cx', centerXY.x).attr('cy', centerXY.y)

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
