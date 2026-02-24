/**
 * MainLineBoard component - displays the played cards
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Card } from './Card';
import { GlassPanel } from './GlassPanel';
import type { PlayedCard } from '../engine';

interface MainLineBoardProps {
  mainLine: PlayedCard[];
  prophetMarkerIndex?: number;
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

export function MainLineBoard({ mainLine, prophetMarkerIndex }: MainLineBoardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [zoom, setZoom] = useState(1.0);

  // Auto-scroll to latest card when mainLine changes
  useEffect(() => {
    if (scrollContainerRef.current && mainLine.length > 0) {
      const scrollContainer = scrollContainerRef.current;
      // Smooth scroll to the right edge
      scrollContainer.scrollTo({
        left: scrollContainer.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, [mainLine.length]);

  // Grab & Pan handlers
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
    const walk = (x - startX) * 2; // Scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 2.0));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5));
  const resetZoom = () => setZoom(1.0);

  // Recenter to latest card
  const recenter = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth,
        behavior: 'smooth',
      });
    }
  };

  // Reset view (zoom + recenter)
  const resetView = () => {
    resetZoom();
    setTimeout(() => recenter(), 100);
  };

  return (
    <GlassPanel style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      position: 'relative',
      minHeight: 0,
      overflow: 'hidden',
    }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h2
          style={{
            fontSize: '1rem',
            color: 'var(--accent-purple)',
            margin: 0,
          }}
        >
          MainLine ({mainLine.length} cards)
        </h2>

        {/* Pan & Zoom Controls */}
        {mainLine.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            {/* Zoom controls */}
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
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  padding: '0.25rem 0.5rem',
                  fontFamily: 'Press Start 2P, cursive',
                }}
              >
                −
              </button>
              <span
                style={{
                  fontSize: '0.4rem',
                  color: 'var(--text-dim)',
                  minWidth: '40px',
                  textAlign: 'center',
                }}
              >
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={zoomIn}
                title="Zoom In"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-light)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  padding: '0.25rem 0.5rem',
                  fontFamily: 'Press Start 2P, cursive',
                }}
              >
                +
              </button>
            </div>

            {/* Recenter button */}
            <button
              onClick={recenter}
              title="Recenter to Latest Card"
              style={{
                background: 'rgba(138, 43, 226, 0.3)',
                border: '2px solid var(--accent-purple)',
                color: 'var(--text-light)',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.5rem',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-purple)';
                e.currentTarget.style.borderColor = 'var(--accent-gold)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(138, 43, 226, 0.3)';
                e.currentTarget.style.borderColor = 'var(--accent-purple)';
              }}
            >
              ⟲
            </button>

            {/* Reset view button */}
            <button
              onClick={resetView}
              title="Reset View"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                color: 'var(--text-light)',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.4rem',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-blue)';
                e.currentTarget.style.borderColor = 'var(--accent-gold)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {mainLine.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: 'var(--text-dim)',
            fontSize: '0.65rem',
          }}
        >
          Waiting for game to start...
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="mainline-scroll"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'visible',
            paddingBottom: '200px',
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
            }}
          >
            {mainLine.map((playedCard, index) => {
              // Check if we should render a black marker after this card
              const shouldShowMarker = prophetMarkerIndex !== undefined &&
                (index === prophetMarkerIndex ||
                 (index > prophetMarkerIndex && (index - prophetMarkerIndex) % 10 === 0));

              return (
                <React.Fragment key={playedCard.id}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: index * 0.1,
                      type: 'spring',
                      stiffness: 200,
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                {/* Main card */}
                <div style={{ position: 'relative' }}>
                  <Card
                    suit={getSuitSymbol(playedCard.suit)}
                    rank={playedCard.rank}
                    disabled
                  />

                  {/* Correct indicator */}
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
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        boxShadow: '0 0 10px rgba(0, 200, 255, 0.6)',
                      }}
                    >
                      ✓
                    </div>
                  )}

                  {/* Prophet prediction indicator */}
                  {playedCard.prophetPrediction && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-8px',
                        left: '-8px',
                        padding: '4px 8px',
                        background: 'var(--accent-gold)',
                        borderRadius: '4px',
                        fontSize: '0.4rem',
                        color: 'var(--bg-deep)',
                        fontWeight: 'bold',
                      }}
                    >
                      PROPHET
                    </div>
                  )}
                </div>

                {/* Branches (wrong cards) - positioned below */}
                {playedCard.branches && playedCard.branches.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '180px',
                      left: '0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    {playedCard.branches.map((branch) => (
                      <motion.div
                        key={branch.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ transform: 'scale(0.8)' }}>
                          <Card
                            suit={getSuitSymbol(branch.suit)}
                            rank={branch.rank}
                            disabled
                          />
                        </div>
                        <div
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'rgba(220, 20, 60, 0.2)',
                            border: '1px solid rgba(220, 20, 60, 0.5)',
                            borderRadius: '8px',
                            fontSize: '0.5rem',
                            color: 'rgba(220, 20, 60, 1)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          WRONG
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Black marker for Prophet */}
              {shouldShowMarker && (
                <div
                  style={{
                    width: '4px',
                    height: '160px',
                    background: 'black',
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
                      fontSize: '0.4rem',
                      color: 'var(--accent-gold)',
                      whiteSpace: 'nowrap',
                      fontWeight: 'bold',
                      textShadow: '0 0 5px rgba(0, 0, 0, 0.8)',
                    }}
                  >
                    {index === prophetMarkerIndex ? 'PROPHET' : '10'}
                  </div>
                </div>
              )}
            </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      {mainLine.length > 0 && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            gap: '2rem',
            fontSize: '0.5rem',
            color: 'var(--text-dim)',
          }}
        >
          <div>
            CARDS IN MAINLINE:{' '}
            <span style={{ color: 'var(--accent-blue)' }}>{mainLine.length}</span>
          </div>
          <div>
            WRONG PLAYS:{' '}
            <span style={{ color: 'rgba(220, 20, 60, 1)' }}>
              {mainLine.reduce((sum, card) => sum + (card.branches?.length || 0), 0)}
            </span>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
