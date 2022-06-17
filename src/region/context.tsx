import React, { createContext, useContext, useState } from 'react'

type Context = {
  region: any
  setRegion: (region: any) => void
}

const RegionContext = createContext<Context>({
  region: null,
  setRegion: () => {
    throw new Error('Tried to set region before initializing context')
  },
})

export const useRegionContext = () => {
  return useContext(RegionContext)
}

export const useRegion = () => {
  const { region } = useContext(RegionContext)
  return { region }
}

type Props = {
  children?: React.ReactNode
}

export const RegionProvider = ({ children }: Props) => {
  const [region, setRegion] = useState(null)

  return (
    <RegionContext.Provider value={{ region, setRegion }}>
      {children}
    </RegionContext.Provider>
  )
}
