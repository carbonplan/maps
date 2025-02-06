import React from 'react'
import PlausibleProvider from 'next-plausible'
import { ThemeProvider } from 'theme-ui'
import { MDXProvider } from '@mdx-js/react'
import '@carbonplan/components/fonts.css'
import '@carbonplan/components/globals.css'
import theme from '@carbonplan/theme'

const App = ({ Component, pageProps }) => {
  return (
    <PlausibleProvider domain='carbonplan.org'>
      <ThemeProvider theme={theme}>
        <MDXProvider>
          <Component {...pageProps} />
        </MDXProvider>
      </ThemeProvider>
    </PlausibleProvider>
  )
}

export default App
