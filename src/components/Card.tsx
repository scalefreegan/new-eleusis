import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';

type Suit = '♥' | '♦' | '♣' | '♠';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface CardProps {
  suit: Suit;
  rank: Rank;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const Card: React.FC<CardProps> = ({ suit, rank, onClick, className = '', disabled = false }) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const isRed = suit === '♥' || suit === '♦';
  const suitColor = isRed ? 'var(--suit-red)' : 'var(--suit-black)';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateXValue = ((y - centerY) / centerY) * -15;
    const rotateYValue = ((x - centerX) / centerX) * 15;

    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`card ${className}`}
      onClick={() => {
        if (!disabled && onClick) {
          onClick();
        }
      }}
      onMouseMove={disabled ? undefined : handleMouseMove}
      onMouseLeave={disabled ? undefined : handleMouseLeave}
      whileHover={disabled ? {} : { scale: 1.05 }}
      animate={{
        rotateX,
        rotateY,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      style={{
        width: 'var(--card-width)',
        height: 'var(--card-height)',
        background: 'var(--card-bg)',
        borderRadius: '12px',
        border: '2px solid var(--card-border)',
        cursor: onClick && !disabled ? 'pointer' : 'default',
        opacity: disabled ? 0.7 : 1,
        transformStyle: 'preserve-3d',
        perspective: '1000px',
        position: 'relative',
        boxShadow: `
          0 10px 30px rgba(0, 0, 0, 0.3),
          0 0 15px rgba(138, 43, 226, 0.3)
        `,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Holographic shine overlay */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(
            ${rotateY + 120}deg,
            transparent 40%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 60%
          )`,
          opacity: 0,
          pointerEvents: 'none',
          borderRadius: '12px',
        }}
        animate={{
          opacity: rotateX !== 0 || rotateY !== 0 ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
      />

      {/* Card content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Rank */}
        <div
          style={{
            fontSize: 'var(--card-font-size)',
            fontWeight: 'bold',
            color: suitColor,
            lineHeight: 1,
            fontFamily: 'Press Start 2P, cursive',
          }}
        >
          {rank}
        </div>

        {/* Suit */}
        <div
          style={{
            fontSize: 'var(--card-suit-size)',
            color: suitColor,
            lineHeight: 1,
          }}
        >
          {suit}
        </div>
      </div>

    </motion.div>
  );
};
