/**
 * TurnTransitionOverlay - Full-screen overlay for turn transitions in multiplayer
 */

import React from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from './GlassPanel';

interface TurnTransitionOverlayProps {
  playerName: string;
  onReady: () => void;
}

export const TurnTransitionOverlay: React.FC<TurnTransitionOverlayProps> = ({
  playerName,
  onReady,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <GlassPanel
          style={{
            padding: '3rem',
            textAlign: 'center',
            minWidth: '400px',
          }}
        >
          <motion.h2
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            style={{
              fontSize: '1.25rem',
              color: 'var(--accent-gold)',
              textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
              marginBottom: '2rem',
              fontFamily: 'Press Start 2P, cursive',
            }}
          >
            {playerName}
          </motion.h2>

          <motion.p
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-light)',
              marginBottom: '3rem',
              lineHeight: '1.6',
            }}
          >
            Pass the device to {playerName}
          </motion.p>

          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReady}
            style={{
              width: '100%',
              padding: '1.5rem',
              background: 'var(--accent-purple)',
              border: '3px solid var(--accent-gold)',
              borderRadius: '12px',
              color: 'var(--text-light)',
              fontSize: '1rem',
              cursor: 'pointer',
              fontFamily: 'Press Start 2P, cursive',
              transition: 'all 0.2s',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-gold)';
              e.currentTarget.style.color = 'var(--bg-deep)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent-purple)';
              e.currentTarget.style.color = 'var(--text-light)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.3)';
            }}
          >
            I'M READY
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
            style={{
              fontSize: '0.5rem',
              color: 'var(--text-dim)',
              marginTop: '2rem',
              lineHeight: '1.5',
            }}
          >
            This screen prevents other players from seeing your hand
          </motion.p>
        </GlassPanel>
      </motion.div>
    </motion.div>
  );
};
