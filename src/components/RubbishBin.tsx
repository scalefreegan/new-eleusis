/**
 * RubbishBin — small visual pile representing every card the dealer rejected.
 *
 * Click to open the RejectionsModal. Empty state is a dimmed silhouette with
 * no count badge and no click handler.
 */

import { motion } from 'motion/react';
import { GlassPanel } from './GlassPanel';
import { countRejectedCards, type PlayedCard } from '../engine';

interface RubbishBinProps {
  mainLine: PlayedCard[];
  onOpen: () => void;
}

export function RubbishBin({ mainLine, onOpen }: RubbishBinProps) {
  const rejectedCount = countRejectedCards(mainLine);

  const isEmpty = rejectedCount === 0;
  const stackDepth = Math.min(3, Math.max(1, rejectedCount));

  return (
    <GlassPanel
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '0.75rem',
        padding: '1rem',
        minWidth: '140px',
        height: '100%',
        opacity: isEmpty ? 0.55 : 1,
      }}
    >
      <h3
        style={{
          fontSize: '1.0rem',
          color: 'var(--suit-red)',
          margin: 0,
          fontFamily: 'Press Start 2P, cursive',
          letterSpacing: '0.05em',
          textShadow: '0 0 8px rgba(220, 20, 60, 0.4)',
        }}
      >
        REJECTED
      </h3>

      <motion.button
        onClick={isEmpty ? undefined : onOpen}
        disabled={isEmpty}
        whileHover={isEmpty ? {} : { scale: 1.05 }}
        whileTap={isEmpty ? {} : { scale: 0.97 }}
        aria-label={
          isEmpty
            ? 'No rejected cards yet'
            : `Open rejected cards (${rejectedCount})`
        }
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: isEmpty ? 'default' : 'pointer',
          width: 'calc(var(--card-width) + 16px)',
          height: 'calc(var(--card-height) + 16px)',
        }}
      >
        {/* Stacked card backs */}
        {Array.from({ length: stackDepth }).map((_, i) => {
          const offset = (stackDepth - 1 - i) * 4;
          const rotate = (i - (stackDepth - 1) / 2) * 6;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: offset,
                left: offset,
                width: 'var(--card-width)',
                height: 'var(--card-height)',
                borderRadius: '12px',
                border: '2px solid rgba(220, 20, 60, 0.8)',
                background:
                  'repeating-linear-gradient(45deg, #2d1b4e 0 6px, #1a0f2e 6px 12px)',
                boxShadow:
                  '0 6px 20px rgba(0, 0, 0, 0.4), inset 0 0 12px rgba(220, 20, 60, 0.25)',
                transform: `rotate(${rotate}deg)`,
                transformOrigin: 'center center',
              }}
            />
          );
        })}

        {/* Count badge */}
        {!isEmpty && (
          <div
            style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              minWidth: '32px',
              height: '32px',
              padding: '0 8px',
              borderRadius: '16px',
              background: 'var(--suit-red)',
              border: '2px solid var(--accent-gold)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              fontFamily: 'Press Start 2P, cursive',
              boxShadow: '0 0 14px rgba(220, 20, 60, 0.7)',
              zIndex: 2,
            }}
          >
            {rejectedCount}
          </div>
        )}
      </motion.button>

      <p
        style={{
          fontSize: '0.9rem',
          color: 'var(--text-dim)',
          textAlign: 'center',
          margin: 0,
          fontFamily: 'Press Start 2P, cursive',
          lineHeight: 1.4,
        }}
      >
        {isEmpty ? 'None yet' : 'Tap to view'}
      </p>
    </GlassPanel>
  );
}
