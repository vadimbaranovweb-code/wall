import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-8">
        <div className="bg-card border border-red-200 rounded-2xl p-6 max-w-lg w-full">
          <h1 className="text-base font-semibold text-red-600 mb-3">
            Что-то пошло не так
          </h1>
          <pre className="text-xs text-ink-60 bg-canvas rounded-lg p-3 overflow-auto
                          font-mono whitespace-pre-wrap mb-4">
            {error.message}
            {'\n\n'}
            {error.stack?.split('\n').slice(0, 6).join('\n')}
          </pre>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-ink text-card text-sm
                         font-medium hover:opacity-90"
              onClick={() => {
                // Clear localStorage and reload — fixes corrupt state
                localStorage.removeItem('stena-cards')
                localStorage.removeItem('stena-walls')
                window.location.href = '/'
              }}
            >
              Сбросить данные и перезагрузить
            </button>
            <button
              className="px-4 py-2 rounded-lg border border-ink-10 text-sm
                         text-ink-60 hover:bg-ink-10"
              onClick={() => this.setState({ error: null })}
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    )
  }
}
