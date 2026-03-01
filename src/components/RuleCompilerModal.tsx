/**
 * Multi-step modal for compiling a human God's natural language rule
 * into a deterministic function via the Vite dev server.
 *
 * Steps: compiling → (ambiguity?) → confirmation → ready | error
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GlassPanel } from './GlassPanel';
import { RuleExampleCard } from './RuleExampleCard';
import { compileRule, testCompiledFunction } from '../services/ruleCompiler';
import type { CardExample, CompiledRule } from '../services/ruleCompiler';
import type { Card } from '../engine/types';

type Step = 'compiling' | 'ambiguity' | 'confirmation' | 'ready' | 'error';

interface RuleCompilerModalProps {
  ruleText: string;
  onCompiled: (fn: (lastCard: Card, newCard: Card) => boolean) => void;
  onSkip: () => void;
}

export const RuleCompilerModal: React.FC<RuleCompilerModalProps> = ({
  ruleText,
  onCompiled,
  onSkip,
}) => {
  const [step, setStep] = useState<Step>('compiling');
  const [errorMessage, setErrorMessage] = useState('');
  const [compiled, setCompiled] = useState<CompiledRule | null>(null);
  const [examples, setExamples] = useState<CardExample[]>([]);
  const [clarifications, setClarifications] = useState('');
  const [testResults, setTestResults] = useState<ReturnType<typeof testCompiledFunction> | null>(null);

  // Prevent double-invocation in React StrictMode dev
  const hasCompiled = useRef(false);

  const doCompile = useCallback(async (extraClarifications?: string) => {
    setStep('compiling');
    setErrorMessage('');

    try {
      const result = await compileRule(ruleText, extraClarifications);
      const testResult = testCompiledFunction(result.fn, result.examples);

      setCompiled(result);
      setExamples(result.examples);
      setTestResults(testResult);

      if (result.ambiguities.length > 0) {
        setStep('ambiguity');
      } else {
        setStep('confirmation');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setStep('error');
    }
  }, [ruleText]);

  useEffect(() => {
    if (hasCompiled.current) return;
    hasCompiled.current = true;
    void doCompile();
  }, [doCompile]);

  const handleAmbiguityContinue = () => {
    void doCompile(clarifications);
  };

  const handleOverrideExample = (index: number, newExpected: boolean) => {
    setExamples(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], expected: newExpected };
      return updated;
    });
  };

  const handleApprove = () => {
    if (!compiled) return;

    // If God overrode examples, re-check against overrides
    const overrideTest = testCompiledFunction(compiled.fn, examples);
    if (!overrideTest.passed) {
      // God found mismatches and overrode them — recompile with feedback
      const feedback = overrideTest.failures.map(f =>
        `The card pair (${f.lastCard.rank}${f.lastCard.suit} → ${f.newCard.rank}${f.newCard.suit}) should be ${f.expected ? 'VALID' : 'INVALID'} but the function returned ${f.actual ? 'valid' : 'invalid'}.`
      ).join('\n');
      void doCompile(`Please fix these mismatches:\n${feedback}\n\nOriginal clarifications:\n${clarifications}`);
      return;
    }

    setStep('ready');
    setTimeout(() => {
      onCompiled(compiled.fn);
    }, 800);
  };

  const handleRecompileWithFeedback = () => {
    if (!compiled) return;
    // Build feedback from current test results
    if (testResults && !testResults.passed) {
      const feedback = testResults.failures.map(f =>
        `The card pair (${f.lastCard.rank}${f.lastCard.suit} → ${f.newCard.rank}${f.newCard.suit}) should be ${f.expected ? 'VALID' : 'INVALID'}.`
      ).join('\n');
      void doCompile(`${clarifications}\n\nPlease fix:\n${feedback}`);
    } else {
      void doCompile(clarifications);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '2rem',
      }}
    >
      <GlassPanel
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '2rem',
          border: '2px solid var(--accent-purple)',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
            RULE COMPILER
          </div>
          <div style={{ fontSize: '0.45rem', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.5 }}>
            "{ruleText.slice(0, 120)}{ruleText.length > 120 ? '…' : ''}"
          </div>
        </div>

        {/* Step: Compiling */}
        {step === 'compiling' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>⚙</div>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-light)' }}>
              Analyzing your rule...
            </div>
            <div style={{ fontSize: '0.4rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
              Claude is generating a deterministic function
            </div>
          </div>
        )}

        {/* Step: Ambiguity */}
        {step === 'ambiguity' && compiled && (
          <div>
            <div style={{ fontSize: '0.55rem', color: '#ffcc00', marginBottom: '1rem' }}>
              ⚠ Clarification needed
            </div>
            <div style={{ fontSize: '0.4rem', color: 'var(--text-dim)', marginBottom: '1rem', lineHeight: 1.6 }}>
              The compiler has questions about your rule:
            </div>
            {compiled.ambiguities.map((q, i) => (
              <div
                key={i}
                style={{
                  padding: '0.75rem',
                  background: 'rgba(255, 200, 0, 0.08)',
                  border: '1px solid rgba(255, 200, 0, 0.3)',
                  borderRadius: '6px',
                  marginBottom: '0.5rem',
                  fontSize: '0.45rem',
                  color: 'var(--text-light)',
                  lineHeight: 1.5,
                }}
              >
                {i + 1}. {q}
              </div>
            ))}
            <textarea
              value={clarifications}
              onChange={(e) => setClarifications(e.target.value)}
              placeholder="Type your clarifications here..."
              style={{
                width: '100%',
                height: '80px',
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: 'var(--text-light)',
                fontSize: '0.45rem',
                fontFamily: 'Press Start 2P, cursive',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                onClick={handleAmbiguityContinue}
                style={btnStyle('var(--accent-purple)')}
              >
                RECOMPILE WITH ANSWERS
              </button>
              <button
                onClick={() => setStep('confirmation')}
                style={btnStyle('rgba(255,255,255,0.1)')}
              >
                SKIP, USE AS-IS
              </button>
            </div>
          </div>
        )}

        {/* Step: Confirmation */}
        {step === 'confirmation' && compiled && (
          <div>
            <div style={{ fontSize: '0.5rem', color: 'var(--accent-gold)', marginBottom: '0.75rem' }}>
              Review examples — verify the rule is correct
            </div>
            {testResults && !testResults.passed && (
              <div
                style={{
                  padding: '0.75rem',
                  background: 'rgba(255, 100, 0, 0.15)',
                  border: '1px solid rgba(255, 100, 0, 0.5)',
                  borderRadius: '6px',
                  fontSize: '0.4rem',
                  color: '#ff8844',
                  marginBottom: '1rem',
                  lineHeight: 1.5,
                }}
              >
                ⚠ {testResults.failures.length} example(s) don't match the compiled function.
                You can flip verdicts below, then approve to recompile.
              </div>
            )}

            <div style={{ maxHeight: '340px', overflow: 'auto', marginBottom: '1rem' }}>
              {examples.map((ex, i) => (
                <RuleExampleCard
                  key={i}
                  example={ex}
                  index={i}
                  actualResult={compiled.fn(ex.lastCard, ex.newCard)}
                  onOverride={handleOverrideExample}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={handleApprove} style={btnStyle('#00aa55')}>
                ✓ APPROVE &amp; START
              </button>
              <button onClick={handleRecompileWithFeedback} style={btnStyle('var(--accent-purple)')}>
                ↻ RECOMPILE
              </button>
              <button onClick={onSkip} style={btnStyle('rgba(255,255,255,0.1)')}>
                SKIP (MANUAL)
              </button>
            </div>
          </div>
        )}

        {/* Step: Ready */}
        {step === 'ready' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✓</div>
            <div style={{ fontSize: '0.6rem', color: '#00ff88' }}>Rule compiled!</div>
            <div style={{ fontSize: '0.4rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
              Starting game...
            </div>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div>
            <div style={{ fontSize: '0.55rem', color: '#ff4444', marginBottom: '1rem' }}>
              ✗ Compilation failed
            </div>
            <div
              style={{
                padding: '0.75rem',
                background: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid rgba(255, 0, 0, 0.3)',
                borderRadius: '6px',
                fontSize: '0.4rem',
                color: 'var(--text-dim)',
                fontFamily: 'monospace',
                lineHeight: 1.5,
                marginBottom: '1rem',
                wordBreak: 'break-all',
              }}
            >
              {errorMessage}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => void doCompile(clarifications)} style={btnStyle('var(--accent-purple)')}>
                RETRY
              </button>
              <button onClick={onSkip} style={btnStyle('rgba(255,255,255,0.1)')}>
                SKIP (JUDGE MANUALLY)
              </button>
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    flex: 1,
    padding: '0.75rem',
    background: bg,
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    color: 'var(--text-light)',
    fontSize: '0.45rem',
    cursor: 'pointer',
    fontFamily: 'Press Start 2P, cursive',
    transition: 'all 0.2s',
  };
}
