import React, { createContext, useContext, useState } from 'react'

const RegionContext = createContext({
  region: null,
  onChange: () => {
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
  children?: React.Node
}

export const RegionProvider = ({ children }: Props) => {
  const [region, setRegion] = useState(null)

  return (
    <RegionContext.Provider value={{ region, setRegion }}>
      {children}
    </RegionContext.Provider>
  )
}
