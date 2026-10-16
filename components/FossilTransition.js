// "Fossil" page transition: home page → menu.
// The screen turns to cracked mud, real three-toed theropod tracks press into it,
// a giant print slams down, and the menu opens out from under it.
// Phases: 'run' (mud + tracks + big print) → 'reveal' (hole opens onto the new page).
// Styles: .fossil-fx in globals.css. Driven by pages/_app.js.

// One toe: tapered with knuckle bulges and a pointed claw, pointing up from the heel.
const TOE = 'M42.5 80 C39 68 42.5 62 41.5 56 C40.5 47 44 39 46 32 L50 8 L54 32 C56 39 59.5 47 58.5 56 C57.5 62 61 68 57.5 80 Q50 87 42.5 80Z';
const toe = (sc, rot) => (
  <path transform={`rotate(${rot} 50 92) translate(50 92) scale(${sc}) translate(-50 -92)`} d={TOE} />
);

function Track() {
  return (
    <svg viewBox="0 0 100 120" filter="url(#fx-press)">
      {toe(1, 0)}
      {toe(0.8, -36)}
      {toe(0.8, 34)}
      <path d="M38 84 Q50 78 62 84 Q61 104 50 109 Q39 104 38 84Z" />
    </svg>
  );
}

// A walking trackway up the screen: left, right, left… each foot pointing the way it walks.
const STEPS = Array.from({ length: 5 }, (_, i) => {
  const left = i % 2 === 0;
  return { i, left, y: 86 - i * 18, delay: 0.05 + i * 0.27 };
});

export default function FossilTransition({ phase }) {
  if (!phase) return null;
  return (
    <div className={`fossil-fx ${phase}`} aria-hidden="true">
      <svg width="0" height="0" className="fx-defs">
        <defs>
          <radialGradient id="fx-mud" cx=".5" cy=".4" r=".7">
            <stop offset="0" stopColor="#0b0605" />
            <stop offset=".7" stopColor="#1c100b" />
            <stop offset="1" stopColor="#7a4a32" />
          </radialGradient>
          <filter id="fx-press" x="-20%" y="-20%" width="140%" height="140%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="d" />
            <feFlood floodColor="#8c5a3c" />
            <feComposite in2="d" operator="in" result="rim" />
            <feMerge>
              <feMergeNode in="rim" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <div className="fx-shake">
        <div className="fx-ground">
          <svg viewBox="0 0 270 560" preserveAspectRatio="none">
            <g fill="none" stroke="#0c0706" strokeWidth="1.6" opacity=".7">
              <path d="M0 120 L40 135 L70 110 L120 140 L150 118 L210 150 L270 130" />
              <path d="M70 110 L60 60 L90 20" />
              <path d="M150 118 L170 200 L140 260 L180 330" />
              <path d="M0 300 L50 290 L90 320 L140 260" />
              <path d="M180 330 L240 310 L270 340" />
              <path d="M90 320 L80 400 L130 450 L120 520 L150 560" />
              <path d="M180 330 L200 420 L260 450" />
              <path d="M0 470 L60 480 L80 400" />
              <path d="M200 420 L150 470 L130 450" />
            </g>
          </svg>
        </div>
        {STEPS.map((s) => (
          <div key={s.i}>
            <div className="fx-ring" style={{ left: `calc(50% ${s.left ? '-' : '+'} var(--fx-gap))`, top: `calc(${s.y}% + 30px)`, '--d': `${s.delay}s` }} />
            <div
              className="fx-print"
              style={{
                left: `calc(50% ${s.left ? '-' : '+'} var(--fx-gap))`,
                top: `${s.y}%`,
                '--tf': `rotate(${s.left ? -8 : 8}deg)${s.left ? '' : ' scaleX(-1)'}`,
                '--d': `${s.delay}s`,
              }}
            >
              <Track />
            </div>
          </div>
        ))}
        <div className="fx-big"><Track /></div>
      </div>
    </div>
  );
}
