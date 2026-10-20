import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../state/LanguageContext';
import { CardIcon, CheckIcon, MapPinIcon, TranslateIcon, TripIcon } from './Icons';

// Four short slides shown once to every user (and again from Settings). Copy lives in the
// dictionaries under `tour.*` so it follows the UI language like everything else.
const SLIDES = [
  { key: 'route', Icon: TripIcon, Icon2: MapPinIcon },
  { key: 'mark', Icon: CheckIcon, Icon2: null },
  { key: 'budget', Icon: CardIcon, Icon2: null },
  { key: 'translate', Icon: TranslateIcon, Icon2: null },
] as const;

export function OnboardingTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, dir } = useLanguage();
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  function close() {
    onClose();
    // After the exit animation, so the first slide doesn't flash while it fades out.
    setTimeout(() => setIndex(0), 250);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: 'calc(18px + env(safe-area-inset-top)) 26px calc(26px + env(safe-area-inset-bottom))' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          role="dialog" aria-modal="true" aria-label={t('tour.title')}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 34 }}>
            {!last && (
              <div onClick={close} style={{ font: "500 13px 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', cursor: 'pointer', padding: '8px 2px' }}>{t('tour.skip')}</div>
            )}
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={slide.key}
                initial={{ opacity: 0, x: dir === 'rtl' ? -28 : 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir === 'rtl' ? 28 : -28 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 340 }}
              >
                <div style={{
                  width: 112, height: 112, borderRadius: '50%', background: 'var(--card-soft)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--accent)',
                }}>
                  <div style={{ display: 'flex', gap: 8, transform: 'scale(1.9)' }}>
                    <slide.Icon />
                    {slide.Icon2 && <slide.Icon2 />}
                  </div>
                </div>
                <div style={{ font: "600 24px/1.3 'Noto Sans Hebrew',sans-serif", letterSpacing: '-.3px', marginTop: 30 }}>{t(`tour.${slide.key}.title`)}</div>
                <div style={{ font: "400 14.5px/1.7 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', marginTop: 12 }}>{t(`tour.${slide.key}.body`)}</div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 20 }}>
            {SLIDES.map((s, i) => (
              <div key={s.key} style={{ width: i === index ? 22 : 7, height: 7, borderRadius: 999, background: i === index ? 'var(--accent)' : 'var(--border)', transition: 'width .2s, background .2s' }} />
            ))}
          </div>
          <div className="btn btn-accent" style={{ textAlign: 'center', padding: 16 }} onClick={() => (last ? close() : setIndex(index + 1))}>
            {last ? t('tour.done') : t('tour.next')}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
