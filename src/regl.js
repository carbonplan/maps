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

const Regl = ({ style, containerStyle, extensions, children }) => {
  const regl = useRef()
  const [ready, setReady] = useState(false)

  const ref = useCallback((node) => {
    if (node !== null) {
      regl.current = _regl({
        container: node,
        extensions: extensions,
      })
      setReady(true)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (regl.current) regl.current.destroy()
      setReady(false)
    }
  }, [])

  return (
    <ReglContext.Provider
      value={{
        regl: regl.current,
      }}
    >
      <div
        style={{ width: '100%', height: '100%', ...containerStyle }}
        ref={ref}
      />
      {ready && children}
    </ReglContext.Provider>
  )
}

export default Regl
