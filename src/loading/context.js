import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import { v4 as uuidv4 } from 'uuid'

const LoadingContext = createContext({})

export const useSetLoading = () => {
  const loadingId = useRef(uuidv4())
  const loading = useRef(false)
  const { dispatch } = useContext(LoadingContext)
  const [initializingIds, setInitializingIds] = useState(new Set())
  const [fetchingIds, setFetchingIds] = useState(new Set())

  useEffect(() => {
    return () => {
      dispatch({ ids: initializingIds, type: 'clear all', key: 'initializing' })
      dispatch({ ids: fetchingIds, type: 'clear all', key: 'fetching' })
      dispatch({ id: loadingId.current, type: 'clear', key: 'loading' })
    }
  }, [])

  const setLoading = useCallback((key = 'fetching') => {
    const id = uuidv4()
    const setter = key === 'initializing' ? setInitializingIds : setFetchingIds
    setter((prev) => {
      prev.add(id)
      return prev
    })

    if (!loading.current) {
      dispatch({ id: loadingId.current, type: 'set', key: 'loading' })
      loading.current = true
    }
    dispatch({ id, type: 'set', key })
    return id
  }, [])

  const clearLoading = useCallback((id) => {
    setInitializingIds((prevInitializing) => {
      if (prevInitializing.has(id)) {
        dispatch({ id, type: 'clear', key: 'initializing' })
        prevInitializing.delete(id)
      }
      setFetchingIds((prevFetching) => {
        if (prevFetching.has(id)) {
          dispatch({ id, type: 'clear', key: 'fetching' })
          prevFetching.delete(id)
          if (
            loading.current &&
            prevInitializing.size === 0 &&
            prevFetching.size === 0
          ) {
            dispatch({ id: loadingId.current, type: 'clear', key: 'loading' })
            loading.current = false
          }
        }
        return prevFetching
      })
      return prevInitializing
    })
  }, [])

  return {
    setLoading,
    clearLoading,
    loading: loading.current,
    initializing: initializingIds.size > 0,
    fetching: fetchingIds.size > 0,
  }
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'set':
      return {
        ...state,
        [action.key]: [...state[action.key], action.id],
      }
    case 'clear':
      return {
        ...state,
        [action.key]: state[action.key].filter((el) => el !== action.id),
      }
    case 'clear all':
      return {
        ...state,
        [action.key]: state[action.key].filter((el) => !action.ids.has(el)),
      }
    default:
      throw new Error(`Unexpected action: ${action.type}`)
  }
}

export const LoadingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, {
    loading: [],
    initializing: [],
    fetching: [],
  })

  return (
    <LoadingContext.Provider
      value={{
        ...state,
        dispatch,
      }}
    >
      {children}
    </LoadingContext.Provider>
  )
}

export const useLoadingContext = () => {
  const { loading, initializing, fetching } = useContext(LoadingContext)

  return {
    loading: loading.length > 0,
    initializing: initializing.length > 0,
    fetching: fetching.length > 0,
  }
}
