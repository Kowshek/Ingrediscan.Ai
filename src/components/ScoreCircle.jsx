import { motion } from 'framer-motion';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getColor(score) {
  if (score <= 4) return '#ef4444';
  if (score <= 7) return '#f97316';
  return '#22c55e';
}

function getLabel(score) {
  if (score <= 4) return 'Harmful';
  if (score <= 7) return 'Moderate';
  return 'Safe';
}

export default function ScoreCircle({ score }) {
  const color = getColor(score);
  const targetOffset = CIRCUMFERENCE * (1 - score / 10);

  return (
    <div className="flex flex-col items-center gap-3 shrink-0">
      <div className="relative w-36 h-36">
        {/* Glow effect */}
        <div
          className="absolute inset-4 rounded-full blur-xl opacity-20"
          style={{ backgroundColor: color }}
        />

        <svg
          width="144"
          height="144"
          viewBox="0 0 144 144"
          className="relative -rotate-90"
        >
          {/* Track */}
          <circle
            cx="72"
            cy="72"
            r={RADIUS}
            fill="none"
            stroke="#1f2023"
            strokeWidth="9"
          />
          {/* Progress */}
          <motion.circle
            cx="72"
            cy="72"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={{ duration: 1.6, ease: [0.34, 1.2, 0.64, 1], delay: 0.2 }}
          />
        </svg>

        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-bold leading-none tabular-nums"
            style={{ color }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.9, ease: 'backOut' }}
          >
            {score}
          </motion.span>
          <motion.span
            className="text-zinc-600 text-xs font-medium mt-0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            / 10
          </motion.span>
        </div>
      </div>

      {/* Label badge */}
      <motion.span
        className="text-xs font-semibold px-3 py-1 rounded-full tracking-wide"
        style={{
          backgroundColor: `${color}18`,
          color,
          border: `1px solid ${color}35`,
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        {getLabel(score)}
      </motion.span>
    </div>
  );
}
