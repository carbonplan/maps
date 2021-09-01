import React, { createContext, useContext, useState } from 'react'

const RegionContext = createContext({
  region: null,
  onChange: () => {
    throw new Error('Tried to set region before initializing context')
  },
})

export const useRegion = () => {
  return useContext(RegionContext)
}

export const RegionProvider = ({ children }) => {
  const [region, setRegion] = useState(null)

  return (
    <RegionContext.Provider value={{ region, onChange: setRegion }}>
      {children}
    </RegionContext.Provider>
  )
}
