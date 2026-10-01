import { describe, expect, it } from 'vitest';
import { lightSteps, luminance, PALETTE, PIGMENT, SERIES, SHADES } from './palette';

describe('palette', () => {
  it('빛넣기는 계열·단계 수와 상관없이 늘 어두운 → 밝은', () => {
    for (const s of SERIES) for (const steps of [2, 3, 4]) {
      const colors = lightSteps(s, steps);
      expect(colors).toHaveLength(steps);
      for (let i = 1; i < colors.length; i++) expect(luminance(colors[i])).toBeGreaterThan(luminance(colors[i - 1]));
    }
  });
  it('4단이면 마지막은 백분', () => {
    expect(lightSteps('cheong', 4).at(-1)).toBe(PIGMENT.baekbun);
  });
  it('PALETTE 는 안료와 모든 계열 색을 담는다', () => {
    for (const c of [...Object.values(PIGMENT), ...Object.values(SHADES).flat()]) expect(PALETTE.has(c)).toBe(true);
  });
  it('luminance: 검정 0, 흰색 1', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBeCloseTo(1, 9);
  });
});
