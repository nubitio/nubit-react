import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@nubitio/ui';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Keeps a thrown field renderer from taking the whole admin down with it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Nubit admin render error', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div role="alert" style={{ padding: 24, maxWidth: 480 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>Something went wrong</h1>
        <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)' }}>
          Reload the page. If it happens again, the last action is in the browser console.
        </p>
        <Button
          variant="primary"
          onClick={() => {
            this.setState({ error: null });
            window.location.reload();
          }}
        >
          Reload
        </Button>
      </div>
    );
  }
}
