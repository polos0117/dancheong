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
