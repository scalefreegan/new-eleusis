/**
 * Game Over Screen with leaderboard and play again option
 */

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { GlassPanel } from './GlassPanel';
import { calculateFinalScores, type GameState } from '../engine';
import { sounds } from '../audio/sounds';

interface GameOverScreenProps {
  state: GameState;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function GameOverScreen({ state, onPlayAgain, onMainMenu }: GameOverScreenProps) {
  const scores = calculateFinalScores(state);

  // Sort players by score (descending)
  const sortedPlayers = [...state.players]
    .filter(p => !p.isDealer)
    .sort((a, b) => scores[b.id] - scores[a.id]);

  const winner = sortedPlayers[0];
  const isOverthrown = state.prophetsCorrectCount >= 3;

  // Play game over sound on mount
  useEffect(() => {
    sounds.playGameOver();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        zIndex: 1000,
      }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <GlassPanel style={{ maxWidth: '600px', padding: '3rem', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '2rem',
              color: 'var(--accent-gold)',
              textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
              marginBottom: '1rem',
            }}
          >
            GAME OVER
          </h1>

          {isOverthrown && (
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--accent-purple)',
                marginBottom: '1.5rem',
                padding: '0.5rem',
                background: 'rgba(138, 43, 226, 0.2)',
                borderRadius: '8px',
              }}
            >
              👑 DEALER OVERTHROWN! Prophet discovered the rule!
            </div>
          )}

          {/* Winner */}
          {winner && (
            <div
              style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(138, 43, 226, 0.3))',
                borderRadius: '12px',
                border: '2px solid var(--accent-gold)',
              }}
            >
              <div
                style={{
                  fontSize: '1.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                🏆
              </div>
              <div
                style={{
                  fontSize: '1rem',
                  color: 'var(--accent-gold)',
                  marginBottom: '0.5rem',
                }}
              >
                {winner.name}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-light)',
                }}
              >
                {scores[winner.id]} points
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div
            style={{
              marginBottom: '2rem',
              textAlign: 'left',
            }}
          >
            <h2
              style={{
                fontSize: '0.75rem',
                color: 'var(--accent-blue)',
                marginBottom: '1rem',
                textAlign: 'center',
              }}
            >
              FINAL STANDINGS
            </h2>
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  marginBottom: '0.5rem',
                  background: index === 0
                    ? 'rgba(255, 215, 0, 0.1)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: index === 0
                    ? '1px solid rgba(255, 215, 0, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span
                    style={{
                      color: index === 0 ? 'var(--accent-gold)' : 'var(--text-dim)',
                      fontWeight: 'bold',
                      minWidth: '30px',
                    }}
                  >
                    #{index + 1}
                  </span>
                  <span style={{ color: 'var(--text-light)' }}>
                    {player.name}
                    {player.isProphet && ' 👑'}
                    {player.isExpelled && ' 💀'}
                  </span>
                </div>
                <span
                  style={{
                    color: index === 0 ? 'var(--accent-gold)' : 'var(--text-light)',
                    fontWeight: 'bold',
                  }}
                >
                  {scores[player.id]} pts
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={onPlayAgain}
              style={{
                padding: '1rem 2rem',
                background: 'var(--accent-purple)',
                border: '2px solid var(--accent-gold)',
                borderRadius: '8px',
                color: 'var(--text-light)',
                fontSize: '0.65rem',
                cursor: 'pointer',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-gold)';
                e.currentTarget.style.color = 'var(--bg-deep)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--accent-purple)';
                e.currentTarget.style.color = 'var(--text-light)';
              }}
            >
              PLAY AGAIN
            </button>
            <button
              onClick={onMainMenu}
              style={{
                padding: '1rem 2rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'var(--text-dim)',
                fontSize: '0.65rem',
                cursor: 'pointer',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-blue)';
                e.currentTarget.style.color = 'var(--text-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = 'var(--text-dim)';
              }}
            >
              MAIN MENU
            </button>
          </div>
        </GlassPanel>
      </motion.div>
    </motion.div>
  );
}
