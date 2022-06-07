import React, {
  createContext,
  useCallback,
  useState,
  useEffect,
  useContext,
  useRef,
} from 'react'
import * as _regl from 'regl'

export const ReglContext = createContext<{ regl?: _regl.Regl } | null>(null)

export const useRegl = (): { regl: _regl.Regl } => {
  const value = useContext(ReglContext)
  if (value && value.regl) {
    return { regl: value.regl }
  }
  throw new Error('Invoked useRegl before initializing context')
}

type Props = {
  style?: { [key: string]: string | number }
  children?: React.ReactNode
}

const Regl = ({ style, children }: Props) => {
  const regl = useRef<_regl.Regl>()
  const [ready, setReady] = useState(false)

  const ref = useCallback((node: HTMLDivElement) => {
    if (node !== null) {
      regl.current = _regl({
        container: node,
        extensions: ['OES_texture_float', 'OES_element_index_uint'],
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
      <div style={{ width: '100%', height: '100%', ...style }} ref={ref} />
      {ready && children}
    </ReglContext.Provider>
  )
}

export default Regl
