/**
 * Template-based rule selector component.
 *
 * Displays curated rule templates extracted from the RULE_BANK,
 * organized by difficulty. Provides an instant, offline alternative
 * to the AI-powered rule compiler backends.
 */

import React, { useState } from 'react';

export interface RuleTemplate {
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  functionBody: string;
}

// ────────────────────────────────────────────
// Templates extracted from src/engine/ai/rules.ts
// functionBody uses helpers.* prefix (sandboxed function signature)
// ────────────────────────────────────────────

export const RULE_TEMPLATES: RuleTemplate[] = [
  // ===== EASY =====
  {
    name: 'Alternating Colors',
    description: 'Alternate between red and black cards',
    difficulty: 'easy',
    functionBody: 'return helpers.getSuitColor(lastCard.suit) !== helpers.getSuitColor(newCard.suit);',
  },
  {
    name: 'Same Color',
    description: 'All cards must be the same color',
    difficulty: 'easy',
    functionBody: 'return helpers.getSuitColor(lastCard.suit) === helpers.getSuitColor(newCard.suit);',
  },
  {
    name: 'Same Suit',
    description: 'All cards must be the same suit',
    difficulty: 'easy',
    functionBody: 'return lastCard.suit === newCard.suit;',
  },
  {
    name: 'Only Even Ranks',
    description: 'Only even rank values allowed (2, 4, 6, 8, 10, Q)',
    difficulty: 'easy',
    functionBody: 'return helpers.isEvenRank(newCard.rank);',
  },
  {
    name: 'Only Odd Ranks',
    description: 'Only odd rank values allowed (A, 3, 5, 7, 9, J, K)',
    difficulty: 'easy',
    functionBody: 'return !helpers.isEvenRank(newCard.rank);',
  },
  {
    name: 'No Face Cards',
    description: 'Face cards (J, Q, K) are not allowed',
    difficulty: 'easy',
    functionBody: 'return !helpers.isFaceCard(newCard.rank);',
  },

  // ===== MEDIUM =====
  {
    name: 'Ascending Rank',
    description: 'Each card must have a higher rank than the last',
    difficulty: 'medium',
    functionBody: 'return helpers.getRankValue(newCard.rank) > helpers.getRankValue(lastCard.rank);',
  },
  {
    name: 'Adjacent Ranks',
    description: 'Rank must be within 1 of the previous card',
    difficulty: 'medium',
    functionBody: 'var diff = Math.abs(helpers.getRankValue(newCard.rank) - helpers.getRankValue(lastCard.rank));\nreturn diff === 1;',
  },
  {
    name: 'Alternating Even/Odd',
    description: 'Alternate between even and odd rank values',
    difficulty: 'medium',
    functionBody: 'return helpers.isEvenRank(lastCard.rank) !== helpers.isEvenRank(newCard.rank);',
  },
  {
    name: 'Different Suit',
    description: 'Suit must be different from the previous card',
    difficulty: 'medium',
    functionBody: 'return lastCard.suit !== newCard.suit;',
  },
  {
    name: 'Match Suit or Rank',
    description: 'Card must match either suit or rank of previous card',
    difficulty: 'medium',
    functionBody: 'return lastCard.suit === newCard.suit || lastCard.rank === newCard.rank;',
  },
  {
    name: 'Prime Ranks Only',
    description: 'Only prime number ranks (2, 3, 5, 7, J, K)',
    difficulty: 'medium',
    functionBody: 'var primes = [2, 3, 5, 7, 11, 13];\nreturn primes.includes(helpers.getRankValue(newCard.rank));',
  },

  // ===== HARD =====
  {
    name: 'Suit Rotation',
    description: 'Suits must rotate: hearts → diamonds → clubs → spades → hearts',
    difficulty: 'hard',
    functionBody: 'var next;\nif (lastCard.suit === "hearts") next = "diamonds";\nelse if (lastCard.suit === "diamonds") next = "clubs";\nelse if (lastCard.suit === "clubs") next = "spades";\nelse next = "hearts";\nreturn next === newCard.suit;',
  },
  {
    name: 'Same Parity, Different Color',
    description: 'Same even/odd parity but different color',
    difficulty: 'hard',
    functionBody: 'var sameParity = helpers.isEvenRank(lastCard.rank) === helpers.isEvenRank(newCard.rank);\nvar diffColor = helpers.getSuitColor(lastCard.suit) !== helpers.getSuitColor(newCard.suit);\nreturn sameParity && diffColor;',
  },
  {
    name: 'Rank Difference of 3',
    description: 'Absolute rank difference must equal 3',
    difficulty: 'hard',
    functionBody: 'var diff = Math.abs(helpers.getRankValue(newCard.rank) - helpers.getRankValue(lastCard.rank));\nreturn diff === 3;',
  },
  {
    name: 'Low Red, High Black',
    description: 'Red cards must be 7 or lower, black cards 8 or higher',
    difficulty: 'hard',
    functionBody: 'var value = helpers.getRankValue(newCard.rank);\nvar color = helpers.getSuitColor(newCard.suit);\nif (color === "red") return value <= 7;\nreturn value >= 8;',
  },
  {
    name: 'Sum Divisible by 5',
    description: 'Sum of both rank values must be divisible by 5',
    difficulty: 'hard',
    functionBody: 'var sum = helpers.getRankValue(lastCard.rank) + helpers.getRankValue(newCard.rank);\nreturn sum % 5 === 0;',
  },
  {
    name: 'Alternating High/Low',
    description: 'Alternate between high (8+) and low (≤7) ranks',
    difficulty: 'hard',
    functionBody: 'var lastHigh = helpers.getRankValue(lastCard.rank) >= 8;\nvar newHigh = helpers.getRankValue(newCard.rank) >= 8;\nreturn lastHigh !== newHigh;',
  },
];

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

interface RuleTemplateSelectorProps {
  onSelect: (template: RuleTemplate) => void;
  onBack: () => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#44cc44',
  medium: '#cccc00',
  hard: '#cc4444',
};

export const RuleTemplateSelector: React.FC<RuleTemplateSelectorProps> = ({ onSelect, onBack }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const groups: Array<{ label: string; difficulty: RuleTemplate['difficulty'] }> = [
    { label: 'EASY', difficulty: 'easy' },
    { label: 'MEDIUM', difficulty: 'medium' },
    { label: 'HARD', difficulty: 'hard' },
  ];

  return (
    <div>
      <div style={{ fontSize: '1.0rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>
        Pick a rule template
      </div>

      <div style={{ maxHeight: '400px', overflow: 'auto', marginBottom: '1rem' }}>
        {groups.map(({ label, difficulty }) => {
          const templates = RULE_TEMPLATES.filter(t => t.difficulty === difficulty);
          return (
            <div key={difficulty} style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: DIFFICULTY_COLORS[difficulty],
                  marginBottom: '0.5rem',
                  letterSpacing: '0.1em',
                }}
              >
                ── {label} ──
              </div>
              {templates.map(template => {
                const isSelected = selected === template.name;
                return (
                  <button
                    key={template.name}
                    onClick={() => {
                      setSelected(template.name);
                      onSelect(template);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      marginBottom: '0.4rem',
                      background: isSelected
                        ? 'rgba(138, 43, 226, 0.25)'
                        : 'rgba(255, 255, 255, 0.04)',
                      border: isSelected
                        ? '1px solid var(--accent-purple)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: 'Press Start 2P, cursive',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>
                      {template.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                      {template.description}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <button
        onClick={onBack}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '6px',
          color: 'var(--text-light)',
          fontSize: '0.9rem',
          cursor: 'pointer',
          fontFamily: 'Press Start 2P, cursive',
          transition: 'all 0.2s',
        }}
      >
        ← BACK
      </button>
    </div>
  );
};
