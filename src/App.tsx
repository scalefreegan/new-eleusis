import { useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { createBackgroundShader } from './shaders/background';
import { StartMenu } from './components/StartMenu';
import { GameScreen } from './components/GameScreen';
import { useGameStore } from './store/gameStore';
import type { PlayerConfig } from './engine/types';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shaderRef = useRef<ReturnType<typeof createBackgroundShader> | null>(null);
  const [shaderFailed, setShaderFailed] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
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
    let handle: { remove: () => void } | null = null;

    CapacitorApp.addListener('backButton', () => {
      if (gameStarted) {
        resetGame();
        setGameStarted(false);
      } else {
        CapacitorApp.exitApp().catch((err) => { console.warn('[App] exitApp failed:', err); });
      }
    })
      .then((h) => {
        if (cancelled) h.remove();
        else handle = h;
      })
      .catch((err) => { console.warn('[App] backButton listener failed:', err); });

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, [gameStarted, resetGame]);

  const handleStartGame = (configs: PlayerConfig[]) => {
    startNewGame(configs);
    setGameStarted(true);
  };

  const handleReturnToMenu = () => {
    resetGame();
    setGameStarted(false);
  };

  const handleContinueGame = () => {
    setGameStarted(true);
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
      {!gameStarted ? (
        <StartMenu onStartGame={handleStartGame} onContinueGame={handleContinueGame} />
      ) : (
        <GameScreen onReturnToMenu={handleReturnToMenu} />
      )}
    </div>
  );
}

export default App;
