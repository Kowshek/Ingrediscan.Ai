import { motion, AnimatePresence } from 'framer-motion';
import WaitlistForm from './WaitlistForm';

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="9" x2="12" y2="3" />
      <line x1="15" y1="12" x2="21" y2="12" />
      <line x1="12" y1="15" x2="12" y2="21" />
      <line x1="9" y1="12" x2="3" y2="12" />
    </svg>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const PILLS = ['🔓 10 Free Scans at Launch', '📋 Scan History', '⚡ Faster Results'];


export default function LimitReached() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0A0F1E',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        overflowX: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '300px',
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(45,212,191,0.07) 0%, transparent 70%)',
        }}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{
          position: 'relative',
          maxWidth: '420px',
          margin: '0 auto',
          padding: '0 20px 96px',
        }}
      >
        {/* ── Header ── */}
        <motion.header
          variants={fadeUp}
          style={{ paddingTop: '32px', paddingBottom: '48px', textAlign: 'center' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: 'rgba(45,212,191,0.1)',
                border: '1px solid rgba(45,212,191,0.2)',
                color: '#2dd4bf',
              }}
            >
              <Logo />
            </div>
            <span
              style={{
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#f4f4f5',
                fontSize: 'clamp(1.1rem, 5vw, 1.35rem)',
              }}
            >
              IngrediScan.Ai
            </span>
          </div>
        </motion.header>

        {/* ── Hero ── */}
        <motion.section
          variants={fadeUp}
          style={{ marginBottom: '52px', textAlign: 'center' }}
        >
          <h1
            style={{
              color: '#f4f4f5',
              fontWeight: 700,
              fontSize: 'clamp(1.5rem, 6vw, 2rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              marginBottom: '16px',
            }}
          >
            You&apos;ve used your <br></br>3 free scans
          </h1>
          <p
            style={{
              color: '#F1F5F9',
              fontSize: '15px',
              lineHeight: 1.7,
              maxWidth: '320px',
              margin: '0 auto',
            }}
          >
            You&apos;re clearly someone who cares about what goes into your body. So are we.
          </p>
        </motion.section>

        {/* ── Coming soon ── */}
        <motion.section variants={fadeUp} style={{ marginBottom: '52px' }}>
          <span
            style={{
              display: 'inline-block',
              color: '#2dd4bf',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            Coming Soon
          </span>
          <h2
            style={{
              color: '#f4f4f5',
              fontWeight: 700,
              fontSize: 'clamp(1.1rem, 5vw, 1.35rem)',
              letterSpacing: '-0.02em',
              marginBottom: '20px',
            }}
          >
            More scanning. Launching soon.
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {PILLS.map((pill) => (
              <span
                key={pill}
                style={{
                  background: '#1E293B',
                  color: '#F1F5F9',
                  fontSize: '13px',
                  fontWeight: 500,
                  padding: '6px 14px',
                  borderRadius: '9999px',
                }}
              >
                {pill}
              </span>
            ))}
          </div>
        </motion.section>

        {/* ── Waitlist form ── */}
        <motion.section variants={fadeUp} style={{ marginBottom: '52px' }}>
          <h2
            style={{
              color: '#f4f4f5',
              fontWeight: 700,
              fontSize: 'clamp(1.1rem, 5vw, 1.35rem)',
              letterSpacing: '-0.02em',
              marginBottom: '8px',
            }}
          >
            Get early access
          </h2>
          <p
            style={{
              color: '#F1F5F9',
              fontSize: '14px',
              lineHeight: 1.6,
              marginBottom: '28px',
            }}
          >
            Join the waitlist<br></br> first users get{' '}
            <span style={{ fontSize: '1.2em', fontWeight: 800, color: '#4ADE80' }}>10 free scans</span>{' '}
            at launch.
          </p>
          <WaitlistForm />
        </motion.section>

        {/* ── Footer ── */}
        <motion.footer variants={fadeUp} style={{ textAlign: 'center' }}>
          <p style={{ color: '#F1F5F9', fontSize: '13px', marginBottom: '16px' }}>
            Already on the waitlist?
          </p>
          <motion.a
            href="https://www.ingrediscan.in/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#F1F5F9',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
              marginBottom: '28px',
            }}
            whileHover={{
              borderColor: 'rgba(255,255,255,0.25)',
              color: '#d4d4d8',
              transition: { duration: 0.15 },
            }}
            whileTap={{ scale: 0.97 }}
          >
            Visit our website →
          </motion.a>
          <p style={{ color: '#F1F5F9', fontSize: '12px' }}>
            Built by Kowshek &amp; Kavin · Tamil Nadu, India
          </p>
          <a
            href="https://www.ingrediscan.in/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#94A3B8', fontSize: '11px', textDecoration: 'none', marginTop: '6px', display: 'inline-block' }}
          >
            Privacy Policy
          </a>
        </motion.footer>
      </motion.div>
    </div>
  );
}
