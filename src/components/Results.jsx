import { motion } from 'framer-motion';
import ScoreCircle from './ScoreCircle';

const STATUS_MAP = {
  harmful: {
    label: 'Harmful',
    dotCls: 'bg-red-400',
    badgeStyle: {
      background: 'rgba(239,68,68,0.1)',
      color: '#f87171',
      border: '1px solid rgba(239,68,68,0.2)',
    },
  },
  decent: {
    label: 'Moderate',
    dotCls: 'bg-orange-400',
    badgeStyle: {
      background: 'rgba(249,115,22,0.1)',
      color: '#fb923c',
      border: '1px solid rgba(249,115,22,0.2)',
    },
  },
  safe: {
    label: 'Safe',
    dotCls: 'bg-emerald-400',
    badgeStyle: {
      background: 'rgba(34,197,94,0.1)',
      color: '#4ade80',
      border: '1px solid rgba(34,197,94,0.2)',
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

export default function Results({ result, imagePreview, onReset }) {
  const { score, verdict, ingredients = [], alternatives = [] } = result;

  const harmful = ingredients.filter((i) => i.status === 'harmful');
  const decent = ingredients.filter((i) => i.status === 'decent');
  const safe = ingredients.filter((i) => i.status === 'safe');
  const sorted = [...harmful, ...decent, ...safe];

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

          <div className="flex-1 text-center sm:text-left space-y-3">
            <SectionLabel>Safety Verdict</SectionLabel>
            <motion.p
              className="text-zinc-100 text-xl font-semibold leading-snug"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {verdict}
            </motion.p>

            {/* Stat pills */}
            <motion.div
              className="flex flex-wrap gap-2 justify-center sm:justify-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {harmful.length > 0 && (
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={STATUS_MAP.harmful.badgeStyle}
                >
                  {harmful.length} harmful
                </span>
              )}
              {decent.length > 0 && (
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={STATUS_MAP.decent.badgeStyle}
                >
                  {decent.length} moderate
                </span>
              )}
              {safe.length > 0 && (
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={STATUS_MAP.safe.badgeStyle}
                >
                  {safe.length} safe
                </span>
              )}
            </motion.div>
          </div>

          {/* Thumbnail */}
          {imagePreview && (
            <motion.div
              className="shrink-0"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
            >
              <img
                src={imagePreview}
                alt="Scanned product"
                className="w-24 h-24 rounded-2xl object-cover"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </motion.div>
          )}
        </div>
      </SectionCard>

      {/* Ingredients */}
      {sorted.length > 0 && (
        <SectionCard delay={0.15}>
          <SectionLabel>
            Ingredients Analysis &middot; {sorted.length} identified
          </SectionLabel>
          <motion.div
            className="space-y-1"
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            {sorted.map((ing, i) => {
              const s = STATUS_MAP[ing.status] || STATUS_MAP.safe;
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
                      <span className="text-sm font-medium text-zinc-100">
                        {ing.name}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={s.badgeStyle}
                      >
                        {s.label}
                      </span>
                    </div>
                    {ing.reason && (
                      <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                        {ing.reason}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </SectionCard>
      )}

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <SectionCard delay={0.3}>
          <SectionLabel>Safer Alternatives</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {alternatives.map((alt, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-3 p-4 rounded-2xl"
                style={{
                  background: 'rgba(45,212,191,0.04)',
                  border: '1px solid rgba(45,212,191,0.12)',
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + i * 0.1 }}
                whileHover={{
                  borderColor: 'rgba(45,212,191,0.28)',
                  background: 'rgba(45,212,191,0.07)',
                  transition: { duration: 0.15 },
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{
                    background: 'rgba(45,212,191,0.12)',
                    color: '#2dd4bf',
                  }}
                >
                  {i + 1}
                </div>
                <span className="text-zinc-300 text-sm font-medium leading-snug">
                  {alt}
                </span>
              </motion.div>
            ))}
          </div>
        </SectionCard>
      )}

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
