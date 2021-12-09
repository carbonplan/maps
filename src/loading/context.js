import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react'
import { v4 as uuidv4 } from 'uuid'

const LoadingContext = createContext({})

export const useLoadingContext = () => {
  return useContext(LoadingContext)
}

export const useSetLoading = () => {
  const { values, dispatch } = useLoadingContext()
  const key = useRef(uuidv4())

  useEffect(() => {
    return () => {
      dispatch({ id: key.current, type: 'delete' })
    }
  }, [])

  const setLoading = useCallback(
    (value) => {
      dispatch({ id: key.current, value, type: 'set' })
    },
    [key.current]
  )

  return { setLoading, loading: !!values[key.current] }
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'set':
      return { ...state, [action.id]: action.value }
    case 'delete':
      const { [action.id]: removed, ...remaining } = state
      return remaining
    default:
      throw new Error(`Unexpected action: ${action.type}`)
  }
}

export const LoadingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, {})

  return (
    <LoadingContext.Provider value={{ values: state, dispatch }}>
      {children}
    </LoadingContext.Provider>
  )
}
