import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../state/LanguageContext';
import { useTripData, type PendingAttraction } from '../state/TripDataContext';

// Joining is per person, so an attraction someone adds isn't in your trip until you say you're going.
// This asks for that answer straight away and has no close button: it stays until every attraction
// waiting on you has been answered. For someone who just joined a trip that is every existing
// attraction, which makes it the checklist to go through. Answers can be changed later from City.
export function PendingAttractionsModal() {
  const { t, displayName } = useLanguage();
  const { pendingAttractions, respondToAttraction, offline } = useTripData();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const open = pendingAttractions.length > 0 && !offline;

  async function answer(a: PendingAttraction, response: 'in' | 'out') {
    if (busyId) return;
    setBusyId(a.id); setError(false);
    try {
      await respondToAttraction(a, response);
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="drawer-overlay" style={{ alignItems: 'center', zIndex: 950 }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          role="dialog" aria-modal="true" aria-label={t('pending.title')}
        >
          <motion.div
            style={{ width: 'calc(100% - 40px)', maxWidth: 420, maxHeight: '84vh', display: 'flex', flexDirection: 'column', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, padding: '20px 18px 14px' }}
            initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', damping: 26, stiffness: 380 }}
          >
            <div style={{ font: "600 18px/1.3 'Noto Sans Hebrew',sans-serif" }}>
              {pendingAttractions.length === 1 ? t('pending.titleOne') : t('pending.title')}
            </div>
            <div style={{ font: "400 12.5px/1.6 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 6 }}>
              {pendingAttractions.length === 1 ? t('pending.descOne') : t('pending.desc', { count: pendingAttractions.length })}
            </div>
            <div style={{ overflow: 'auto', marginTop: 12, minHeight: 0 }}>
              {pendingAttractions.map((a) => (
                <div key={a.id} style={{ padding: '13px 0', borderTop: '1px solid var(--border-soft)', opacity: busyId === a.id ? 0.55 : 1 }}>
                  <div style={{ font: "600 15.5px/1.35 'Noto Sans Hebrew',sans-serif" }}>{displayName(a)}</div>
                  <div style={{ font: "400 12px/1.5 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 3 }}>
                    {[displayName({ nameHe: a.destNameHe, nameEn: a.destNameEn }), a.day && a.day.split('-').slice(1).reverse().join('/'), a.hour, a.addedByName && t('pending.addedBy', { name: a.addedByName })].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <div className="btn btn-accent" style={{ flex: 1, textAlign: 'center', padding: '10px 6px', fontSize: 13 }} onClick={() => answer(a, 'in')}>{t('pending.join')}</div>
                    <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center', padding: '10px 6px', fontSize: 13 }} onClick={() => answer(a, 'out')}>{t('pending.decline')}</div>
                  </div>
                </div>
              ))}
            </div>
            {error && <div style={{ font: "500 12px 'Noto Sans Hebrew',sans-serif", color: 'var(--danger)', marginTop: 8 }}>{t('pending.error')}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
