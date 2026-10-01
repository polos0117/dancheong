import type { Design } from './design';
import { lightSteps, PIGMENT } from './palette';
import { circlePath, num, rect, type Shape } from './shape';

// 금문: 비단 무늬처럼 되풀이되는 기하 문양. 고리금(맞물린 고리) · 삼각금 · 바자금(마름모 엮음).
// 영역을 4줄로 나누고, 칸마다 두 계열 색을 번갈아 쓴다.
export function geummun(d: Design, x: number, y: number, w: number, h: number): Shape[] {
  const part = 'geummun' as const;
  const rows = 4;
  const t = h / rows;
  const cols = Math.max(1, Math.round(w / t));
  const tw = w / cols;
  const a = lightSteps(d.bands[0], 3), b = lightSteps(d.bands[1], 3);
  const out: Shape[] = [rect(x, y, w, h, PIGMENT.noerok, part)];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = x + (c + 0.5) * tw, cy = y + (r + 0.5) * t;
      const [dark, mid, light] = (r + c) % 2 ? a : b;
      if (d.geummun === 'gori') {
        const rad = Math.min(tw, t) / 2;
        out.push({ d: circlePath(cx, cy, rad), fill: dark, stroke: PIGMENT.meok, sw: 0.3, part },
          { d: circlePath(cx, cy, rad * 0.66), fill: PIGMENT.noerok, part },
          { d: circlePath(cx, cy, rad * 0.22), fill: light, part });
      } else if (d.geummun === 'samgak') {
        const up = (r + c) % 2 === 0;
        const tri = (k: number) => {
          const hw = (tw / 2) * k, hh = (t / 2) * k;
          return up ? `M${num(cx - hw)} ${num(cy + hh)}L${num(cx)} ${num(cy - hh)}L${num(cx + hw)} ${num(cy + hh)}Z`
            : `M${num(cx - hw)} ${num(cy - hh)}L${num(cx)} ${num(cy + hh)}L${num(cx + hw)} ${num(cy - hh)}Z`;
        };
        out.push({ d: tri(1), fill: dark, stroke: PIGMENT.meok, sw: 0.3, part }, { d: tri(0.55), fill: mid, part }, { d: tri(0.2), fill: light, part });
      } else {
        const dia = (k: number) => `M${num(cx)} ${num(cy - (t / 2) * k)}L${num(cx + (tw / 2) * k)} ${num(cy)}L${num(cx)} ${num(cy + (t / 2) * k)}L${num(cx - (tw / 2) * k)} ${num(cy)}Z`;
        out.push({ d: dia(1), fill: mid, stroke: PIGMENT.meok, sw: 0.3, part }, { d: dia(0.5), fill: light, part }, { d: dia(0.18), fill: dark, part });
      }
    }
  }
  out.push(rect(x, y, w, 0.6, PIGMENT.meok, part), rect(x, y + h - 0.6, w, 0.6, PIGMENT.meok, part));
  return out;
}
