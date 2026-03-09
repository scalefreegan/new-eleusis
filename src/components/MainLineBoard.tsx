/**
 * MainLineBoard component - displays the played cards
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Card } from './Card';
import { GlassPanel } from './GlassPanel';
import type { PlayedCard } from '../engine';
import { getSuitSymbol } from '../utils/cardUtils';

interface MainLineBoardProps {
  mainLine: PlayedCard[];
  prophetMarkerIndex?: number;
}

export function MainLineBoard({ mainLine, prophetMarkerIndex }: MainLineBoardProps) {
  // Helper to count all cards played (including branches) up to a certain index
  const countCardsUpToIndex = (index: number): number => {
    let count = 0;
    for (let i = 0; i <= index; i++) {
      count++; // Main card
      if (mainLine[i].branches) {
        count += mainLine[i].branches!.length; // Branch cards
      }
    }
    return count;
  };

  // Helper to determine if we should show a white marker (every 10 total cards)
  const shouldShowWhiteMarker = (index: number): boolean => {
    const cardsUpToHere = countCardsUpToIndex(index);
    const cardsUpToPrev = index > 0 ? countCardsUpToIndex(index - 1) : 0;
    // Check if we crossed a 10-card boundary
    return Math.floor(cardsUpToHere / 10) > Math.floor(cardsUpToPrev / 10);
  };

  // Helper to determine if we should show a black marker (every 10 cards after prophet)
  const shouldShowBlackMarker = (index: number): boolean => {
    if (prophetMarkerIndex === undefined || index <= prophetMarkerIndex) {
      return false;
    }
    // Count cards after prophet marker
    const cardsAfterProphet = countCardsUpToIndex(index) - countCardsUpToIndex(prophetMarkerIndex);
    const cardsAfterProphetPrev = index > prophetMarkerIndex + 1 ?
      countCardsUpToIndex(index - 1) - countCardsUpToIndex(prophetMarkerIndex) : 0;
    return Math.floor(cardsAfterProphet / 10) > Math.floor(cardsAfterProphetPrev / 10);
  };
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
            fontSize: '2.0rem',
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
                  fontSize: '1.6rem',
                  padding: '0.25rem 0.5rem',
                  fontFamily: 'Press Start 2P, cursive',
                }}
              >
                −
              </button>
              <span
                style={{
                  fontSize: '1.6rem',
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
                  fontSize: '1.6rem',
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
                fontSize: '1.0rem',
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
                fontSize: '1.6rem',
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
            fontSize: '1.3rem',
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
              const showProphetMarker = prophetMarkerIndex !== undefined && index === prophetMarkerIndex;
              const showWhite = shouldShowWhiteMarker(index);
              const showBlack = shouldShowBlackMarker(index);

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
                        fontSize: '1.5rem',
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
                        fontSize: '1.6rem',
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
                            fontSize: '1.0rem',
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

              {/* Prophet marker (gold) */}
              {showProphetMarker && (
                <div
                  style={{
                    width: '4px',
                    height: '160px',
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
                      fontSize: '1.6rem',
                      color: 'var(--bg-deep)',
                      whiteSpace: 'nowrap',
                      fontWeight: 'bold',
                    }}
                  >
                    PROPHET
                  </div>
                </div>
              )}

              {/* White marker (every 10 total cards) */}
              {showWhite && !showProphetMarker && (
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                    position: 'relative',
                    flexShrink: 0,
                    alignSelf: 'center',
                  }}
                  title={`${countCardsUpToIndex(index)} cards played`}
                />
              )}

              {/* Black marker (every 10 cards after prophet) */}
              {showBlack && (
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'black',
                    border: '2px solid var(--accent-gold)',
                    boxShadow: '0 0 10px rgba(255, 215, 0, 0.6)',
                    position: 'relative',
                    flexShrink: 0,
                    alignSelf: 'center',
                  }}
                  title={`${countCardsUpToIndex(index) - countCardsUpToIndex(prophetMarkerIndex!)} cards after Prophet`}
                />
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
            fontSize: '1.0rem',
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
