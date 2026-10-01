import type { Design } from './design';
import { geummun } from './geummun';
import { BEAM_H, beamMeoricho, SQUARE, squareMeoricho } from './meoricho';
import { PIGMENT } from './palette';
import { rect, type Label, type Shape } from './shape';
import type { Ratio, Style } from './url';

// 비율·양식에 따라 전체 그림(장면)을 짠다.

export interface Group { transform?: string; shapes: Shape[]; children?: Group[] }
export interface Scene { w: number; h: number; groups: Group[]; labels: Label[] }

export const SIZE: Record<Ratio, { w: number; h: number }> = {
  beam: { w: 300, h: 100 }, square: { w: 200, h: 200 }, phone: { w: 180, h: 320 }, pc: { w: 320, h: 180 },
};
export const EXPORT_PX: Record<Ratio, { w: number; h: number }> = {
  beam: { w: 3000, h: 1000 }, square: { w: 2048, h: 2048 }, phone: { w: 1440, h: 2560 }, pc: { w: 2560, h: 1440 },
};

// 보 한 칸 (300×100): 계풍(+금문) · 왼쪽 머리초 · 거울 머리초 · 위아래 테두리
function beam(d: Design, style: Style): { groups: Group[]; labels: Label[] } {
  const W = SIZE.beam.w, H = BEAM_H;
  const m = beamMeoricho(d);
  const mid = W - 2 * m.width;
  const gyepung: Shape[] = [rect(m.width, 0, mid, H, PIGMENT.noerok, 'gyepung')];
  if (style === 'geum') gyepung.push(...geummun(d, m.width + 3, 14, mid - 6, H - 28));
  const edges: Shape[] = [
    rect(0, 0, W, 2, PIGMENT.seokganju, 'tedu'), rect(0, 2, W, 0.6, PIGMENT.meok, 'tedu'), rect(0, 2.6, W, 0.5, PIGMENT.baekbun, 'tedu'),
    rect(0, H - 2, W, 2, PIGMENT.seokganju, 'tedu'), rect(0, H - 2.6, W, 0.6, PIGMENT.meok, 'tedu'), rect(0, H - 3.1, W, 0.5, PIGMENT.baekbun, 'tedu'),
  ];
  const labels: Label[] = [...m.labels, { part: 'gyepung', x: W / 2, y: style === 'geum' ? 8 : H / 2 }];
  if (style === 'geum') labels.push({ part: 'geummun', x: W / 2, y: H / 2 });
  return {
    groups: [{ shapes: gyepung }, { shapes: m.shapes }, { transform: `matrix(-1 0 0 1 ${W} 0)`, shapes: m.shapes }, { shapes: edges }],
    labels,
  };
}

const moved = (labels: Label[], k: number, dx: number, dy: number) => labels.map(l => ({ ...l, x: l.x * k + dx, y: l.y * k + dy }));

// 이름표는 가운데 정렬로 그림 위에 얹힌다 — 가장자리 가까운 것은 안쪽으로 당겨 잘리지 않게
const inside = (scene: Scene): Scene => ({
  ...scene,
  labels: scene.labels.map(l => ({
    ...l,
    x: Math.min(scene.w * 0.88, Math.max(scene.w * 0.12, l.x)),
    y: Math.min(scene.h * 0.89, Math.max(scene.h * 0.11, l.y)),
  })),
});

export const compose = (d: Design, style: Style, ratio: Ratio): Scene => inside(layout(d, style, ratio));

function layout(d: Design, style: Style, ratio: Ratio): Scene {
  const { w, h } = SIZE[ratio];
  if (ratio === 'beam') return { w, h, ...beam(d, style) };
  if (ratio === 'square') return { w, h, groups: [{ shapes: squareMeoricho(d).shapes }], labels: squareMeoricho(d).labels };

  if (ratio === 'phone') {
    // 세로: 가운데 머리초 확대(폭에 맞춰 0.9배), 위아래 띠
    const k = w / SQUARE, top = (h - SQUARE * k) / 2;
    const sq = squareMeoricho(d);
    const band = (y: number, bh: number): Shape[] => style === 'geum'
      ? geummun(d, 0, y + 4, w, bh - 8)
      : [rect(0, y, w, bh, PIGMENT.noerok, 'gyepung'), rect(0, y + bh / 2 - 1, w, 2, PIGMENT.seokganju, 'tedu')];
    const labels = moved(sq.labels, k, 0, top);
    labels.push(style === 'geum' ? { part: 'geummun', x: w / 2, y: top / 2 } : { part: 'gyepung', x: w / 2, y: top / 2 });
    return {
      w, h, labels,
      groups: [
        { shapes: [rect(0, 0, w, h, PIGMENT.noerok, 'gyepung'), ...band(0, top), ...band(top + SQUARE * k, top)] },
        { transform: `matrix(${k} 0 0 ${k} 0 ${top})`, shapes: sq.shapes },
      ],
    };
  }

  // PC: 가운데 보 한 칸(폭에 맞춤), 위아래 뇌록 + 석간주 선
  const k = w / SIZE.beam.w, top = (h - BEAM_H * k) / 2;
  const b = beam(d, style);
  return {
    w, h,
    labels: moved(b.labels, k, 0, top),
    groups: [
      { shapes: [rect(0, 0, w, h, PIGMENT.noerok, 'gyepung'), rect(0, top - 4, w, 1.2, PIGMENT.seokganju, 'tedu'), rect(0, top + BEAM_H * k + 2.8, w, 1.2, PIGMENT.seokganju, 'tedu')] },
      { transform: `matrix(${k} 0 0 ${k} 0 ${top})`, shapes: [], children: b.groups },
    ],
  };
}

export function allShapes(scene: Scene): Shape[] {
  const walk = (gs: Group[]): Shape[] => gs.flatMap(g => [...g.shapes, ...walk(g.children ?? [])]);
  return walk(scene.groups);
}
