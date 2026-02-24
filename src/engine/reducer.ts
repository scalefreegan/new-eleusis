/**
 * Game state reducer for New Eleusis
 * Pure state machine that handles all game actions
 */

import type { GameState, GameAction, Player, PlayedCard, Card, GamePhase } from './types';
import { createDeck, shuffle, dealCards } from './deck';
import { shouldGameEnd, shouldReceiveSuddenDeathMarker, shouldBeExpelled } from './validation';

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
    dealerRule: '',
    pendingPlay: undefined,
    prophetsCorrectCount: 0,
    prophetMarkerIndex: undefined,
    prophetHandAside: undefined,
    prophetCorrectCalls: 0,
    prophetIncorrectCalls: 0,
    roundNumber: 0,
    gameStartTime: Date.now(),
  };
}

/**
 * Initialize a new game
 */
function initGame(state: GameState, action: { type: 'INIT_GAME'; dealerId: string; playerIds: string[]; dealerRule?: string }): GameState {
  // Create players
  const players: Player[] = action.playerIds.map(id => ({
    id,
    name: id,
    hand: [],
    score: 0,
    isProphet: false,
    isDealer: id === action.dealerId,
    type: 'ai',
    suddenDeathMarkers: 0,
    isExpelled: false,
  }));

  // Create and shuffle deck
  const deck = shuffle(createDeck());

  return {
    ...state,
    phase: 'dealing',
    players,
    deck,
    dealerRule: action.dealerRule || '',
    currentPlayerIndex: 0,
    mainLine: [],
    prophetsCorrectCount: 0,
    roundNumber: 1,
    gameStartTime: Date.now(),
  };
}

/**
 * Set the dealer's rule
 */
function setDealerRule(state: GameState, action: { type: 'SET_DEALER_RULE'; rule: string; ruleFunction?: (lastCard: Card, newCard: Card) => boolean }): GameState {
  return {
    ...state,
    dealerRule: action.rule,
    dealerRuleFunction: action.ruleFunction,
  };
}

/**
 * Deal cards to all non-dealer players
 */
function dealCardsToPlayers(state: GameState, action: { type: 'DEAL_CARDS'; count: number }): GameState {
  let remainingDeck = [...state.deck];
  const updatedPlayers = state.players.map(player => {
    if (player.isDealer) {
      return player;
    }

    const { dealt, remaining } = dealCards(remainingDeck, action.count);
    remainingDeck = remaining;

    return {
      ...player,
      hand: [...player.hand, ...dealt],
    };
  });

  // Deal starter card to main line if empty
  let mainLine = [...state.mainLine];
  if (mainLine.length === 0 && remainingDeck.length > 0) {
    const starterCard = remainingDeck[0];
    remainingDeck = remainingDeck.slice(1);
    mainLine = [{
      ...starterCard,
      correct: true,
      playedBy: 'dealer',
    }];
  }

  return {
    ...state,
    players: updatedPlayers,
    deck: remainingDeck,
    mainLine,
    phase: 'playing',
    currentPlayerIndex: 1, // Start on first scientist, not dealer
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

  // If there's a dealer rule function (AI dealer), stay in 'playing' phase
  // If no dealer rule function (human dealer), transition to 'awaiting_judgment'
  const newPhase = state.dealerRuleFunction ? 'playing' : 'awaiting_judgment';

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
function judgeCard(state: GameState, action: { type: 'JUDGE_CARD'; cardId: string; correct: boolean }): GameState {
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
  }

  // Remove this card from pending cards
  const remainingCards = state.pendingPlay.cards.filter(c => c.id !== action.cardId);

  // Add to judged cards
  const judgedCards = [...state.pendingPlay.judgedCards, playedCard];

  // If all cards are judged, clear pendingPlay and return to 'playing'
  if (remainingCards.length === 0) {
    return {
      ...state,
      mainLine: updatedMainLine,
      pendingPlay: undefined,
      phase: 'playing',
    };
  }

  // Otherwise, update pendingPlay with remaining cards
  return {
    ...state,
    mainLine: updatedMainLine,
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
      return { ...p, isProphet: false };
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
function prophetVerify(state: GameState, action: { type: 'PROPHET_VERIFY'; prediction: boolean; dealerJudgment: boolean; cardId: string }): GameState {
  const predictionCorrect = action.prediction === action.dealerJudgment;

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
      return { ...p, isProphet: false, hand: restoredHand };
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
function resolveNoPlay(state: GameState, action: { type: 'RESOLVE_NO_PLAY'; valid: boolean }): GameState {
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

  if (action.valid) {
    // Valid no-play: player draws a card
    const { dealt, remaining } = dealCards(state.deck, 1);
    updatedPlayers = updatedPlayers.map(p => {
      if (p.id === declaration.playerId) {
        return { ...p, hand: [...p.hand, ...dealt] };
      }
      return p;
    });

    return {
      ...state,
      deck: remaining,
      players: updatedPlayers,
      phase: 'playing',
      noPlayDeclaration: undefined,
    };
  } else {
    // Invalid no-play: player receives penalty
    updatedPlayers = updatedPlayers.map(p => {
      if (p.id === declaration.playerId) {
        return { ...p, score: p.score - 5 };
      }
      return p;
    });

    return {
      ...state,
      players: updatedPlayers,
      phase: 'playing',
      noPlayDeclaration: undefined,
    };
  }
}

/**
 * Add sudden death marker to a player
 */
function addSuddenDeathMarker(state: GameState, action: { type: 'ADD_SUDDEN_DEATH_MARKER'; playerId: string }): GameState {
  const updatedPlayers = state.players.map(p => {
    if (p.id === action.playerId) {
      const newMarkers = p.suddenDeathMarkers + 1;
      return {
        ...p,
        suddenDeathMarkers: newMarkers,
        isExpelled: shouldBeExpelled({ ...p, suddenDeathMarkers: newMarkers }),
      };
    }
    return p;
  });

  return {
    ...state,
    players: updatedPlayers,
  };
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
  // Check for sudden death markers
  const currentPlayer = state.players[state.currentPlayerIndex];
  let updatedState = { ...state };

  if (shouldReceiveSuddenDeathMarker(currentPlayer)) {
    updatedState = addSuddenDeathMarker(updatedState, {
      type: 'ADD_SUDDEN_DEATH_MARKER',
      playerId: currentPlayer.id,
    });
  }

  // Find next non-expelled, non-dealer, non-prophet player
  let nextPlayerIndex = (updatedState.currentPlayerIndex + 1) % updatedState.players.length;
  let iterations = 0;
  while (
    iterations < updatedState.players.length &&
    (updatedState.players[nextPlayerIndex].isExpelled ||
      updatedState.players[nextPlayerIndex].isDealer ||
      updatedState.players[nextPlayerIndex].isProphet)
  ) {
    nextPlayerIndex = (nextPlayerIndex + 1) % updatedState.players.length;
    iterations++;
  }

  // Check if game should end
  if (shouldGameEnd(updatedState)) {
    return {
      ...updatedState,
      phase: 'game_over',
    };
  }

  return {
    ...updatedState,
    currentPlayerIndex: nextPlayerIndex,
    roundNumber: updatedState.roundNumber + 1,
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
    case 'SET_DEALER_RULE':
      return setDealerRule(state, action);
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
    case 'ADD_SUDDEN_DEATH_MARKER':
      return addSuddenDeathMarker(state, action);
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
