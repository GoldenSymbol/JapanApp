import { useNavigate } from 'react-router-dom';
import type { LegalSection } from '../legal/content';

// Draft text marks anything that still needs a real business/legal decision with
// ⟦REVIEW: ...⟧ — highlighted here so it's impossible to miss while reviewing the page itself,
// not just in the source file's comments.
const REVIEW_PATTERN = /⟦REVIEW:([^⟧]+)⟧/g;

function renderWithReviewMarkers(text: string) {
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
        לבדיקה: {part.review}
      </span>
    )
  );
}

export function LegalPage({ title, version, updated, sections }: {
  title: string; version: string; updated: string; sections: LegalSection[];
}) {
  const navigate = useNavigate();
  return (
    <div className="app-shell">
      <div style={{ padding: '18px 22px 48px' }}>
        <div onClick={() => navigate(-1)} style={{ font: "500 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--accent)', cursor: 'pointer', padding: '8px 0' }}>
          → חזרה
        </div>
        <div style={{ font: "600 27px/1.25 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.4px', marginTop: 14 }}>{title}</div>
        <div style={{ font: "400 11.5px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 6 }}>
          גרסה {version} · עודכן לאחרונה {updated}
        </div>

        <div style={{
          marginTop: 18, padding: '14px 16px', borderRadius: 14,
          border: '1px dashed rgba(217,86,75,.5)', background: 'rgba(217,86,75,.06)',
        }}>
          <div style={{ font: "600 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)' }}>טיוטה לצורך בדיקה</div>
          <div style={{ font: "400 12px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 5 }}>
            מסמך זה הוכן בהתאם למה שהאפליקציה עושה בפועל בקוד, אך טרם עבר אישור משפטי ואינו מהווה ייעוץ משפטי.
            סעיפים המסומנים ״לבדיקה״ למטה מכילים פרטים עסקיים/משפטיים שטרם הוחלטו ויש להשלים לפני הצגת המסמך למשתמשים אמיתיים.
          </div>
        </div>

        {sections.map((s) => (
          <div key={s.heading} style={{ marginTop: 26 }}>
            <div style={{ font: "600 16px/1.4 'Noto Sans Hebrew',sans-serif" }}>{s.heading}</div>
            {s.body.map((p, i) => (
              <p key={i} style={{ font: "400 13.5px/1.75 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 9 }}>
                {renderWithReviewMarkers(p)}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
