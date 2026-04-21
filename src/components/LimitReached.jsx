import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

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

const FIELDS = [
  { id: 'name',     label: 'Name',                                              type: 'text',  placeholder: 'Your name' },
  { id: 'email',    label: 'Email',                                             type: 'email', placeholder: 'you@example.com' },
  { id: 'products', label: 'What products would you scan first?',               type: 'text',  placeholder: 'e.g. protein powder, snacks…' },
  { id: 'source',   label: 'How did you hear about us?',                        type: 'text',  placeholder: 'e.g. Instagram, a friend…' },
  { id: 'barrier',  label: "What's stopping you from paying ₹99/month for this?", type: 'text', placeholder: 'Be honest — it helps us' },
];

const INPUT_STYLE = {
  width: '100%',
  background: '#1E293B',
  border: '1px solid #2D3F55',
  borderRadius: '10px',
  padding: '14px 16px',
  color: '#F1F5F9',
  fontSize: '15px',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const LABEL_STYLE = {
  display: 'block',
  fontSize: '12px',
  color: '#94A3B8',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '8px',
  fontWeight: 500,
};

function WaitlistForm({ initialData }) {
  const [fields, setFields] = useState(initialData);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [focused, setFocused] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await fetch('https://tally.so/r/5BG78o', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(fields),
        mode: 'no-cors',
      });
      // Backup to Supabase — fire-and-forget, never blocks the UI
      supabase.from('waitlist').insert({
        name: fields.name,
        email: fields.email,
        products: fields.products,
        source: fields.source,
        blocker: fields.barrier,
      }).then(({ error }) => { if (error) console.error(error); });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: 'center', padding: '32px 0' }}
      >
        <p style={{ fontSize: '24px', marginBottom: '12px' }}>🎉</p>
        <p style={{ color: '#F1F5F9', fontSize: '16px', fontWeight: 600, lineHeight: 1.5 }}>
          You&apos;re on the list! We&apos;ll notify you at launch with{' '}
          <span style={{ color: '#4ADE80', fontWeight: 800 }}>10 free scans</span>.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {FIELDS.map(({ id, label, type, placeholder }) => (
        <div key={id}>
          <label htmlFor={id} style={LABEL_STYLE}>{label}</label>
          <input
            id={id}
            type={type}
            placeholder={placeholder}
            value={fields[id]}
            required={id === 'name' || id === 'email'}
            onChange={(e) => setFields((p) => ({ ...p, [id]: e.target.value }))}
            onFocus={() => setFocused(id)}
            onBlur={() => setFocused(null)}
            style={{
              ...INPUT_STYLE,
              borderColor: focused === id ? '#38BDF8' : '#2D3F55',
            }}
          />
        </div>
      ))}

      {status === 'error' && (
        <p style={{ color: '#F87171', fontSize: '13px', margin: 0 }}>
          Something went wrong — please try again.
        </p>
      )}

      <motion.button
        type="submit"
        disabled={status === 'loading'}
        style={{
          width: '100%',
          height: '52px',
          background: status === 'loading' ? '#1E293B' : '#38BDF8',
          color: status === 'loading' ? '#94A3B8' : '#000',
          fontWeight: 700,
          fontSize: '15px',
          fontFamily: "'DM Sans', system-ui, sans-serif",
          borderRadius: '14px',
          border: 'none',
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
        }}
        whileHover={status !== 'loading' ? { background: '#7DD3FC' } : {}}
        whileTap={status !== 'loading' ? { scale: 0.98 } : {}}
      >
        {status === 'loading' ? 'Submitting…' : 'Join the Waitlist'}
      </motion.button>
    </motion.form>
  );
}

const EMPTY_FIELDS = { name: '', email: '', products: '', source: '', barrier: '' };

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
            You&apos;ve used your 3 free scans
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
            Join the waitlist — first users get{' '}
            <span style={{ fontSize: '1.2em', fontWeight: 800, color: '#4ADE80' }}>10 free scans</span>{' '}
            at launch. Limited spots.
          </p>
          <WaitlistForm initialData={EMPTY_FIELDS} />
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
        </motion.footer>
      </motion.div>
    </div>
  );
}
