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
  decent: {
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
  const { score, ingredients = [] } = result;

  const harmful = ingredients.filter((i) => i.status === 'harmful');
  const decent  = ingredients.filter((i) => i.status === 'decent');
  const safe    = ingredients.filter((i) => i.status === 'safe');
  const problematic = [...harmful, ...decent];
  const allSafe = problematic.length === 0;

  return (
    <motion.div
      className="w-full space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
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
                🟠 {decent.length} Moderate
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
              const s = STATUS_MAP[ing.status] || STATUS_MAP.decent;
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
