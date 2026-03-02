/**
 * Game state reducer for New Eleusis
 * Pure state machine that handles all game actions
 */

import type { GameState, GameAction, Player, PlayedCard, Card, GamePhase } from './types';
import { createDeck, shuffle, dealCards, getRankValue } from './deck';
import { shouldGameEnd, isSuddenDeath } from './validation';

/**
 * Create initial game state
 */
export function createInitialState(): GameState {
  return {
    phase: 'setup',
    players: [],
    currentPlayerIndex: 0,
    deck: [],
    mainLine: [],
    godRule: '',
    pendingPlay: undefined,
    prophetMarkerIndex: undefined,
    prophetHandAside: undefined,
    prophetCorrectCalls: 0,
    prophetIncorrectCalls: 0,
    roundNumber: 0,
    gameStartTime: Date.now(),
    totalCardsPlayed: 0,
  };
}

/**
 * Initialize a new game
 */
function initGame(state: GameState, action: { type: 'INIT_GAME'; godId: string; playerIds: string[]; godRule?: string }): GameState {
  // Create players
  const players: Player[] = action.playerIds.map(id => ({
    id,
    name: id,
    hand: [],
    score: 0,
    isProphet: false,
    isGod: id === action.godId,
    type: 'ai',
    wasProphet: false,
    isExpelled: false,
  }));

  // Create and shuffle deck
  const deck = shuffle(createDeck());

  return {
    ...state,
    phase: 'dealing',
    players,
    deck,
    godRule: action.godRule || '',
    currentPlayerIndex: 0,
    mainLine: [],
    roundNumber: 1,
    gameStartTime: Date.now(),
    totalCardsPlayed: 0,
  };
}

/**
 * Set the god's rule
 */
function setGodRule(state: GameState, action: { type: 'SET_GOD_RULE'; rule: string; ruleFunction?: (lastCard: Card, newCard: Card) => boolean }): GameState {
  return {
    ...state,
    godRule: action.rule,
    godRuleFunction: action.ruleFunction,
  };
}

/**
 * Deal cards to all non-dealer players
 */
function dealCardsToPlayers(state: GameState, action: { type: 'DEAL_CARDS'; count: number }): GameState {
  let remainingDeck = [...state.deck];
  const updatedPlayers = state.players.map(player => {
    if (player.isGod) {
      return { ...player, wasProphet: false };
    }

    const { dealt, remaining } = dealCards(remainingDeck, action.count);
    remainingDeck = remaining;

    return {
      ...player,
      hand: [...player.hand, ...dealt],
      wasProphet: false,
    };
  });

  // Deal starter card to main line if empty
  let mainLine = [...state.mainLine];
  let startPlayerIndex = 1;
  if (mainLine.length === 0 && remainingDeck.length > 0) {
    const starterCard = remainingDeck[0];
    remainingDeck = remainingDeck.slice(1);
    mainLine = [{
      ...starterCard,
      correct: true,
      playedBy: 'god',
    }];

    // Calculate start player based on starter card rank
    const rankValue = getRankValue(starterCard.rank);
    const nonGodPlayers = updatedPlayers.filter(p => !p.isGod);
    if (nonGodPlayers.length > 0) {
      // Count that many positions clockwise among non-God players starting from player index 1 (left of God)
      const startOffset = (rankValue - 1) % nonGodPlayers.length;
      // Find the actual player index
      let count = 0;
      for (let i = 0; i < updatedPlayers.length; i++) {
        if (!updatedPlayers[i].isGod) {
          if (count === startOffset) {
            startPlayerIndex = i;
            break;
          }
          count++;
        }
      }
    }
  }

  return {
    ...state,
    players: updatedPlayers,
    deck: remainingDeck,
    mainLine,
    phase: 'playing',
    currentPlayerIndex: startPlayerIndex,
  };
}

/**
 * Play cards from a player's hand
 */
function playCard(state: GameState, action: { type: 'PLAY_CARD'; playerId: string; cardIds: string[] }): GameState {
  const player = state.players.find(p => p.id === action.playerId);
  if (!player) {
    return state;
  }

  // Find the cards in the player's hand
  const cardsToPlay = action.cardIds
    .map(id => player.hand.find(c => c.id === id))
    .filter((c): c is Card => c !== undefined);

  if (cardsToPlay.length !== action.cardIds.length) {
    return state;
  }

  // Remove cards from player's hand
  const updatedPlayers = state.players.map(p => {
    if (p.id === action.playerId) {
      return {
        ...p,
        hand: p.hand.filter(c => !action.cardIds.includes(c.id)),
      };
    }
    return p;
  });

  // Store cards in pendingPlay for judgment
  const pendingPlay = {
    playerId: action.playerId,
    cards: cardsToPlay,
    judgedCards: [],
    predictions: {},
  };

  // Always transition to 'awaiting_judgment': AI God auto-judges via store effect,
  // human God (compiled or manual) uses DealerControlPanel
  const newPhase = 'awaiting_judgment';

  return {
    ...state,
    players: updatedPlayers,
    pendingPlay,
    phase: newPhase as GamePhase,
  };
}

/**
 * Judge a played card as correct or incorrect
 */
function judgeCard(state: GameState, action: { type: 'JUDGE_CARD'; cardId: string; correct: boolean; skipPenalty?: boolean }): GameState {
  if (!state.pendingPlay) {
    return state;
  }

  // Find the card in pendingPlay
  const cardToJudge = state.pendingPlay.cards.find(c => c.id === action.cardId);
  if (!cardToJudge) {
    return state;
  }

  // Get any prophet prediction for this card
  const prophetPrediction = state.pendingPlay.predictions[action.cardId];

  // Create the played card
  const playedCard: PlayedCard = {
    ...cardToJudge,
    correct: action.correct,
    playedBy: state.pendingPlay.playerId,
    prophetPrediction,
  };

  // Add to main line or branch immutably
  let updatedMainLine = [...state.mainLine];
  let remainingDeck = [...state.deck];
  let updatedPlayers = [...state.players];

  if (action.correct) {
    updatedMainLine.push(playedCard);
  } else {
    // Add to branch of last card
    if (updatedMainLine.length > 0) {
      const lastCardIndex = updatedMainLine.length - 1;
      const lastCard = updatedMainLine[lastCardIndex];
      const updatedLastCard = {
        ...lastCard,
        branches: [...(lastCard.branches || []), playedCard],
      };
      updatedMainLine = [
        ...updatedMainLine.slice(0, lastCardIndex),
        updatedLastCard,
      ];
    }

    // Deal 2 penalty cards to the player (unless skipPenalty is set)
    if (!action.skipPenalty) {
      const { dealt: penaltyCards, remaining } = dealCards(remainingDeck, 2);
      remainingDeck = remaining;

      updatedPlayers = updatedPlayers.map(p => {
        if (p.id === state.pendingPlay!.playerId) {
          return { ...p, hand: [...p.hand, ...penaltyCards] };
        }
        return p;
      });
    }
  }

  // Increment totalCardsPlayed
  const totalCardsPlayed = state.totalCardsPlayed + 1;

  // Check if player should be expelled (sudden death + wrong play), unless skipPenalty is set
  if (!action.correct && !action.skipPenalty && isSuddenDeath({ ...state, totalCardsPlayed })) {
    updatedPlayers = updatedPlayers.map(p => {
      if (p.id === state.pendingPlay!.playerId) {
        return { ...p, isExpelled: true };
      }
      return p;
    });
  }

  // Remove this card from pending cards
  const remainingCards = state.pendingPlay.cards.filter(c => c.id !== action.cardId);

  // Add to judged cards
  const judgedCards = [...state.pendingPlay.judgedCards, playedCard];

  // If all cards are judged, clear pendingPlay and return to 'playing'
  if (remainingCards.length === 0) {
    const newState = {
      ...state,
      mainLine: updatedMainLine,
      deck: remainingDeck,
      players: updatedPlayers,
      totalCardsPlayed,
      pendingPlay: undefined,
      phase: 'playing' as GamePhase,
    };

    // Check if game should end
    if (shouldGameEnd(newState)) {
      return {
        ...newState,
        phase: 'game_over',
      };
    }

    return newState;
  }

  // Otherwise, update pendingPlay with remaining cards
  return {
    ...state,
    mainLine: updatedMainLine,
    deck: remainingDeck,
    players: updatedPlayers,
    totalCardsPlayed,
    pendingPlay: {
      ...state.pendingPlay,
      cards: remainingCards,
      judgedCards,
    },
  };
}

/**
 * Declare a player as Prophet
 */
function declareProphet(state: GameState, action: { type: 'DECLARE_PROPHET'; playerId: string }): GameState {
  const player = state.players.find(p => p.id === action.playerId);
  if (!player) {
    return state;
  }

  const updatedPlayers = state.players.map(p => {
    if (p.id === action.playerId) {
      return { ...p, isProphet: true, hand: [] };
    }
    return p;
  });

  return {
    ...state,
    players: updatedPlayers,
    prophetMarkerIndex: state.mainLine.length - 1,
    prophetHandAside: [...player.hand],
    prophetCorrectCalls: 0,
    prophetIncorrectCalls: 0,
  };
}

/**
 * Resign from being Prophet
 */
function resignProphet(state: GameState, action: { type: 'RESIGN_PROPHET'; playerId: string }): GameState {
  const updatedPlayers = state.players.map(p => {
    if (p.id === action.playerId) {
      return { ...p, isProphet: false, wasProphet: true };
    }
    return p;
  });

  return {
    ...state,
    players: updatedPlayers,
  };
}

/**
 * Prophet makes a prediction
 */
function prophetPredict(state: GameState, action: { type: 'PROPHET_PREDICT'; playerId: string; cardId: string; prediction: boolean }): GameState {
  const prediction = {
    predictedBy: action.playerId,
    prediction: action.prediction,
  };

  // Check if the card is in pendingPlay (not yet judged)
  if (state.pendingPlay && state.pendingPlay.cards.find(c => c.id === action.cardId)) {
    return {
      ...state,
      pendingPlay: {
        ...state.pendingPlay,
        predictions: {
          ...state.pendingPlay.predictions,
          [action.cardId]: prediction,
        },
      },
    };
  }

  // Otherwise, check mainLine
  const updatedMainLine = state.mainLine.map(pc => {
    if (pc.id === action.cardId) {
      return {
        ...pc,
        prophetPrediction: prediction,
      };
    }
    return pc;
  });

  return {
    ...state,
    mainLine: updatedMainLine,
  };
}

/**
 * Verify prophet's prediction
 */
function prophetVerify(state: GameState, action: { type: 'PROPHET_VERIFY'; prediction: boolean; godJudgment: boolean; cardId: string }): GameState {
  const predictionCorrect = action.prediction === action.godJudgment;

  return {
    ...state,
    prophetCorrectCalls: predictionCorrect ? state.prophetCorrectCalls + 1 : state.prophetCorrectCalls,
    prophetIncorrectCalls: predictionCorrect ? state.prophetIncorrectCalls : state.prophetIncorrectCalls + 1,
  };
}

/**
 * Overthrow the Prophet (wrong prediction)
 */
function overthrowProphet(state: GameState, action: { type: 'OVERTHROW_PROPHET'; prophetId: string }): GameState {
  const prophet = state.players.find(p => p.id === action.prophetId);
  if (!prophet || !state.prophetHandAside) {
    return state;
  }

  // Deal 5 penalty cards from deck
  const { dealt: penaltyCards, remaining: remainingDeck } = dealCards(state.deck, 5);

  // Restore hand with penalty cards
  const restoredHand = [...state.prophetHandAside, ...penaltyCards];

  const updatedPlayers = state.players.map(p => {
    if (p.id === action.prophetId) {
      return { ...p, isProphet: false, wasProphet: true, hand: restoredHand };
    }
    return p;
  });

  return {
    ...state,
    players: updatedPlayers,
    deck: remainingDeck,
    prophetMarkerIndex: undefined,
    prophetHandAside: undefined,
    prophetCorrectCalls: 0,
    prophetIncorrectCalls: 0,
  };
}

/**
 * Declare "No Play"
 */
function declareNoPlay(state: GameState, action: { type: 'DECLARE_NO_PLAY'; playerId: string }): GameState {
  const player = state.players.find(p => p.id === action.playerId);
  if (!player) {
    return state;
  }

  return {
    ...state,
    phase: 'no_play_dispute',
    noPlayDeclaration: {
      playerId: action.playerId,
      hand: [...player.hand],
      disputed: false,
    },
  };
}

/**
 * Dispute a "No Play" declaration
 */
function disputeNoPlay(state: GameState, action: { type: 'DISPUTE_NO_PLAY'; disputerId: string }): GameState {
  if (!state.noPlayDeclaration) {
    return state;
  }

  return {
    ...state,
    noPlayDeclaration: {
      ...state.noPlayDeclaration,
      disputed: true,
      disputedBy: action.disputerId,
    },
  };
}

/**
 * Resolve "No Play" declaration
 */
function resolveNoPlay(state: GameState, action: { type: 'RESOLVE_NO_PLAY'; valid: boolean; correctCardId?: string }): GameState {
  if (!state.noPlayDeclaration) {
    return state;
  }

  const declaration = state.noPlayDeclaration;
  const player = state.players.find(p => p.id === declaration.playerId);

  if (!player) {
    return {
      ...state,
      phase: 'playing',
      noPlayDeclaration: undefined,
    };
  }

  let updatedPlayers = [...state.players];
  let updatedDeck = [...state.deck];
  let updatedMainLine = [...state.mainLine];

  if (action.valid) {
    // Valid no-play: discard entire hand, deal new hand with 4 fewer cards
    const oldHandSize = player.hand.length;
    const newHandSize = Math.max(0, oldHandSize - 4);

    const { dealt, remaining } = dealCards(updatedDeck, newHandSize);
    updatedDeck = remaining;

    updatedPlayers = updatedPlayers.map(p => {
      if (p.id === declaration.playerId) {
        return { ...p, hand: dealt };
      }
      return p;
    });

    const newState = {
      ...state,
      deck: updatedDeck,
      players: updatedPlayers,
      phase: 'playing' as GamePhase,
      noPlayDeclaration: undefined,
    };

    // Check if game should end (player may have empty hand now)
    if (shouldGameEnd(newState)) {
      return {
        ...newState,
        phase: 'game_over',
      };
    }

    return newState;
  } else {
    // Invalid no-play: play the correct card + 5 penalty cards
    if (!action.correctCardId) {
      return state;
    }

    const correctCard = player.hand.find(c => c.id === action.correctCardId);
    if (!correctCard) {
      return state;
    }

    // Play the correct card on the mainline
    const playedCard: PlayedCard = {
      ...correctCard,
      correct: true,
      playedBy: declaration.playerId,
    };
    updatedMainLine.push(playedCard);

    // Deal 5 penalty cards
    const { dealt: penaltyCards, remaining } = dealCards(updatedDeck, 5);
    updatedDeck = remaining;

    // Update player's hand: remove correct card, add penalty cards
    updatedPlayers = updatedPlayers.map(p => {
      if (p.id === declaration.playerId) {
        const newHand = p.hand.filter(c => c.id !== action.correctCardId);
        return { ...p, hand: [...newHand, ...penaltyCards] };
      }
      return p;
    });

    return {
      ...state,
      deck: updatedDeck,
      players: updatedPlayers,
      mainLine: updatedMainLine,
      totalCardsPlayed: state.totalCardsPlayed + 1,
      phase: 'playing',
      noPlayDeclaration: undefined,
    };
  }
}

/**
 * Expel a player from the game
 */
function expelPlayer(state: GameState, action: { type: 'EXPEL_PLAYER'; playerId: string }): GameState {
  const updatedPlayers = state.players.map(p => {
    if (p.id === action.playerId) {
      return { ...p, isExpelled: true };
    }
    return p;
  });

  return {
    ...state,
    players: updatedPlayers,
  };
}

/**
 * End the current turn and advance to next player
 */
function endTurn(state: GameState): GameState {
  // Find next non-expelled, non-god, non-prophet player
  let nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  let iterations = 0;
  while (
    iterations < state.players.length &&
    (state.players[nextPlayerIndex].isExpelled ||
      state.players[nextPlayerIndex].isGod ||
      state.players[nextPlayerIndex].isProphet)
  ) {
    nextPlayerIndex = (nextPlayerIndex + 1) % state.players.length;
    iterations++;
  }

  // Check if game should end
  if (shouldGameEnd(state)) {
    return {
      ...state,
      phase: 'game_over',
    };
  }

  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    roundNumber: state.roundNumber + 1,
  };
}

/**
 * End the game
 */
function endGame(state: GameState): GameState {
  return {
    ...state,
    phase: 'game_over',
  };
}

/**
 * Main reducer function
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INIT_GAME':
      return initGame(state, action);
    case 'SET_GOD_RULE':
      return setGodRule(state, action);
    case 'DEAL_CARDS':
      return dealCardsToPlayers(state, action);
    case 'PLAY_CARD':
      return playCard(state, action);
    case 'JUDGE_CARD':
      return judgeCard(state, action);
    case 'DECLARE_PROPHET':
      return declareProphet(state, action);
    case 'RESIGN_PROPHET':
      return resignProphet(state, action);
    case 'PROPHET_PREDICT':
      return prophetPredict(state, action);
    case 'PROPHET_VERIFY':
      return prophetVerify(state, action);
    case 'OVERTHROW_PROPHET':
      return overthrowProphet(state, action);
    case 'DECLARE_NO_PLAY':
      return declareNoPlay(state, action);
    case 'DISPUTE_NO_PLAY':
      return disputeNoPlay(state, action);
    case 'RESOLVE_NO_PLAY':
      return resolveNoPlay(state, action);
    case 'EXPEL_PLAYER':
      return expelPlayer(state, action);
    case 'END_TURN':
      return endTurn(state);
    case 'END_GAME':
      return endGame(state);
    default:
      return state;
  }
}
