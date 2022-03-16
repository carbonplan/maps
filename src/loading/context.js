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
      const loaders = [{ id: loadingId.current, key: 'loading' }]
      metadataIds.forEach((id) => loaders.push({ id, key: 'metadata' }))
      chunkIds.forEach((id) => loaders.push({ id, key: 'chunk' }))
      dispatch({ loaders, type: 'clear' })
    }
  }, [])

  useEffect(() => {
    if (loading.current && metadataIds.size === 0 && chunkIds.size === 0) {
      dispatch({
        loaders: [{ id: loadingId.current, key: 'loading' }],
        type: 'clear',
      })
      loading.current = false
    }
  }, [metadataIds.size, chunkIds.size, loading.current])

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

    const loaders = [{ id, key }]

    if (!loading.current) {
      loaders.push({ id: loadingId.current, key: 'loading' })
      loading.current = true
    }
    dispatch({ loaders, type: 'set' })
    return id
  }, [])

  const clearLoading = useCallback((id, { forceClear } = {}) => {
    if (id) {
      setMetadataIds((prevMetadata) => {
        prevMetadata.delete(id)
        return prevMetadata
      })
      setChunkIds((prevChunk) => {
        prevChunk.delete(id)
        return prevChunk
      })

      dispatch({
        loaders: [
          { id, key: 'metadata' },
          { id, key: 'chunk' },
        ],
        type: 'clear',
      })
    }

    if (forceClear && loading.current) {
      dispatch({
        loaders: [{ id: loadingId.current, key: 'loading' }],
        type: 'clear',
      })
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
      action.loaders.forEach(({ id, key }) => {
        state[key].add(id)
      })

      return { ...state }
    case 'clear':
      action.loaders.forEach(({ id, key }) => {
        state[key].delete(id)
      })

      return { ...state }
    default:
      throw new Error(`Unexpected action: ${action.type}`)
  }
}

export const LoadingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, {
    loading: new Set(),
    metadata: new Set(),
    chunk: new Set(),
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
    loading: loading.size > 0,
    metadataLoading: metadata.size > 0,
    chunkLoading: chunk.size > 0,
  }
}
