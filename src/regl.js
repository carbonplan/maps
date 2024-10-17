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
  const [ready, setReady] = useState(false)

  const ref = useCallback(
    (node) => {
      if (node !== null) {
        const requiredExtensions = [
          'OES_texture_float',
          'OES_element_index_uint',
          ...(extensions || []),
        ]

        try {
          reglRef.current = webgl2Compat.overrideContextType(() =>
            _regl({
              container: node,
              extensions: requiredExtensions,
            })
          )
          setReady(true)
        } catch (err) {
          console.error('Error initializing regl:', err)
        }
      }
    },
    [extensions]
  )

  useEffect(() => {
    return () => {
      if (reglRef.current) {
        reglRef.current.destroy()
        reglRef.current = null
      }
      setReady(false)
    }
  }, [])

  return (
    <ReglContext.Provider
      value={{
        regl: reglRef.current,
      }}
    >
      <div ref={ref} style={{ width: '100%', height: '100%', ...style }} />
      {ready && children}
    </ReglContext.Provider>
  )
}

export default Regl
