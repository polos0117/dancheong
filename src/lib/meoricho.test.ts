import { describe, expect, it } from 'vitest';
import { designOf, type Design } from './design';
import { BEAM_H, beamMeoricho, lotus, SQUARE, squareMeoricho } from './meoricho';
import { luminance, PALETTE } from './palette';
import { petalAngles, type Shape } from './shape';

const stacks = (shapes: Shape[]) => {
  const m = new Map<string, Shape[]>();
  for (const s of shapes) if (s.stack) m.set(s.stack, [...(m.get(s.stack) ?? []), s]);
  return m;
};
// 경로 글 속 숫자 — 좌표가 범위 안인지 보려고 (호의 반지름·플래그도 섞이지만 모두 범위 안이어야 한다)
const numbers = (shapes: Shape[]) => shapes.flatMap(s => (s.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number));
const dense: Design = { ...designOf(1), petals: 16, hwiLayers: 4, hwiCount: 6, steps: 4, bands: ['cheong', 'jeok', 'nok', 'hwang', 'ja', 'cheong', 'jeok'], banjuhwa: true, seongnyudong: true };

describe('petalAngles', () => {
  it('정한 수만큼, 같은 간격', () => {
    const a = petalAngles(12, 0, Math.PI * 2);
    expect(a).toHaveLength(12);
    for (let i = 1; i < a.length; i++) expect(a[i] - a[i - 1]).toBeCloseTo(Math.PI / 6, 9);
  });
});

describe('lotus', () => {
  it('바깥 꽃잎이 설계의 꽃잎 수만큼, 꽃잎마다 빛넣기 단계 수만큼 겹친다', () => {
    const d = designOf(4821);
    const shapes = lotus(100, 100, 40, d, 0, Math.PI * 2, 'juhwa', 'j');
    const outer = [...stacks(shapes).keys()].filter(k => k.startsWith('j:outer:'));
    expect(outer).toHaveLength(d.petals);
    for (const k of outer) expect(stacks(shapes).get(k)).toHaveLength(d.steps);
  });
  it('석류동은 설계에 있을 때만, 반주화엔 없다', () => {
    const on = { ...designOf(1), seongnyudong: true }, off = { ...on, seongnyudong: false };
    expect(lotus(0, 0, 40, on, 0, Math.PI * 2, 'juhwa', 'j').some(s => s.part === 'seongnyudong')).toBe(true);
    expect(lotus(0, 0, 40, off, 0, Math.PI * 2, 'juhwa', 'j').some(s => s.part === 'seongnyudong')).toBe(false);
    expect(lotus(0, 0, 12, on, 0, Math.PI, 'banjuhwa', 'b', 5).some(s => s.part === 'seongnyudong')).toBe(false);
  });
});

describe('머리초', () => {
  for (const [name, shapes] of [['보', beamMeoricho(dense).shapes], ['정사각', squareMeoricho(dense).shapes]] as const) {
    it(`${name}: 모든 빛넣기 겹이 어두운 → 밝은`, () => {
      for (const layers of stacks(shapes).values()) {
        for (let i = 1; i < layers.length; i++) expect(luminance(layers[i].fill)).toBeGreaterThan(luminance(layers[i - 1].fill));
      }
    });
    it(`${name}: 칠하고 긋는 색은 모두 팔레트 안`, () => {
      for (const s of shapes) {
        expect(PALETTE.has(s.fill)).toBe(true);
        if (s.stroke) expect(PALETTE.has(s.stroke)).toBe(true);
      }
    });
  }
  it('가장 빽빽한 설계도 보 높이·정사각형 안에 들어간다', () => {
    const beam = beamMeoricho(dense);
    expect(beam.width).toBeLessThanOrEqual(130);
    expect(Math.min(...numbers(beam.shapes))).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...numbers(beam.shapes))).toBeLessThanOrEqual(Math.max(beam.width, BEAM_H) + 1);
    const sq = numbers(squareMeoricho(dense).shapes);
    expect(Math.min(...sq)).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...sq)).toBeLessThanOrEqual(SQUARE + 1);
  });
  it('휘는 겹 수 × 세로 꽃잎 수 만큼', () => {
    const d = designOf(77);
    const hwi = [...stacks(beamMeoricho(d).shapes).keys()].filter(k => k.startsWith('hwi:'));
    expect(hwi).toHaveLength(d.hwiLayers * d.hwiCount);
  });
  it('이름표: 있는 부분만', () => {
    const parts = (d: Design) => beamMeoricho(d).labels.map(l => l.part);
    expect(parts({ ...dense, banjuhwa: false, seongnyudong: false })).toEqual(['meoricho', 'hwi', 'juhwa', 'tedu']);
    expect(parts(dense)).toEqual(['meoricho', 'hwi', 'juhwa', 'tedu', 'seongnyudong', 'banjuhwa']);
  });
});
