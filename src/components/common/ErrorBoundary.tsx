import { Component, type ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'var(--bg-secondary)',
          }}
        >
          <Card style={{ maxWidth: '500px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 0.5rem',
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                marginBottom: '1.5rem',
                lineHeight: 1.6,
              }}
            >
              An unexpected error occurred. You can try again or reload the page.
            </p>
            {this.state.error && (
              <details
                style={{
                  textAlign: 'left',
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Error details
                </summary>
                <code
                  style={{
                    display: 'block',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'var(--error)',
                  }}
                >
                  {this.state.error.message}
                </code>
              </details>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Button variant="secondary" onClick={this.handleReset}>
                Try Again
              </Button>
              <Button variant="primary" onClick={this.handleReload}>
                Reload Page
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
