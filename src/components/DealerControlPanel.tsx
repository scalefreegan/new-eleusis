/**
 * DealerControlPanel - Panel for human dealer to judge cards.
 *
 * When `autoVerdict` is provided (compiled rule), displays the auto-computed verdict
 * and lets God accept or override it. When undefined, shows manual CORRECT/WRONG buttons.
 */

import React, { useState, useEffect } from 'react';
import { GlassPanel } from './GlassPanel';
import { Card as CardComponent } from './Card';
import type { Card } from '../engine/types';

interface DealerControlPanelProps {
  pendingCard: Card;
  playerName: string;
  onJudge: (correct: boolean) => void;
  /** Pre-computed verdict from compiled God rule. When provided, shows auto-judge UI. */
  autoVerdict?: boolean;
}

function getSuitSymbol(suit: string): '♥' | '♦' | '♣' | '♠' {
  const suitMap: Record<string, '♥' | '♦' | '♣' | '♠'> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return suitMap[suit] || '♥';
}

export const DealerControlPanel: React.FC<DealerControlPanelProps> = ({
  pendingCard,
  playerName,
  onJudge,
  autoVerdict,
}) => {
  const [overrideMode, setOverrideMode] = useState(false);
  const hasAutoVerdict = autoVerdict !== undefined;

  // Reset override mode when a new card arrives
  useEffect(() => {
    setOverrideMode(false);
  }, [pendingCard.id]);

  const handleAcceptAuto = () => {
    onJudge(autoVerdict!);
  };

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
          minWidth: '450px',
          border: '3px solid var(--accent-gold)',
          background: 'rgba(30, 20, 50, 0.95)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '0.6rem',
              color: 'var(--accent-gold)',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
            }}
          >
            {hasAutoVerdict && !overrideMode ? '🤖 AUTO JUDGMENT' : '⚖️ DEALER JUDGMENT'}
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-light)',
              marginBottom: '1.5rem',
            }}
          >
            Card played by {playerName}
          </div>

          {/* Display the pending card */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ transform: 'scale(1.2)' }}>
              <CardComponent
                suit={getSuitSymbol(pendingCard.suit)}
                rank={pendingCard.rank}
                disabled={true}
              />
            </div>
          </div>

          {/* Auto-verdict mode */}
          {hasAutoVerdict && !overrideMode ? (
            <div>
              {/* Auto verdict display */}
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: autoVerdict ? 'rgba(0, 200, 100, 0.15)' : 'rgba(220, 20, 60, 0.15)',
                  border: `2px solid ${autoVerdict ? 'rgba(0, 255, 0, 0.4)' : 'rgba(255, 0, 0, 0.4)'}`,
                  marginBottom: '1rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: autoVerdict ? '#00ff88' : '#ff4444',
                    fontWeight: 'bold',
                  }}
                >
                  {autoVerdict ? '✓ AUTO: CORRECT' : '✗ AUTO: WRONG'}
                </div>
                <div style={{ fontSize: '0.4rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                  Based on your compiled rule
                </div>
              </div>

              {/* Accept + Override buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={handleAcceptAuto}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: autoVerdict ? 'rgba(0, 200, 100, 0.3)' : 'rgba(220, 20, 60, 0.3)',
                    border: `2px solid ${autoVerdict ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)'}`,
                    borderRadius: '8px',
                    color: autoVerdict ? '#00ff00' : '#ff0000',
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                    fontFamily: 'Press Start 2P, cursive',
                    transition: 'all 0.2s',
                    fontWeight: 'bold',
                  }}
                >
                  ✓ ACCEPT
                </button>
                <button
                  onClick={() => setOverrideMode(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(255, 215, 0, 0.15)',
                    border: '2px solid rgba(255, 215, 0, 0.4)',
                    borderRadius: '8px',
                    color: 'var(--accent-gold)',
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                    fontFamily: 'Press Start 2P, cursive',
                    transition: 'all 0.2s',
                  }}
                >
                  ✎ OVERRIDE
                </button>
              </div>
            </div>
          ) : (
            /* Manual judgment buttons */
            <div>
              {hasAutoVerdict && overrideMode && (
                <div style={{ fontSize: '0.4rem', color: 'var(--accent-gold)', marginBottom: '0.75rem' }}>
                  Override mode — choose manually:
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={() => onJudge(true)}
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
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 200, 100, 0.3)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  ✓ CORRECT
                </button>
                <button
                  onClick={() => onJudge(false)}
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
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(220, 20, 60, 0.3)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  ✗ WRONG
                </button>
              </div>
              {hasAutoVerdict && overrideMode && (
                <button
                  onClick={() => setOverrideMode(false)}
                  style={{
                    marginTop: '0.75rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-dim)',
                    fontSize: '0.4rem',
                    cursor: 'pointer',
                    fontFamily: 'Press Start 2P, cursive',
                  }}
                >
                  ← Back to auto verdict
                </button>
              )}
            </div>
          )}

          {!hasAutoVerdict && (
            <div
              style={{
                marginTop: '1rem',
                fontSize: '0.5rem',
                color: 'var(--text-dim)',
                lineHeight: '1.5',
              }}
            >
              Judge this card according to your secret rule
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
};
