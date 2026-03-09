import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  onReset: () => void;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GameErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[GameErrorBoundary] Caught error:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2rem',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontSize: '2.4rem',
              color: 'var(--accent-gold)',
              textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
              fontFamily: 'Press Start 2P, cursive',
            }}
          >
            Something went wrong
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-dim)', maxWidth: '500px' }}>
            The game encountered an unexpected error. You can reset to start a fresh game.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '1rem 2rem',
              background: 'var(--accent-purple)',
              border: '2px solid var(--accent-gold)',
              borderRadius: '8px',
              color: 'var(--text-light)',
              fontSize: '1.4rem',
              cursor: 'pointer',
              fontFamily: 'Press Start 2P, cursive',
              transition: 'all 0.2s',
            }}
            className="btn-hover-border-gold"
          >
            Reset Game
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
