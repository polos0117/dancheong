# 단청 생성기 (dancheong) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 씨앗 하나로 전통 규칙을 따르는 단청 문양(보 한 칸·머리초 확대·휴대폰·PC 배경)을 SVG 로 그리고, 저장·공유하는 웹 생성기를 GitHub Pages 에 올린다.

**Architecture:** `src/lib/` 의 순수 함수가 씨앗 → 설계값 → 도형 목록(장면) → SVG 글을 만든다(Vitest). React 화면은 그 SVG 글을 그대로 보여 주고, 같은 글을 SVG·PNG 로 저장한다. 오른쪽 머리초는 왼쪽 도형을 거울 변환으로 다시 쓰므로 대칭이 구조로 보장된다.

**Tech Stack:** React 19, Vite 8, TypeScript 5, Vitest 4, GitHub Actions → Pages. 런타임 의존성 react·react-dom 뿐. Node 22(fnm).

**Spec:** `docs/superpowers/specs/2026-10-01-dancheong-design.md`

## Global Constraints

- 공개 저장소 `polos0117/dancheong`, 배포 `https://polos0117.github.io/dancheong/` (`BASE_PATH=/dancheong/`).
- 런타임 의존성: `react`, `react-dom` 만. `.npmrc` 에 `legacy-peer-deps=true`(Vite 8 + plugin-react 6 조합).
- 씨앗 0~99999 정수. 주소 `?seed=4821&style=geum&ratio=phone`. 잘못된 값은 기본값(양식 `moro`, 비율 `beam`, 씨앗은 무작위).
- 비율과 논리 크기: 보 300×100(3:1), 머리초 200×200, 휴대폰 180×320(9:16), PC 320×180(16:9).
- PNG 크기: 보 3000×1000, 머리초 2048×2048, 휴대폰 **1440×2560**, PC 2560×1440. (스펙의 1170×2532 는 9:16 이 아니라서 9:16 인 1440×2560 으로 — Ruling 으로 기록)
- 칠하는 색은 `palette.ts` 의 `PALETTE` 안에서만. 빛넣기는 늘 어두운 → 밝은.
- 화면 글은 한국어. 그림 아래 "단청의 구성을 단순화한 생성기예요 — 실제 단청과 다를 수 있어요."
- Bash 에서 Node 22: 명령 앞에 `export PATH="$APPDATA/fnm/aliases/default:$PATH";`.

## Review Focus

1. **주소에 이상한 값**(`?seed=-1`, `?seed=abc`, `?seed=`, `?ratio=xx`) — 깨지지 않고 기본값 → Task 1 `parseState` 테스트.
2. **휘 4겹 + 꽃잎 16장 같은 가장 빽빽한 설계** — 머리초가 보 높이·정사각형 밖으로 나가지 않는다 → Task 2 `squareMeoricho`·`beamMeoricho` 크기 테스트.
3. **휴대폰 폭(390px)** — 조작판이 세로로 쌓이고 가로 스크롤 없음 → Task 4 브라우저 확인.
4. **PNG 저장** — 9:16 등 비율이 찌그러지지 않고 파일이 만들어진다 → Task 4 브라우저 확인(내려받기 이벤트·이미지 크기).
5. **SVG 글에 `NaN`·`undefined`** — 어떤 씨앗에도 없다 → Task 3 `svgOf` 테스트(씨앗 200개).

---

### Task 1: 틀 + 난수·팔레트·주소

**Files:**
- Create: `package.json`, `.npmrc`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`(임시: "단청 생성기" 제목만), `src/lib/rng.ts`, `src/lib/palette.ts`, `src/lib/url.ts`, `src/lib/palette.test.ts`, `src/lib/url.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // rng.ts
  export function rng(seed: number): () => number;            // 0 이상 1 미만
  export function pick<T>(r: () => number, list: readonly T[]): T;
  // palette.ts
  export type Series = 'cheong' | 'nok' | 'jeok' | 'hwang' | 'ja';
  export const SERIES: readonly Series[];
  export const PIGMENT: { noerok; seokganju; meok; baekbun };
  export const SHADES: Record<Series, readonly [string, string, string]>;
  export const PALETTE: ReadonlySet<string>;
  export function lightSteps(series: Series, steps: number): string[];
  export function luminance(hex: string): number;
  // url.ts
  export type Style = 'moro' | 'geum';
  export type Ratio = 'beam' | 'square' | 'phone' | 'pc';
  export const SEED_MAX = 99_999;
  export interface State { seed: number; style: Style; ratio: Ratio }
  export function parseState(search: string, fallbackSeed: number): State;
  export function toQuery(s: State): string;
  ```

- [ ] **Step 1: 틀**

`package.json`:
```json
{
  "name": "dancheong",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```
`.npmrc`: `legacy-peer-deps=true`
`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["ES2022", "DOM", "DOM.Iterable"], "module": "ESNext", "moduleResolution": "bundler",
    "jsx": "react-jsx", "strict": true, "noEmit": true, "skipLibCheck": true, "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```
`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 는 /dancheong/ 아래 — 배포 워크플로가 BASE_PATH 를 준다. 로컬은 /
export default defineConfig({ base: process.env.BASE_PATH ?? '/', plugins: [react()] });
```
`index.html`:
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="한국 전통 건축의 단청 문양을 규칙으로 만들어 내는 생성기" />
    <title>단청 생성기</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```
`src/main.tsx`(임시):
```tsx
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')!).render(<h1>단청 생성기</h1>);
```
Run: `npm i react@^19 react-dom@^19 && npm i -D vite@^8 @vitejs/plugin-react@^6 typescript@^5 @types/react@^19 @types/react-dom@^19 vitest@^4`

- [ ] **Step 2: 실패하는 테스트**

`src/lib/palette.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { lightSteps, luminance, PALETTE, PIGMENT, SERIES, SHADES } from './palette';

describe('palette', () => {
  it('빛넣기는 계열·단계 수와 상관없이 늘 어두운 → 밝은', () => {
    for (const s of SERIES) for (const steps of [2, 3, 4]) {
      const colors = lightSteps(s, steps);
      expect(colors).toHaveLength(steps);
      for (let i = 1; i < colors.length; i++) expect(luminance(colors[i])).toBeGreaterThan(luminance(colors[i - 1]));
    }
  });
  it('4단이면 마지막은 백분', () => {
    expect(lightSteps('cheong', 4).at(-1)).toBe(PIGMENT.baekbun);
  });
  it('PALETTE 는 안료와 모든 계열 색을 담는다', () => {
    for (const c of [...Object.values(PIGMENT), ...Object.values(SHADES).flat()]) expect(PALETTE.has(c)).toBe(true);
  });
  it('luminance: 검정 0, 흰색 1', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBeCloseTo(1, 9);
  });
});
```
`src/lib/url.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseState, toQuery } from './url';

describe('url', () => {
  it('왕복', () => {
    const s = { seed: 4821, style: 'geum', ratio: 'phone' } as const;
    expect(parseState(toQuery(s), 7)).toEqual(s);
    expect(toQuery(s)).toBe('?seed=4821&style=geum&ratio=phone');
  });
  it.each(['', '?seed=-1', '?seed=abc', '?seed=', '?seed=100000', '?seed=1.5'])('잘못된 씨앗 %s → 대신 받은 씨앗', (q) => {
    expect(parseState(q, 7).seed).toBe(7);
  });
  it('잘못된 양식·비율 → moro·beam', () => {
    expect(parseState('?seed=3&style=xx&ratio=yy', 7)).toEqual({ seed: 3, style: 'moro', ratio: 'beam' });
  });
  it('0 과 99999 는 받는다', () => {
    expect(parseState('?seed=0', 7).seed).toBe(0);
    expect(parseState('?seed=99999', 7).seed).toBe(99999);
  });
});
```

- [ ] **Step 3: 실패 확인** — Run: `npx vitest run` → FAIL (모듈 없음)

- [ ] **Step 4: 구현**

`src/lib/rng.ts`:
```ts
// 씨앗 → 0 이상 1 미만 난수열 (mulberry32). 같은 씨앗이면 같은 수열
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)];
```
`src/lib/palette.ts`:
```ts
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
```
`src/lib/url.ts`:
```ts
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
```

- [ ] **Step 5: 통과 확인** — Run: `npx vitest run && npx tsc --noEmit` → PASS, 타입 오류 없음.

- [ ] **Step 6: 커밋**
```bash
git add package.json package-lock.json .npmrc tsconfig.json vite.config.ts index.html src
git commit -m "Set up the generator with seeded randomness, the pigment palette and URL state"
```

---

### Task 2: 설계값 + 도형 도우미 + 머리초

**Files:**
- Create: `src/lib/design.ts`, `src/lib/shape.ts`, `src/lib/meoricho.ts`, `src/lib/design.test.ts`, `src/lib/meoricho.test.ts`

**Interfaces:**
- Consumes: Task 1 `rng`, `pick`, `SERIES`, `Series`, `lightSteps`, `PIGMENT`
- Produces:
  ```ts
  // design.ts
  export type Form = 'round' | 'pointed';
  export type Geum = 'gori' | 'samgak' | 'baja';
  export interface Design {
    seed: number; petals: number; petalShape: Form; hwiLayers: number; hwiShape: Form; hwiCount: number; steps: number;
    bands: Series[];   // [휘 1..hwiLayers, 주화 바깥 꽃잎, 주화 안쪽 꽃잎, 가운데] — 이웃끼리 다른 계열
    seongnyudong: boolean; banjuhwa: boolean; geummun: Geum;
  }
  export function designOf(seed: number): Design;
  // shape.ts
  export type Part = 'meoricho' | 'tedu' | 'hwi' | 'juhwa' | 'seongnyudong' | 'banjuhwa' | 'gyepung' | 'geummun';
  export interface Shape { d: string; fill: string; stroke?: string; sw?: number; part: Part; stack?: string }
  export interface Label { part: Part; x: number; y: number }
  export const num: (v: number) => number;           // 소수 둘째 자리
  export function rect(x, y, w, h, fill, part): Shape;
  export function circlePath(cx, cy, r): string;
  export function petalPath(bl, br, tip, cl, cr, anchor): (k: number) => string;
  export function radialPetal(cx, cy, r0, r1, angle, halfWidth, form): (k: number) => string;
  export function lightStack(path: (k: number) => string, colors: string[], part: Part, stack: string): Shape[];
  export function petalAngles(count: number, from: number, range: number): number[];
  // meoricho.ts
  export const BEAM_H = 100;
  export const SQUARE = 200;
  export function lotus(cx, cy, r, d: Design, from, range, part: 'juhwa' | 'banjuhwa', id: string, petals?: number): Shape[];
  export function beamMeoricho(d: Design): { width: number; shapes: Shape[]; labels: Label[] };
  export function squareMeoricho(d: Design): { shapes: Shape[]; labels: Label[] };
  ```

- [ ] **Step 1: 실패하는 테스트**

`src/lib/design.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { designOf } from './design';

describe('designOf', () => {
  it('같은 씨앗이면 같은 설계', () => {
    expect(designOf(4821)).toEqual(designOf(4821));
  });
  it('값들이 정해진 범위 안, 띠 수 = 휘 겹 + 3', () => {
    for (let s = 0; s < 300; s++) {
      const d = designOf(s);
      expect([8, 10, 12, 16]).toContain(d.petals);
      expect([2, 3, 4]).toContain(d.hwiLayers);
      expect([4, 5, 6]).toContain(d.hwiCount);
      expect([3, 4]).toContain(d.steps);
      expect(d.bands).toHaveLength(d.hwiLayers + 3);
    }
  });
  it('이웃한 띠는 늘 다른 색 계열', () => {
    for (let s = 0; s < 300; s++) {
      const { bands } = designOf(s);
      for (let i = 1; i < bands.length; i++) expect(bands[i]).not.toBe(bands[i - 1]);
    }
  });
  it('씨앗이 다르면 설계가 다양하다', () => {
    const seen = new Set(Array.from({ length: 60 }, (_, s) => JSON.stringify({ ...designOf(s), seed: 0 })));
    expect(seen.size).toBeGreaterThan(50);
  });
});
```
`src/lib/meoricho.test.ts`:
```ts
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
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run` → FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`src/lib/design.ts`:
```ts
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
```
`src/lib/shape.ts`:
```ts
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
```
`src/lib/meoricho.ts`:
```ts
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
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run && npx tsc --noEmit` → PASS.
  범위 테스트가 실패하면(가장 빽빽한 설계가 넘침) 상수(`HWI_W`, `R`, 정사각의 `rj`·간격)를 줄이고 Ruling 으로 남긴다.

- [ ] **Step 5: 커밋**
```bash
git add src/lib
git commit -m "Derive a design from the seed and draw the meoricho with layered light bands"
```

---

### Task 3: 금문 + 장면 구성 + SVG

**Files:**
- Create: `src/lib/geummun.ts`, `src/lib/compose.ts`, `src/lib/svg.ts`, `src/lib/labels.ts`, `src/lib/compose.test.ts`

**Interfaces:**
- Consumes: Task 2 전부, Task 1 `Style`, `Ratio`
- Produces:
  ```ts
  // geummun.ts
  export function geummun(d: Design, x: number, y: number, w: number, h: number): Shape[];
  // compose.ts
  export interface Group { transform?: string; shapes: Shape[]; children?: Group[] }
  export interface Scene { w: number; h: number; groups: Group[]; labels: Label[] }
  export const SIZE: Record<Ratio, { w: number; h: number }>;
  export const EXPORT_PX: Record<Ratio, { w: number; h: number }>;
  export function compose(d: Design, style: Style, ratio: Ratio): Scene;
  export function allShapes(scene: Scene): Shape[];
  // svg.ts
  export function svgOf(scene: Scene, size?: { w: number; h: number }): string;
  // labels.ts
  export const LABEL: Record<Part, { name: string; desc: string }>;
  export const BITNEOGI: { name: string; desc: string };
  ```

- [ ] **Step 1: 실패하는 테스트**

`src/lib/compose.test.ts`:
```ts
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
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run src/lib/compose.test.ts` → FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`src/lib/geummun.ts`:
```ts
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
```
`src/lib/labels.ts`:
```ts
import type { Part } from './shape';

// 이름표: 부분 이름과 한 줄 설명
export const LABEL: Record<Part, { name: string; desc: string }> = {
  meoricho: { name: '머리초', desc: '보·도리 같은 부재의 양 끝에 그리는 가장 중요한 문양' },
  hwi: { name: '휘', desc: '머리초 바깥을 감싸는 꽃잎 모양 띠. 겹이 많을수록 격이 높다' },
  juhwa: { name: '주화', desc: '머리초 가운데의 큰 꽃. 주로 연꽃이다' },
  seongnyudong: { name: '석류동', desc: '주화 한가운데의 석류. 많은 씨앗처럼 번성을 빈다' },
  banjuhwa: { name: '반주화', desc: '가장자리에 반만 보이게 그린 꽃' },
  gyepung: { name: '계풍', desc: '양 끝 머리초 사이의 가운데 부분' },
  geummun: { name: '금문', desc: '비단 무늬처럼 되풀이되는 기하 문양' },
  tedu: { name: '먹선·분선', desc: '색 띠 사이를 가르는 검은 선과 흰 선' },
};

export const BITNEOGI = { name: '빛넣기', desc: '같은 색을 어두운 데서 밝은 데로 겹쳐 입체감을 낸다' };
```
`src/lib/compose.ts`:
```ts
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

export function compose(d: Design, style: Style, ratio: Ratio): Scene {
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
```
`src/lib/svg.ts`:
```ts
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
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run && npx tsc --noEmit` → PASS.

- [ ] **Step 5: 커밋**
```bash
git add src/lib
git commit -m "Compose beams, squares and wallpapers with geummun bands and render them to SVG"
```

---

### Task 4: 생성기 화면

**Files:**
- Create: `src/App.tsx`, `src/App.css`, `src/lib/download.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `designOf`, `compose`, `svgOf`, `EXPORT_PX`, `SIZE`, `LABEL`, `BITNEOGI`, `parseState`, `toQuery`, `SEED_MAX`, `STYLES`, `RATIOS`, `State`

- [ ] **Step 1: `src/lib/download.ts`**
```ts
// 내려받기 (브라우저 전용 — 테스트하지 않고 화면에서 확인)
function save(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const downloadSvg = (svg: string, name: string) => save(new Blob([svg], { type: 'image/svg+xml' }), name);

// SVG 를 이미지로 읽어 원하는 크기의 캔버스에 그린 뒤 PNG 로 (글자가 없어 웹 서체 걱정 없음)
export async function downloadPng(svg: string, w: number, h: number, name: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
    if (!blob) throw new Error('PNG 를 만들지 못했어요');
    save(blob, name);
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

- [ ] **Step 2: `src/App.tsx`**
```tsx
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { compose, EXPORT_PX, SIZE } from './lib/compose';
import { designOf } from './lib/design';
import { downloadPng, downloadSvg } from './lib/download';
import { BITNEOGI, LABEL } from './lib/labels';
import { svgOf } from './lib/svg';
import { parseState, RATIOS, SEED_MAX, STYLES, toQuery, type Ratio, type State, type Style } from './lib/url';
import './App.css';

const STYLE_NAME: Record<Style, string> = { moro: '모로단청', geum: '금단청' };
const RATIO_NAME: Record<Ratio, string> = { beam: '보', square: '머리초', phone: '휴대폰 9:16', pc: 'PC 16:9' };
const randomSeed = () => Math.floor(Math.random() * (SEED_MAX + 1));

export default function App() {
  const [state, setState] = useState<State>(() => parseState(location.search, randomSeed()));
  const [labels, setLabels] = useState(false);
  const [note, setNote] = useState('');
  const set = (patch: Partial<State>) => setState(s => ({ ...s, ...patch }));

  useEffect(() => { history.replaceState(null, '', toQuery(state)); }, [state]);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(''), 3000);
    return () => clearTimeout(t);
  }, [note]);

  const scene = useMemo(() => compose(designOf(state.seed), state.style, state.ratio), [state]);
  const svg = useMemo(() => svgOf(scene), [scene]);
  const name = `dancheong-${state.seed}-${state.style}-${state.ratio}`;
  const parts = [...new Set(scene.labels.map(l => l.part))];

  async function savePng() {
    const { w, h } = EXPORT_PX[state.ratio];
    try {
      await downloadPng(svgOf(scene, { w, h }), w, h, `${name}.png`);
      setNote(`${name}.png 로 저장했어요`);
    } catch (e) {
      setNote((e as Error).message);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      setNote('링크를 복사했어요');
    } catch {
      setNote('복사하지 못했어요 — 주소창의 링크를 직접 복사해 주세요');
    }
  }

  return (
    <main className="app">
      <header className="top">
        <h1>단청 생성기</h1>
        <label className="toggle"><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)} /> 이름표</label>
      </header>

      <figure className="stage" style={{ '--ar': `${SIZE[state.ratio].w} / ${SIZE[state.ratio].h}` } as CSSProperties}>
        <div className="art" role="img" aria-label={`단청 문양, 씨앗 ${state.seed}, ${STYLE_NAME[state.style]}, ${RATIO_NAME[state.ratio]}`}
          dangerouslySetInnerHTML={{ __html: svg }} />
        {labels && scene.labels.map(l => (
          <span key={`${l.part}-${l.x}-${l.y}`} className="tag" style={{ left: `${(l.x / scene.w) * 100}%`, top: `${(l.y / scene.h) * 100}%` }}>
            {LABEL[l.part].name}
          </span>
        ))}
      </figure>

      {labels && (
        <dl className="legend">
          {parts.map(p => <div key={p}><dt>{LABEL[p].name}</dt><dd>{LABEL[p].desc}</dd></div>)}
          <div><dt>{BITNEOGI.name}</dt><dd>{BITNEOGI.desc}</dd></div>
        </dl>
      )}

      <section className="controls" aria-label="조작">
        <div className="row">
          <button type="button" className="primary" onClick={() => set({ seed: randomSeed() })}>새로 만들기</button>
          <label className="field">씨앗
            <input type="number" min={0} max={SEED_MAX} value={state.seed} inputMode="numeric"
              onChange={e => { const v = Number(e.target.value); if (Number.isInteger(v) && v >= 0 && v <= SEED_MAX) set({ seed: v }); }} />
          </label>
        </div>
        <div className="row" role="group" aria-label="양식">
          {STYLES.map(s => <button key={s} type="button" className="seg" aria-pressed={state.style === s} onClick={() => set({ style: s })}>{STYLE_NAME[s]}</button>)}
        </div>
        <div className="row" role="group" aria-label="비율">
          {RATIOS.map(r => <button key={r} type="button" className="seg" aria-pressed={state.ratio === r} onClick={() => set({ ratio: r })}>{RATIO_NAME[r]}</button>)}
        </div>
        <div className="row">
          <button type="button" onClick={() => { downloadSvg(svgOf(scene, EXPORT_PX[state.ratio]), `${name}.svg`); setNote(`${name}.svg 로 저장했어요`); }}>SVG 저장</button>
          <button type="button" onClick={savePng}>PNG 저장</button>
          <button type="button" onClick={copyLink}>링크 복사</button>
        </div>
      </section>

      <p className="note" role="status">{note}</p>
      <footer className="foot">단청의 구성을 단순화한 생성기예요 — 실제 단청과 다를 수 있어요.</footer>
    </main>
  );
}
```
`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
```

- [ ] **Step 3: `src/App.css`**
```css
:root {
  color-scheme: light dark;
  --bg: #f3efe6; --ink: #1d1a17; --ink-2: #5f5850; --line: #ddd5c6; --card: #fbf8f2; --accent: #7e2f22; --accent-ink: #fbf8f2;
  font: 15px/1.55 "Pretendard Variable", Pretendard, system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #15140f; --ink: #efe9dc; --ink-2: #b3aa9a; --line: #36322a; --card: #1e1c16; --accent: #e08a6c; --accent-ink: #15140f; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); }
.app { max-width: 1040px; margin: 0 auto; padding: 20px 16px 40px; display: grid; gap: 16px; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
h1 { margin: 0; font-size: 22px; letter-spacing: 1px; }
.toggle { display: flex; align-items: center; gap: 6px; color: var(--ink-2); }
.stage { position: relative; margin: 0 auto; aspect-ratio: var(--ar); width: min(100%, calc(70vh * (var(--ar)))); border-radius: 6px; overflow: hidden; box-shadow: 0 10px 30px rgb(0 0 0 / 0.25); }
.art, .art svg { display: block; width: 100%; height: 100%; }
.tag {
  position: absolute; transform: translate(-50%, -50%); padding: 2px 8px; border-radius: 999px;
  background: rgb(29 26 23 / 0.82); color: #f4eee0; font-size: 12px; white-space: nowrap; pointer-events: none;
}
.legend { margin: 0; display: grid; gap: 6px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.legend div { padding: 8px 12px; background: var(--card); border: 1px solid var(--line); border-radius: 8px; }
.legend dt { font-weight: 700; }
.legend dd { margin: 2px 0 0; color: var(--ink-2); font-size: 13px; }
.controls { display: grid; gap: 10px; justify-items: center; }
.row { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; align-items: center; }
button {
  min-height: 40px; padding: 0 16px; font: inherit; color: var(--ink); background: var(--card);
  border: 1px solid var(--line); border-radius: 999px; cursor: pointer;
}
button:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
button.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); font-weight: 700; }
button.seg[aria-pressed="true"] { background: var(--ink); color: var(--bg); border-color: var(--ink); font-weight: 600; }
.field { display: flex; align-items: center; gap: 8px; color: var(--ink-2); }
.field input { width: 7.5em; min-height: 40px; padding: 0 12px; font: inherit; color: var(--ink); background: var(--card); border: 1px solid var(--line); border-radius: 8px; }
.note { min-height: 1.5em; margin: 0; text-align: center; color: var(--ink-2); }
.foot { text-align: center; font-size: 13px; color: var(--ink-2); }
```

- [ ] **Step 4: 정적 검사** — Run: `npx vitest run && npm run build` → PASS, 빌드 성공.

- [ ] **Step 5: 브라우저 확인** — `npx vite --port 4191 --strictPort` 를 백그라운드로, `$CLAUDE_JOB_DIR/tmp/dan-check.mjs`(커밋하지 않음) 로 headless Chrome:
  1. `/?seed=4821&style=geum&ratio=beam` → `.art svg` 있음, `aria-label` 에 "씨앗 4821, 금단청". 예외 없음.
  2. 비율 4개 × 씨앗 3개(0, 4821, 99999) × 양식 2개 스크린샷 몇 장(보·머리초·휴대폰·PC 각 1장 이상)을 `$CLAUDE_JOB_DIR/tmp/` 에 저장하고 눈으로: 단청으로 보이는지, 넘치거나 빈 곳이 없는지, 좌우 대칭.
  3. [새로 만들기] 를 누르면 주소의 seed 가 바뀐다. 주소를 그대로 새로 열면 같은 SVG 글.
  4. 이름표 켜기 → `.tag` 개수 = 장면 이름표 수, 설명 목록에 빛넣기 포함.
  5. 390×844: `scrollWidth === innerWidth`.
  6. PNG 저장: `Browser.setDownloadBehavior({ behavior: 'allow', downloadPath })` 후 [PNG 저장] → 파일이 생기고, 휴대폰 비율 PNG 가 1440×2560(파일 헤더의 IHDR 폭·높이로 확인).
  Expected: 1~6 기대대로. 색·모양이 어색하면 `palette.ts` 색값이나 `meoricho.ts` 상수를 다듬고(테스트는 계속 통과) Ruling 으로 남긴다.

- [ ] **Step 6: 커밋**
```bash
git add src
git commit -m "Add the generator page: art, labels, controls, SVG and PNG export"
```

---

### Task 5: 배포

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

- [ ] **Step 1: `.github/workflows/deploy.yml`**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          BASE_PATH: /dancheong/
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: `README.md`**
```md
# 단청 생성기

한국 전통 건축의 **단청** 문양을 규칙으로 만들어 내는 생성기. 씨앗 하나가 문양 하나 — 같은 씨앗이면 늘 같은 문양.

**열어 보기:** https://polos0117.github.io/dancheong/

- 보 한 칸 · 머리초 확대 · 휴대폰(9:16) · PC(16:9) 배경
- 모로단청 / 금단청
- 이름표를 켜면 머리초 · 휘 · 주화 · 석류동 · 계풍 · 금문 · 빛넣기를 한 줄씩 설명
- SVG · 고해상도 PNG 저장, 링크로 공유 (`?seed=4821&style=geum&ratio=phone`)

단청의 구성을 단순화한 것이라 실제 단청과 다를 수 있다.

## 개발

    npm install
    npm run dev
    npm test
```

- [ ] **Step 3: 커밋** — `git add .github README.md && git commit -m "Deploy to GitHub Pages on every push to main"`

- [ ] **Step 4: 병합·푸시·배포 확인** (사용자에게 병합·푸시 확인을 받은 뒤)
  `git remote add origin https://github.com/polos0117/dancheong.git && git push -u origin main`.
  저장소 Settings → Pages → Source 가 **GitHub Actions** 여야 한다(처음 한 번, 사용자 설정). 배포가 "Pages 꺼짐" 으로 실패하면 사용자에게 이 설정을 부탁하고 workflow 를 다시 돌린다.
  배포 뒤 `https://polos0117.github.io/dancheong/?seed=4821&ratio=phone` 를 headless Chrome 으로 열어 그림이 뜨는지 확인.
