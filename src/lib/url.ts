// 주소 ↔ 생성기 상태. ?seed=4821&style=geum&ratio=phone

export type Style = 'moro' | 'geum';
export type Ratio = 'beam' | 'square' | 'phone' | 'pc';
export const STYLES: readonly Style[] = ['moro', 'geum'];
export const RATIOS: readonly Ratio[] = ['beam', 'square', 'phone', 'pc'];
export const SEED_MAX = 99_999;
export interface State { seed: number; style: Style; ratio: Ratio }

export function parseState(search: string, fallbackSeed: number): State {
  const q = new URLSearchParams(search);
  const raw = q.get('seed') ?? '';
  const seed = /^\d+$/.test(raw) && Number(raw) <= SEED_MAX ? Number(raw) : fallbackSeed;
  const style = STYLES.find(s => s === q.get('style')) ?? 'moro';
  const ratio = RATIOS.find(r => r === q.get('ratio')) ?? 'beam';
  return { seed, style, ratio };
}

export const toQuery = (s: State) => `?seed=${s.seed}&style=${s.style}&ratio=${s.ratio}`;
