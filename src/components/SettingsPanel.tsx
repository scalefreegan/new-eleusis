/**
 * SettingsPanel - User preferences with localStorage persistence
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GlassPanel } from './GlassPanel';
import { sounds } from '../audio/sounds';

interface SettingsConfig {
  soundVolume: number;
  soundEnabled: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  autoCollapseHand: boolean;
}

const DEFAULT_SETTINGS: SettingsConfig = {
  soundVolume: 0.3,
  soundEnabled: true,
  animationSpeed: 'normal',
  autoCollapseHand: false,
};

const SETTINGS_KEY = 'eleusis-settings';

function loadSettings(): SettingsConfig {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: SettingsConfig) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<SettingsConfig>(loadSettings());

  useEffect(() => {
    // Apply settings on mount and whenever they change
    sounds.setVolume(settings.soundVolume);
    sounds.setEnabled(settings.soundEnabled);
    saveSettings(settings);
  }, [settings]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    setSettings({ ...settings, soundVolume: volume });
  };

  const handleSoundToggle = () => {
    setSettings({ ...settings, soundEnabled: !settings.soundEnabled });
  };

  const handleAnimationSpeedChange = (speed: 'slow' | 'normal' | 'fast') => {
    setSettings({ ...settings, animationSpeed: speed });
  };

  const handleAutoCollapseToggle = () => {
    setSettings({ ...settings, autoCollapseHand: !settings.autoCollapseHand });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 2000,
        padding: '2rem',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px', width: '100%' }}
      >
        <GlassPanel style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1
              style={{
                fontSize: '1.5rem',
                color: 'var(--accent-gold)',
                textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
              }}
            >
              SETTINGS
            </h1>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'var(--text-light)',
                fontSize: '1rem',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                fontFamily: 'Press Start 2P, cursive',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: '0.65rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Sound Settings */}
            <section>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                🔊 SOUND
              </h2>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={handleSoundToggle}
                    style={{ cursor: 'pointer', width: '20px', height: '20px' }}
                  />
                  <span style={{ color: 'var(--text-light)' }}>Enable Sound Effects</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-dim)' }}>
                  Volume: {Math.round(settings.soundVolume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.soundVolume}
                  onChange={handleVolumeChange}
                  disabled={!settings.soundEnabled}
                  style={{
                    width: '100%',
                    cursor: settings.soundEnabled ? 'pointer' : 'not-allowed',
                    opacity: settings.soundEnabled ? 1 : 0.5,
                  }}
                />
              </div>
            </section>

            {/* Animation Speed */}
            <section>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ⚡ ANIMATION SPEED
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['slow', 'normal', 'fast'] as const).map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleAnimationSpeedChange(speed)}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: settings.animationSpeed === speed
                        ? 'var(--accent-purple)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: settings.animationSpeed === speed
                        ? '2px solid var(--accent-gold)'
                        : '2px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'var(--text-light)',
                      fontSize: '0.6rem',
                      cursor: 'pointer',
                      fontFamily: 'Press Start 2P, cursive',
                      transition: 'all 0.2s',
                      textTransform: 'uppercase',
                    }}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </section>

            {/* Hand Settings */}
            <section>
              <h2 style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                🎴 HAND
              </h2>
              <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.autoCollapseHand}
                  onChange={handleAutoCollapseToggle}
                  style={{ cursor: 'pointer', width: '20px', height: '20px' }}
                />
                <span style={{ color: 'var(--text-light)' }}>Auto-collapse hand when not your turn</span>
              </label>
            </section>
          </div>

          <button
            onClick={onClose}
            style={{
              marginTop: '2rem',
              width: '100%',
              padding: '1rem',
              background: 'var(--accent-purple)',
              border: '2px solid var(--accent-gold)',
              borderRadius: '8px',
              color: 'var(--text-light)',
              fontSize: '0.65rem',
              cursor: 'pointer',
              fontFamily: 'Press Start 2P, cursive',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-gold)';
              e.currentTarget.style.color = 'var(--bg-deep)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent-purple)';
              e.currentTarget.style.color = 'var(--text-light)';
            }}
          >
            SAVE & CLOSE
          </button>
        </GlassPanel>
      </motion.div>
    </motion.div>
  );
}

// Export helper to get current settings
export function getSettings(): SettingsConfig {
  return loadSettings();
}
