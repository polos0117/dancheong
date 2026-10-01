// 단청 안료. 이름은 전통 안료, 색값은 화면에서 조화와 대비를 보고 고른 근사치다.

export type Series = 'cheong' | 'nok' | 'jeok' | 'hwang' | 'ja';
export const SERIES: readonly Series[] = ['cheong', 'nok', 'jeok', 'hwang', 'ja'];

export const PIGMENT = {
  noerok: '#4f7f6a',     // 뇌록 — 바탕
  seokganju: '#7e2f22',  // 석간주 — 테두리
  meok: '#1d1a17',       // 먹 — 검은 선
  baekbun: '#f4eee0',    // 백분 — 흰 선, 가장 밝은 빛
} as const;

// 계열마다 어두운 → 밝은 세 단계
export const SHADES: Record<Series, readonly [string, string, string]> = {
  cheong: ['#1f3d7a', '#3f67b0', '#8fb0e0'], // 삼청 쪽
  nok: ['#24683c', '#47975f', '#9ccfa6'],    // 양록 쪽
  jeok: ['#7e2f22', '#d0502a', '#f0a070'],   // 석간주 → 장단
  hwang: ['#a8741a', '#e2b236', '#f4da8a'],  // 황
  ja: ['#4f2738', '#86475f', '#c895a8'],     // 다자
};

export const PALETTE: ReadonlySet<string> = new Set([...Object.values(PIGMENT), ...Object.values(SHADES).flat()]);

// 빛넣기 단계: 어두운 → 밝은. 4단이면 마지막이 백분
export function lightSteps(series: Series, steps: number): string[] {
  const [dark, mid, light] = SHADES[series];
  if (steps >= 4) return [dark, mid, light, PIGMENT.baekbun];
  if (steps === 3) return [dark, mid, light];
  return [dark, light];
}

// WCAG 상대 휘도
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
