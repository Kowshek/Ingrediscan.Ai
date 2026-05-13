import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Sentry from '@sentry/react';
import UploadZone from './components/UploadZone';
import Results from './components/Results';
import LimitReached from './components/LimitReached';
import WaitlistPage from './components/WaitlistPage';
import Onboarding from './components/Onboarding';
import AppErrorFallback from './components/AppErrorFallback';
import { analyzeIngredients } from './utils/analyzeImage';
import { track } from './lib/analytics';
import './App.css';

// ── Loading state ──────────────────────────────────────────────────────────
function LoadingState({ imagePreview }) {
  return (
    <motion.div
      key="loading"
      className="flex flex-col items-center gap-10 py-16"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
    >
      {imagePreview && (
        <div className="relative w-44 h-44">
          <img
            src={imagePreview}
            alt="Scanning"
            className="w-full h-full object-cover rounded-2xl"
            style={{
              filter: 'brightness(0.45) saturate(0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
          {/* Scan line */}
          <motion.div
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, #2dd4bf 50%, transparent 100%)',
              boxShadow: '0 0 10px 1px #2dd4bf88',
            }}
            animate={{ top: ['8%', '92%', '8%'] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Corner brackets */}
          {[
            'top-2 left-2 border-l-2 border-t-2',
            'top-2 right-2 border-r-2 border-t-2',
            'bottom-2 left-2 border-l-2 border-b-2',
            'bottom-2 right-2 border-r-2 border-b-2',
          ].map((cls, i) => (
            <div
              key={i}
              className={`absolute w-5 h-5 border-teal-400 ${cls}`}
            />
          ))}
        </div>
      )}

      <div className="text-center space-y-2">
        <motion.p
          className="text-lg font-semibold text-zinc-100"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Analyzing ingredients...
        </motion.p>
        <p className="text-zinc-600 text-sm">AI is reading your product label</p>
      </div>

      {/* Dot loader */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-teal-400"
            animate={{ scale: [1, 1.6, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.22 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Error state ────────────────────────────────────────────────────────────
function ErrorState({ error, onRetry }) {
  const isLimitError    = error === 'scan_limit_reached';
  const isMedicine      = error === 'medicine_not_supported';
  const isOverloaded    = typeof error === 'string' && error.toLowerCase().includes('high demand');

  const icon    = isLimitError ? '🔒' : isMedicine ? '💊' : isOverloaded ? '⏳' : '⚠️';
  const accent  = isMedicine
    ? { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.22)', color: '#FCD34D' }
    : isLimitError
    ? { bg: 'rgba(45,212,191,0.08)',  border: 'rgba(45,212,191,0.2)',  color: '#2dd4bf' }
    : { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   color: '#f87171' };

  const title = isLimitError
    ? "You've used your 3 free scans"
    : isMedicine
    ? "Medicine detected — not supported"
    : 'Analysis Failed';

  const body = isLimitError
    ? 'Join the waitlist to get 10 free scans when we launch the full version.'
    : isMedicine
    ? 'IngrediScan analyses food and personal care products only. We don\'t scan prescription or OTC medicines — please consult a pharmacist or doctor for medication questions.'
    : error;

  return (
    <motion.div
      key="error"
      className="flex flex-col items-center gap-6 py-16 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: accent.bg, border: `1px solid ${accent.border}` }}
      >
        {icon}
      </div>
      <div className="space-y-2 max-w-sm">
        <p className="text-zinc-100 font-semibold text-lg">{title}</p>
        <p className="text-zinc-500 text-sm leading-relaxed">{body}</p>
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        {isLimitError ? (
          <>
            <motion.a
              href="https://www.ingrediscan.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-6 py-3 rounded-xl font-semibold text-sm text-center"
              style={{ background: '#2dd4bf', color: '#000', display: 'block' }}
              whileHover={{ opacity: 0.9 }}
              whileTap={{ scale: 0.97 }}
            >
              Join the waitlist →
            </motion.a>
            <motion.a
              href="https://www.ingrediscan.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-6 py-3 rounded-xl text-zinc-400 font-medium text-sm text-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'block',
              }}
              whileHover={{ background: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.97 }}
            >
              Visit ingrediscan.in
            </motion.a>
          </>
        ) : (
          <motion.button
            onClick={onRetry}
            className="px-6 py-3 rounded-xl font-medium text-sm cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: isMedicine ? '#FCD34D' : '#e4e4e7',
            }}
            whileHover={{ background: 'rgba(255,255,255,0.09)' }}
            whileTap={{ scale: 0.97 }}
          >
            {isMedicine ? 'Scan a food product instead' : 'Try Again'}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ── Logo ───────────────────────────────────────────────────────────────────
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

// ── App (wrapped in Sentry Error Boundary) ────────────────────────────────
// If any unhandled JS exception reaches the root, Sentry captures it and the
// user sees AppErrorFallback instead of a white screen.
// The boundary is outside all state, so it catches render errors too.
function AppInner() {
  const [onboardingDone, setOnboardingDone] = useState(() =>
    localStorage.getItem('onboarding_complete') === 'true'
  );
  // ?preview=limit in the URL forces the limit screen (dev convenience only)
  const [phase, setPhase] = useState(() =>
    import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'limit'
      ? 'limit'
      : 'idle'
  ); // idle | loading | result | error | limit
  const [result, setResult] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [scanCount, setScanCount] = useState(() =>
    parseInt(localStorage.getItem('ingrediscan_scan_count') || '0', 10)
  );

  const handleAnalyze = useCallback(async (file) => {
    // Client-side limit check (fast path — avoids unnecessary API call)
    // Bypassed in dev so you can stress-test locally without clearing storage.
    if (!import.meta.env.DEV && scanCount >= 3) {
      track('scan_limit_reached', { source: 'client', scans_used: scanCount });
      setPhase('limit');
      return;
    }

    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setPhase('loading');
    setError(null);
    track('scan_started', { scan_number: scanCount + 1 });

    try {
      const data = await analyzeIngredients(file);
      const next = scanCount + 1;
      setScanCount(next);
      localStorage.setItem('ingrediscan_scan_count', String(next));

      // Server returned a structured error (e.g. medicine not supported).
      // Don't render the Results component with garbage data — show a proper error.
      if (data.error) {
        setError(data.error === 'Medicine scanning not supported.'
          ? 'medicine_not_supported'
          : data.error);
        setPhase('error');
        return;
      }

      setResult(data);
      setPhase('result');
      track('scan_completed', {
        score: data.score,
        harmful_count: data.ingredients?.filter(i => i.status === 'harmful').length ?? 0,
        moderate_count: data.ingredients?.filter(i => i.status === 'moderate').length ?? 0,
        total_flagged: data.ingredients?.length ?? 0,
        has_confidence_warning: !!data.low_confidence_warning,
        scan_number: next,
      });
    } catch (err) {
      // Server confirmed the free limit was hit (user bypassed localStorage)
      // Check both err.code (typed error) and err.message (fallback)
      if (err.code === 'scan_limit_reached' || err.message === 'scan_limit_reached') {
        track('scan_limit_reached', { source: 'server', scans_used: scanCount });
        localStorage.setItem('ingrediscan_scan_count', '3');
        setScanCount(3);
        setPhase('limit');
        return;
      }
      track('scan_error', { reason: err.message });
      setError(err.message || 'Something went wrong. Please try again.');
      setPhase('error');
    }
  }, [scanCount]);

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setError(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  }, [imagePreview]);

  if (!onboardingDone) {
    return (
      <Onboarding onComplete={() => {
        track('onboarding_completed');
        setOnboardingDone(true);
      }} />
    );
  }

  if (phase === 'limit') {
    return <LimitReached />;
  }

  if (phase === 'waitlist') {
    return <WaitlistPage onBack={() => setPhase('idle')} />;
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: '#08090a',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Ambient glow at top */}
      <div
        className="fixed top-0 left-0 right-0 h-[300px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(45,212,191,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-2xl mx-auto px-4 pt-8 pb-24 md:pt-10">
        {/* Header */}
        <motion.header
          className="mb-8 md:mb-12 text-center"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="flex items-center justify-center gap-2.5 mb-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(45,212,191,0.1)',
                border: '1px solid rgba(45,212,191,0.2)',
                color: '#2dd4bf',
              }}
            >
              <Logo />
            </div>
            <h1
              className="font-bold tracking-tight"
              style={{
                color: '#f4f4f5',
                fontSize: 'clamp(1.2rem, 5vw, 1.5rem)',
              }}
            >
              IngrediScan.Ai
            </h1>
          </div>
          <p className="text-sm" style={{ color: '#9c9c9c' }}>
            Know what&apos;s really in your products
          </p>
        </motion.header>

        {/* Content */}
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <UploadZone key="upload" onAnalyze={handleAnalyze} onJoinWaitlist={() => setPhase('waitlist')} />
          )}
          {phase === 'loading' && (
            <LoadingState key="loading" imagePreview={imagePreview} />
          )}
          {phase === 'result' && (
            <Results
              key="result"
              result={result}
              onReset={reset}
              onJoinWaitlist={() => setPhase('waitlist')}
            />
          )}
          {phase === 'error' && (
            <ErrorState key="error" error={error} onRetry={reset} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={AppErrorFallback} showDialog={false}>
      <AppInner />
    </Sentry.ErrorBoundary>
  );
}
