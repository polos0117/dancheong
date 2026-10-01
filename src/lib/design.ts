import { SERIES, type Series } from './palette';
import { pick, rng } from './rng';

// 씨앗 → 문양 설계값. 같은 씨앗이면 같은 설계.

export type Form = 'round' | 'pointed';
export type Geum = 'gori' | 'samgak' | 'baja';
export interface Design {
  seed: number;
  petals: number;        // 주화 꽃잎 수
  petalShape: Form;
  hwiLayers: number;     // 휘 겹 수
  hwiShape: Form;
  hwiCount: number;      // 보의 휘 한 줄에 세로로 늘어선 꽃잎 수
  steps: number;         // 빛넣기 단계 수
  bands: Series[];       // [휘 1..hwiLayers, 주화 바깥 꽃잎, 주화 안쪽 꽃잎, 가운데]
  seongnyudong: boolean;
  banjuhwa: boolean;
  geummun: Geum;
}

export function designOf(seed: number): Design {
  const r = rng(seed);
  const hwiLayers = pick(r, [2, 3, 4] as const);
  // 이웃한 띠는 다른 계열 — 단청은 색이 번갈아 와야 또렷하다
  const bands: Series[] = [];
  for (let i = 0; i < hwiLayers + 3; i++) bands.push(pick(r, SERIES.filter(s => s !== bands[i - 1])));
  return {
    seed,
    petals: pick(r, [8, 10, 12, 16] as const),
    petalShape: pick(r, ['round', 'pointed'] as const),
    hwiLayers,
    hwiShape: pick(r, ['round', 'pointed'] as const),
    hwiCount: pick(r, [4, 5, 6] as const),
    steps: pick(r, [3, 4] as const),
    bands,
    seongnyudong: r() < 0.6,
    banjuhwa: r() < 0.5,
    geummun: pick(r, ['gori', 'samgak', 'baja'] as const),
  };
}
