/**
 * Zustand store wrapping the game engine
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createInitialState,
  gameReducer,
  createAIDealer,
  selectCardsToPlay,
  type GameState,
  type GameAction,
  type PlayerConfig,
} from '../engine';
import { sounds } from '../audio/sounds';

interface GameStore {
  state: GameState;
  selectedCards: Set<string>;
  aiDealer: ReturnType<typeof createAIDealer> | null;
  showTransitionOverlay: boolean;
  transitionTargetName: string;
  hasSavedGame: boolean;

  // Actions
  dispatch: (action: GameAction) => void;
  toggleCardSelection: (cardId: string) => void;
  clearSelection: () => void;

  // Game setup
  startNewGame: (configs: PlayerConfig[]) => void;
  resetGame: () => void;
  loadSavedGame: () => void;
  clearSavedGame: () => void;

  // Multiplayer actions
  advanceToNextActionablePlayer: () => void;
  confirmTurnTransition: () => void;
  judgeCardAsHumanDealer: (cardId: string, correct: boolean) => void;
  makeProphetPrediction: (prediction: boolean) => void;

  // AI actions
  executeAITurn: () => void;

  // Helper getters
  getCurrentPlayer: () => GameState['players'][0] | undefined;
  getActiveLocalPlayer: () => GameState['players'][0] | undefined;
}

const SAVE_KEY = 'eleusis-game-save';

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      state: createInitialState(),
      selectedCards: new Set(),
      aiDealer: null,
      showTransitionOverlay: false,
      transitionTargetName: '',
      hasSavedGame: false,

  dispatch: (action: GameAction) => {
    const previousState = get().state;
    const newState = gameReducer(previousState, action);
    set({ state: newState });

    // After END_TURN, advance to next actionable player
    if (action.type === 'END_TURN') {
      setTimeout(() => {
        get().advanceToNextActionablePlayer();
      }, 300);
    }

    // After PLAY_CARD with AI dealer, auto-judge the cards
    if (action.type === 'PLAY_CARD' && newState.pendingPlay) {
      const { aiDealer } = get();
      const player = newState.players.find(p => p.id === action.playerId);

      // Check if a Prophet needs to predict before judgment
      const prophetPlayer = newState.players.find(p => p.isProphet && p.type === 'human' && !p.isDealer);
      const shouldWaitForProphet = prophetPlayer && prophetPlayer.id !== action.playerId;

      // Only auto-judge if there's an AI dealer, no Prophet awaiting prediction, and player is human
      if (aiDealer && player && player.type === 'human' && newState.mainLine.length > 0 && !shouldWaitForProphet) {
        const cardIds = newState.pendingPlay.cards.map(c => c.id);

        // Judge each card sequentially
        cardIds.forEach((cardId, i) => {
          setTimeout(() => {
            const currentState = get().state;
            const card = currentState.pendingPlay?.cards.find(c => c.id === cardId);

            if (card && currentState.mainLine.length > 0) {
              const lastCard = currentState.mainLine[currentState.mainLine.length - 1];
              const isCorrect = aiDealer.judgeCard(lastCard, card);

              // Play judgment sound
              setTimeout(() => {
                if (isCorrect) {
                  sounds.playCorrect();
                } else {
                  sounds.playWrong();
                }
              }, 150);

              get().dispatch({
                type: 'JUDGE_CARD',
                cardId,
                correct: isCorrect,
              });
            }
          }, (i + 1) * 600);
        });
      }
    }

    // After PROPHET_PREDICT with AI dealer, auto-judge the predicted card
    if (action.type === 'PROPHET_PREDICT' && newState.pendingPlay) {
      const { aiDealer } = get();
      if (aiDealer && newState.mainLine.length > 0) {
        const card = newState.pendingPlay.cards.find(c => c.id === action.cardId);
        if (card) {
          setTimeout(() => {
            const currentState = get().state;
            if (currentState.mainLine.length > 0 && currentState.pendingPlay) {
              const pendingCard = currentState.pendingPlay.cards.find(c => c.id === action.cardId);
              if (pendingCard) {
                const lastCard = currentState.mainLine[currentState.mainLine.length - 1];
                const isCorrect = aiDealer.judgeCard(lastCard, pendingCard);

                setTimeout(() => {
                  if (isCorrect) {
                    sounds.playCorrect();
                  } else {
                    sounds.playWrong();
                  }
                }, 150);

                get().dispatch({
                  type: 'JUDGE_CARD',
                  cardId: action.cardId,
                  correct: isCorrect,
                });
              }
            }
          }, 600);
        }
      }
    }

    // After JUDGE_CARD clears pendingPlay, auto-dispatch END_TURN
    if (action.type === 'JUDGE_CARD') {
      const currentPlayer = newState.players[newState.currentPlayerIndex];

      if (!newState.pendingPlay && previousState.pendingPlay) {
        // Dispatch END_TURN for:
        // 1. Human players (always need auto END_TURN)
        // 2. AI players when Prophet flow is active (executeAITurn doesn't schedule END_TURN in that case)
        const prophetPlayer = newState.players.find(p => p.isProphet && !p.isDealer);
        const wasInProphetFlow = prophetPlayer && previousState.pendingPlay.playerId !== prophetPlayer.id;

        if (currentPlayer?.type === 'human' || wasInProphetFlow) {
          setTimeout(() => {
            get().dispatch({ type: 'END_TURN' });
          }, 400);
        }
      }
    }
  },

  toggleCardSelection: (cardId: string) => {
    set((state) => {
      const newSelection = new Set(state.selectedCards);
      if (newSelection.has(cardId)) {
        newSelection.delete(cardId);
      } else {
        newSelection.add(cardId);
      }
      return { selectedCards: newSelection };
    });
  },

  clearSelection: () => {
    set({ selectedCards: new Set() });
  },

  startNewGame: (configs: PlayerConfig[]) => {
    // Find dealer config
    const dealerConfig = configs.find(c => c.isDealer);
    if (!dealerConfig) {
      throw new Error('No dealer specified in player configs');
    }

    // Create AI dealer only if dealer is AI type
    const aiDealer = dealerConfig.type === 'ai' ? createAIDealer() : null;

    // Generate player IDs from configs
    const playerIds = configs.map((config, index) => {
      if (config.isDealer) return 'dealer';
      return `player-${index}`;
    });

    // Initialize game
    let state = createInitialState();
    state = gameReducer(state, {
      type: 'INIT_GAME',
      dealerId: 'dealer',
      playerIds,
    });

    // Set dealer rule
    if (aiDealer) {
      state = gameReducer(state, {
        type: 'SET_DEALER_RULE',
        rule: aiDealer.getRuleName(),
        ruleFunction: aiDealer.getRuleFunction(),
      });
    }

    // Set player names and types from configs
    state = {
      ...state,
      players: state.players.map((p, index) => {
        const config = configs[index];
        return {
          ...p,
          name: config.name,
          type: config.type,
        };
      }),
    };

    // Deal cards
    state = gameReducer(state, {
      type: 'DEAL_CARDS',
      count: 14,
    });

    set({
      state,
      aiDealer,
      selectedCards: new Set(),
      showTransitionOverlay: false,
      transitionTargetName: '',
    });

    // Advance to next actionable player
    setTimeout(() => {
      get().advanceToNextActionablePlayer();
    }, 500);
  },

  executeAITurn: () => {
    const { state, aiDealer, dispatch } = get();
    const currentPlayer = state.players[state.currentPlayerIndex];

    if (!currentPlayer || currentPlayer.type !== 'ai' || currentPlayer.isDealer) {
      return;
    }

    // AI selects cards to play
    const cardIds = selectCardsToPlay(currentPlayer.hand, state);

    if (cardIds.length === 0) {
      // No cards to play, end turn
      dispatch({ type: 'END_TURN' });
      return;
    }

    // Check if a human Prophet needs to predict before judgment
    const prophetPlayer = state.players.find(p => p.isProphet && p.type === 'human' && !p.isDealer);

    // Dispatch PLAY_CARD through reducer
    setTimeout(() => {
      sounds.playCardPlace();
      dispatch({
        type: 'PLAY_CARD',
        playerId: currentPlayer.id,
        cardIds,
      });

      // If there's a human Prophet, wait for their predictions before judging.
      // The PROPHET_PREDICT handler will trigger auto-judgment for each card,
      // and the JUDGE_CARD handler will dispatch END_TURN when all cards are done.
      if (prophetPlayer) {
        return;
      }

      // No Prophet - judge each card sequentially (existing behavior)
      cardIds.forEach((cardId, i) => {
        setTimeout(() => {
          const currentState = get().state;

          // Find the card in pendingPlay
          const card = currentState.pendingPlay?.cards.find(c => c.id === cardId);

          if (card && aiDealer && currentState.mainLine.length > 0) {
            const lastCard = currentState.mainLine[currentState.mainLine.length - 1];
            const isCorrect = aiDealer.judgeCard(lastCard, card);

            // Play judgment sound
            setTimeout(() => {
              if (isCorrect) {
                sounds.playCorrect();
              } else {
                sounds.playWrong();
              }
            }, 150);

            // Dispatch JUDGE_CARD through reducer
            dispatch({
              type: 'JUDGE_CARD',
              cardId,
              correct: isCorrect,
            });
          }
        }, (i + 1) * 600);
      });

      // End turn after all cards are judged
      setTimeout(() => {
        dispatch({ type: 'END_TURN' });
      }, cardIds.length * 600 + 400);
    }, 300);
  },

  advanceToNextActionablePlayer: () => {
    const { state } = get();
    const currentPlayer = state.players[state.currentPlayerIndex];

    if (!currentPlayer) {
      return;
    }

    // If current player is AI, execute their turn
    if (currentPlayer.type === 'ai' && !currentPlayer.isDealer) {
      setTimeout(() => {
        get().executeAITurn();
      }, 800);
    }
    // If current player is human (non-dealer), show transition overlay
    else if (currentPlayer.type === 'human' && !currentPlayer.isDealer) {
      set({
        showTransitionOverlay: true,
        transitionTargetName: currentPlayer.name,
      });
    }
  },

  confirmTurnTransition: () => {
    set({ showTransitionOverlay: false });
  },

  judgeCardAsHumanDealer: (cardId: string, correct: boolean) => {
    const { dispatch } = get();
    sounds.playCardPlace();
    setTimeout(() => {
      if (correct) {
        sounds.playCorrect();
      } else {
        sounds.playWrong();
      }
    }, 150);
    dispatch({ type: 'JUDGE_CARD', cardId, correct });
  },

  makeProphetPrediction: (prediction: boolean) => {
    const { state, dispatch } = get();
    // Find the actual Prophet player (not the current turn player)
    const prophetPlayer = state.players.find(p => p.isProphet && !p.isDealer);

    if (!prophetPlayer || !state.pendingPlay) {
      return;
    }

    // Get the next pending card
    const nextCard = state.pendingPlay.cards[0];
    if (nextCard) {
      dispatch({
        type: 'PROPHET_PREDICT',
        playerId: prophetPlayer.id,
        cardId: nextCard.id,
        prediction,
      });
    }
  },

  resetGame: () => {
    set({
      state: createInitialState(),
      selectedCards: new Set(),
      aiDealer: null,
      showTransitionOverlay: false,
      transitionTargetName: '',
      hasSavedGame: false,
    });
  },

  loadSavedGame: () => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      const { state: savedState, dealerRuleName } = parsed;

      // Reconstruct AI dealer if it exists
      let aiDealer = null;
      if (dealerRuleName) {
        aiDealer = createAIDealer();
        // Note: We can't perfectly restore the dealer's exact rule,
        // but we create a new one for consistency
      }

      set({
        state: savedState,
        aiDealer,
        selectedCards: new Set(),
        showTransitionOverlay: false,
        transitionTargetName: '',
        hasSavedGame: true,
      });
    } catch (err) {
      console.error('Failed to load saved game:', err);
    }
  },

  clearSavedGame: () => {
    try {
      localStorage.removeItem(SAVE_KEY);
      set({ hasSavedGame: false });
    } catch (err) {
      console.error('Failed to clear saved game:', err);
    }
  },

  getCurrentPlayer: () => {
    const { state } = get();
    return state.players[state.currentPlayerIndex];
  },

  getActiveLocalPlayer: () => {
    const { state } = get();
    const currentPlayer = state.players[state.currentPlayerIndex];
    // Only return current player if they are human (local)
    return currentPlayer?.type === 'human' ? currentPlayer : undefined;
  },
    }),
    {
      name: SAVE_KEY,
      partialize: (state) => ({
        state: state.state,
        dealerRuleName: state.aiDealer?.getRuleName() || null,
        hasSavedGame: state.state.phase !== 'setup',
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, reconstruct AIDealer if needed
        if (state?.state && state.state.dealerRule) {
          const dealer = createAIDealer();
          state.aiDealer = dealer;
        }
      },
    }
  )
);
