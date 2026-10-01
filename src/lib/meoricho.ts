import type { Design } from './design';
import { lightSteps, PIGMENT } from './palette';
import { circlePath, lightStack, petalAngles, petalPath, radialPetal, rect, type Label, type Part, type Shape } from './shape';

// 머리초: 보 끝에 그리는 주된 문양. 바깥(보 끝)부터 테두리 → 휘 → 주화(연꽃, 가운데 석류동).
// 보는 높이 100 의 좌표, 정사각 확대는 200×200.

export const BEAM_H = 100;
export const SQUARE = 200;
const TEDU = 3;      // 보 끝 석간주 테두리 폭
const HWI_W = 8;     // 휘 한 겹 폭
const R = 38;        // 보 머리초의 주화 반지름

// 연꽃(주화·반주화): from 부터 range 만큼에 꽃잎 두 겹(바깥·안쪽), 주화면 가운데 원과 석류동
export function lotus(cx: number, cy: number, r: number, d: Design, from: number, range: number,
  part: 'juhwa' | 'banjuhwa', id: string, petals = d.petals): Shape[] {
  const out: Shape[] = [];
  const full = range >= Math.PI * 2 - 1e-9;
  const half = (range / petals / 2) * 0.92;
  const outer = lightSteps(d.bands[d.hwiLayers], d.steps);
  const inner = lightSteps(d.bands[d.hwiLayers + 1], d.steps);
  if (full) out.push({ d: circlePath(cx, cy, r), fill: PIGMENT.noerok, stroke: PIGMENT.meok, sw: 0.6, part });
  petalAngles(petals, from, range).forEach((a, i) =>
    out.push(...lightStack(radialPetal(cx, cy, r * 0.3, r, a, half, d.petalShape), outer, part, `${id}:outer:${i}`)));
  // 안쪽 꽃잎: 온 꽃이면 바깥 꽃잎 사이사이로 반 칸 돌려서
  const shift = full ? range / petals / 2 : 0;
  petalAngles(petals, from + shift, range).forEach((a, i) =>
    out.push(...lightStack(radialPetal(cx, cy, r * 0.18, r * 0.62, a, half, d.petalShape), inner, part, `${id}:inner:${i}`)));
  if (part === 'juhwa') {
    const center = lightSteps(d.bands[d.hwiLayers + 2], d.steps);
    out.push(...lightStack(k => circlePath(cx, cy, r * 0.3 * k), center, part, `${id}:center`));
    if (d.seongnyudong) out.push(...seongnyudong(cx, cy, r, lightSteps(d.bands[d.hwiLayers + 2], 3)));
  }
  return out;
}

// 석류동: 가운데 석류 — 몸통, 꼭지(세 갈래), 씨앗 셋
function seongnyudong(cx: number, cy: number, r: number, [dark, mid, light]: string[]): Shape[] {
  const part: Part = 'seongnyudong';
  const s = r * 0.17;
  const crown = `M${cx - s * 0.7} ${cy - s * 0.55}L${cx - s * 0.35} ${cy - s * 1.45}L${cx} ${cy - s * 0.8}L${cx + s * 0.35} ${cy - s * 1.45}L${cx + s * 0.7} ${cy - s * 0.55}Z`;
  return [
    { d: crown, fill: mid, stroke: PIGMENT.meok, sw: 0.4, part },
    { d: circlePath(cx, cy + s * 0.15, s), fill: dark, stroke: PIGMENT.meok, sw: 0.5, part },
    ...[-0.4, 0, 0.4].map(dx => ({ d: circlePath(cx + dx * s, cy + s * 0.25, s * 0.17), fill: light, part })),
  ];
}

// 보 왼쪽 머리초. 오른쪽은 이걸 거울로 뒤집어 쓴다
export function beamMeoricho(d: Design): { width: number; shapes: Shape[]; labels: Label[] } {
  const H = BEAM_H;
  const hwiStart = TEDU + 1.4;
  const hwiEnd = hwiStart + d.hwiLayers * HWI_W;
  const cx = hwiEnd + 1.3 + 2 + R;
  const cy = H / 2;
  const xe = cx + R + 2;
  const width = xe + 4.2;
  const shapes: Shape[] = [
    rect(0, 0, width, H, PIGMENT.noerok, 'meoricho'),
    rect(0, 0, TEDU, H, PIGMENT.seokganju, 'tedu'),
    rect(TEDU, 0, 0.8, H, PIGMENT.meok, 'tedu'),
    rect(TEDU + 0.8, 0, 0.6, H, PIGMENT.baekbun, 'tedu'),
  ];
  // 휘: 세로로 늘어선 꽃잎 띠. 꽃잎 끝이 보 안쪽(주화 쪽)을 향한다
  const ph = H / d.hwiCount;
  const reach = HWI_W * (d.hwiShape === 'round' ? 1 : 0.5);
  for (let layer = 0; layer < d.hwiLayers; layer++) {
    const x0 = hwiStart + layer * HWI_W;
    for (let j = 0; j < d.hwiCount; j++) {
      const yT = j * ph, yB = yT + ph, yM = yT + ph / 2;
      const path = petalPath({ x: x0, y: yT }, { x: x0, y: yB }, { x: x0 + HWI_W, y: yM },
        { x: x0 + reach, y: yT }, { x: x0 + reach, y: yB }, { x: x0 + HWI_W * 0.3, y: yM });
      shapes.push(...lightStack(path, lightSteps(d.bands[layer], d.steps), 'hwi', `hwi:${layer}:${j}`));
    }
  }
  shapes.push(rect(hwiEnd, 0, 0.8, H, PIGMENT.meok, 'tedu'), rect(hwiEnd + 0.8, 0, 0.5, H, PIGMENT.baekbun, 'tedu'));
  if (d.banjuhwa) {
    shapes.push(...lotus(cx, 0, 12, d, 0, Math.PI, 'banjuhwa', 'ban:top', 5));
    shapes.push(...lotus(cx, H, 12, d, Math.PI, Math.PI, 'banjuhwa', 'ban:bottom', 5));
  }
  shapes.push(...lotus(cx, cy, R, d, 0, Math.PI * 2, 'juhwa', 'juhwa'));
  shapes.push(rect(xe, 0, 0.5, H, PIGMENT.baekbun, 'tedu'), rect(xe + 0.5, 0, 0.8, H, PIGMENT.meok, 'tedu'),
    rect(xe + 1.3, 0, 2.9, H, PIGMENT.seokganju, 'tedu'));

  const labels: Label[] = [
    { part: 'meoricho', x: width / 2, y: H - 6 },
    { part: 'hwi', x: hwiStart + HWI_W / 2, y: cy },
    { part: 'juhwa', x: cx, y: cy - R * 0.7 },
    { part: 'tedu', x: xe + 2, y: cy + R * 0.6 },
  ];
  if (d.seongnyudong) labels.push({ part: 'seongnyudong', x: cx, y: cy });
  if (d.banjuhwa) labels.push({ part: 'banjuhwa', x: cx, y: 6 });
  return { width, shapes, labels };
}

// 머리초 확대: 가운데 주화, 바깥으로 둥글게 휘를 두르고, 네 귀퉁이에 반주화
export function squareMeoricho(d: Design): { shapes: Shape[]; labels: Label[] } {
  const S = SQUARE, c = S / 2, rj = 40, frame = 6;
  const shapes: Shape[] = [rect(0, 0, S, S, PIGMENT.noerok, 'meoricho')];
  const border = (t0: number, t: number, fill: string) => [
    rect(t0, t0, S - 2 * t0, t, fill, 'tedu'), rect(t0, S - t0 - t, S - 2 * t0, t, fill, 'tedu'),
    rect(t0, t0, t, S - 2 * t0, fill, 'tedu'), rect(S - t0 - t, t0, t, S - 2 * t0, fill, 'tedu'),
  ];
  shapes.push(...border(0, frame, PIGMENT.seokganju), ...border(frame, 0.8, PIGMENT.meok), ...border(frame + 0.8, 0.6, PIGMENT.baekbun));
  if (d.banjuhwa) {
    const k = frame + 1.4;
    ([[k, k, 0], [S - k, k, 0.5], [S - k, S - k, 1], [k, S - k, 1.5]] as const).forEach(([x, y, q], i) =>
      shapes.push(...lotus(x, y, 26, d, q * Math.PI, Math.PI / 2, 'banjuhwa', `ban:${i}`, 4)));
  }
  for (let layer = 0; layer < d.hwiLayers; layer++) {
    const ra = rj + 3 + layer * 11;
    const count = d.petals * 2;
    const half = (Math.PI / count) * 0.92;
    petalAngles(count, (layer % 2) * (Math.PI / count), Math.PI * 2).forEach((a, i) =>
      shapes.push(...lightStack(radialPetal(c, c, ra, ra + 10, a, half, d.hwiShape), lightSteps(d.bands[layer], d.steps), 'hwi', `hwi:${layer}:${i}`)));
  }
  shapes.push(...lotus(c, c, rj, d, 0, Math.PI * 2, 'juhwa', 'juhwa'));
  const labels: Label[] = [
    { part: 'meoricho', x: c, y: S - 14 },
    { part: 'hwi', x: c + rj + 3 + 5, y: c },
    { part: 'juhwa', x: c, y: c - rj * 0.7 },
    { part: 'tedu', x: frame / 2 + 1, y: c },
  ];
  if (d.seongnyudong) labels.push({ part: 'seongnyudong', x: c, y: c });
  if (d.banjuhwa) labels.push({ part: 'banjuhwa', x: 18, y: 18 });
  return { shapes, labels };
}
