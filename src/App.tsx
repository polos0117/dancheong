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
