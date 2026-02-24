/**
 * Prophet Prediction Panel - appears when Prophet needs to predict
 */

import { GlassPanel } from './GlassPanel';
import type { GameState } from '../engine';

interface ProphetPredictionPanelProps {
  state: GameState;
  prophetId: string;
  onPredictRight: () => void;
  onPredictWrong: () => void;
}

export function ProphetPredictionPanel({
  state,
  prophetId,
  onPredictRight,
  onPredictWrong,
}: ProphetPredictionPanelProps) {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const prophet = state.players.find(p => p.id === prophetId);

  if (!prophet || !currentPlayer || currentPlayer.id === prophetId) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
      }}
    >
      <GlassPanel
        style={{
          padding: '1.5rem',
          minWidth: '400px',
          border: '2px solid var(--accent-gold)',
          background: 'rgba(138, 43, 226, 0.9)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '0.6rem',
              color: 'var(--accent-gold)',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
            }}
          >
            👑 PROPHET PREDICTION
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-light)',
              marginBottom: '1.5rem',
            }}
          >
            Will {currentPlayer.name}'s next card be correct?
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={onPredictRight}
              style={{
                padding: '1rem 2rem',
                background: 'rgba(0, 200, 100, 0.3)',
                border: '2px solid rgba(0, 255, 0, 0.5)',
                borderRadius: '8px',
                color: '#00ff00',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
                fontWeight: 'bold',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 255, 0, 0.5)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 200, 100, 0.3)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ✓ RIGHT
            </button>
            <button
              onClick={onPredictWrong}
              style={{
                padding: '1rem 2rem',
                background: 'rgba(220, 20, 60, 0.3)',
                border: '2px solid rgba(255, 0, 0, 0.5)',
                borderRadius: '8px',
                color: '#ff0000',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
                fontWeight: 'bold',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(220, 20, 60, 0.5)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(220, 20, 60, 0.3)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ✗ WRONG
            </button>
          </div>
          <div
            style={{
              marginTop: '1rem',
              fontSize: '0.5rem',
              color: 'var(--text-dim)',
            }}
          >
            Correct Calls: {state.prophetCorrectCalls}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
