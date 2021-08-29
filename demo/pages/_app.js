import { ThemeProvider } from 'theme-ui'
import '@carbonplan/components/fonts.css'
import '@carbonplan/components/globals.css'
import theme from '@carbonplan/theme'

const App = ({ Component, pageProps }) => {
  return (
    <ThemeProvider theme={theme}>
      <Component {...pageProps} />
    </ThemeProvider>
  )
}

export default App
