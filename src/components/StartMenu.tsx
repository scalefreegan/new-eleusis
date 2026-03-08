/**
 * StartMenu component for game setup with multiplayer support
 */

import { useState } from 'react';
import { GlassPanel } from './GlassPanel';
import { HelpOverlay } from './HelpOverlay';
import { SettingsPanel } from './SettingsPanel';
import { useGameStore } from '../store/gameStore';
import { useRuleCompilerAvailable } from '../hooks/useRuleCompilerAvailable';
import type { PlayerConfig } from '../engine/types';
import { motion, AnimatePresence } from 'framer-motion';

interface StartMenuProps {
  onStartGame: (configs: PlayerConfig[], ruleText?: string) => void;
  onContinueGame?: () => void;
}

export function StartMenu({ onStartGame, onContinueGame }: StartMenuProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { hasSavedGame, loadSavedGame, lastGodIndex, trueProphetIndex } = useGameStore();
  const { available: compilerAvailable, loading: compilerLoading } = useRuleCompilerAvailable();

  // Default: AI dealer, 1 human player, 2 AI players
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([
    { name: 'Dealer', type: 'ai', isGod: true },
    { name: 'You', type: 'human', isGod: false },
    { name: 'AI Player 1', type: 'ai', isGod: false },
    { name: 'AI Player 2', type: 'ai', isGod: false },
  ]);

  const [dealerRule, setDealerRule] = useState('');
  const [showRule, setShowRule] = useState(false);

  const dealerConfig = playerConfigs[0];
  const playerList = playerConfigs.slice(1);

  const updateDealer = (updates: Partial<PlayerConfig>) => {
    setPlayerConfigs([{ ...dealerConfig, ...updates }, ...playerList]);
  };

  const updatePlayer = (index: number, updates: Partial<PlayerConfig>) => {
    const newPlayers = [...playerList];
    newPlayers[index] = { ...newPlayers[index], ...updates };
    setPlayerConfigs([dealerConfig, ...newPlayers]);
  };

  const addPlayer = () => {
    if (playerList.length >= 7) return;
    const aiCount = playerList.filter(p => p.type === 'ai').length;
    setPlayerConfigs([
      ...playerConfigs,
      { name: `AI Player ${aiCount + 1}`, type: 'ai', isGod: false },
    ]);
  };

  const removePlayer = (index: number) => {
    if (playerList.length <= 2) return; // Minimum 2 players
    const newPlayers = playerList.filter((_, i) => i !== index);
    setPlayerConfigs([dealerConfig, ...newPlayers]);
  };

  const applyPreset = (preset: 'solo' | 'duo' | 'party') => {
    switch (preset) {
      case 'solo':
        // 1 human vs AI (current behavior)
        setPlayerConfigs([
          { name: 'Dealer', type: 'ai', isGod: true },
          { name: 'You', type: 'human', isGod: false },
          { name: 'AI Player 1', type: 'ai', isGod: false },
          { name: 'AI Player 2', type: 'ai', isGod: false },
        ]);
        break;
      case 'duo':
        // 2 humans
        setPlayerConfigs([
          { name: 'Dealer', type: 'ai', isGod: true },
          { name: 'Player 1', type: 'human', isGod: false },
          { name: 'Player 2', type: 'human', isGod: false },
        ]);
        break;
      case 'party':
        // 4 players
        setPlayerConfigs([
          { name: 'Dealer', type: 'ai', isGod: true },
          { name: 'Player 1', type: 'human', isGod: false },
          { name: 'Player 2', type: 'human', isGod: false },
          { name: 'Player 3', type: 'human', isGod: false },
          { name: 'Player 4', type: 'human', isGod: false },
        ]);
        break;
    }
  };

  const isHumanGod = dealerConfig.type === 'human';

  const handleStart = () => {
    onStartGame(playerConfigs, isHumanGod ? dealerRule : undefined);
  };

  // Calculate which player will be God next
  // True Prophet takes precedence over rotation
  const nextGodIndex = trueProphetIndex >= 0
    ? trueProphetIndex
    : (lastGodIndex + 1) % playerConfigs.length;

  const isTrueProphetGod = trueProphetIndex >= 0;

  const handleContinue = () => {
    loadSavedGame();
    onContinueGame?.();
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        overflow: 'auto',
        padding: '2rem',
      }}
    >
      <GlassPanel
        style={{
          maxWidth: '600px',
          padding: '3rem',
          margin: 'auto',
        }}
      >
        <h1
          style={{
            fontSize: '3.0rem',
            color: 'var(--accent-gold)',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
            marginBottom: '1rem',
            textAlign: 'center',
          }}
        >
          NEW ELEUSIS
        </h1>

        <p
          style={{
            fontSize: '1.3rem',
            color: 'var(--text-dim)',
            marginBottom: '2rem',
            textAlign: 'center',
            lineHeight: '1.5',
          }}
        >
          Deduce the secret rule by playing cards. Can you discover the pattern?
        </p>

        {/* Quick Presets */}
        <div style={{ marginBottom: '2rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '1.3rem',
              color: 'var(--text-dim)',
              marginBottom: '0.75rem',
            }}
          >
            QUICK SETUP
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => applyPreset('solo')}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'var(--text-light)',
                fontSize: '1.0rem',
                cursor: 'pointer',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
              }}
            >
              Solo vs AI
            </button>
            <button
              onClick={() => applyPreset('duo')}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'var(--text-light)',
                fontSize: '1.0rem',
                cursor: 'pointer',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
              }}
            >
              2 Players
            </button>
            <button
              onClick={() => applyPreset('party')}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'var(--text-light)',
                fontSize: '1.0rem',
                cursor: 'pointer',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
              }}
            >
              Party Mode
            </button>
          </div>
        </div>

        {/* God Setup */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '1.3rem',
              color: 'var(--accent-gold)',
              marginBottom: '0.75rem',
            }}
          >
            GOD {isTrueProphetGod
              ? <span style={{ fontSize: '1rem', color: 'var(--accent-gold)' }}>(True Prophet!)</span>
              : lastGodIndex >= 0 && <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>(rotates each game)</span>
            }
          </label>
          <div
            style={{
              padding: '1rem',
              background: nextGodIndex === 0 ? 'rgba(255, 215, 0, 0.1)' : 'rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              border: nextGodIndex === 0 ? '2px solid var(--accent-gold)' : '1px solid var(--accent-gold)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="text"
                value={dealerConfig.name}
                onChange={(e) => updateDealer({ name: e.target.value })}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'var(--text-light)',
                  fontSize: '1.3rem',
                  fontFamily: 'Press Start 2P, cursive',
                }}
                placeholder="God Name"
              />
              {nextGodIndex === 0 && (
                <div
                  style={{
                    fontSize: '1.0rem',
                    color: 'var(--accent-gold)',
                    whiteSpace: 'nowrap',
                    fontWeight: 'bold',
                  }}
                >
                  👑 {isTrueProphetGod ? 'True Prophet!' : 'Next God'}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => updateDealer({ type: 'human' })}
                  style={{
                    padding: '0.75rem 1rem',
                    background:
                      dealerConfig.type === 'human' ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.1)',
                    border:
                      dealerConfig.type === 'human'
                        ? '2px solid var(--accent-gold)'
                        : '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'var(--text-light)',
                    fontSize: '1.0rem',
                    cursor: 'pointer',
                    fontFamily: 'Press Start 2P, cursive',
                    transition: 'all 0.2s',
                  }}
                >
                  Human
                </button>
                <button
                  onClick={() => updateDealer({ type: 'ai' })}
                  style={{
                    padding: '0.75rem 1rem',
                    background:
                      dealerConfig.type === 'ai' ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.1)',
                    border:
                      dealerConfig.type === 'ai'
                        ? '2px solid var(--accent-gold)'
                        : '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'var(--text-light)',
                    fontSize: '1.0rem',
                    cursor: 'pointer',
                    fontFamily: 'Press Start 2P, cursive',
                    transition: 'all 0.2s',
                  }}
                >
                  AI
                </button>
              </div>
            </div>

            {/* Custom Rule Input (if dealer is human) */}
            {dealerConfig.type === 'human' && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '1.0rem', color: 'var(--text-dim)' }}>
                    SECRET RULE (OPTIONAL)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {!compilerLoading && compilerAvailable && dealerRule.trim().length > 0 && (
                      <div style={{ fontSize: '1rem', color: '#00cc88' }}>
                        ⚡ Will compile on start
                      </div>
                    )}
                    {!compilerLoading && !compilerAvailable && (
                      <div style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>
                        Manual judgment only
                      </div>
                    )}
                    <button
                      onClick={() => setShowRule(!showRule)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-blue)',
                        fontSize: '1.0rem',
                        cursor: 'pointer',
                        fontFamily: 'Press Start 2P, cursive',
                      }}
                    >
                      {showRule ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>
                </div>
                <textarea
                  value={dealerRule}
                  onChange={(e) => setDealerRule(e.target.value)}
                  placeholder={compilerAvailable
                    ? 'e.g. "alternate red and black" or "rank must increase by 1"'
                    : 'Describe your secret rule (for reference only — judge manually)'}
                  style={{
                    width: '100%',
                    height: '80px',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: `2px solid ${compilerAvailable && dealerRule.trim().length > 0 ? 'rgba(0, 200, 136, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
                    borderRadius: '8px',
                    color: showRule ? 'var(--text-light)' : 'transparent',
                    textShadow: showRule ? 'none' : '0 0 8px var(--text-light)',
                    fontSize: '1.0rem',
                    fontFamily: 'Press Start 2P, cursive',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
                {compilerAvailable && dealerRule.trim().length > 0 && (
                  <div style={{ fontSize: '1rem', color: 'var(--text-dim)', marginTop: '0.3rem', lineHeight: 1.5 }}>
                    Claude will compile this into a deterministic function when you start.
                    You'll review examples before the game begins.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Players List */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '1.3rem',
              color: 'var(--text-dim)',
              marginBottom: '0.75rem',
            }}
          >
            PLAYERS ({playerList.length})
          </label>
          <AnimatePresence>
            {playerList.map((player, index) => {
              const playerConfigIndex = index + 1; // +1 because playerList doesn't include dealer
              const isNextGod = playerConfigIndex === nextGodIndex;

              return (
              <motion.div
                key={index}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  marginBottom: '0.75rem',
                  padding: '1rem',
                  background: isNextGod ? 'rgba(255, 215, 0, 0.1)' : 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  border: isNextGod ? '2px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayer(index, { name: e.target.value })}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'var(--text-light)',
                      fontSize: '1.3rem',
                      fontFamily: 'Press Start 2P, cursive',
                    }}
                    placeholder="Player Name"
                  />
                  {isNextGod && (
                    <div
                      style={{
                        fontSize: '1.0rem',
                        color: 'var(--accent-gold)',
                        whiteSpace: 'nowrap',
                        fontWeight: 'bold',
                      }}
                    >
                      👑 {isTrueProphetGod ? 'True Prophet!' : 'Next God'}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => updatePlayer(index, { type: 'human' })}
                      style={{
                        padding: '0.75rem 1rem',
                        background:
                          player.type === 'human' ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.1)',
                        border:
                          player.type === 'human'
                            ? '2px solid var(--accent-gold)'
                            : '2px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'var(--text-light)',
                        fontSize: '1.0rem',
                        cursor: 'pointer',
                        fontFamily: 'Press Start 2P, cursive',
                        transition: 'all 0.2s',
                      }}
                    >
                      Human
                    </button>
                    <button
                      onClick={() => updatePlayer(index, { type: 'ai' })}
                      style={{
                        padding: '0.75rem 1rem',
                        background:
                          player.type === 'ai' ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.1)',
                        border:
                          player.type === 'ai'
                            ? '2px solid var(--accent-gold)'
                            : '2px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'var(--text-light)',
                        fontSize: '1.0rem',
                        cursor: 'pointer',
                        fontFamily: 'Press Start 2P, cursive',
                        transition: 'all 0.2s',
                      }}
                    >
                      AI
                    </button>
                    <button
                      onClick={() => removePlayer(index)}
                      disabled={playerList.length <= 2}
                      style={{
                        padding: '0.75rem',
                        background: 'rgba(220, 20, 60, 0.2)',
                        border: '2px solid rgba(220, 20, 60, 0.5)',
                        borderRadius: '8px',
                        color: playerList.length <= 2 ? 'var(--text-dim)' : '#dc143c',
                        fontSize: '1.3rem',
                        cursor: playerList.length <= 2 ? 'not-allowed' : 'pointer',
                        fontFamily: 'Press Start 2P, cursive',
                        opacity: playerList.length <= 2 ? 0.5 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Add Player Button */}
          <button
            onClick={addPlayer}
            disabled={playerList.length >= 7}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px dashed rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              color: playerList.length >= 7 ? 'var(--text-dim)' : 'var(--text-light)',
              fontSize: '1.2rem',
              cursor: playerList.length >= 7 ? 'not-allowed' : 'pointer',
              fontFamily: 'Press Start 2P, cursive',
              opacity: playerList.length >= 7 ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            + ADD PLAYER
          </button>
        </div>

        {/* Continue Game Button (if saved game exists) */}
        {hasSavedGame && (
          <button
            onClick={handleContinue}
            style={{
              width: '100%',
              padding: '1.25rem',
              marginBottom: '1rem',
              background: 'var(--accent-gold)',
              border: '2px solid var(--accent-purple)',
              borderRadius: '8px',
              color: 'var(--bg-deep)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              fontFamily: 'Press Start 2P, cursive',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-purple)';
              e.currentTarget.style.color = 'var(--text-light)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent-gold)';
              e.currentTarget.style.color = 'var(--bg-deep)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ▶ CONTINUE GAME
          </button>
        )}

        {/* Start Game Button */}
        <button
          onClick={handleStart}
          style={{
            width: '100%',
            padding: '1.25rem',
            background: 'var(--accent-purple)',
            border: '2px solid var(--accent-gold)',
            borderRadius: '8px',
            color: 'var(--text-light)',
            fontSize: '1.5rem',
            cursor: 'pointer',
            fontFamily: 'Press Start 2P, cursive',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-gold)';
            e.currentTarget.style.color = 'var(--bg-deep)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent-purple)';
            e.currentTarget.style.color = 'var(--text-light)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {hasSavedGame ? 'NEW GAME' : 'START GAME'}
        </button>

        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            fontSize: '1.0rem',
            color: 'var(--text-dim)',
            lineHeight: '1.6',
          }}
        >
          <strong style={{ color: 'var(--accent-blue)' }}>HOW TO PLAY:</strong>
          <br />
          • Select cards from your hand and click PLAY
          <br />
          • The Dealer judges each card Right or Wrong
          <br />
          • Right cards continue the MainLine
          <br />
          • Wrong cards branch off
          <br />• Try to deduce the secret pattern!
        </div>

        {/* Help and Settings buttons */}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setShowHelp(true)}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'var(--text-light)',
              fontSize: '1.2rem',
              cursor: 'pointer',
              fontFamily: 'Press Start 2P, cursive',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-blue)';
              e.currentTarget.style.background = 'rgba(100, 149, 237, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            ? HELP
          </button>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'var(--text-light)',
              fontSize: '1.2rem',
              cursor: 'pointer',
              fontFamily: 'Press Start 2P, cursive',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-purple)';
              e.currentTarget.style.background = 'rgba(138, 43, 226, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            ⚙ SETTINGS
          </button>
        </div>
      </GlassPanel>

      {/* Overlays */}
      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
