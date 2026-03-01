import { describe, it, expect } from 'vitest';
import { createBackgroundShader } from '../../src/shaders/background';

describe('createBackgroundShader', () => {
  it('returns null when WebGL is unavailable', () => {
    const canvas = document.createElement('canvas');
    expect(createBackgroundShader(canvas)).toBeNull();
  });
});
