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
  const [metadataIds, setMetadataIds] = useState(new Set())
  const [chunkIds, setChunkIds] = useState(new Set())

  useEffect(() => {
    return () => {
      dispatch({ ids: metadataIds, type: 'clear all', key: 'metadata' })
      dispatch({ ids: chunkIds, type: 'clear all', key: 'chunk' })
      dispatch({ id: loadingId.current, type: 'clear', key: 'loading' })
    }
  }, [])

  const setLoading = useCallback((key = 'chunk') => {
    if (!['chunk', 'metadata'].includes(key)) {
      throw new Error(
        `Unexpected loading key: ${key}. Expected one of: 'chunk', 'metadata'.`
      )
    }

    const id = uuidv4()
    const setter = key === 'metadata' ? setMetadataIds : setChunkIds
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

  const clearLoading = useCallback((id, { forceClear } = {}) => {
    if (id) {
      setMetadataIds((prevMetadata) => {
        if (prevMetadata.has(id)) {
          dispatch({ id, type: 'clear', key: 'metadata' })
          prevMetadata.delete(id)
        }
        setChunkIds((prevChunk) => {
          if (prevChunk.has(id)) {
            dispatch({ id, type: 'clear', key: 'chunk' })
            prevChunk.delete(id)
            if (
              loading.current &&
              prevMetadata.size === 0 &&
              prevChunk.size === 0
            ) {
              dispatch({ id: loadingId.current, type: 'clear', key: 'loading' })
              loading.current = false
            }
          }
          return prevChunk
        })
        return prevMetadata
      })
    }
    if (forceClear && loading.current) {
      dispatch({ id: loadingId.current, type: 'clear', key: 'loading' })
      loading.current = false
    }
  }, [])

  return {
    setLoading,
    clearLoading,
    loading: loading.current,
    metadataLoading: metadataIds.size > 0,
    chunkLoading: chunkIds.size > 0,
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
    metadata: [],
    chunk: [],
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
  const { loading, metadata, chunk } = useContext(LoadingContext)

  return {
    loading: loading.length > 0,
    metadataLoading: metadata.length > 0,
    chunkLoading: chunk.length > 0,
  }
}
