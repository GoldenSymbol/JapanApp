import { AnimatePresence, motion } from 'framer-motion';
import { useTripData } from '../state/TripDataContext';
import { useLanguage } from '../state/LanguageContext';

export function OfflineBanner() {
  const { offline } = useTripData();
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ overflow: 'hidden', flex: 'none' }}
        >
          <div style={{
            padding: '8px 22px', textAlign: 'center',
            font: "500 12px 'Noto Sans Hebrew',sans-serif",
            background: 'var(--card-soft)', color: 'var(--text-dim)',
            borderBottom: '1px solid var(--border)',
          }}>
            {t('offline.banner')}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
