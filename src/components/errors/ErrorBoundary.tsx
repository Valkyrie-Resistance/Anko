import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  handleReload = (): void => {
    window.location.reload()
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-destructive">Something went wrong</h1>
              <p className="text-muted-foreground">
                An unexpected error occurred. You can try to recover or reload the application.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-zinc-900 rounded-lg p-4 text-left">
                <p className="text-xs text-zinc-500 mb-1">Error details:</p>
                <code className="text-xs text-red-400 break-all">{this.state.error.message}</code>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={this.handleReset}>
                Try Again
              </Button>
              <Button onClick={this.handleReload}>Reload App</Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
