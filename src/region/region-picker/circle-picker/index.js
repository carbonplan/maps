import React, { useState, useEffect } from 'react'
import { useMapbox } from '../../../mapbox'
import CircleRenderer from './circle-renderer'

const CirclePicker = ({
  id,
  backgroundColor,
  center,
  color,
  fontFamily,
  fontSize,
  radius,
  onIdle,
  onDrag,
  units,
  maxRadius,
  minRadius,
}) => {
  const { map } = useMapbox()
  const [renderer, setRenderer] = useState(null)

  useEffect(() => {
    const renderer = CircleRenderer({
      id,
      map,
      onIdle,
      onDrag,
      initialCenter: center,
      initialRadius: radius,
      units,
      maxRadius,
      minRadius,
    })

    setRenderer(renderer)

    return function cleanup() {
      // need to check load state for fast-refresh purposes
      if (map.loaded()) renderer.remove()
    }
  }, [])

  return (
    <svg
      id={`circle-picker-${id}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    >
      <defs>
        <clipPath id={`circle-clip-${id}`}>
          <path id={`circle-cutout-${id}`} />
        </clipPath>
      </defs>

      <path
        id={`circle-${id}`}
        stroke={color}
        strokeWidth={1}
        fill='transparent'
        cursor='move'
      />
      <rect
        x='0'
        y='0'
        width='100%'
        height='100%'
        clipPath={`url(#circle-clip-${id})`}
        fill={backgroundColor}
        fillOpacity={0.8}
      />
      <circle id={`handle-${id}`} r={8} fill={color} cursor='ew-resize' />
      <line
        id={`radius-guideline-${id}`}
        stroke={color}
        strokeOpacity={0}
        strokeWidth={1}
        strokeDasharray='3,2'
      />
      <g id={`radius-text-container-${id}`}>
        <text
          id={`radius-text-${id}`}
          textAnchor='middle'
          fontFamily={fontFamily}
          fontSize={fontSize}
          fill={color}
        />
      </g>
    </svg>
  )
}

export default CirclePicker
