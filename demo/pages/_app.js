import React from 'react'
import PlausibleProvider from 'next-plausible'
import { ThemeProvider } from 'theme-ui'
import '@carbonplan/components/fonts.css'
import '@carbonplan/components/globals.css'
import '@carbonplan/maps/mapbox.css'
import theme from '@carbonplan/theme'

const App = ({ Component, pageProps }) => {
  return (
    <PlausibleProvider domain='carbonplan.org'>
      <ThemeProvider theme={theme}>
        <Component {...pageProps} />
      </ThemeProvider>
    </PlausibleProvider>
  )
}

export default App
