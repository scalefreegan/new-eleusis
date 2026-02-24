/**
 * HelpOverlay - Tutorial and rules explanation modal
 */

import { motion } from 'motion/react';
import { GlassPanel } from './GlassPanel';

interface HelpOverlayProps {
  onClose: () => void;
}

export function HelpOverlay({ onClose }: HelpOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 2000,
        padding: '2rem',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}
      >
        <GlassPanel style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1
              style={{
                fontSize: '1.5rem',
                color: 'var(--accent-gold)',
                textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
              }}
            >
              HOW TO PLAY
            </h1>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'var(--text-light)',
                fontSize: '1rem',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                fontFamily: 'Press Start 2P, cursive',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: '0.65rem', lineHeight: '1.8', color: 'var(--text-light)' }}>
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                🎯 OBJECTIVE
              </h2>
              <p style={{ marginBottom: '0.75rem' }}>
                The Dealer has a secret rule. Your goal is to play cards that follow this rule.
                Score points for correct plays and avoid penalties for wrong ones.
              </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                🎴 BASIC PLAY
              </h2>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  On your turn, select one or more cards and click "Play Cards"
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Cards that follow the rule are added to the main line (correct)
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Cards that break the rule branch off as incorrect
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  If you can't play any cards, declare "No Play"
                </li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                👑 THE PROPHET
              </h2>
              <p style={{ marginBottom: '0.75rem' }}>
                Declare yourself as Prophet when you think you know the rule:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  Predict whether other players' cards will be correct or wrong
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Get 3 predictions right to overthrow the Dealer and win!
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Wrong predictions cost you points
                </li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                📊 SCORING
              </h2>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--accent-gold)' }}>+1</span> point for each correct card
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: '#dc143c' }}>-1</span> point for each wrong card
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--accent-gold)' }}>+5</span> for correct Prophet predictions
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: '#dc143c' }}>-5</span> for wrong Prophet predictions
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Penalty for having 25+ cards in hand
                </li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ⚡ SUDDEN DEATH
              </h2>
              <p style={{ marginBottom: '0.75rem' }}>
                If you reach 25 cards in your hand, you get a Sudden Death marker (💀).
                Get 2 markers and you're expelled from the game!
              </p>
            </section>

            <section>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                🏆 WINNING
              </h2>
              <ul style={{ paddingLeft: '1.5rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  The game ends when the deck runs out
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Or when the Prophet gets 3 correct predictions
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Highest score wins!
                </li>
              </ul>
            </section>
          </div>

          <button
            onClick={onClose}
            style={{
              marginTop: '2rem',
              width: '100%',
              padding: '1rem',
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
            GOT IT!
          </button>
        </GlassPanel>
      </motion.div>
    </motion.div>
  );
}
