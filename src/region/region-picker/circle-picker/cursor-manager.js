export default function CursorManager(map) {
  const canvas = map.getCanvas()
  const originalStyle = canvas.style.cursor

  let mouseState = {
    onHandle: false,
    draggingHandle: false,
    onCircle: false,
    draggingCircle: false,
  }

  return function setCursor(newState) {
    mouseState = {
      ...mouseState,
      ...newState,
    }

    if (mouseState.onHandle || mouseState.draggingHandle)
      canvas.style.cursor = 'ew-resize'
    else if (mouseState.onCircle || mouseState.draggingCircle)
      canvas.style.cursor = 'move'
    else canvas.style.cursor = originalStyle
  }
}
