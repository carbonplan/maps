import React, { useEffect } from 'react'

import { useLoadingContext } from './context'

export const LoadingUpdater = ({ setLoading }) => {
  const { values } = useLoadingContext()
  const loading = Object.keys(values).some((key) => values[key])

  useEffect(() => {
    setLoading(loading)
  }, [loading])

  return null
}
