/**
 * Displays a single example card pair with verdict for rule verification.
 */

import React from 'react';
import { Card as CardComponent } from './Card';
import type { CardExample } from '../services/ruleCompiler';

interface RuleExampleCardProps {
  example: CardExample;
  index: number;
  /** If provided, shows whether the compiled function agrees with the expected verdict */
  actualResult?: boolean;
  onOverride?: (index: number, newExpected: boolean) => void;
}

function getSuitSymbol(suit: string): '♥' | '♦' | '♣' | '♠' {
  const map: Record<string, '♥' | '♦' | '♣' | '♠'> = {
    hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
  };
  return map[suit] || '♥';
}

export const RuleExampleCard: React.FC<RuleExampleCardProps> = ({
  example,
  index,
  actualResult,
  onOverride,
}) => {
  const { lastCard, newCard, expected, explanation } = example;

  const isMismatch = actualResult !== undefined && actualResult !== expected;

  const verdictColor = expected ? '#00ff88' : '#ff4444';
  const rowBg = isMismatch
    ? 'rgba(255, 100, 0, 0.15)'
    : 'rgba(255, 255, 255, 0.03)';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto auto auto 1fr auto',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.6rem 0.75rem',
        background: rowBg,
        borderRadius: '6px',
        border: isMismatch
          ? '1px solid rgba(255, 100, 0, 0.5)'
          : '1px solid rgba(255, 255, 255, 0.07)',
        marginBottom: '0.4rem',
      }}
    >
      {/* Last card */}
      <div style={{ transform: 'scale(0.6)', transformOrigin: 'center', width: 40, height: 56 }}>
        <CardComponent
          suit={getSuitSymbol(lastCard.suit)}
          rank={lastCard.rank}
          disabled={true}
        />
      </div>

      {/* Arrow */}
      <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>→</div>

      {/* New card */}
      <div style={{ transform: 'scale(0.6)', transformOrigin: 'center', width: 40, height: 56 }}>
        <CardComponent
          suit={getSuitSymbol(newCard.suit)}
          rank={newCard.rank}
          disabled={true}
        />
      </div>

      {/* Explanation */}
      <div style={{ fontSize: '0.4rem', color: 'var(--text-dim)', lineHeight: 1.4, overflow: 'hidden' }}>
        {explanation}
        {isMismatch && (
          <span style={{ color: '#ff6400', display: 'block', marginTop: '0.2rem' }}>
            ⚠ Function returned {String(actualResult)}, expected {String(expected)}
          </span>
        )}
      </div>

      {/* Verdict + override */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
        <span
          style={{
            fontSize: '0.45rem',
            color: verdictColor,
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          {expected ? '✓ VALID' : '✗ INVALID'}
        </span>
        {onOverride && (
          <button
            onClick={() => onOverride(index, !expected)}
            title="Override verdict"
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: 'var(--text-dim)',
              fontSize: '0.35rem',
              cursor: 'pointer',
              padding: '0.15rem 0.3rem',
              fontFamily: 'Press Start 2P, cursive',
            }}
          >
            FLIP
          </button>
        )}
      </div>
    </div>
  );
};
