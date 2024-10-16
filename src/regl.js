import React, {
  createContext,
  useCallback,
  useState,
  useEffect,
  useContext,
  useRef,
} from 'react'
import _regl from 'regl'

import { webgl2Compat } from './webgl2-compat'

export const ReglContext = createContext(null)

export const useRegl = () => {
  return useContext(ReglContext)
}

const Regl = ({ style, extensions, children }) => {
  const reglRef = useRef(null)
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (canvasRef.current) {
      const requiredExtensions = [
        'OES_texture_float',
        'OES_element_index_uint',
        ...(extensions || []),
      ]

      try {
        reglRef.current = webgl2Compat.overrideContextType(() =>
          _regl({
            canvas: canvasRef.current,
            extensions: requiredExtensions,
          })
        )
        setReady(true)
      } catch (err) {
        console.error('Error initializing regl:', err)
      }
    }

    return () => {
      if (reglRef.current) {
        reglRef.current.destroy()
        reglRef.current = null
      }
      setReady(false)
    }
  }, [extensions])

  return (
    <ReglContext.Provider
      value={{
        regl: reglRef.current,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', ...style }}
      />
      {ready && children}
    </ReglContext.Provider>
  )
}

export default Regl
