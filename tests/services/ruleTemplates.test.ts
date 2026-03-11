import { describe, it, expect } from 'vitest';
import { RULE_TEMPLATES } from '../../src/components/RuleTemplateSelector';
import { validateFunctionBody, createSandboxedFunction, stressTestFunction } from '../../src/services/ruleCompiler';
import type { Card } from '../../src/engine/types';

function card(rank: string, suit: string): Card {
  return { rank, suit, id: `${rank}-${suit}` };
}

describe('RULE_TEMPLATES', () => {
  it('has 18 templates', () => {
    expect(RULE_TEMPLATES.length).toBe(18);
  });

  it.each(RULE_TEMPLATES.map(t => [t.name, t]))('%s passes validation and stress test', (_name, template) => {
    const validation = validateFunctionBody(template.functionBody);
    expect(validation.valid, `validation error: ${validation.error}`).toBe(true);

    const fn = createSandboxedFunction(template.functionBody);
    expect(stressTestFunction(fn), 'stress test failed').toBe(true);
  });
});

describe('RULE_TEMPLATES behavioral correctness', () => {
  function getTemplate(name: string) {
    const t = RULE_TEMPLATES.find(t => t.name === name);
    if (!t) throw new Error(`Template "${name}" not found`);
    return createSandboxedFunction(t.functionBody);
  }

  it('Alternating Colors: red→black=true, red→red=false', () => {
    const fn = getTemplate('Alternating Colors');
    expect(fn(card('A', 'hearts'), card('2', 'spades'))).toBe(true);
    expect(fn(card('A', 'hearts'), card('2', 'diamonds'))).toBe(false);
  });

  it('Same Color: red→red=true, red→black=false', () => {
    const fn = getTemplate('Same Color');
    expect(fn(card('A', 'hearts'), card('2', 'diamonds'))).toBe(true);
    expect(fn(card('A', 'hearts'), card('2', 'clubs'))).toBe(false);
  });

  it('Same Suit: hearts→hearts=true, hearts→spades=false', () => {
    const fn = getTemplate('Same Suit');
    expect(fn(card('A', 'hearts'), card('2', 'hearts'))).toBe(true);
    expect(fn(card('A', 'hearts'), card('2', 'spades'))).toBe(false);
  });

  it('Ascending Rank: 5→7=true, 5→5=false, 5→3=false', () => {
    const fn = getTemplate('Ascending Rank');
    expect(fn(card('5', 'hearts'), card('7', 'clubs'))).toBe(true);
    expect(fn(card('5', 'hearts'), card('5', 'clubs'))).toBe(false);
    expect(fn(card('5', 'hearts'), card('3', 'clubs'))).toBe(false);
  });

  it('Adjacent Ranks: 5→6=true, 5→4=true, 5→7=false', () => {
    const fn = getTemplate('Adjacent Ranks');
    expect(fn(card('5', 'hearts'), card('6', 'clubs'))).toBe(true);
    expect(fn(card('5', 'hearts'), card('4', 'clubs'))).toBe(true);
    expect(fn(card('5', 'hearts'), card('7', 'clubs'))).toBe(false);
  });

  it('Prime Ranks Only: J(11)=true, K(13)=true, Q(12)=false', () => {
    const fn = getTemplate('Prime Ranks Only');
    expect(fn(card('A', 'hearts'), card('J', 'clubs'))).toBe(true);
    expect(fn(card('A', 'hearts'), card('K', 'clubs'))).toBe(true);
    expect(fn(card('A', 'hearts'), card('Q', 'clubs'))).toBe(false);
  });

  it('Suit Rotation: hearts→diamonds=true, hearts→clubs=false', () => {
    const fn = getTemplate('Suit Rotation');
    expect(fn(card('A', 'hearts'), card('2', 'diamonds'))).toBe(true);
    expect(fn(card('A', 'hearts'), card('2', 'clubs'))).toBe(false);
    expect(fn(card('A', 'spades'), card('2', 'hearts'))).toBe(true);
  });

  it('Only Even Ranks: 2=true, 4=true, Q(12)=true, 3=false, K(13)=false', () => {
    const fn = getTemplate('Only Even Ranks');
    expect(fn(card('A', 'hearts'), card('2', 'clubs'))).toBe(true);
    expect(fn(card('A', 'hearts'), card('Q', 'clubs'))).toBe(true);
    expect(fn(card('A', 'hearts'), card('3', 'clubs'))).toBe(false);
    expect(fn(card('A', 'hearts'), card('K', 'clubs'))).toBe(false);
  });

  it('Sum Divisible by 5: A(1)+4=5=true, A(1)+3=4=false', () => {
    const fn = getTemplate('Sum Divisible by 5');
    expect(fn(card('A', 'hearts'), card('4', 'clubs'))).toBe(true);
    expect(fn(card('A', 'hearts'), card('3', 'clubs'))).toBe(false);
  });
});
