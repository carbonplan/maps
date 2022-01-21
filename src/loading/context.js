import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from 'react'
import { v4 as uuidv4 } from 'uuid'

const LoadingContext = createContext({})

export const useLoadingContext = () => {
  return useContext(LoadingContext)
}

export const useSetLoading = () => {
  const { dispatch } = useLoadingContext()
  const [ids, setIds] = useState(new Set())

  useEffect(() => {
    return () => {
      dispatch({ ids, type: 'unset all' })
    }
  }, [])

  const setLoading = useCallback(() => {
    const id = uuidv4()
    setIds((prev) => {
      prev.add(id)
      return prev
    })
    dispatch({ id, type: 'set' })
    const unsetLoading = () => {
      dispatch({ id, type: 'unset' })
      setIds((prev) => {
        prev.delete(id)
        return prev
      })
    }
    return unsetLoading
  }, [])

  return { setLoading, loading: ids.size > 0 }
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'set':
      return [...state, action.id]
    case 'unset':
      return state.filter((el) => el !== action.id)
    case 'unset all':
      return state.filter((el) => !action.ids.has(el))
    default:
      throw new Error(`Unexpected action: ${action.type}`)
  }
}

export const LoadingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, [])

  return (
    <LoadingContext.Provider value={{ value: state.length > 0, dispatch }}>
      {children}
    </LoadingContext.Provider>
  )
}
