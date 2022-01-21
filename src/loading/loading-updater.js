import React, { useEffect } from 'react'

import { useLoadingContext } from './context'

export const LoadingUpdater = ({ setLoading }) => {
  const { value } = useLoadingContext()

  useEffect(() => {
    setLoading(value)
  }, [value])

  return null
}
