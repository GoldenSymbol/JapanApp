import { useNavigate } from 'react-router-dom';
import type { LegalSection } from '../legal/content';
import { PUBLICATION_BLOCKERS } from '../legal/content';
import { useLanguage } from '../state/LanguageContext';

// Draft text marks anything that still needs a real business/legal decision with
// ⟦REVIEW: ...⟧ — highlighted here so it's impossible to miss while reviewing the page itself,
// not just in the source file's comments.
const REVIEW_PATTERN = /⟦REVIEW:([^⟧]+)⟧/g;

function renderWithReviewMarkers(text: string, reviewLabel: string) {
  const parts: (string | { review: string })[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(REVIEW_PATTERN)) {
    if (match.index! > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push({ review: match[1].trim() });
    lastIndex = match.index! + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.map((part, i) =>
    typeof part === 'string' ? (
      <span key={i}>{part}</span>
    ) : (
      <span key={i} style={{
        display: 'inline', border: '1px dashed rgba(217,86,75,.55)', background: 'rgba(217,86,75,.1)',
        color: 'var(--danger)', borderRadius: 6, padding: '1px 6px', fontWeight: 600,
      }}>
        {reviewLabel} {part.review}
      </span>
    )
  );
}

export function LegalPage({ title, version, updated, sections }: {
  title: string; version: string; updated: string; sections: LegalSection[];
}) {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const blockers = PUBLICATION_BLOCKERS[lang];
  return (
    <div className="app-shell">
      <div style={{ padding: 'calc(18px + env(safe-area-inset-top)) 22px 48px' }}>
        <div onClick={() => navigate(-1)} style={{ font: "500 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer', padding: '8px 0' }}>
          {t('legal.back')}
        </div>
        <div style={{ font: "600 27px/1.25 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.4px', marginTop: 14 }}>{title}</div>
        <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 6 }}>
          {t('legal.versionLine', { version, updated })}
        </div>

        <div style={{
          marginTop: 18, padding: '14px 16px', borderRadius: 14,
          border: '1px dashed rgba(217,86,75,.5)', background: 'rgba(217,86,75,.06)',
        }}>
          <div style={{ font: "600 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)' }}>{t('legal.draftTitle')}</div>
          <div style={{ font: "400 12px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 5 }}>
            {t('legal.draftDesc')}
          </div>
          {blockers.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed rgba(217,86,75,.35)' }}>
              <div style={{ font: "600 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)' }}>
                {t('legal.blockersHeader', { count: blockers.length })}
              </div>
              <ul style={{ margin: '6px 0 0', padding: '0 18px 0 0' }}>
                {blockers.map((b, i) => (
                  <li key={i} style={{ font: "400 12px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 4 }}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {sections.map((s) => (
          <div key={s.heading} style={{ marginTop: 26 }}>
            <div style={{ font: "600 16px/1.4 'Noto Sans Hebrew',sans-serif" }}>{s.heading}</div>
            {s.body.map((p, i) => (
              <p key={i} style={{ font: "400 13.5px/1.75 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 9 }}>
                {renderWithReviewMarkers(p, t('legal.reviewLabel'))}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
