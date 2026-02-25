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
  aiGod: ReturnType<typeof createAIDealer> | null;
  showTransitionOverlay: boolean;
  transitionTargetName: string;
  hasSavedGame: boolean;
  lastGodIndex: number; // Track which player was God last game for rotation
  trueProphetIndex: number; // Track True Prophet (becomes next God, -1 if none)

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
      aiGod: null,
      showTransitionOverlay: false,
      transitionTargetName: '',
      hasSavedGame: false,
      lastGodIndex: -1, // -1 means no previous God, start with first player
      trueProphetIndex: -1, // -1 means no True Prophet

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

    // After DECLARE_PROPHET, end turn and advance to next player
    if (action.type === 'DECLARE_PROPHET') {
      setTimeout(() => {
        get().dispatch({ type: 'END_TURN' });
      }, 400);
    }

    // After END_GAME, check for True Prophet
    if (action.type === 'END_GAME') {
      const trueProphet = newState.players.find(p => p.isProphet);
      if (trueProphet) {
        // Find the index of the True Prophet in the original configs order
        const trueProphetIndex = newState.players.findIndex(p => p.id === trueProphet.id);
        set({ trueProphetIndex });
      }
    }

    // After PLAY_CARD with AI dealer, auto-judge the cards
    if (action.type === 'PLAY_CARD' && newState.pendingPlay) {
      const { aiGod } = get();
      const player = newState.players.find(p => p.id === action.playerId);

      // Check if a Prophet needs to predict before judgment
      const prophetPlayer = newState.players.find(p => p.isProphet && p.type === 'human' && !p.isGod);
      const shouldWaitForProphet = prophetPlayer && prophetPlayer.id !== action.playerId;

      // Only auto-judge if there's an AI dealer, no Prophet awaiting prediction, and player is human
      if (aiGod && player && player.type === 'human' && newState.mainLine.length > 0 && !shouldWaitForProphet) {
        const cardIds = newState.pendingPlay.cards.map(c => c.id);

        // Judge each card sequentially
        cardIds.forEach((cardId, i) => {
          setTimeout(() => {
            const currentState = get().state;
            const card = currentState.pendingPlay?.cards.find(c => c.id === cardId);

            if (card && currentState.mainLine.length > 0) {
              const lastCard = currentState.mainLine[currentState.mainLine.length - 1];
              const isCorrect = aiGod.judgeCard(lastCard, card);

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

    // After PROPHET_PREDICT with AI dealer, compare prediction to dealer judgment
    if (action.type === 'PROPHET_PREDICT' && newState.pendingPlay) {
      const { aiGod } = get();
      if (aiGod && newState.mainLine.length > 0) {
        const card = newState.pendingPlay.cards.find(c => c.id === action.cardId);
        if (card) {
          setTimeout(() => {
            const currentState = get().state;
            if (currentState.mainLine.length > 0 && currentState.pendingPlay) {
              const pendingCard = currentState.pendingPlay.cards.find(c => c.id === action.cardId);
              if (pendingCard) {
                const lastCard = currentState.mainLine[currentState.mainLine.length - 1];
                const godJudgment = aiGod.judgeCard(lastCard, pendingCard);
                const prophetPrediction = action.prediction;
                const prophetPlayer = currentState.players.find(p => p.isProphet && !p.isGod);

                // Check if Prophet's prediction matches dealer's judgment
                const approved = prophetPrediction === godJudgment;

                if (approved) {
                  // Prophet was correct - proceed normally
                  get().dispatch({
                    type: 'PROPHET_VERIFY',
                    prediction: prophetPrediction,
                    godJudgment,
                    cardId: action.cardId,
                  });

                  setTimeout(() => {
                    if (godJudgment) {
                      sounds.playCorrect();
                    } else {
                      sounds.playWrong();
                    }
                  }, 150);

                  get().dispatch({
                    type: 'JUDGE_CARD',
                    cardId: action.cardId,
                    correct: godJudgment,
                  });
                } else {
                  // Prophet was wrong - overthrow them
                  if (prophetPlayer) {
                    get().dispatch({
                      type: 'OVERTHROW_PROPHET',
                      prophetId: prophetPlayer.id,
                    });
                  }

                  // Still judge the card with the actual result (no penalty to player)
                  setTimeout(() => {
                    // Play a distinctive overthrow sound (using wrong sound for now)
                    sounds.playWrong();
                  }, 150);

                  get().dispatch({
                    type: 'JUDGE_CARD',
                    cardId: action.cardId,
                    correct: godJudgment,
                  });
                }
              }
            }
          }, 600);
        }
      }
    }

    // After RESOLVE_NO_PLAY with AI God, auto-find correct card for invalid no-play
    if (action.type === 'RESOLVE_NO_PLAY' && !action.valid && !action.correctCardId) {
      const { aiGod } = get();
      if (aiGod && previousState.noPlayDeclaration && previousState.mainLine.length > 0) {
        const player = previousState.players.find(p => p.id === previousState.noPlayDeclaration!.playerId);
        if (player) {
          const lastCard = previousState.mainLine[previousState.mainLine.length - 1];
          // Find a correct card in player's hand
          const correctCard = player.hand.find(card => aiGod.judgeCard(lastCard, card));
          if (correctCard) {
            // Re-dispatch with correct card ID
            setTimeout(() => {
              get().dispatch({
                type: 'RESOLVE_NO_PLAY',
                valid: false,
                correctCardId: correctCard.id,
              });
            }, 100);
            return;
          }
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
        const prophetPlayer = newState.players.find(p => p.isProphet && p.type === 'human' && !p.isGod);
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
    const { lastGodIndex, trueProphetIndex } = get();

    // Determine next God index
    // If there was a True Prophet (not overthrown), they become next God
    // Otherwise, rotate through all players sequentially
    const nextGodIndex = trueProphetIndex >= 0
      ? trueProphetIndex
      : (lastGodIndex + 1) % configs.length;

    // Update configs to set the next player as God
    const rotatedConfigs = configs.map((config, index) => ({
      ...config,
      isGod: index === nextGodIndex,
    }));

    // Find god config
    const godConfig = rotatedConfigs[nextGodIndex];
    if (!godConfig) {
      throw new Error('No god found in player configs');
    }

    // Create AI god only if god is AI type
    const aiGod = godConfig.type === 'ai' ? createAIDealer() : null;

    // Generate player IDs from configs
    const playerIds = rotatedConfigs.map((config, index) => {
      if (config.isGod) return 'god';
      return `player-${index}`;
    });

    // Initialize game
    let state = createInitialState();
    state = gameReducer(state, {
      type: 'INIT_GAME',
      godId: 'god',
      playerIds,
    });

    // Set god rule
    if (aiGod) {
      state = gameReducer(state, {
        type: 'SET_GOD_RULE',
        rule: aiGod.getRuleName(),
        ruleFunction: aiGod.getRuleFunction(),
      });
    }

    // Set player names and types from configs
    state = {
      ...state,
      players: state.players.map((p, index) => {
        const config = rotatedConfigs[index];
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
      aiGod,
      selectedCards: new Set(),
      showTransitionOverlay: false,
      transitionTargetName: '',
      lastGodIndex: nextGodIndex, // Store current God index for next rotation
      trueProphetIndex: -1, // Reset True Prophet for new game
    });

    // Advance to next actionable player
    setTimeout(() => {
      get().advanceToNextActionablePlayer();
    }, 500);
  },

  executeAITurn: () => {
    const { state, aiGod, dispatch } = get();
    const currentPlayer = state.players[state.currentPlayerIndex];

    if (!currentPlayer || currentPlayer.type !== 'ai' || currentPlayer.isGod) {
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
    const prophetPlayer = state.players.find(p => p.isProphet && p.type === 'human' && !p.isGod);

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

          if (card && aiGod && currentState.mainLine.length > 0) {
            const lastCard = currentState.mainLine[currentState.mainLine.length - 1];
            const isCorrect = aiGod.judgeCard(lastCard, card);

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
    if (currentPlayer.type === 'ai' && !currentPlayer.isGod) {
      setTimeout(() => {
        get().executeAITurn();
      }, 800);
    }
    // If current player is human (non-dealer), show transition overlay
    else if (currentPlayer.type === 'human' && !currentPlayer.isGod) {
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
    const prophetPlayer = state.players.find(p => p.isProphet && !p.isGod);

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
      aiGod: null,
      showTransitionOverlay: false,
      transitionTargetName: '',
      hasSavedGame: false,
      lastGodIndex: -1, // Reset God rotation
      trueProphetIndex: -1, // Reset True Prophet
    });
  },

  loadSavedGame: () => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      const { state: savedState, godRuleName } = parsed;

      // Reconstruct AI dealer if it exists
      let aiGod = null;
      if (godRuleName) {
        aiGod = createAIDealer();
        // Note: We can't perfectly restore the dealer's exact rule,
        // but we create a new one for consistency
      }

      set({
        state: savedState,
        aiGod,
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
        godRuleName: state.aiGod?.getRuleName() || null,
        hasSavedGame: state.state.phase !== 'setup',
        lastGodIndex: state.lastGodIndex,
        trueProphetIndex: state.trueProphetIndex,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, reconstruct AIDealer if needed
        if (state?.state && state.state.godRule) {
          const dealer = createAIDealer();
          state.aiGod = dealer;
        }
      },
    }
  )
);
