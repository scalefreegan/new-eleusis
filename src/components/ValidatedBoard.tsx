/**
 * ValidatedBoard — shows the sequence of cards the dealer accepted.
 *
 * Compact mode (default): the row fills up with as many cards as physically fit
 * across its width; only once it overflows does it collapse, hiding the oldest
 * cards behind a "+N earlier" chip while fading the trailing (older) visible
 * cards and highlighting the latest. Expanded mode: full horizontal scroll strip
 * with zoom / pan / recenter controls. Rejected cards are not rendered here —
 * they live in the RubbishBin / RejectionsModal.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Card } from './Card';
import { GlassPanel } from './GlassPanel';
import type { PlayedCard } from '../engine';
import { getSuitSymbol } from '../utils/cardUtils';

interface ValidatedBoardProps {
  mainLine: PlayedCard[];
  prophetMarkerIndex?: number;
}

// Layout constants for the compact-row fit calculation.
const CARD_GAP = 16; // 1rem flex gap between cards
const CHIP_RESERVE = 170; // px held back for the "+N earlier" chip on overflow
const DEFAULT_CARD_WIDTH = 80; // fallback if the CSS var can't be read

export function ValidatedBoard({ mainLine, prophetMarkerIndex }: ValidatedBoardProps) {
  const [expanded, setExpanded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [zoom, setZoom] = useState(1.0);

  // Measured geometry of the compact row, used to decide how many cards fit.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ width: 0, cardWidth: DEFAULT_CARD_WIDTH });

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => {
      const cardWidth =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--card-width'),
        ) || DEFAULT_CARD_WIDTH;
      setMetrics({ width: el.clientWidth, cardWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = mainLine.length;

  // How many cards to show in compact mode: pack the row until it overflows,
  // then hold back CHIP_RESERVE for the "+N earlier" chip.
  const compactVisibleCount = (() => {
    if (metrics.width === 0) return Math.min(total, 4); // pre-measure fallback
    const per = metrics.cardWidth + CARD_GAP;
    const fitAll = Math.floor((metrics.width + CARD_GAP) / per);
    if (total <= fitAll) return total; // everything fits — let the row fill up
    const fitWithChip = Math.floor((metrics.width - CHIP_RESERVE + CARD_GAP) / per);
    return Math.max(1, Math.min(total, fitWithChip));
  })();

  const visibleStart = expanded ? 0 : Math.max(0, total - compactVisibleCount);
  const visibleCards = mainLine.slice(visibleStart);
  const earlierCount = expanded ? 0 : visibleStart;

  // Total cards (mainLine + branches) up to and including a given mainLine index.
  // Used for milestone dots.
  const countCardsUpToIndex = (index: number): number => {
    let count = 0;
    for (let i = 0; i <= index; i++) {
      count++;
      if (mainLine[i]?.branches) {
        count += mainLine[i].branches!.length;
      }
    }
    return count;
  };

  const shouldShowWhiteMarker = (index: number): boolean => {
    const here = countCardsUpToIndex(index);
    const prev = index > 0 ? countCardsUpToIndex(index - 1) : 0;
    return Math.floor(here / 10) > Math.floor(prev / 10);
  };

  const shouldShowBlackMarker = (index: number): boolean => {
    if (prophetMarkerIndex === undefined || index <= prophetMarkerIndex) return false;
    const afterProphet = countCardsUpToIndex(index) - countCardsUpToIndex(prophetMarkerIndex);
    const afterProphetPrev = index > prophetMarkerIndex + 1
      ? countCardsUpToIndex(index - 1) - countCardsUpToIndex(prophetMarkerIndex)
      : 0;
    return Math.floor(afterProphet / 10) > Math.floor(afterProphetPrev / 10);
  };

  // Auto-scroll to latest card in expanded mode whenever the line grows.
  useEffect(() => {
    if (expanded && scrollContainerRef.current && total > 0) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, [total, expanded]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsDragging(false);

  const zoomIn = () => setZoom((z) => Math.min(z + 0.2, 2.0));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));
  const resetZoom = () => setZoom(1.0);
  const recenter = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth,
        behavior: 'smooth',
      });
    }
  };
  const resetView = () => {
    resetZoom();
    setTimeout(recenter, 100);
  };

  const renderCard = (
    playedCard: PlayedCard,
    index: number,
    opts: { newest?: boolean; opacity?: number } = {},
  ) => {
    const showProphetMarker = prophetMarkerIndex !== undefined && index === prophetMarkerIndex;
    const showWhite = shouldShowWhiteMarker(index);
    const showBlack = shouldShowBlackMarker(index);
    const { newest = false, opacity = 1 } = opts;

    return (
      <React.Fragment key={playedCard.id}>
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -10 }}
          animate={{ opacity, scale: 1, y: 0 }}
          transition={{ duration: 0.25, type: 'spring', stiffness: 220 }}
          style={{
            position: 'relative',
            flexShrink: 0,
            borderRadius: newest ? '14px' : undefined,
            // Highlight the latest accepted card so the eye lands on it.
            boxShadow: newest
              ? '0 0 0 3px var(--accent-gold), 0 0 22px rgba(255, 215, 0, 0.55)'
              : undefined,
          }}
        >
          <Card
            suit={getSuitSymbol(playedCard.suit)}
            rank={playedCard.rank}
            disabled
          />

          {/* Correct ✓ — only for non-starter cards */}
          {playedCard.correct && index > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                boxShadow: '0 0 10px rgba(0, 200, 255, 0.6)',
              }}
            >
              ✓
            </div>
          )}

          {/* Prophet prediction badge */}
          {playedCard.prophetPrediction && (
            <div
              style={{
                position: 'absolute',
                bottom: '-8px',
                left: '-8px',
                padding: '4px 8px',
                background: 'var(--accent-gold)',
                borderRadius: '4px',
                fontSize: '1.0rem',
                color: 'var(--bg-deep)',
                fontWeight: 'bold',
                fontFamily: 'Press Start 2P, cursive',
              }}
            >
              PROPHET
            </div>
          )}

          {/* Per-card milestone dots (overlay corner) */}
          {(showWhite || showBlack) && (
            <div
              style={{
                position: 'absolute',
                top: '-10px',
                left: '-10px',
                display: 'flex',
                gap: '4px',
              }}
            >
              {showWhite && (
                <div
                  title={`${countCardsUpToIndex(index)} cards played`}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.6)',
                    boxShadow: '0 0 6px rgba(255, 255, 255, 0.5)',
                  }}
                />
              )}
              {showBlack && (
                <div
                  title={`${countCardsUpToIndex(index) - countCardsUpToIndex(prophetMarkerIndex!)} cards after Prophet`}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'black',
                    border: '2px solid var(--accent-gold)',
                    boxShadow: '0 0 8px rgba(255, 215, 0, 0.7)',
                  }}
                />
              )}
            </div>
          )}
        </motion.div>

        {/* Prophet declaration marker (vertical bar) */}
        {showProphetMarker && (
          <div
            style={{
              width: '4px',
              height: 'var(--card-height)',
              background: 'var(--accent-gold)',
              border: '2px solid var(--accent-gold)',
              borderRadius: '2px',
              boxShadow: '0 0 10px rgba(255, 215, 0, 0.6)',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-90deg)',
                fontSize: '1.0rem',
                color: 'var(--bg-deep)',
                whiteSpace: 'nowrap',
                fontWeight: 'bold',
                fontFamily: 'Press Start 2P, cursive',
              }}
            >
              PROPHET
            </div>
          </div>
        )}
      </React.Fragment>
    );
  };

  const showExpandToggle = expanded || earlierCount > 0;

  return (
    <GlassPanel
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        position: 'relative',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2
            style={{
              fontSize: '1.8rem',
              color: 'var(--accent-purple)',
              margin: 0,
              fontFamily: 'Press Start 2P, cursive',
              letterSpacing: '0.05em',
            }}
          >
            VALIDATED
          </h2>
          <span
            style={{
              padding: '0.35rem 0.6rem',
              background: 'rgba(138, 43, 226, 0.25)',
              border: '1px solid var(--accent-purple)',
              borderRadius: '6px',
              color: 'var(--text-light)',
              fontSize: '1.0rem',
              fontFamily: 'Press Start 2P, cursive',
            }}
          >
            {total}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Zoom / pan / recenter — only in expanded mode */}
          {expanded && total > 0 && (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: '0.25rem',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <button
                  onClick={zoomOut}
                  title="Zoom Out"
                  style={zoomBtn}
                >
                  −
                </button>
                <span
                  style={{
                    fontSize: '1.0rem',
                    color: 'var(--text-dim)',
                    minWidth: '40px',
                    textAlign: 'center',
                    fontFamily: 'Press Start 2P, cursive',
                  }}
                >
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  title="Zoom In"
                  style={zoomBtn}
                >
                  +
                </button>
              </div>

              <button
                onClick={recenter}
                title="Recenter to Latest Card"
                style={accentBtn}
              >
                ⟲
              </button>

              <button
                onClick={resetView}
                title="Reset View"
                style={mutedBtn}
              >
                Reset
              </button>
            </>
          )}

          {showExpandToggle && (
            <button
              onClick={() => setExpanded((e) => !e)}
              title={expanded ? 'Collapse' : 'Show full history'}
              style={{
                background: 'rgba(138, 43, 226, 0.25)',
                border: '2px solid var(--accent-purple)',
                color: 'var(--text-light)',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1.0rem',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              className="btn-hover-toggle-expand"
            >
              {expanded ? '▲ Collapse' : `▼ Show all ${total}`}
            </button>
          )}
        </div>
      </div>

      {/* Body — empty / compact / expanded */}
      <div ref={bodyRef} style={{ width: '100%' }}>
      {total === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '180px',
            color: 'var(--text-dim)',
            fontSize: '1.2rem',
          }}
        >
          Waiting for game to start...
        </div>
      ) : (
        <AnimatePresence initial={false} mode="wait">
          {expanded ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <div
                ref={scrollContainerRef}
                className="mainline-scroll"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                  overflowX: 'auto',
                  overflowY: 'visible',
                  paddingBottom: '1rem',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--accent-purple) rgba(255,255,255,0.1)',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  userSelect: 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '1rem',
                    minWidth: 'max-content',
                    position: 'relative',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'left center',
                    transition: isDragging ? 'none' : 'transform 0.2s',
                    paddingTop: '12px',
                  }}
                >
                  {visibleCards.map((card, i) =>
                    renderCard(card, visibleStart + i, {
                      newest: visibleStart + i === total - 1,
                    }),
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="compact"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '1rem',
                  alignItems: 'center',
                  paddingTop: '12px',
                  paddingBottom: '0.5rem',
                  flexWrap: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {earlierCount > 0 && (
                  <button
                    onClick={() => setExpanded(true)}
                    title="Show full history"
                    style={{
                      flexShrink: 0,
                      padding: '0.6rem 0.9rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '2px dashed rgba(255, 255, 255, 0.25)',
                      borderRadius: '8px',
                      color: 'var(--text-dim)',
                      fontSize: '1.0rem',
                      fontFamily: 'Press Start 2P, cursive',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                    }}
                    className="btn-hover-toggle-expand"
                  >
                    … +{earlierCount} earlier
                  </button>
                )}
                {visibleCards.map((card, i) => {
                  const absIndex = visibleStart + i;
                  // Fade the trailing (older) cards once the row has overflowed,
                  // so the receding history reads as "previous"; newest stays lit.
                  const distFromNewest = visibleCards.length - 1 - i;
                  const opacity =
                    earlierCount > 0 ? Math.max(0.5, 1 - distFromNewest * 0.12) : 1;
                  return renderCard(card, absIndex, {
                    newest: absIndex === total - 1,
                    opacity,
                  });
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
      </div>
    </GlassPanel>
  );
}

const zoomBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-light)',
  cursor: 'pointer',
  fontSize: '1.4rem',
  padding: '0.2rem 0.5rem',
  fontFamily: 'Press Start 2P, cursive',
};

const accentBtn: React.CSSProperties = {
  background: 'rgba(138, 43, 226, 0.3)',
  border: '2px solid var(--accent-purple)',
  color: 'var(--text-light)',
  padding: '0.4rem 0.75rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '1.0rem',
  fontFamily: 'Press Start 2P, cursive',
  transition: 'all 0.2s',
};

const mutedBtn: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.1)',
  border: '2px solid rgba(255, 255, 255, 0.2)',
  color: 'var(--text-light)',
  padding: '0.4rem 0.75rem',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '1.0rem',
  fontFamily: 'Press Start 2P, cursive',
  transition: 'all 0.2s',
};
