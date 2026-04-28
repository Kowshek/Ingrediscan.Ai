import { motion } from 'framer-motion';
import WaitlistForm from './WaitlistForm';

function BackArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export default function WaitlistPage({ onBack }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#08090a',
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
          background: 'radial-gradient(ellipse at 50% 0%, rgba(45,212,191,0.07) 0%, transparent 70%)',
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
        {/* Back button */}
        <motion.div variants={fadeUp} style={{ paddingTop: '24px', paddingBottom: '8px' }}>
          <motion.button
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              fontSize: '14px',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              cursor: 'pointer',
              padding: '6px 0',
            }}
            whileHover={{ color: '#94A3B8' }}
            whileTap={{ scale: 0.97 }}
          >
            <BackArrow />
            Back
          </motion.button>
        </motion.div>

        {/* Header */}
        <motion.section variants={fadeUp} style={{ paddingTop: '32px', paddingBottom: '12px' }}>
          <span
            style={{
              display: 'inline-block',
              color: '#2dd4bf',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }}
          >
            Early Access
          </span>
          <h1
            style={{
              color: '#f4f4f5',
              fontWeight: 700,
              fontSize: 'clamp(1.5rem, 6vw, 2rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              marginBottom: '14px',
            }}
          >
            Get early access
          </h1>
          <p
            style={{
              color: '#94A3B8',
              fontSize: '15px',
              lineHeight: 1.65,
              marginBottom: '36px',
            }}
          >
            Join the waitlist — first users get{' '}
            <span style={{ color: '#4ADE80', fontWeight: 700 }}>10 free scans</span>{' '}
            at launch. Limited spots.
          </p>
        </motion.section>

        {/* Form */}
        <motion.section variants={fadeUp}>
          <WaitlistForm />
        </motion.section>
      </motion.div>
    </div>
  );
}
