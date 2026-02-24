import { useEffect, useRef, useState } from 'react';
import { createBackgroundShader } from './shaders/background';
import { StartMenu } from './components/StartMenu';
import { GameScreen } from './components/GameScreen';
import { useGameStore } from './store/gameStore';
import type { PlayerConfig } from './engine/types';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shaderRef = useRef<ReturnType<typeof createBackgroundShader> | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const startNewGame = useGameStore((state) => state.startNewGame);
  const resetGame = useGameStore((state) => state.resetGame);

  useEffect(() => {
    if (canvasRef.current && !shaderRef.current) {
      shaderRef.current = createBackgroundShader(canvasRef.current);
    }

    return () => {
      if (shaderRef.current) {
        shaderRef.current.destroy();
        shaderRef.current = null;
      }
    };
  }, []);

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
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
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
