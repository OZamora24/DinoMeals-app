// Launch screen, played once per real page load:
//  1. the DinoMeals badge STOMPS down from above — landing shockwave + screen shake
//  2. the logo "draws itself" with a circular sweep (matches the logo's swoosh)
//  3. the name drops in letter by letter, embers drift up like a smoker
//  4. loader = dino footprints walking across + a glossy shine over the badge
//  5. exit = three giant claw slashes rip across the screen and reveal the app
const EMBERS = [
  { l: 12, d: 0.0, s: 4, t: 2.8 }, { l: 22, d: 0.9, s: 3, t: 3.2 }, { l: 31, d: 0.4, s: 5, t: 2.5 },
  { l: 43, d: 1.4, s: 3, t: 3.0 }, { l: 52, d: 0.2, s: 4, t: 2.7 }, { l: 63, d: 1.1, s: 3, t: 3.4 },
  { l: 72, d: 0.6, s: 5, t: 2.6 }, { l: 81, d: 1.8, s: 3, t: 3.1 }, { l: 90, d: 0.3, s: 4, t: 2.9 },
  { l: 38, d: 2.1, s: 3, t: 2.4 }, { l: 58, d: 2.4, s: 4, t: 2.8 }, { l: 6, d: 1.6, s: 3, t: 3.0 },
];

// One three-toed dino track (points up; rotated per step)
function Track({ style, flip }) {
  return (
    <svg className="track" viewBox="0 0 40 46" style={style} aria-hidden="true">
      <g transform={flip ? 'translate(40 0) scale(-1 1)' : undefined}>
        <ellipse cx="20" cy="34" rx="7.5" ry="8.5" />
        <path d="M16 28 L7 9 M20 26 L20 4 M24 28 L33 9" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

function SpeakerIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      {off ? (
        <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

export default function SplashScreen({ phase, mode, muted, label, onEnter, onToggleMute }) {
  const word = 'DINO MEALS'.split('');
  const leaving = phase === 'leaving';
  const paused = phase === 'pre' || phase === 'gate';
  const cls = ['splash', paused && 'splash-paused', mode === 'quick' && 'splash-quick', leaving && 'splash-leaving']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} role="status" aria-label="Loading DinoMeals">
      {phase === 'gate' && (
        <div className="splash-gate">
          <div className="gate-badge">
            <img src="/logo-mark.png" alt="" />
          </div>
          <div className="gate-word">
            <span>DINO</span> MEALS
          </div>
          <button type="button" className="gate-enter" onClick={() => onEnter(true)}>
            TAP TO ENTER
          </button>
          <div className="gate-es">Toca para entrar</div>
          <button type="button" className="gate-quiet" onClick={() => onEnter(false)}>
            Enter without sound · Sin sonido
          </button>
        </div>
      )}
      {mode === 'full' && phase !== 'pre' && (
        <button
          type="button"
          className={`splash-mute${muted ? ' is-off' : ''}`}
          onClick={onToggleMute}
          aria-label={muted ? 'Turn sound on' : 'Mute sound'}
          aria-pressed={muted}
        >
          <SpeakerIcon off={muted} />
        </button>
      )}
      <div className="splash-stage">
        <div className="splash-glow" />
        <div className="splash-embers" aria-hidden="true">
          {EMBERS.map((e, i) => (
            <span key={i} style={{ left: `${e.l}%`, width: e.s, height: e.s, animationDelay: `${e.d}s`, animationDuration: `${e.t}s` }} />
          ))}
        </div>

        <div className="splash-center">
          <div className="splash-badge-wrap">
            <span className="splash-shock" />
            <span className="splash-shock two" />
            <svg className="splash-ring" viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r="92" className="ring-track" />
              <circle cx="100" cy="100" r="92" className="ring-red" />
              <circle cx="100" cy="100" r="92" className="ring-dark" />
            </svg>
            <div className="splash-badge">
              <img src="/logo-mark.png" alt="" className="splash-logo" />
              <span className="splash-shine" />
            </div>
          </div>

          <div className="splash-word" aria-hidden="true">
            {word.map((ch, i) => (
              <span key={i} style={{ animationDelay: `${0.55 + i * 0.06}s` }} className={ch === ' ' ? 'splash-gap' : ''}>
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </div>

          <div className="splash-tracks" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <Track key={i} flip={i % 2 === 1} style={{ left: `${i * 21}%`, top: i % 2 ? 2 : 14, animationDelay: `${0.9 + i * 0.28}s` }} />
            ))}
          </div>
          <div className="splash-label">{label}</div>
        </div>
      </div>

      <div className="splash-slashes" aria-hidden="true">
        <span /><span /><span />
      </div>
    </div>
  );
}
