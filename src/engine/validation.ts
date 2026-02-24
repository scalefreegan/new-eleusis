/**
 * Turn validation logic for New Eleusis
 */

import type { GameState, Player } from './types';

/**
 * Check if a player can play a card
 */
export function canPlayCard(state: GameState, playerId: string): boolean {
  // Game must be in playing phase
  if (state.phase !== 'playing') {
    return false;
  }

  // Must be the current player's turn
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return false;
  }

  // Player must not be expelled
  if (currentPlayer.isExpelled) {
    return false;
  }

  // Player must have cards in hand
  if (currentPlayer.hand.length === 0) {
    return false;
  }

  // Player cannot be the dealer
  if (currentPlayer.isGod) {
    return false;
  }

  return true;
}

/**
 * Check if a player can declare themselves as Prophet
 */
export function canDeclareProphet(state: GameState, playerId: string): boolean {
  // Game must be in playing phase
  if (state.phase !== 'playing') {
    return false;
  }

  const player = state.players.find(p => p.id === playerId);
  if (!player) {
    return false;
  }

  // Player must not already be a prophet
  if (player.isProphet) {
    return false;
  }

  // Player must not be expelled
  if (player.isExpelled) {
    return false;
  }

  // Player cannot be the dealer
  if (player.isGod) {
    return false;
  }

  // Main line must have at least one card
  if (state.mainLine.length === 0) {
    return false;
  }

  return true;
}

/**
 * Check if a player can declare "No Play"
 */
export function canDeclareNoPlay(state: GameState, playerId: string): boolean {
  // Must be able to play a card (i.e., it's their turn)
  if (!canPlayCard(state, playerId)) {
    return false;
  }

  // Player must have at least one card in hand
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.hand.length === 0) {
    return false;
  }

  return true;
}

/**
 * Validate a card play attempt
 */
export function validatePlay(
  state: GameState,
  cardIds: string[]
): { valid: boolean; reason?: string } {
  const currentPlayer = state.players[state.currentPlayerIndex];

  // Check if player can play
  if (!canPlayCard(state, currentPlayer.id)) {
    return { valid: false, reason: 'Cannot play card at this time' };
  }

  // Check card count (1-4 cards allowed)
  if (cardIds.length === 0 || cardIds.length > 4) {
    return { valid: false, reason: 'Must play 1-4 cards' };
  }

  // Check if player has all the cards
  const playerCardIds = new Set(currentPlayer.hand.map(c => c.id));
  for (const cardId of cardIds) {
    if (!playerCardIds.has(cardId)) {
      return { valid: false, reason: 'Player does not have this card' };
    }
  }

  // Check for duplicate cards in play
  if (new Set(cardIds).size !== cardIds.length) {
    return { valid: false, reason: 'Cannot play duplicate cards' };
  }

  return { valid: true };
}

/**
 * Check if a player should receive a sudden death marker
 */
export function shouldReceiveSuddenDeathMarker(player: Player, handThreshold: number = 25): boolean {
  return player.hand.length >= handThreshold && !player.isExpelled;
}

/**
 * Check if a player should be expelled
 */
export function shouldBeExpelled(player: Player): boolean {
  return player.suddenDeathMarkers >= 3;
}

/**
 * Check if game should end
 */
export function shouldGameEnd(state: GameState): boolean {
  // Deck is empty
  if (state.deck.length === 0) {
    return true;
  }

  // All non-dealer players are expelled
  const activePlayers = state.players.filter(p => !p.isGod && !p.isExpelled);
  if (activePlayers.length === 0) {
    return true;
  }

  // Prophet has been correct 3 times in a row (dealer overthrown)
  if (state.prophetsCorrectCount >= 3) {
    return true;
  }

  return false;
}

/**
 * Check if a player can dispute a no-play declaration
 */
export function canDisputeNoPlay(state: GameState, playerId: string): boolean {
  // Must be in no_play_dispute phase
  if (state.phase !== 'no_play_dispute') {
    return false;
  }

  // Cannot dispute your own no-play
  if (state.noPlayDeclaration?.playerId === playerId) {
    return false;
  }

  const player = state.players.find(p => p.id === playerId);
  if (!player) {
    return false;
  }

  // Cannot dispute if expelled
  if (player.isExpelled) {
    return false;
  }

  // Cannot dispute if dealer
  if (player.isGod) {
    return false;
  }

  return true;
}

/**
 * Check if a prophet can make a prediction
 */
export function canProphetPredict(state: GameState, playerId: string): boolean {
  // Must be in playing phase
  if (state.phase !== 'playing') {
    return false;
  }

  const player = state.players.find(p => p.id === playerId);
  if (!player) {
    return false;
  }

  // Must be a prophet
  if (!player.isProphet) {
    return false;
  }

  // Must not be expelled
  if (player.isExpelled) {
    return false;
  }

  // Must not be the current player (can't predict own plays)
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id === playerId) {
    return false;
  }

  return true;
}

/**
 * Check if a player is expelled
 */
export function isPlayerExpelled(state: GameState, playerId: string): boolean {
  const player = state.players.find(p => p.id === playerId);
  return player?.isExpelled ?? false;
}

/**
 * Check if a player can resign as prophet
 */
export function canResignProphet(state: GameState, playerId: string): boolean {
  const player = state.players.find(p => p.id === playerId);
  if (!player) {
    return false;
  }

  // Must be a prophet
  if (!player.isProphet) {
    return false;
  }

  // Must not be expelled
  if (player.isExpelled) {
    return false;
  }

  return true;
}
