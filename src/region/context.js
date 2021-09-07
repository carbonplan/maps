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

export const RegionProvider = ({ children }) => {
  const [region, setRegion] = useState(null)

  return (
    <RegionContext.Provider value={{ region, setRegion }}>
      {children}
    </RegionContext.Provider>
  )
}
