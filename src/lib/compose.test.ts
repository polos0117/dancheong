import { describe, expect, it } from 'vitest';
import { allShapes, compose, EXPORT_PX, SIZE } from './compose';
import { designOf } from './design';
import { geummun } from './geummun';
import { LABEL } from './labels';
import { PALETTE } from './palette';
import { svgOf } from './svg';
import { RATIOS, STYLES } from './url';

describe('compose', () => {
  const d = designOf(4821);

  it('보: 오른쪽 머리초는 왼쪽 도형을 거울로 뒤집어 쓴다 (정확한 대칭)', () => {
    const scene = compose(d, 'moro', 'beam');
    const [, left, right] = scene.groups;
    expect(right.shapes).toBe(left.shapes);
    expect(right.transform).toBe(`matrix(-1 0 0 1 ${SIZE.beam.w} 0)`);
    expect(left.transform).toBeUndefined();
  });

  it('금문은 금단청에만', () => {
    expect(allShapes(compose(d, 'moro', 'beam')).some(s => s.part === 'geummun')).toBe(false);
    expect(allShapes(compose(d, 'geum', 'beam')).some(s => s.part === 'geummun')).toBe(true);
  });

  it('모든 양식·비율: 크기, 팔레트 안의 색, 이름표는 그림 안·이름이 있는 부분', () => {
    for (const style of STYLES) for (const ratio of RATIOS) for (const seed of [0, 1, 4821, 99999]) {
      const scene = compose(designOf(seed), style, ratio);
      expect([scene.w, scene.h]).toEqual([SIZE[ratio].w, SIZE[ratio].h]);
      for (const s of allShapes(scene)) {
        expect(PALETTE.has(s.fill)).toBe(true);
        if (s.stroke) expect(PALETTE.has(s.stroke)).toBe(true);
      }
      for (const l of scene.labels) {
        expect(LABEL[l.part]).toBeDefined();
        expect(l.x).toBeGreaterThanOrEqual(0);
        expect(l.x).toBeLessThanOrEqual(scene.w);
        expect(l.y).toBeGreaterThanOrEqual(0);
        expect(l.y).toBeLessThanOrEqual(scene.h);
      }
    }
  });

  it('이름표는 가장자리에서 떨어져 있다 — 가운데 정렬한 이름표가 그림 밖으로 잘리지 않게', () => {
    for (const style of STYLES) for (const ratio of RATIOS) for (const seed of [0, 1, 4821, 99999]) {
      const scene = compose(designOf(seed), style, ratio);
      for (const l of scene.labels) {
        expect(l.x).toBeGreaterThanOrEqual(scene.w * 0.12 - 1e-9);
        expect(l.x).toBeLessThanOrEqual(scene.w * 0.88 + 1e-9);
        expect(l.y).toBeGreaterThanOrEqual(scene.h * 0.11 - 1e-9);
        expect(l.y).toBeLessThanOrEqual(scene.h * 0.89 + 1e-9);
      }
    }
  });

  it('내보내기 크기는 비율과 같은 모양', () => {
    for (const r of RATIOS) expect(EXPORT_PX[r].w / EXPORT_PX[r].h).toBeCloseTo(SIZE[r].w / SIZE[r].h, 2);
  });
});

describe('geummun', () => {
  it('세 가지 금문 모두 그려지고, 영역 바탕은 뇌록 한 장', () => {
    for (const g of ['gori', 'samgak', 'baja'] as const) {
      const shapes = geummun({ ...designOf(3), geummun: g }, 10, 10, 100, 40);
      expect(shapes.length).toBeGreaterThan(10);
      expect(shapes.every(s => s.part === 'geummun')).toBe(true);
    }
  });
});

describe('svgOf', () => {
  it('도형마다 path 하나, viewBox, 크기 지정', () => {
    const scene = compose(designOf(4821), 'geum', 'phone');
    const svg = svgOf(scene, { w: 1440, h: 2560 });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 320" width="1440" height="2560">')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    // 보의 거울 머리초처럼 같은 도형을 두 번 쓰는 장면도 있어, 그룹을 따라 센 수와 비교한다
    const count = (gs: typeof scene.groups): number => gs.reduce((n, g) => n + g.shapes.length + count(g.children ?? []), 0);
    expect(svg.match(/<path /g)).toHaveLength(count(scene.groups));
  });
  it('어떤 씨앗·비율에도 NaN·undefined 가 없다', () => {
    for (let seed = 0; seed < 200; seed++) for (const ratio of RATIOS) {
      const svg = svgOf(compose(designOf(seed), seed % 2 ? 'geum' : 'moro', ratio));
      expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
});
