import { useState } from 'react';
import { motion } from 'framer-motion';
import ScoreCircle from './ScoreCircle';

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

export default function Results({ result, onReset }) {
  const [feedback, setFeedback] = useState(null); // null | 'up' | 'down'

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

      {/* Feedback */}
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
