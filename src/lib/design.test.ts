import { describe, expect, it } from 'vitest';
import { designOf } from './design';

describe('designOf', () => {
  it('같은 씨앗이면 같은 설계', () => {
    expect(designOf(4821)).toEqual(designOf(4821));
  });
  it('값들이 정해진 범위 안, 띠 수 = 휘 겹 + 3', () => {
    for (let s = 0; s < 300; s++) {
      const d = designOf(s);
      expect([8, 10, 12, 16]).toContain(d.petals);
      expect([2, 3, 4]).toContain(d.hwiLayers);
      expect([4, 5, 6]).toContain(d.hwiCount);
      expect([3, 4]).toContain(d.steps);
      expect(d.bands).toHaveLength(d.hwiLayers + 3);
    }
  });
  it('이웃한 띠는 늘 다른 색 계열', () => {
    for (let s = 0; s < 300; s++) {
      const { bands } = designOf(s);
      for (let i = 1; i < bands.length; i++) expect(bands[i]).not.toBe(bands[i - 1]);
    }
  });
  it('씨앗이 다르면 설계가 다양하다', () => {
    const seen = new Set(Array.from({ length: 60 }, (_, s) => JSON.stringify({ ...designOf(s), seed: 0 })));
    expect(seen.size).toBeGreaterThan(50);
  });
});
