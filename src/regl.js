import React, {
  createContext,
  useCallback,
  useState,
  useEffect,
  useContext,
  useRef,
} from 'react'
import _regl from 'regl'

export const ReglContext = createContext(null)

export const useRegl = () => {
  return useContext(ReglContext)
}

const Regl = ({ style, extensions, children }) => {
  const regl = useRef()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  const ref = useCallback((node) => {
    if (node !== null) {
      try {
        const canvas = document.createElement('canvas')
        const context =
          canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        if (!context) {
          throw new Error('WebGL is not supported in this browser.')
        }

        const requiredExtensions = [
          'OES_texture_float',
          'OES_element_index_uint',
        ]
        const missingExtensions = requiredExtensions.filter(
          (ext) => !context.getExtension(ext)
        )

        if (missingExtensions.length > 0) {
          throw new Error(
            `Required WebGL extensions not supported: ${missingExtensions.join(
              ', '
            )}`
          )
        }
        canvas.remove()
        regl.current = _regl({
          container: node,
          extensions: requiredExtensions,
        })
        setReady(true)
      } catch (error) {
        console.error('Error initializing WebGL:', error)
        setError('Sorry, your device is not supported.')
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (regl.current) regl.current.destroy()
      setReady(false)
    }
  }, [])

  if (error) {
    return <div style={{ marginTop: '56px', fontSize: '20px' }}>{error}</div>
  }

  return (
    <ReglContext.Provider
      value={{
        regl: regl.current,
      }}
    >
      <div style={{ width: '100%', height: '100%', ...style }} ref={ref} />
      {ready && children}
    </ReglContext.Provider>
  )
}

export default Regl
