import React from 'react'

// Based on https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
const DEFAULT_ERROR = 'Your device doesn’t support rendering this map.'
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { errorMessage: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return {
      errorMessage: error.message ?? defaultError,
    }
  }

  componentDidCatch(error, info) {
    // Example "componentStack":
    //   in ComponentThatThrows (created by App)
    //   in ErrorBoundary (created by App)
    //   in div (created by App)
    //   in App
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.errorMessage) {
      // You can render any custom fallback UI
      return (
        <div style={{ textAlign: 'center', padding: 24 }}>
          {this.props.showErrorTrace ? this.state.errorMessage : DEFAULT_ERROR}
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
