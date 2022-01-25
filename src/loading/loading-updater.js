import { useEffect } from 'react'

import { useLoadingContext } from './context'

export const LoadingUpdater = ({
  setLoading,
  setInitializing,
  setFetching,
}) => {
  const { loading, initializing, fetching } = useLoadingContext()

  useEffect(() => {
    if (setLoading) {
      setLoading(loading)
    }
  }, [!!setLoading, loading])

  useEffect(() => {
    if (setInitializing) {
      setInitializing(initializing)
    }
  }, [!!setInitializing, initializing])

  useEffect(() => {
    if (setFetching) {
      setFetching(fetching)
    }
  }, [!!setFetching, fetching])

  return null
}
