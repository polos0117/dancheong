import type { Group, Scene } from './compose';
import type { Shape } from './shape';

// 장면 → SVG 글. 화면에 보여 주는 것과 저장하는 것이 같은 글이다.
const shapeSvg = (s: Shape) =>
  `<path d="${s.d}" fill="${s.fill}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.sw}"` : ''}/>`;
const groupSvg = (g: Group): string =>
  `<g${g.transform ? ` transform="${g.transform}"` : ''}>${g.shapes.map(shapeSvg).join('')}${(g.children ?? []).map(groupSvg).join('')}</g>`;

export function svgOf(scene: Scene, size?: { w: number; h: number }): string {
  const attrs = size ? ` width="${size.w}" height="${size.h}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.w} ${scene.h}"${attrs}>${scene.groups.map(groupSvg).join('')}</svg>`;
}
