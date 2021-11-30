import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'

const LoadingContext = createContext({})

export const useLoadingContext = () => {
  return useContext(LoadingContext)
}

export const useSetLoading = () => {
  const { values, setValue } = useLoadingContext()
  const key = useRef(new Date().getTime())

  const setLoading = useCallback(
    (value) => {
      setValue(key.current, value)
    },
    [key.current, setValue]
  )

  return { setLoading, loading: !!values[key.current] }
}

export const LoadingProvider = ({ children }) => {
  const [loading, setLoading] = useState({})

  const setValue = (key, value) => {
    setLoading({ ...loading, [key]: value })
  }

  return (
    <LoadingContext.Provider value={{ values: loading, setValue }}>
      {children}
    </LoadingContext.Provider>
  )
}
