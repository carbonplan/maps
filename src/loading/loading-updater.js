import { useEffect } from 'react'

import { useLoadingContext } from './context'

export const LoadingUpdater = ({
  setLoading,
  setMetadataLoading,
  setChunkLoading,
}) => {
  const { loading, metadataLoading, chunkLoading } = useLoadingContext()

  useEffect(() => {
    if (setLoading) {
      setLoading(loading)
    }
  }, [!!setLoading, loading])

  useEffect(() => {
    if (setMetadataLoading) {
      setMetadataLoading(metadataLoading)
    }
  }, [!!setMetadataLoading, metadataLoading])

  useEffect(() => {
    if (setChunkLoading) {
      setChunkLoading(chunkLoading)
    }
  }, [!!setChunkLoading, chunkLoading])

  return null
}
