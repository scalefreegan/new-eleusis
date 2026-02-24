/**
 * Scoreboard - Compact display of all players' stats
 */

import React from 'react';
import type { Player, GameState } from '../engine/types';
import { calculatePlayerScore, calculateDealerScore } from '../engine/scoring';
import { motion } from 'framer-motion';

interface ScoreboardProps {
  players: Player[];
  currentPlayerIndex: number;
  gameState: GameState;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ players, currentPlayerIndex, gameState }) => {
  return (
    <div style={{ width: '100%' }}>
      <h2
        style={{
          fontSize: '0.8rem',
          marginBottom: '0.75rem',
          color: 'var(--accent-gold)',
          textAlign: 'center',
        }}
      >
        Players
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {players.map((player, index) => {
          const isCurrent = index === currentPlayerIndex;
          const isExpelled = player.isExpelled;

          // Calculate live score
          const currentScore = player.isDealer
            ? calculateDealerScore(gameState)
            : calculatePlayerScore(player, gameState);

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{
                padding: '0.5rem',
                background: isCurrent
                  ? 'rgba(255, 215, 0, 0.15)'
                  : 'rgba(0, 0, 0, 0.3)',
                border: isCurrent
                  ? '2px solid var(--accent-gold)'
                  : '2px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                opacity: isExpelled ? 0.5 : 1,
                transition: 'all 0.3s',
              }}
            >
              {/* Player Name Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: isCurrent ? 'bold' : 'normal',
                      color: isExpelled
                        ? 'var(--text-dim)'
                        : isCurrent
                        ? 'var(--accent-gold)'
                        : 'var(--text-light)',
                      textDecoration: isExpelled ? 'line-through' : 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {player.name}
                  </span>
                  {player.type === 'ai' && (
                    <span
                      style={{
                        fontSize: '0.45rem',
                        color: 'var(--text-dim)',
                        padding: '0.1rem 0.2rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '3px',
                        flexShrink: 0,
                      }}
                    >
                      AI
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {player.isProphet && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        filter: isExpelled ? 'grayscale(100%)' : 'none',
                      }}
                      title="Prophet"
                    >
                      👑
                    </span>
                  )}
                  {isExpelled && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                      }}
                      title="Expelled"
                    >
                      ⛔
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.55rem',
                  color: 'var(--text-dim)',
                  gap: '0.5rem',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Scr:</span>{' '}
                  <span
                    style={{
                      color: isExpelled
                        ? 'var(--text-dim)'
                        : 'var(--accent-gold)',
                    }}
                  >
                    {currentScore}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Cds:</span>{' '}
                  <span
                    style={{
                      color: isExpelled
                        ? 'var(--text-dim)'
                        : player.hand.length >= 25
                        ? '#dc143c'
                        : player.hand.length >= 20
                        ? '#ffa500'
                        : 'var(--text-light)',
                    }}
                  >
                    {player.hand.length}
                    {!isExpelled && player.hand.length >= 25 && ' 💀'}
                    {!isExpelled && player.hand.length >= 20 && player.hand.length < 25 && ' ⚠️'}
                  </span>
                </div>
              </div>

              {/* Sudden Death Markers */}
              {player.suddenDeathMarkers > 0 && (
                <div
                  style={{
                    fontSize: '0.6rem',
                    marginTop: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(220, 20, 60, 0.2)',
                    border: '1px solid rgba(220, 20, 60, 0.5)',
                    borderRadius: '4px',
                    color: '#dc143c',
                  }}
                >
                  💀 {player.suddenDeathMarkers} Marker{player.suddenDeathMarkers !== 1 ? 's' : ''}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
