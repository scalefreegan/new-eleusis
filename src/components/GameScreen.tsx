/**
 * GameScreen - main game interface (multiplayer-enabled)
 */

import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { MainLineBoard } from './MainLineBoard';
import { PlayerHand } from './PlayerHand';
import { GameOverScreen } from './GameOverScreen';
import { ProphetPredictionPanel } from './ProphetPredictionPanel';
import { TurnTransitionOverlay } from './TurnTransitionOverlay';
import { DealerControlPanel } from './DealerControlPanel';
import { NoPlayDisputePanel } from './NoPlayDisputePanel';
import { Scoreboard } from './Scoreboard';
import { HelpOverlay } from './HelpOverlay';
import { SettingsPanel } from './SettingsPanel';
import { sounds } from '../audio/sounds';
import { canDeclareProphet } from '../engine/validation';

interface GameScreenProps {
  onReturnToMenu?: () => void;
}

export function GameScreen({ onReturnToMenu }: GameScreenProps) {
  const {
    state,
    selectedCards,
    toggleCardSelection,
    clearSelection,
    dispatch,
    showTransitionOverlay,
    transitionTargetName,
    confirmTurnTransition,
    judgeCardAsHumanDealer,
    makeProphetPrediction,
    resolveNoPlayAsHumanGod,
    resetGame,
    getActiveLocalPlayer,
    getCurrentPlayer,
    aiGod,
    errorMessage,
  } = useGameStore();

  const [handCollapsed, setHandCollapsed] = useState(false);
  const [scoreboardCollapsed, setScoreboardCollapsed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCheat, setShowCheat] = useState(false);

  // Get the active local player (current player if human)
  const activePlayer = getActiveLocalPlayer();
  const currentPlayer = getCurrentPlayer();
  const isLocalPlayerTurn = !!activePlayer;

  // Find the local human Prophet player (may not be the current turn player)
  const prophetPlayer = state.players.find(p => p.isProphet && p.type === 'human' && !p.isGod);

  // Check if active player can declare prophet
  const canActivePlayerDeclareProphet = activePlayer ? canDeclareProphet(state, activePlayer.id) : false;

  const handleCardClick = (cardId: string) => {
    toggleCardSelection(cardId);
  };

  const handlePlayCards = () => {
    if (!activePlayer || selectedCards.size === 0 || !isLocalPlayerTurn) {
      return;
    }

    const cardIds = Array.from(selectedCards);

    // Dispatch PLAY_CARD through reducer
    dispatch({
      type: 'PLAY_CARD',
      playerId: activePlayer.id,
      cardIds,
    });

    clearSelection();
  };

  const handleNoPlay = () => {
    if (!isLocalPlayerTurn || !activePlayer) return;
    dispatch({ type: 'DECLARE_NO_PLAY', playerId: activePlayer.id });
  };

  const handleDeclareProphet = () => {
    if (!activePlayer) return;
    sounds.playProphetDeclare();
    dispatch({ type: 'DECLARE_PROPHET', playerId: activePlayer.id });
  };

  const handlePlayAgain = () => {
    resetGame();
  };

  const handleMainMenu = () => {
    if (onReturnToMenu) {
      onReturnToMenu();
    } else {
      resetGame();
    }
  };

  const handleProphetPredictRight = () => {
    makeProphetPrediction(true);
  };

  const handleProphetPredictWrong = () => {
    makeProphetPrediction(false);
  };

  const handleJudgeCard = (correct: boolean) => {
    if (!state.pendingPlay || state.pendingPlay.cards.length === 0) return;
    const cardId = state.pendingPlay.cards[0].id;
    judgeCardAsHumanDealer(cardId, correct);
  };

  const handleAcceptNoPlay = () => {
    resolveNoPlayAsHumanGod(true);
  };

  const handleRejectNoPlay = () => {
    resolveNoPlayAsHumanGod(false);
  };

  // Scores are now displayed in Scoreboard component

  // Show Prophet prediction panel if local human Prophet exists and another player's cards are pending
  const showProphetPanel = !!prophetPlayer && !!state.pendingPlay && state.pendingPlay.cards.length > 0 && state.pendingPlay.playerId !== prophetPlayer.id && state.phase !== 'game_over';

  // Show Dealer control panel if local player is dealer and a card is awaiting judgment
  const showDealerPanel = currentPlayer?.isGod && currentPlayer.type === 'human' && state.phase === 'awaiting_judgment' && state.pendingPlay && state.pendingPlay.cards.length > 0;

  // Show No-Play dispute panel when in no_play_dispute phase
  const showNoPlayPanel = state.phase === 'no_play_dispute' && state.noPlayDeclaration;
  const isAIGod = !!aiGod;

  // Extract IDs for use in JSX (avoids TypeScript narrowing issues)
  const prophetId = prophetPlayer?.id;

  // Pre-compute dealer panel props (avoids IIFE in JSX)
  const dealerPendingCard = showDealerPanel && state.pendingPlay ? state.pendingPlay.cards[0] : undefined;
  let dealerAutoVerdict: boolean | undefined;
  if (dealerPendingCard && state.godRuleFunction && state.mainLine.length > 0) {
    try {
      dealerAutoVerdict = state.godRuleFunction(state.mainLine[state.mainLine.length - 1], dealerPendingCard);
    } catch (err) {
      console.error('[GameScreen] godRuleFunction threw, falling back to manual judgment:', err);
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        height: '100vh',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '2rem',
          gap: '2rem',
          minWidth: 0,
        }}
      >
        {/* Title Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Left: Title */}
          <div>
            <h1
              style={{
                fontSize: '1.5rem',
                color: 'var(--accent-gold)',
                textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
                marginBottom: '0.25rem',
              }}
            >
              NEW ELEUSIS
            </h1>
            <p
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-dim)',
              }}
            >
              {state.phase === 'game_over'
                ? 'Game Over!'
                : isLocalPlayerTurn
                ? `Your Turn${activePlayer?.isProphet ? ' 👑' : ''}`
                : `${currentPlayer?.name}'s Turn${currentPlayer?.isProphet ? ' 👑' : ''}`}
            </p>
            {prophetPlayer && (
              <p
                style={{
                  fontSize: '0.5rem',
                  color: 'var(--accent-gold)',
                  marginTop: '0.25rem',
                }}
              >
                👑 Prophet: {state.prophetCorrectCalls} correct call{state.prophetCorrectCalls !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Right: Controls */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setShowCheat(!showCheat)}
              style={{
                padding: '0.5rem 1rem',
                background: showCheat ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                border: `2px solid ${showCheat ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.2)'}`,
                borderRadius: '8px',
                color: showCheat ? 'var(--accent-gold)' : 'var(--text-light)',
                fontSize: '0.6rem',
                cursor: 'pointer',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-gold)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = showCheat ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.2)';
              }}
              title="Toggle rule visibility (cheat mode)"
            >
              👁
            </button>
            <button
              onClick={() => setShowHelp(true)}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'var(--text-light)',
                fontSize: '0.6rem',
                cursor: 'pointer',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-blue)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              ?
            </button>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'var(--text-light)',
                fontSize: '0.6rem',
                cursor: 'pointer',
                fontFamily: 'Press Start 2P, cursive',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-purple)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              ⚙
            </button>
          </div>
        </div>

        {/* MainLine Board Area - Maximized */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <MainLineBoard mainLine={state.mainLine} prophetMarkerIndex={state.prophetMarkerIndex} totalCardsPlayed={state.totalCardsPlayed} />
        </div>

        {/* Cheat Mode - Show Rule */}
        {showCheat && state.godRule && (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(255, 215, 0, 0.2)',
              border: '2px solid var(--accent-gold)',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '0.6rem',
              color: 'var(--text-light)',
              marginBottom: '1rem',
            }}
          >
            <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>🔍 CHEAT MODE:</span>
            {' '}
            <span style={{ color: 'var(--text-light)' }}>{state.godRule}</span>
          </div>
        )}

        {/* Prophet Status Bar (when not predicting) */}
        {prophetPlayer && !showProphetPanel && state.phase !== 'game_over' && (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(138, 43, 226, 0.5)',
              border: '2px solid var(--accent-gold)',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '0.6rem',
              color: 'var(--text-light)',
              marginBottom: '1rem',
            }}
          >
            <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>👑 You are the Prophet.</span>
            {' '}Watch other players' plays and call them right or wrong.
            {' '}
            <span style={{ color: 'var(--text-dim)' }}>
              (Correct calls: {state.prophetCorrectCalls})
            </span>
          </div>
        )}

        {/* Error Message Banner */}
        {errorMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(220, 38, 38, 0.3)',
              border: '2px solid rgba(220, 38, 38, 0.6)',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '0.6rem',
              color: '#fca5a5',
              fontFamily: 'Press Start 2P, cursive',
            }}
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {/* Bottom Section - Player Hand (Full Width) */}
        {activePlayer && (
          <PlayerHand
            hand={activePlayer.hand}
            selectedCards={selectedCards}
            onCardClick={handleCardClick}
            disabled={!isLocalPlayerTurn || state.phase === 'game_over'}
            collapsed={handCollapsed}
            onToggleCollapse={() => setHandCollapsed(!handCollapsed)}
            onPlayCards={handlePlayCards}
            onNoPlay={handleNoPlay}
            onDeclareProphet={handleDeclareProphet}
            isProphet={activePlayer.isProphet}
            isHumanTurn={isLocalPlayerTurn}
            gamePhase={state.phase}
            canDeclareProphet={canActivePlayerDeclareProphet}
          />
        )}
      </div>

      {/* Right Sidebar - Scoreboard (Collapsible) */}
      <div
        style={{
          width: scoreboardCollapsed ? '50px' : '280px',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          borderLeft: '2px solid var(--glass-border)',
          transition: 'width 0.3s ease',
          position: 'relative',
        }}
      >
        {/* Collapse/Expand Button */}
        <button
          onClick={() => setScoreboardCollapsed(!scoreboardCollapsed)}
          style={{
            position: 'absolute',
            left: scoreboardCollapsed ? '50%' : '1rem',
            top: '1rem',
            transform: scoreboardCollapsed ? 'translateX(-50%)' : 'none',
            background: 'var(--accent-purple)',
            border: '2px solid var(--accent-gold)',
            padding: '0.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.6rem',
            color: 'var(--text-light)',
            fontFamily: 'Press Start 2P, cursive',
            transition: 'all 0.2s',
            zIndex: 10,
            whiteSpace: 'nowrap',
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
          {scoreboardCollapsed ? '◀' : '▶'}
        </button>

        {/* Scoreboard Content */}
        {!scoreboardCollapsed && (
          <div
            style={{
              flex: 1,
              padding: '4rem 1rem 1rem 1rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <Scoreboard
              players={state.players}
              currentPlayerIndex={state.currentPlayerIndex}
              gameState={state}
            />

            <div
              style={{
                fontSize: '0.6rem',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '6px',
                textAlign: 'center',
                marginTop: 'auto',
              }}
            >
              <span style={{ color: 'var(--text-dim)' }}>Round:</span>{' '}
              <span style={{ color: 'var(--text-light)' }}>{state.roundNumber}</span>
            </div>
          </div>
        )}

        {/* Collapsed State - Vertical Text */}
        {scoreboardCollapsed && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '4rem',
            }}
          >
            <div
              style={{
                writingMode: 'vertical-rl',
                fontSize: '0.7rem',
                color: 'var(--accent-gold)',
                fontFamily: 'Press Start 2P, cursive',
                letterSpacing: '0.2em',
              }}
            >
              PLAYERS
            </div>
          </div>
        )}
      </div>

      {/* Prophet Prediction Panel */}
      {showProphetPanel && prophetId && (
        <ProphetPredictionPanel
          state={state}
          prophetId={prophetId}
          onPredictRight={handleProphetPredictRight}
          onPredictWrong={handleProphetPredictWrong}
        />
      )}

      {/* Dealer Control Panel (for human dealer) */}
      {showDealerPanel && state.pendingPlay && dealerPendingCard && (
        <DealerControlPanel
          pendingCard={dealerPendingCard}
          playerName={state.pendingPlay.playerId}
          onJudge={handleJudgeCard}
          autoVerdict={dealerAutoVerdict}
        />
      )}

      {/* No-Play Dispute Panel */}
      {showNoPlayPanel && (
        <NoPlayDisputePanel
          state={state}
          onAccept={handleAcceptNoPlay}
          onReject={handleRejectNoPlay}
          isAIGod={isAIGod}
        />
      )}

      {/* Turn Transition Overlay (for multiplayer) */}
      {showTransitionOverlay && (
        <TurnTransitionOverlay
          playerName={transitionTargetName}
          onReady={confirmTurnTransition}
        />
      )}

      {/* Game Over Screen Overlay */}
      {state.phase === 'game_over' && (
        <GameOverScreen
          state={state}
          onPlayAgain={handlePlayAgain}
          onMainMenu={handleMainMenu}
        />
      )}

      {/* Help and Settings Overlays */}
      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
