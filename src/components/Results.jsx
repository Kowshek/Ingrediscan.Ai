import { useState } from 'react';
import { motion } from 'framer-motion';
import ScoreCircle from './ScoreCircle';
import { supabase } from '../lib/supabase';

// ── Star SVG (supports full, half, empty) ─────────────────────────────────
function StarIcon({ fill = 'empty', size = 26, id = 'half-star' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {fill === 'half' && (
        <defs>
          <clipPath id={id}>
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
        </defs>
      )}
      {/* Empty shell */}
      <path
        d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
        fill="#1E293B"
        stroke="#2D3F55"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Filled layer */}
      {(fill === 'full' || fill === 'half') && (
        <path
          d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
          fill="#FBBF24"
          stroke="#FBBF24"
          strokeWidth="1.5"
          strokeLinejoin="round"
          clipPath={fill === 'half' ? `url(#${id})` : undefined}
        />
      )}
    </svg>
  );
}

// ── Star Rating Row ────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(null);

  const getStarFill = (starIdx, display) => {
    if (display >= starIdx + 1) return 'full';
    if (display >= starIdx + 0.5) return 'half';
    return 'empty';
  };

  const handleMouseMove = (e, starIdx) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHovered(starIdx + (x < rect.width / 2 ? 0.5 : 1));
  };

  const handleClick = (e, starIdx) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onChange(starIdx + (x < rect.width / 2 ? 0.5 : 1));
  };

  const display = hovered ?? value ?? 0;

  return (
    <div
      style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
      onMouseLeave={() => setHovered(null)}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          style={{ cursor: 'pointer', lineHeight: 0 }}
          onMouseMove={(e) => handleMouseMove(e, i)}
          onClick={(e) => handleClick(e, i)}
          whileTap={{ scale: 0.88 }}
          transition={{ duration: 0.1 }}
        >
          <StarIcon fill={getStarFill(i, display)} size={26} id={`half-star-${i}`} />
        </motion.div>
      ))}
      {value != null && (
        <span style={{ fontSize: '13px', color: '#64748B', marginLeft: '6px' }}>
          {value % 1 === 0 ? `${value}.0` : value} / 5
        </span>
      )}
    </div>
  );
}

// ── Feedback box (stars + optional text) ──────────────────────────────────
function SuggestionsBox({ score }) {
  const [text, setText] = useState('');
  const [stars, setStars] = useState(null);
  const [starsSubmitted, setStarsSubmitted] = useState(false);
  const [textSubmitted, setTextSubmitted] = useState(false);

  const handleStarClick = (val) => {
    setStars(val);
    setStarsSubmitted(true);
    supabase.from('feedback').insert({
      score,
      stars: val,
      suggestion: null,
    }).then(({ error }) => { if (error) console.error(error); });
  };

  const handleTextSubmit = () => {
    if (!text.trim()) return;
    setTextSubmitted(true);
    supabase.from('feedback').insert({
      score,
      stars: starsSubmitted ? stars : null,
      suggestion: text.trim(),
    }).then(({ error }) => { if (error) console.error(error); });
  };

  const allDone = starsSubmitted && textSubmitted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      <p style={{
        fontSize: '12px',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 600,
      }}>
        Got feedback?
      </p>

      {allDone ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ fontSize: '14px', color: '#4ADE80' }}
        >
          Thanks for the feedback 🙏
        </motion.p>
      ) : (
        <>
          {/* Stars row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
              {starsSubmitted ? `You rated ${stars % 1 === 0 ? `${stars}.0` : stars} / 5 ✓` : 'Rate the analysis'}
            </p>
            {!starsSubmitted && (
              <StarRating value={stars} onChange={handleStarClick} />
            )}
          </div>

          {/* Text area */}
          {!textSubmitted && (
            <>
              <textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What would make this more useful for you?"
                style={{
                  width: '100%',
                  background: '#1E293B',
                  border: '1px solid #2D3F55',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#F1F5F9',
                  fontSize: '14px',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <motion.button
                onClick={handleTextSubmit}
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '1px solid #2D3F55',
                  background: 'transparent',
                  color: '#94A3B8',
                  fontSize: '13px',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  cursor: 'pointer',
                }}
                whileHover={{ borderColor: '#475569', color: '#CBD5E1' }}
                whileTap={{ scale: 0.97 }}
              >
                Send feedback
              </motion.button>
            </>
          )}
        </>
      )}
    </motion.div>
  );
}

const STATUS_MAP = {
  harmful: {
    label: 'Harmful',
    dotCls: 'bg-red-500',
    badgeStyle: {
      background: 'rgba(255,68,68,0.12)',
      color: '#FF4444',
      border: '1px solid rgba(255,68,68,0.25)',
    },
  },
  moderate: {
    label: 'Moderate',
    dotCls: 'bg-amber-400',
    badgeStyle: {
      background: 'rgba(255,179,71,0.12)',
      color: '#FFB347',
      border: '1px solid rgba(255,179,71,0.25)',
    },
  },
  safe: {
    label: 'Safe',
    dotCls: 'bg-emerald-400',
    badgeStyle: {
      background: 'rgba(74,222,128,0.1)',
      color: '#4ADE80',
      border: '1px solid rgba(74,222,128,0.2)',
    },
  },
};

const CONCERN_MAP = {
  carcinogen: {
    label: 'Carcinogen',
    style: {
      background: 'rgba(239,68,68,0.12)',
      color: '#EF4444',
      border: '1px solid rgba(239,68,68,0.25)',
    },
  },
  allergen: {
    label: 'Allergen',
    style: {
      background: 'rgba(245,158,11,0.12)',
      color: '#F59E0B',
      border: '1px solid rgba(245,158,11,0.25)',
    },
  },
  irritant: {
    label: 'Irritant',
    style: {
      background: 'rgba(249,115,22,0.12)',
      color: '#F97316',
      border: '1px solid rgba(249,115,22,0.25)',
    },
  },
  endocrine_disruptor: {
    label: 'Endocrine Disruptor',
    style: {
      background: 'rgba(168,85,247,0.12)',
      color: '#A855F7',
      border: '1px solid rgba(168,85,247,0.25)',
    },
  },
  banned_substance: {
    label: 'Banned',
    style: {
      background: 'rgba(220,38,38,0.12)',
      color: '#DC2626',
      border: '1px solid rgba(220,38,38,0.25)',
    },
  },
  frequent_use_concern: {
    label: 'Regular Use Risk',
    style: {
      background: 'rgba(255,179,71,0.12)',
      color: '#FFB347',
      border: '1px solid rgba(255,179,71,0.25)',
    },
  },
};

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.055, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -14 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

function SectionCard({ children, delay = 0 }) {
  return (
    <motion.div
      className="rounded-3xl p-6 md:p-8"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-5">
      {children}
    </p>
  );
}

export default function Results({ result, onReset, onJoinWaitlist }) {
  // const [feedback, setFeedback] = useState(null); // null | 'up' | 'down'

  const {
    score,
    ingredients = [],
    score_rationale,
    low_confidence_warning,
  } = result;

  const harmful    = ingredients.filter((i) => i.status === 'harmful');
  const moderate   = ingredients.filter((i) => i.status === 'moderate');
  const safe       = ingredients.filter((i) => i.status === 'safe');
  const problematic = [...harmful, ...moderate];
  const allSafe = problematic.length === 0;

  return (
    <motion.div
      className="w-full space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      {/* Low confidence warning banner */}
      {low_confidence_warning && (
        <motion.div
          className="rounded-3xl px-6 py-5 flex items-start gap-3"
          style={{
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.22)',
          }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0 }}
        >
          <span style={{ fontSize: '16px', marginTop: '1px', flexShrink: 0 }}>⚠️</span>
          <p className="text-sm leading-relaxed" style={{ color: '#FCD34D' }}>
            {low_confidence_warning}
          </p>
        </motion.div>
      )}

      {/* Score + Verdict card */}
      <SectionCard delay={0}>
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <ScoreCircle score={score} />

          <div className="flex-1 min-w-0 text-center sm:text-left space-y-3">
            <SectionLabel>Safety Verdict</SectionLabel>

            {/* Score breakdown pills */}
            <motion.div
              className="flex flex-wrap gap-2 justify-center sm:justify-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <span
                className="rounded-full font-medium"
                style={{
                  fontSize: '13px',
                  padding: '6px 14px',
                  background: 'rgba(248,113,113,0.2)',
                  color: '#F87171',
                  border: '1px solid rgba(248,113,113,0.4)',
                }}
              >
                🔴 {harmful.length} Harmful
              </span>
              <span
                className="rounded-full font-medium"
                style={{
                  fontSize: '13px',
                  padding: '6px 14px',
                  background: 'rgba(251,146,60,0.2)',
                  color: '#FB923C',
                  border: '1px solid rgba(251,146,60,0.4)',
                }}
              >
                🟠 {moderate.length} Moderate
              </span>
              {safe.length > 0 && (
                <span
                  className="rounded-full font-medium"
                  style={{
                    fontSize: '13px',
                    padding: '6px 14px',
                    background: 'rgba(74,222,128,0.2)',
                    color: '#4ADE80',
                    border: '1px solid rgba(74,222,128,0.4)',
                  }}
                >
                  🟢 {safe.length} Safe
                </span>
              )}
            </motion.div>

            {/* Score rationale */}
            {score_rationale && (
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed text-center sm:text-left">
                {score_rationale}
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Waitlist CTA — between score and ingredients so it's seen without scrolling */}
      {onJoinWaitlist && (
        <motion.div
          className="rounded-3xl p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(45,212,191,0.07) 0%, rgba(56,189,248,0.07) 100%)',
            border: '1px solid rgba(45,212,191,0.15)',
          }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#2dd4bf' }}>
            Want more scans?
          </p>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#94A3B8' }}>
            Join the waitlist — first users get{' '}
            <span style={{ color: '#4ADE80', fontWeight: 700 }}>10 free scans</span>{' '}
            at launch. Limited spots.
          </p>
          <motion.button
            onClick={onJoinWaitlist}
            className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer"
            style={{
              background: 'rgba(45,212,191,0.12)',
              border: '1px solid rgba(45,212,191,0.25)',
              color: '#2dd4bf',
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
            whileHover={{ background: 'rgba(45,212,191,0.2)', borderColor: 'rgba(45,212,191,0.4)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            Join the Waitlist →
          </motion.button>
        </motion.div>
      )}

      {/* Ingredients to Watch */}
      <SectionCard delay={0.15}>
        <SectionLabel>Ingredients to Watch</SectionLabel>

        {allSafe ? (
          <motion.div
            className="flex items-center gap-3 px-3 py-3 rounded-xl"
            style={{
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.15)',
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span style={{ color: '#4ADE80', fontSize: '15px' }}>✓</span>
            <p className="text-sm font-medium" style={{ color: '#4ADE80' }}>
              No concerning ingredients found. This product looks clean.
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-1"
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            {problematic.map((ing, i) => {
              const s = STATUS_MAP[ing.status] || STATUS_MAP.moderate;
              const concern = ing.concern_type && ing.concern_type !== 'none'
                ? CONCERN_MAP[ing.concern_type] ?? null
                : null;
              return (
                <motion.div
                  key={`${ing.name}-${i}`}
                  variants={itemVariants}
                  className="flex items-start gap-3 px-3 py-3 rounded-xl transition-colors duration-150 hover:bg-white/[0.03]"
                >
                  <span
                    className={`w-2 h-2 rounded-full mt-[5px] shrink-0 ${s.dotCls}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="font-semibold text-zinc-100"
                        style={{ fontSize: '16px', wordBreak: 'break-word' }}
                      >
                        {ing.name}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                        style={s.badgeStyle}
                      >
                        {s.label}
                      </span>
                      {concern && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                          style={concern.style}
                        >
                          {concern.label}
                        </span>
                      )}
                    </div>
                    {ing.reason && (
                      <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                        {ing.reason}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </SectionCard>

      {/* Disclaimer */}
      <p className="text-xs text-zinc-600 text-center px-2">
        AI analysis is for reference only — not medical advice.
      </p>

      {/* Feedback — temporarily hidden
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {feedback === null && (
          <>
            <p className="text-xs text-zinc-600 text-center">Was this analysis helpful?</p>
            <div className="flex gap-3">
              <motion.button
                onClick={() => setFeedback('up')}
                className="px-5 py-2 rounded-xl text-sm cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                whileHover={{ background: 'rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.97 }}
              >
                👍
              </motion.button>
              <motion.button
                onClick={() => setFeedback('down')}
                className="px-5 py-2 rounded-xl text-sm cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                whileHover={{ background: 'rgba(255,255,255,0.08)' }}
                whileTap={{ scale: 0.97 }}
              >
                👎
              </motion.button>
            </div>
          </>
        )}
        {feedback === 'up' && (
          <p className="text-xs text-zinc-500 text-center">Thanks for the feedback</p>
        )}
        {feedback === 'down' && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-zinc-500 text-center">Something look wrong?</p>
            <motion.button
              onClick={onReset}
              className="px-5 py-2 rounded-xl text-sm cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#a1a1aa',
              }}
              whileHover={{ background: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.97 }}
            >
              Rescan this photo
            </motion.button>
          </div>
        )}
      </motion.div>
      */}

      {/* Suggestions */}
      <SuggestionsBox score={score} />

      {/* Reset button */}
      <motion.button
        onClick={onReset}
        className="w-full py-4 rounded-2xl text-zinc-400 font-semibold text-sm transition-colors duration-200 cursor-pointer"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileHover={{
          background: 'rgba(255,255,255,0.06)',
          color: '#f4f4f5',
          borderColor: 'rgba(255,255,255,0.12)',
          transition: { duration: 0.15 },
        }}
        whileTap={{ scale: 0.99 }}
      >
        Scan Another Product
      </motion.button>
    </motion.div>
  );
}
