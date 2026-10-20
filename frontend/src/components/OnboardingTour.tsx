import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../state/LanguageContext';
import { CardIcon, CheckIcon, FolderIcon, MapPinIcon, TranslateIcon, TripIcon } from './Icons';

// Short slides shown once to every user (and again from Settings). Copy lives in the
// dictionaries under `tour.*` so it follows the UI language like everything else.
const SLIDES = [
  { key: 'route', Icon: TripIcon },
  { key: 'map', Icon: MapPinIcon },
  { key: 'mark', Icon: CheckIcon },
  { key: 'budget', Icon: CardIcon },
  { key: 'documents', Icon: FolderIcon },
  { key: 'translate', Icon: TranslateIcon },
] as const;

// Going forward brings the next slide in from the side the language reads toward: from the right in
// English (LTR), from the left in Hebrew (RTL). Going back is the mirror image.
function makeVariants(dir: 'rtl' | 'ltr') {
  const from = dir === 'rtl' ? -1 : 1;
  return {
    enter: (forward: boolean) => ({ opacity: 0, x: (forward ? from : -from) * 28 }),
    center: { opacity: 1, x: 0 },
    exit: (forward: boolean) => ({ opacity: 0, x: (forward ? -from : from) * 28 }),
  };
}

export function OnboardingTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, dir } = useLanguage();
  const [index, setIndex] = useState(0);
  // Which way the last step went, so the slide leaves and arrives from the matching sides.
  const [forward, setForward] = useState(true);
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];
  const variants = makeVariants(dir);

  function go(to: number) {
    setForward(to > index);
    setIndex(to);
  }

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
            <AnimatePresence mode="wait" initial={false} custom={forward}>
              <motion.div
                key={slide.key}
                custom={forward} variants={variants} initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 340 }}
              >
                <div style={{
                  width: 112, height: 112, borderRadius: '50%', background: 'var(--card-soft)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--accent)',
                }}>
                  <div style={{ display: 'flex', gap: 8, transform: 'scale(1.9)' }}>
                    <slide.Icon />
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
          <div style={{ display: 'flex', gap: 10 }}>
            {index > 0 && (
              <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center', padding: 16 }} onClick={() => go(index - 1)}>{t('tour.back')}</div>
            )}
            <div className="btn btn-accent" style={{ flex: index > 0 ? 2 : 1, textAlign: 'center', padding: 16 }} onClick={() => (last ? close() : go(index + 1))}>
              {last ? t('tour.done') : t('tour.next')}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
