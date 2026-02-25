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
                  On your turn, select one or more cards (up to 4) and click "Play Cards"
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Cards that follow the rule are added to the main line (correct)
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Cards that break the rule branch off as incorrect
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: '#dc143c' }}>Wrong play penalty:</span> Each incorrect card earns you <span style={{ color: '#dc143c' }}>2 penalty cards</span> from the deck
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Playing a sequence: If you play multiple cards, each is judged in order
                </li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                🚫 NO PLAY
              </h2>
              <p style={{ marginBottom: '0.75rem' }}>
                If you believe none of your cards can follow the rule:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--accent-gold)' }}>Valid no-play:</span> Discard your entire hand, draw a new hand with 4 fewer cards
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: '#dc143c' }}>Invalid no-play:</span> God finds a correct card, plays it for you, and you draw <span style={{ color: '#dc143c' }}>5 penalty cards</span>
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  If your new hand is empty, you're out but can win on scoring!
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
                  <span style={{ color: 'var(--accent-gold)' }}>Eligibility:</span> No existing Prophet, you haven't been Prophet before, at least 2 other active players
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Predict whether other players' cards will be correct or wrong
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Wrong predictions overthrow you (5 penalty cards + your old hand back)
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Stay Prophet until game end for big score bonus!
                </li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                📊 SCORING
              </h2>
              <p style={{ marginBottom: '0.75rem', fontStyle: 'italic' }}>
                Score = (highest hand count - your hand count) + bonuses
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--accent-gold)' }}>+4 bonus</span> if your hand is empty at game end
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--accent-gold)' }}>Prophet bonus:</span> +1 per correct card played after your marker, +2 per wrong card (if still Prophet at end)
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--accent-purple)' }}>God score:</span> min(highest player score, 2 × cards before Prophet marker)
                </li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ⚡ SUDDEN DEATH
              </h2>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  White markers (○) appear every 10 cards played
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Black markers (●) appear every 10 cards after Prophet marker
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: '#dc143c' }}>Sudden Death starts:</span> at 40 cards total, or 30 cards after Prophet marker
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  During Sudden Death: any wrong play = immediate expulsion!
                </li>
              </ul>
            </section>

            <section>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                🏆 GAME END
              </h2>
              <p style={{ marginBottom: '0.75rem' }}>
                The round ends when:
              </p>
              <ul style={{ paddingLeft: '1.5rem' }}>
                <li style={{ marginBottom: '0.5rem' }}>
                  Any player runs out of cards
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  All non-God players are expelled
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  The deck is empty
                </li>
                <li style={{ marginBottom: '0.5rem' }}>
                  Highest score wins! True Prophet (still Prophet at end) becomes next God.
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
