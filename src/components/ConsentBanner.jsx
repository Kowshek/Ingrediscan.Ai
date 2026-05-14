import { motion, AnimatePresence } from 'framer-motion';
import { giveConsent, denyConsent } from '../lib/consent';
import { initAnalytics } from '../lib/analytics';

export default function ConsentBanner({ visible, onDecide }) {
  const handleAccept = () => {
    giveConsent();
    initAnalytics();
    onDecide();
  };

  const handleDecline = () => {
    denyConsent();
    onDecide();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '16px',
            right: '16px',
            width: 'auto',
            maxWidth: '560px',
            margin: '0 auto',
            zIndex: 1000,
            background: '#0F1923',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          }}
        >
          {/* Icon */}
          <div
            style={{
              flexShrink: 0,
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(45,212,191,0.1)',
              border: '1px solid rgba(45,212,191,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            🍪
          </div>

          {/* Text */}
          <p style={{
            flex: 1,
            fontSize: '13px',
            color: '#94A3B8',
            lineHeight: 1.5,
            margin: 0,
          }}>
            We use anonymous analytics to improve IngrediScan. No ads, no selling data.{' '}
            <a
              href="https://www.ingrediscan.in/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2DD4BF', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              Privacy Policy ↗
            </a>
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <motion.button
              onClick={handleDecline}
              whileHover={{ background: 'rgba(255,255,255,0.07)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: '#64748B',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              Decline
            </motion.button>
            <motion.button
              onClick={handleAccept}
              whileHover={{ background: '#5EEAD4' }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: 'none',
                background: '#2DD4BF',
                color: '#000',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              Accept
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
