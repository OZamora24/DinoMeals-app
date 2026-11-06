// Monthly Plan on the order page: an invite card, or (once started) the 4-weekend switcher.
import { prettyDate, money } from '../../lib/menu';

export default function MonthlyBar({ t, lang, monthly, info, start, goWeek, copyToRest, exit, weekOk }) {
  if (!monthly) {
    return (
      <div className="m-invite">
        <div>
          <b>📅 {t('m_title')}</b>
          <span>{t('m_pitch')}</span>
        </div>
        <button className="btn btn-red btn-sm" onClick={start}>{t('m_start')}</button>
      </div>
    );
  }
  return (
    <div className="m-bar">
      <div className="m-bar-head">
        <b>📅 {t('m_title')} · {info.pct}% {t('off')}</b>
        <button className="link" onClick={exit}>{t('m_exit')}</button>
      </div>
      <p className="muted small">{t('m_how')}</p>
      <div className="m-weeks" role="tablist">
        {info.ws.map((w, i) => (
          <button key={i} role="tab" aria-selected={monthly.week === i} className={`m-week ${monthly.week === i ? 'on' : ''} ${w.ok ? 'ok' : ''}`} onClick={() => goWeek(i)}>
            <span>{t('m_week', i + 1)}</span>
            <b>{prettyDate(info.dates[i], lang)}</b>
            <em>{w.ok ? `✓ ${w.n ? `${w.n} ${t('meals')}` : ''}${w.n && w.lb ? ' + ' : ''}${w.lb ? `${w.lb} lb` : ''}` : t('m_pick')}</em>
          </button>
        ))}
      </div>
      <div className="m-bar-foot">
        {monthly.week < 3 && weekOk && <button className="btn btn-ghost btn-sm" onClick={copyToRest}>{t('m_copy')}</button>}
        <span className="m-sum">{t('m_total')} <b>{money(info.total)}</b> <s>{money(info.sub + info.delivery + info.card)}</s></span>
      </div>
    </div>
  );
}
