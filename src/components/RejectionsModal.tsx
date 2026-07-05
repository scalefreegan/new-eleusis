/**
 * RejectionsModal — lists every rejected card with the context of the play:
 * the validated card it followed, who played it, the turn number, prophet
 * prediction (if any), and the sudden-death state at the time.
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassPanel } from './GlassPanel';
import { Card } from './Card';
import {
  getPlayedCardPositions,
  type PlayedCard,
  type Player,
} from '../engine';
import { getSuitSymbol } from '../utils/cardUtils';

interface RejectionsModalProps {
  open: boolean;
  onClose: () => void;
  mainLine: PlayedCard[];
  players: Player[];
}

interface RejectionEntry {
  wrong: PlayedCard;
  parent: PlayedCard;
  parentIndex: number;
  turn: number;
  suddenDeath: 'prophet' | 'god' | null;
}

function buildEntries(
  mainLine: PlayedCard[],
): RejectionEntry[] {
  return getPlayedCardPositions(mainLine)
    .filter((position) => position.branchIndex !== undefined)
    .map((position) => ({
      wrong: position.card,
      parent: mainLine[position.mainLineIndex],
      parentIndex: position.mainLineIndex,
      turn: position.turn,
      suddenDeath: position.card.suddenDeath ?? null,
    }));
}

export function RejectionsModal({
  open,
  onClose,
  mainLine,
  players,
}: RejectionsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const entries = open ? buildEntries(mainLine) : [];

  const nameFor = (id: string): string => {
    if (id === 'god') return 'God';
    return players.find((p) => p.id === id)?.name ?? id;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(900px, 100%)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <GlassPanel
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                maxHeight: '85vh',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '2px solid var(--glass-border)',
                  paddingBottom: '0.75rem',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.6rem',
                    color: 'var(--suit-red)',
                    margin: 0,
                    fontFamily: 'Press Start 2P, cursive',
                    letterSpacing: '0.05em',
                    textShadow: '0 0 8px rgba(220, 20, 60, 0.4)',
                  }}
                >
                  REJECTED CARDS
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span
                    style={{
                      color: 'var(--text-dim)',
                      fontSize: '1.0rem',
                      fontFamily: 'Press Start 2P, cursive',
                    }}
                  >
                    {entries.length} total
                  </span>
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      color: 'var(--text-light)',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '1.0rem',
                      fontFamily: 'Press Start 2P, cursive',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {entries.length === 0 ? (
                <div
                  style={{
                    padding: '3rem',
                    textAlign: 'center',
                    color: 'var(--text-dim)',
                    fontSize: '1.1rem',
                    fontFamily: 'Press Start 2P, cursive',
                  }}
                >
                  No cards have been rejected yet.
                </div>
              ) : (
                <div
                  style={{
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    paddingRight: '0.5rem',
                  }}
                  className="mainline-scroll"
                >
                  {entries.map((entry, idx) => (
                    <RejectionRow
                      key={`${entry.wrong.id}-${idx}`}
                      entry={entry}
                      playerName={nameFor(entry.wrong.playedBy)}
                      predictorName={
                        entry.wrong.prophetPrediction
                          ? nameFor(entry.wrong.prophetPrediction.predictedBy)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </GlassPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RejectionRow({
  entry,
  playerName,
  predictorName,
}: {
  entry: RejectionEntry;
  playerName: string;
  predictorName?: string;
}) {
  const { wrong, parent, turn, suddenDeath } = entry;
  const prediction = wrong.prophetPrediction;
  const predictionWasRight = prediction?.prediction === false; // prophet called this wrong; it was wrong → correct call

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.85rem 1rem',
        background: 'rgba(220, 20, 60, 0.08)',
        border: '1px solid rgba(220, 20, 60, 0.35)',
        borderRadius: '10px',
      }}
    >
      <div
        style={{
          minWidth: '70px',
          fontSize: '1.0rem',
          color: 'var(--text-dim)',
          fontFamily: 'Press Start 2P, cursive',
        }}
      >
        #{turn}
      </div>

      {/* Cards: parent → wrong */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          transform: 'scale(0.7)',
          transformOrigin: 'left center',
          width: 'calc(var(--card-width) * 2 + 60px)',
          flexShrink: 0,
        }}
      >
        <div style={{ position: 'relative' }}>
          <Card
            suit={getSuitSymbol(parent.suit)}
            rank={parent.rank}
            disabled
          />
          <div
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.0rem',
              fontWeight: 'bold',
            }}
          >
            ✓
          </div>
        </div>
        <div
          style={{
            color: 'var(--text-dim)',
            fontSize: '1.6rem',
            fontFamily: 'Press Start 2P, cursive',
          }}
        >
          →
        </div>
        <div
          style={{
            position: 'relative',
            filter: 'drop-shadow(0 0 8px rgba(220, 20, 60, 0.45))',
          }}
        >
          <Card
            suit={getSuitSymbol(wrong.suit)}
            rank={wrong.rank}
            disabled
          />
          <div
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              padding: '2px 6px',
              borderRadius: '6px',
              background: 'var(--suit-red)',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              fontFamily: 'Press Start 2P, cursive',
            }}
          >
            ✕
          </div>
        </div>
      </div>

      {/* Context column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: '0.95rem',
            color: 'var(--text-light)',
            fontFamily: 'Press Start 2P, cursive',
            lineHeight: 1.4,
          }}
        >
          <span style={{ color: 'var(--text-dim)' }}>Played by</span>{' '}
          <span style={{ color: 'var(--accent-gold)' }}>{playerName}</span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          {suddenDeath && (
            <span
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontFamily: 'Press Start 2P, cursive',
                background:
                  suddenDeath === 'prophet'
                    ? 'rgba(0, 0, 0, 0.7)'
                    : 'rgba(255, 255, 255, 0.2)',
                color:
                  suddenDeath === 'prophet'
                    ? 'var(--accent-gold)'
                    : '#fff',
                border:
                  suddenDeath === 'prophet'
                    ? '1px solid var(--accent-gold)'
                    : '1px solid rgba(255, 255, 255, 0.4)',
              }}
              title={
                suddenDeath === 'prophet'
                  ? 'Played during Prophet sudden death (30+ cards after Prophet declared)'
                  : 'Played during sudden death (40+ cards played, no Prophet)'
              }
            >
              ☠ {suddenDeath === 'prophet' ? 'PROPHET SUDDEN DEATH' : 'GOD SUDDEN DEATH'}
            </span>
          )}
          {prediction && predictorName && (
            <span
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontFamily: 'Press Start 2P, cursive',
                background: predictionWasRight
                  ? 'rgba(255, 215, 0, 0.25)'
                  : 'rgba(220, 20, 60, 0.25)',
                color: predictionWasRight
                  ? 'var(--accent-gold)'
                  : 'var(--suit-red)',
                border: `1px solid ${
                  predictionWasRight ? 'var(--accent-gold)' : 'var(--suit-red)'
                }`,
              }}
              title={
                predictionWasRight
                  ? `${predictorName} (Prophet) correctly called this WRONG`
                  : `${predictorName} (Prophet) called this RIGHT — incorrect`
              }
            >
              👑 {predictorName}: {prediction.prediction ? 'RIGHT' : 'WRONG'}{' '}
              {predictionWasRight ? '✓' : '✕'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
