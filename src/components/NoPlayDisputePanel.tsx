/**
 * NoPlayDisputePanel - UI for God to resolve No-Play declarations
 */

import type { GameState } from '../engine';

interface NoPlayDisputePanelProps {
  state: GameState;
  onAccept: () => void;
  onReject: () => void;
  isAIGod: boolean;
}

export function NoPlayDisputePanel({
  state,
  onAccept,
  onReject,
  isAIGod,
}: NoPlayDisputePanelProps) {
  const declaringPlayer = state.players.find(
    p => p.id === state.noPlayDeclaration?.playerId
  );

  if (!declaringPlayer) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          background: 'var(--glass-bg)',
          border: '3px solid var(--accent-gold)',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 0 40px rgba(255, 215, 0, 0.4)',
        }}
      >
        <h2
          style={{
            fontSize: '2.0rem',
            color: 'var(--accent-gold)',
            marginBottom: '1rem',
            textAlign: 'center',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.6)',
          }}
        >
          ⚖️ No-Play Declaration
        </h2>

        <p
          style={{
            fontSize: '1.4rem',
            color: 'var(--text-light)',
            textAlign: 'center',
            marginBottom: '2rem',
            lineHeight: '1.5',
          }}
        >
          <span style={{ color: 'var(--accent-blue)' }}>{declaringPlayer.name}</span>
          {' '}has declared they have no valid cards to play.
        </p>

        {isAIGod ? (
          <div
            style={{
              textAlign: 'center',
              padding: '1.5rem',
              background: 'rgba(255, 215, 0, 0.1)',
              borderRadius: '8px',
              border: '2px solid rgba(255, 215, 0, 0.3)',
            }}
          >
            <p
              style={{
                fontSize: '1.3rem',
                color: 'var(--accent-gold)',
                marginBottom: '0.5rem',
              }}
            >
              🔮 God is reviewing...
            </p>
            <p
              style={{
                fontSize: '1.1rem',
                color: 'var(--text-dim)',
              }}
            >
              Please wait while the decision is made.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={onAccept}
              style={{
                padding: '1rem 2rem',
                background: 'rgba(0, 255, 0, 0.2)',
                border: '2px solid rgba(0, 255, 0, 0.5)',
                borderRadius: '8px',
                color: 'var(--text-light)',
                fontSize: '1.3rem',
                cursor: 'pointer',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 255, 0, 0.4)';
                e.currentTarget.style.borderColor = 'rgba(0, 255, 0, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 255, 0, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(0, 255, 0, 0.5)';
              }}
            >
              ✓ Accept
            </button>

            <button
              onClick={onReject}
              style={{
                padding: '1rem 2rem',
                background: 'rgba(255, 0, 0, 0.2)',
                border: '2px solid rgba(255, 0, 0, 0.5)',
                borderRadius: '8px',
                color: 'var(--text-light)',
                fontSize: '1.3rem',
                cursor: 'pointer',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 0, 0, 0.4)';
                e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 0, 0, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.5)';
              }}
            >
              ✗ Reject
            </button>
          </div>
        )}

        {!isAIGod && (
          <p
            style={{
              fontSize: '1.0rem',
              color: 'var(--text-dim)',
              textAlign: 'center',
              marginTop: '1.5rem',
              lineHeight: '1.4',
            }}
          >
            Accept if they truly have no valid cards.
            <br />
            Reject if they could have played a card.
          </p>
        )}
      </div>
    </div>
  );
}
