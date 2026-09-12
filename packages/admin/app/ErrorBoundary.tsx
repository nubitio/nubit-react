import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, EmptyState, Page } from '@nubitio/ui';

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
      <Page narrow>
        <EmptyState
          variant="danger"
          title="Something went wrong"
          description="Reload the page. If it happens again, the last action is in the browser console."
          action={
            <Button
              variant="primary"
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
            >
              Reload
            </Button>
          }
        />
      </Page>
    );
  }
}
