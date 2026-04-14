import { motion } from 'framer-motion';

function ScanIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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

export default function LimitReached({ onReset }) {
  return (
    <motion.div
      key="limit"
      className="flex flex-col items-center gap-6 py-16 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: 'rgba(45,212,191,0.08)',
          border: '1px solid rgba(45,212,191,0.2)',
          color: '#2dd4bf',
        }}
      >
        <ScanIcon />
      </div>

      <div
        className="rounded-3xl p-6 md:p-8 w-full max-w-sm space-y-5"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="space-y-2">
          <p className="text-zinc-100 font-semibold text-lg">
            You&apos;ve used your 3 free scans
          </p>
          <p className="text-zinc-500 text-sm leading-relaxed">
            Join the waitlist to get 10 free scans when we launch — limited spots.
          </p>
        </div>

        <motion.a
          href="https://tally.so/r/5BG78o"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 rounded-xl font-semibold text-sm text-center cursor-pointer"
          style={{
            background: 'rgba(45,212,191,0.08)',
            border: '1px solid rgba(45,212,191,0.25)',
            color: '#2dd4bf',
          }}
          whileHover={{
            background: 'rgba(45,212,191,0.14)',
            borderColor: 'rgba(45,212,191,0.4)',
            transition: { duration: 0.15 },
          }}
          whileTap={{ scale: 0.98 }}
        >
          Join the Waitlist
        </motion.a>

        <p className="text-xs text-zinc-600 text-center">
          Already on the list? We&apos;ll reach out.
        </p>
      </div>
    </motion.div>
  );
}
