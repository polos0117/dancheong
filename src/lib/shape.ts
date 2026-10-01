import { PIGMENT } from './palette';

// 장면을 이루는 도형(모두 SVG path)과 도우미. part 는 이름표·테스트용 부분 이름, stack 은 한 빛넣기 묶음.

export type Part = 'meoricho' | 'tedu' | 'hwi' | 'juhwa' | 'seongnyudong' | 'banjuhwa' | 'gyepung' | 'geummun';
export interface Shape { d: string; fill: string; stroke?: string; sw?: number; part: Part; stack?: string }
export interface Label { part: Part; x: number; y: number }
type Pt = { x: number; y: number };

export const num = (v: number) => Math.round(v * 100) / 100;

export const rect = (x: number, y: number, w: number, h: number, fill: string, part: Part): Shape =>
  ({ d: `M${num(x)} ${num(y)}H${num(x + w)}V${num(y + h)}H${num(x)}Z`, fill, part }); // 절대 좌표만 — 범위 검사가 쉽게

export const circlePath = (cx: number, cy: number, r: number) =>
  `M${num(cx - r)} ${num(cy)}A${num(r)} ${num(r)} 0 1 0 ${num(cx + r)} ${num(cy)}A${num(r)} ${num(r)} 0 1 0 ${num(cx - r)} ${num(cy)}Z`;

// 꽃잎 하나: 밑동 두 점(bl, br) → 끝(tip), 곡선 조절점 cl·cr. k 배만큼 anchor 쪽으로 줄인 모양을 돌려준다
export function petalPath(bl: Pt, br: Pt, tip: Pt, cl: Pt, cr: Pt, anchor: Pt): (k: number) => string {
  return (k) => {
    const p = (q: Pt) => `${num(anchor.x + (q.x - anchor.x) * k)} ${num(anchor.y + (q.y - anchor.y) * k)}`;
    return `M${p(bl)}Q${p(cl)} ${p(tip)}Q${p(cr)} ${p(br)}Z`;
  };
}

// 가운데 (cx, cy) 에서 바깥으로 뻗은 꽃잎: 반지름 r0(밑동) ~ r1(끝), 방향 angle, 반폭 halfWidth(라디안)
export function radialPetal(cx: number, cy: number, r0: number, r1: number, angle: number, halfWidth: number, form: 'round' | 'pointed') {
  const at = (r: number, t: number) => ({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
  const reach = r0 + (r1 - r0) * (form === 'round' ? 1 : 0.55);
  return petalPath(at(r0, angle - halfWidth), at(r0, angle + halfWidth), at(r1, angle),
    at(reach, angle - halfWidth * 1.15), at(reach, angle + halfWidth * 1.15), at(r0 + (r1 - r0) * 0.35, angle));
}

// 빛넣기: 같은 모양을 줄여 가며 어두운 → 밝은 색으로 겹친다. 맨 바깥은 먹선, 둘째 겹은 분선(흰 선)
export function lightStack(path: (k: number) => string, colors: string[], part: Part, stack: string): Shape[] {
  return colors.map((fill, i) => {
    const s: Shape = { d: path(1 - (i / colors.length) * 0.8), fill, part, stack };
    if (i === 0) { s.stroke = PIGMENT.meok; s.sw = 0.6; }
    else if (i === 1) { s.stroke = PIGMENT.baekbun; s.sw = 0.35; }
    return s;
  });
}

// from 부터 range 만큼을 count 칸으로 나눈 칸 가운데 각도들
export const petalAngles = (count: number, from: number, range: number) =>
  Array.from({ length: count }, (_, i) => from + ((i + 0.5) * range) / count);
