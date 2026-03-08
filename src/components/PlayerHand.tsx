/**
 * PlayerHand component - displays player's cards in a fan layout
 */

import { motion } from 'motion/react';
import { Card } from './Card';
import { GlassPanel } from './GlassPanel';
import type { Card as CardType } from '../engine';

interface PlayerHandProps {
  hand: CardType[];
  selectedCards: Set<string>;
  onCardClick: (cardId: string) => void;
  disabled?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onPlayCards?: () => void;
  onNoPlay?: () => void;
  onDeclareProphet?: () => void;
  isProphet?: boolean;
  isHumanTurn?: boolean;
  gamePhase?: string;
  canDeclareProphet?: boolean;
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

export function PlayerHand({
  hand,
  selectedCards,
  onCardClick,
  disabled,
  collapsed = false,
  onToggleCollapse,
  onPlayCards,
  onNoPlay,
  onDeclareProphet,
  isProphet = false,
  isHumanTurn = false,
  gamePhase = 'playing',
  canDeclareProphet = false,
}: PlayerHandProps) {
  const fanSpread = Math.min(10, (hand.length > 0 ? 150 / hand.length : 10));

  const canPlay = selectedCards.size > 0 && isHumanTurn && gamePhase === 'playing';
  const canAct = isHumanTurn && gamePhase === 'playing';

  return collapsed ? (
    // MINIMAL collapsed view with action buttons
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: '70px' }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        border: '2px solid var(--glass-border)',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
        flex: 1,
        gap: '1rem',
      }}
    >
      {/* Left: Hand status */}
      <div
        style={{
          fontSize: '1.2rem',
          color: 'var(--text-light)',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          minWidth: '150px',
        }}
      >
        <span>🎴 {hand.length}</span>
        {selectedCards.size > 0 && (
          <span style={{ color: 'var(--accent-gold)' }}>✓ {selectedCards.size}</span>
        )}
      </div>

      {/* Center: Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', flex: 1, justifyContent: 'center' }}>
        {onPlayCards && (
          <button
            onClick={onPlayCards}
            disabled={!canPlay}
            style={{
              padding: '0.5rem 1rem',
              background: canPlay ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.1)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: canPlay ? 'var(--text-light)' : 'var(--text-dim)',
              fontSize: '1.0rem',
              cursor: canPlay ? 'pointer' : 'not-allowed',
              fontFamily: 'Press Start 2P, cursive',
              transition: 'all 0.2s',
              opacity: canPlay ? 1 : 0.5,
              whiteSpace: 'nowrap',
            }}
          >
            Play ({selectedCards.size})
          </button>
        )}
        {onNoPlay && (
          <button
            onClick={onNoPlay}
            disabled={!canAct}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: canAct ? 'var(--text-light)' : 'var(--text-dim)',
              fontSize: '1.0rem',
              cursor: canAct ? 'pointer' : 'not-allowed',
              fontFamily: 'Press Start 2P, cursive',
              transition: 'all 0.2s',
              opacity: canAct ? 1 : 0.5,
              whiteSpace: 'nowrap',
            }}
          >
            No Play
          </button>
        )}
        {onDeclareProphet && (
          <button
            onClick={onDeclareProphet}
            disabled={!canDeclareProphet}
            style={{
              padding: '0.5rem 1rem',
              background: isProphet ? 'var(--accent-gold)' : canDeclareProphet ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              border: '2px solid var(--accent-gold)',
              borderRadius: '8px',
              color: isProphet ? 'var(--bg-deep)' : canDeclareProphet ? 'var(--accent-gold)' : 'var(--text-dim)',
              fontSize: '1.0rem',
              cursor: canDeclareProphet ? 'pointer' : 'not-allowed',
              fontFamily: 'Press Start 2P, cursive',
              transition: 'all 0.2s',
              opacity: canDeclareProphet ? 1 : 0.5,
              whiteSpace: 'nowrap',
            }}
          >
            {isProphet ? 'Prophet ✓' : 'Prophet'}
          </button>
        )}
      </div>

      {/* Right: Expand button */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          style={{
            background: 'var(--accent-blue)',
            border: '2px solid var(--accent-gold)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1.0rem',
            color: 'var(--text-light)',
            fontFamily: 'Press Start 2P, cursive',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-purple)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-blue)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ▲ EXPAND
        </button>
      )}
    </motion.div>
  ) : (
    <GlassPanel style={{ flex: 1 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          gap: '1rem',
        }}
      >
        <h2
          style={{
            fontSize: '1.8rem',
            color: 'var(--accent-blue)',
            margin: 0,
          }}
        >
          Your Hand ({hand.length})
          {selectedCards.size > 0 && (
            <span style={{ color: 'var(--accent-gold)', marginLeft: '0.5rem' }}>
              ({selectedCards.size} selected)
            </span>
          )}
        </h2>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {onPlayCards && (
            <button
              onClick={onPlayCards}
              disabled={!canPlay}
              style={{
                padding: '0.5rem 1rem',
                background: canPlay ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: canPlay ? 'var(--text-light)' : 'var(--text-dim)',
                fontSize: '1.0rem',
                cursor: canPlay ? 'pointer' : 'not-allowed',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
                opacity: canPlay ? 1 : 0.5,
                whiteSpace: 'nowrap',
              }}
            >
              Play
            </button>
          )}
          {onNoPlay && (
            <button
              onClick={onNoPlay}
              disabled={!canAct}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: canAct ? 'var(--text-light)' : 'var(--text-dim)',
                fontSize: '1.0rem',
                cursor: canAct ? 'pointer' : 'not-allowed',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
                opacity: canAct ? 1 : 0.5,
                whiteSpace: 'nowrap',
              }}
            >
              No Play
            </button>
          )}
          {onDeclareProphet && (
            <button
              onClick={onDeclareProphet}
              disabled={!canDeclareProphet}
              style={{
                padding: '0.5rem 1rem',
                background: isProphet ? 'var(--accent-gold)' : canDeclareProphet ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                border: '2px solid var(--accent-gold)',
                borderRadius: '8px',
                color: isProphet ? 'var(--bg-deep)' : canDeclareProphet ? 'var(--accent-gold)' : 'var(--text-dim)',
                fontSize: '1.0rem',
                cursor: canDeclareProphet ? 'pointer' : 'not-allowed',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
                opacity: canDeclareProphet ? 1 : 0.5,
                whiteSpace: 'nowrap',
              }}
            >
              {isProphet ? '👑' : 'Prophet'}
            </button>
          )}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              style={{
                background: 'var(--accent-blue)',
                border: '2px solid var(--accent-gold)',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1.0rem',
                color: 'var(--text-light)',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-purple)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--accent-blue)';
              }}
            >
              ▼ Hide
            </button>
          )}
        </div>
      </div>

      {hand.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '150px',
            color: 'var(--text-dim)',
            fontSize: '1.3rem',
          }}
        >
          No cards in hand
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'center',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            minHeight: '180px',
          }}
        >
          {hand.map((card, index) => {
            const isSelected = selectedCards.has(card.id);
            const centerIndex = (hand.length - 1) / 2;
            const offset = index - centerIndex;
            const rotation = offset * fanSpread * 0.15;
            const yOffset = Math.abs(offset) * 3;

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: isSelected ? -20 : 0,
                  scale: 1,
                }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                  type: 'spring',
                  stiffness: 200,
                }}
                style={{
                  transform: `rotate(${rotation}deg) translateY(${yOffset}px)`,
                  zIndex: isSelected ? 100 : index,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    transition: 'transform 0.2s',
                    filter: isSelected
                      ? 'drop-shadow(0 0 10px var(--accent-gold))'
                      : 'none',
                  }}
                >
                  <Card
                    suit={getSuitSymbol(card.suit)}
                    rank={card.rank}
                    onClick={() => {
                      if (!disabled) {
                        onCardClick(card.id);
                      }
                    }}
                    disabled={disabled}
                  />
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '-10px',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: 'var(--accent-gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2.0rem',
                      fontWeight: 'bold',
                      color: 'var(--bg-deep)',
                      boxShadow: '0 0 15px rgba(255, 215, 0, 0.8)',
                      pointerEvents: 'none',
                    }}
                  >
                    ✓
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <div
        style={{
          marginTop: '1rem',
          fontSize: '1.0rem',
          color: 'var(--text-dim)',
          textAlign: 'center',
        }}
      >
        {selectedCards.size > 0
          ? `${selectedCards.size} card${selectedCards.size !== 1 ? 's' : ''} selected`
          : 'Click cards to select them for play'}
      </div>
    </GlassPanel>
  );
}
