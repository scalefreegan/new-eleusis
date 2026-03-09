import { useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { createBackgroundShader } from './shaders/background';
import { StartMenu } from './components/StartMenu';
import { GameScreen } from './components/GameScreen';
import { GameErrorBoundary } from './components/GameErrorBoundary';
import { RuleCompilerModal } from './components/RuleCompilerModal';
import { useGameStore } from './store/gameStore';
import type { PlayerConfig, Card } from './engine/types';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shaderRef = useRef<ReturnType<typeof createBackgroundShader> | null>(null);
  const [shaderFailed, setShaderFailed] = useState(false);
  const [appState, setAppState] = useState<'menu' | 'compilingRule' | 'game'>('menu');
  const [pendingConfigs, setPendingConfigs] = useState<PlayerConfig[] | null>(null);
  const [pendingRuleText, setPendingRuleText] = useState('');
  const startNewGame = useGameStore((state) => state.startNewGame);
  const resetGame = useGameStore((state) => state.resetGame);

  useEffect(() => {
    if (canvasRef.current && !shaderRef.current) {
      const shader = createBackgroundShader(canvasRef.current);
      shaderRef.current = shader;
      if (!shader) setShaderFailed(true);
    }

    return () => {
      if (shaderRef.current) {
        shaderRef.current.destroy();
        shaderRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let handle: { remove: () => Promise<void> } | null = null;

    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (appState === 'game') {
        resetGame();
        setAppState('menu');
      } else if (!canGoBack) {
        CapacitorApp.exitApp().catch((err) => { console.warn('[App] exitApp failed:', err); });
      }
    })
      .then((h) => {
        if (cancelled) h.remove().catch((err) => { console.warn('[App] remove listener failed:', err); });
        else handle = h;
      })
      .catch((err) => { console.warn('[App] backButton listener failed:', err); });

    return () => {
      cancelled = true;
      handle?.remove().catch((err) => { console.warn('[App] remove listener failed:', err); });
    };
  }, [appState, resetGame]);

  const handleStartGame = (configs: PlayerConfig[], ruleText?: string) => {
    const humanGod = configs.find(c => c.isGod && c.type === 'human');
    const hasRule = ruleText && ruleText.trim().length > 0;

    if (humanGod && hasRule) {
      setPendingConfigs(configs);
      setPendingRuleText(ruleText.trim());
      setAppState('compilingRule');
    } else {
      startNewGame({ configs, ruleText });
      setAppState('game');
    }
  };

  const handleCompiled = (fn: (lastCard: Card, newCard: Card) => boolean, functionBody: string) => {
    if (pendingConfigs) {
      startNewGame({ configs: pendingConfigs, ruleText: pendingRuleText, ruleFunction: fn, functionBody });
    }
    setPendingConfigs(null);
    setPendingRuleText('');
    setAppState('game');
  };

  const handleSkipCompilation = () => {
    if (pendingConfigs) {
      startNewGame({ configs: pendingConfigs, ruleText: pendingRuleText });
    }
    setPendingConfigs(null);
    setPendingRuleText('');
    setAppState('game');
  };

  const handleReturnToMenu = () => {
    resetGame();
    setPendingConfigs(null);
    setPendingRuleText('');
    setAppState('menu');
  };

  const handleContinueGame = () => {
    setAppState('game');
  };

  return (
    <div style={{
      width: '100vw',
      height: '100dvh',
      position: 'relative',
      overflow: 'hidden',
      background: shaderFailed
        ? 'linear-gradient(to bottom, #1a0f2e, #2d1b4e, #1e3a5f)'
        : undefined,
    }}>
      {/* OGL Background Shader */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          display: shaderFailed ? 'none' : undefined,
        }}
      />

      {/* CRT Scanline Overlay */}
      <div className="crt-overlay" />

      {/* Main Content */}
      {appState === 'menu' && (
        <StartMenu onStartGame={handleStartGame} onContinueGame={handleContinueGame} />
      )}
      {appState === 'compilingRule' && pendingRuleText && (
        <RuleCompilerModal
          ruleText={pendingRuleText}
          onCompiled={handleCompiled}
          onSkip={handleSkipCompilation}
        />
      )}
      {appState === 'game' && (
        <GameErrorBoundary onReset={handleReturnToMenu}>
          <GameScreen onReturnToMenu={handleReturnToMenu} />
        </GameErrorBoundary>
      )}
    </div>
  );
}

export default App;
