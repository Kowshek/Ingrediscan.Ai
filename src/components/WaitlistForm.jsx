import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { track } from '../lib/analytics';

const FIELDS = [
  { id: 'name',     label: 'Name',                                                type: 'text',  placeholder: 'Your name',                    required: true  },
  { id: 'email',    label: 'Email',                                               type: 'email', placeholder: 'you@example.com',              required: true  },
  { id: 'mobile',   label: 'Mobile Number',                                       type: 'tel',   placeholder: 'Your phone number',            required: false },
  { id: 'source',   label: 'Where did you hear from us?',                         type: 'text',  placeholder: 'e.g. Instagram, a friend…',    required: true  },
  { id: 'products', label: 'What product would you scan first?',                  type: 'text',  placeholder: 'e.g. protein powder, snacks…', required: false },
  { id: 'barrier',  label: "What's stopping you from paying ₹99/month for this?", type: 'text',  placeholder: 'Be honest — it helps us',      required: false },
];

const EMPTY_FIELDS = { name: '', email: '', mobile: '', source: '', products: '', barrier: '' };

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

export default function WaitlistForm() {
  const [fields, setFields] = useState(EMPTY_FIELDS);
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
      supabase.from('waitlist').insert({
        name:     fields.name,
        email:    fields.email,
        mobile:   fields.mobile   || null,
        source:   fields.source,
        products: fields.products || null,
        blocker:  fields.barrier  || null,
      }).then(({ error }) => { if (error) console.error(error); });
      track('waitlist_submitted', { source: fields.source || 'unknown' });
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
      {FIELDS.map(({ id, label, type, placeholder, required }) => (
        <div key={id}>
          <label htmlFor={id} style={LABEL_STYLE}>
            {label}
            {required && <span style={{ color: '#38BDF8', marginLeft: '4px' }}>*</span>}
          </label>
          <input
            id={id}
            type={type}
            placeholder={placeholder}
            value={fields[id]}
            required={required}
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
