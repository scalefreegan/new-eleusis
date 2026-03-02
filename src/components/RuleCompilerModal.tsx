/**
 * Multi-step modal for compiling a human God's natural language rule
 * into a deterministic function.
 *
 * Steps:
 *   backendSelect → (local: downloading →) compiling → (ambiguity?) → confirmation → ready | error
 *
 * Two backends:
 *   'local'  — Qwen2.5-Coder-1.5B-Instruct via Transformers.js WASM (works everywhere)
 *   'cloud'  — Claude CLI via Vite dev server (dev mode only)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GlassPanel } from './GlassPanel';
import { RuleExampleCard } from './RuleExampleCard';
import {
  compileRule,
  testCompiledFunction,
  getPreferredBackend,
  setPreferredBackend,
  isCloudCompilerAvailable,
} from '../services/ruleCompiler';
import { isWebGPUAvailable } from '../services/llmBackend';
import type { CardExample, CompiledRule, CompilerBackend } from '../services/ruleCompiler';
import type { DownloadProgress } from '../services/llmBackend';
import type { Card } from '../engine/types';

type Step = 'backendSelect' | 'downloading' | 'compiling' | 'ambiguity' | 'confirmation' | 'ready' | 'error';

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
  const [step, setStep] = useState<Step>('backendSelect');
  const [errorMessage, setErrorMessage] = useState('');
  const [compiled, setCompiled] = useState<CompiledRule | null>(null);
  const [examples, setExamples] = useState<CardExample[]>([]);
  const [clarifications, setClarifications] = useState('');
  const [testResults, setTestResults] = useState<ReturnType<typeof testCompiledFunction> | null>(null);
  const [backend, setBackend] = useState<CompilerBackend>(getPreferredBackend);
  const [cloudAvailable, setCloudAvailable] = useState<boolean | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [preferWebGPU, setPreferWebGPU] = useState(false);
  const hasStarted = useRef(false);

  // Probe cloud availability once on mount
  useEffect(() => {
    isCloudCompilerAvailable().then(setCloudAvailable);
  }, []);

  const handleProgress = useCallback((progress: DownloadProgress) => {
    setDownloadProgress(progress);
    // Switch from 'downloading' to 'compiling' once the model is ready or we start generating
    if (progress.status.toLowerCase().startsWith('generat')) {
      setStep('compiling');
    } else if (step !== 'compiling') {
      setStep('downloading');
    }
  }, [step]);

  const doCompile = useCallback(async (selectedBackend: CompilerBackend, extraClarifications?: string) => {
    setStep(selectedBackend === 'local' ? 'downloading' : 'compiling');
    setErrorMessage('');

    try {
      const result = await compileRule(ruleText, extraClarifications, {
        backend: selectedBackend,
        onProgress: selectedBackend === 'local' ? handleProgress : undefined,
        preferWebGPU,
      });
      const testResult = testCompiledFunction(result.fn, result.examples);

      setCompiled(result);
      setExamples(result.examples);
      setTestResults(testResult);

      setStep(result.ambiguities.length > 0 ? 'ambiguity' : 'confirmation');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setStep('error');
    }
  }, [ruleText, handleProgress, preferWebGPU]);

  const handleSelectBackend = (chosen: CompilerBackend) => {
    setBackend(chosen);
    setPreferredBackend(chosen);
    hasStarted.current = true;
    void doCompile(chosen);
  };

  const handleAmbiguityContinue = () => {
    void doCompile(backend, clarifications);
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

    const overrideTest = testCompiledFunction(compiled.fn, examples);
    if (!overrideTest.passed) {
      const feedback = overrideTest.failures.map(f =>
        `The card pair (${f.lastCard.rank}${f.lastCard.suit} → ${f.newCard.rank}${f.newCard.suit}) should be ${f.expected ? 'VALID' : 'INVALID'} but the function returned ${f.actual ? 'valid' : 'invalid'}.`
      ).join('\n');
      void doCompile(backend, `Please fix these mismatches:\n${feedback}\n\nOriginal clarifications:\n${clarifications}`);
      return;
    }

    setStep('ready');
    setTimeout(() => {
      onCompiled(compiled.fn);
    }, 800);
  };

  const handleRecompileWithFeedback = () => {
    if (!compiled) return;
    if (testResults && !testResults.passed) {
      const feedback = testResults.failures.map(f =>
        `The card pair (${f.lastCard.rank}${f.lastCard.suit} → ${f.newCard.rank}${f.newCard.suit}) should be ${f.expected ? 'VALID' : 'INVALID'}.`
      ).join('\n');
      void doCompile(backend, `${clarifications}\n\nPlease fix:\n${feedback}`);
    } else {
      void doCompile(backend, clarifications);
    }
  };

  const webGPUAvailable = isWebGPUAvailable();

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

        {/* Step: Backend selection */}
        {step === 'backendSelect' && (
          <div>
            <div style={{ fontSize: '0.5rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>
              Choose AI backend
            </div>

            {/* Local option */}
            <button
              onClick={() => handleSelectBackend('local')}
              style={{
                ...backendBtnStyle('#3b1a6b'),
                border: backend === 'local' ? '2px solid var(--accent-purple)' : '1px solid rgba(255,255,255,0.2)',
                width: '100%',
                marginBottom: '0.75rem',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '0.5rem', color: 'var(--text-light)', marginBottom: '0.4rem' }}>
                ⬡ Local AI (recommended)
              </div>
              <div style={{ fontSize: '0.35rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                Qwen2.5-Coder 1.5B · runs in browser · works offline &amp; on Android
                {webGPUAvailable && <span style={{ color: '#88ff88' }}> · WebGPU available (fast)</span>}
              </div>
              <div style={{ fontSize: '0.35rem', color: '#ffaa44', marginTop: '0.3rem' }}>
                ~900 MB download on first use (cached)
              </div>
            </button>

            {/* WebGPU toggle (only shown when local is selected and WebGPU available) */}
            {webGPUAvailable && (
              <div style={{ marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={preferWebGPU}
                    onChange={(e) => setPreferWebGPU(e.target.checked)}
                    style={{ accentColor: 'var(--accent-purple)' }}
                  />
                  <span style={{ fontSize: '0.35rem', color: 'var(--text-dim)' }}>
                    Use WebGPU acceleration (3–5× faster, desktop Chrome/Edge only)
                  </span>
                </label>
              </div>
            )}

            {/* Cloud option */}
            <button
              onClick={() => cloudAvailable ? handleSelectBackend('cloud') : undefined}
              disabled={cloudAvailable === false}
              style={{
                ...backendBtnStyle(cloudAvailable === false ? 'rgba(255,255,255,0.03)' : '#1a3b2a'),
                border: backend === 'cloud' ? '2px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.2)',
                width: '100%',
                marginBottom: '1rem',
                textAlign: 'left',
                opacity: cloudAvailable === false ? 0.5 : 1,
                cursor: cloudAvailable === false ? 'not-allowed' : 'pointer',
              }}
            >
              <div style={{ fontSize: '0.5rem', color: 'var(--text-light)', marginBottom: '0.4rem' }}>
                ☁ Cloud AI (Claude)
              </div>
              <div style={{ fontSize: '0.35rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                Highest quality · requires Claude CLI &amp; dev server · instant
                {cloudAvailable === false && (
                  <span style={{ color: '#ff6644' }}> · not available (run npm run dev)</span>
                )}
                {cloudAvailable === null && (
                  <span style={{ color: 'var(--text-dim)' }}> · checking…</span>
                )}
                {cloudAvailable === true && (
                  <span style={{ color: '#88ff88' }}> · available</span>
                )}
              </div>
            </button>

            <button onClick={onSkip} style={btnStyle('rgba(255,255,255,0.08)')}>
              SKIP (JUDGE MANUALLY)
            </button>
          </div>
        )}

        {/* Step: Downloading model */}
        {step === 'downloading' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>⬇</div>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>
              Loading AI model…
            </div>
            {downloadProgress && (
              <>
                <div style={{ fontSize: '0.35rem', color: 'var(--text-dim)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                  {downloadProgress.status}
                </div>
                {downloadProgress.progress >= 0 && (
                  <div
                    style={{
                      height: '6px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.round(downloadProgress.progress * 100)}%`,
                        background: 'var(--accent-purple)',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                )}
                {downloadProgress.total > 0 && (
                  <div style={{ fontSize: '0.35rem', color: 'var(--text-dim)' }}>
                    {(downloadProgress.loaded / 1_048_576).toFixed(0)} /&nbsp;
                    {(downloadProgress.total / 1_048_576).toFixed(0)} MB
                  </div>
                )}
              </>
            )}
            <div style={{ fontSize: '0.35rem', color: 'var(--text-dim)', marginTop: '1rem' }}>
              First-time download ~900 MB · cached for future sessions
            </div>
          </div>
        )}

        {/* Step: Compiling */}
        {step === 'compiling' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>⚙</div>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-light)' }}>
              Analyzing your rule…
            </div>
            <div style={{ fontSize: '0.4rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
              {backend === 'local' ? 'Local AI is generating a deterministic function' : 'Claude is generating a deterministic function'}
            </div>
            {downloadProgress && (
              <div style={{ fontSize: '0.35rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
                {downloadProgress.status}
              </div>
            )}
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
              <button onClick={handleAmbiguityContinue} style={btnStyle('var(--accent-purple)')}>
                RECOMPILE WITH ANSWERS
              </button>
              <button onClick={() => setStep('confirmation')} style={btnStyle('rgba(255,255,255,0.1)')}>
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
              Starting game…
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
              <button onClick={() => void doCompile(backend, clarifications)} style={btnStyle('var(--accent-purple)')}>
                RETRY
              </button>
              <button onClick={() => setStep('backendSelect')} style={btnStyle('rgba(100,100,255,0.2)')}>
                CHANGE BACKEND
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

function backendBtnStyle(bg: string): React.CSSProperties {
  return {
    padding: '1rem',
    background: bg,
    borderRadius: '6px',
    color: 'var(--text-light)',
    cursor: 'pointer',
    fontFamily: 'Press Start 2P, cursive',
    transition: 'all 0.2s',
  };
}
