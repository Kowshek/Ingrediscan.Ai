import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import confetti from 'canvas-confetti';

const SLIDE_DURATION = 4000;
const TAP_THRESHOLD_MS = 250;

const SLIDES = [
  {
    isWelcome: true,
    duration: 5000,
    blob: { color: 'rgba(13,40,24,0.98)', pos: '50% 50%', size: '100% 80%' },
    heading: '',
    subtext: '',
  },
  {
    heading: "You buy products daily.",
    subtext: "But do you actually know what's in them?",
    blob: { color: 'rgba(37,99,235,0.16)', pos: '50% 38%', size: '90% 70%' },
  },
  {
    heading: "Ingredients can be harmful.",
    subtext: "Parabens. Sulfates. Synthetic dyes. They're hiding in plain sight.",
    blob: { color: 'rgba(239,68,68,0.14)', pos: '70% 28%', size: '75% 55%' },
  },
  {
    heading: "One photo. Instant analysis.",
    subtext: "Point your camera at any ingredient list. AI does the rest.",
    blob: { color: 'rgba(34,211,238,0.12)', pos: '50% 65%', size: '80% 60%' },
  },
  {
    heading: "3 free scans. No login.",
    subtext: "Start scanning and see what's really in your products.",
    blob: { color: 'rgba(34,197,94,0.13)', pos: '40% 45%', size: '75% 60%' },
  },
];

// Entering slide scales from 1.05→1, exiting scales 1→0.95 — gives physical depth
const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-100%', scale: 1.05 }),
  center: { x: 0, scale: 1 },
  exit:  (dir) => ({ x: dir > 0 ? '-100%' : '100%', scale: 0.95 }),
};

// ── Slide 0: Welcome ──────────────────────────────────────────────────────

const PARTICLES = [
  { left: '12%', top: '18%', color: '#4ADE80', size: 3 },
  { left: '78%', top: '22%', color: '#38BDF8', size: 4 },
  { left: '25%', top: '72%', color: '#4ADE80', size: 3 },
  { left: '85%', top: '65%', color: '#38BDF8', size: 3 },
  { left: '50%', top: '88%', color: '#4ADE80', size: 4 },
  { left: '6%',  top: '55%', color: '#38BDF8', size: 3 },
  { left: '65%', top: '82%', color: '#4ADE80', size: 3 },
  { left: '40%', top: '12%', color: '#38BDF8', size: 4 },
];

const SUBTEXT_LINES = [
  "Most people never question what's in their products.",
  "You do. That already puts you ahead.",
  "Let's make sure what you use is actually good for you.",
];

function WelcomeSlide() {
  const particlesRef = useRef(null);

  useGSAP(() => {
    Array.from(particlesRef.current.children).forEach((el, i) => {
      gsap.to(el, {
        y: -(10 + i * 2.5),
        x: (i % 2 === 0 ? 1 : -1) * (5 + i * 1.5),
        duration: 2.8 + i * 0.35,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.28,
      });
    });
  }, { scope: particlesRef });

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 36px 60px',
      pointerEvents: 'none',
    }}>
      {/* Floating particles */}
      <div ref={particlesRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {PARTICLES.map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            opacity: 0.3,
          }} />
        ))}
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: 'rgba(45,212,191,0.1)',
          border: '1px solid rgba(45,212,191,0.2)',
          color: '#2dd4bf',
          marginBottom: 16,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
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
      </motion.div>

      {/* App name */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          margin: '0 0 20px',
          fontSize: 32,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '-0.5px',
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        IngrediScan
      </motion.p>

      {/* Divider */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{
          width: 40,
          height: 1,
          background: '#2D3F55',
          marginBottom: 20,
        }}
      />

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{
          margin: '0 0 20px',
          fontSize: 24,
          fontWeight: 700,
          color: '#ffffff',
          textAlign: 'center',
          letterSpacing: '-0.02em',
          lineHeight: 1.3,
        }}
      >
        You&apos;ve taken the first step.
      </motion.h1>

      {/* Staggered subtext lines — 0.5s initial delay, 0.4s apart */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', maxWidth: 300 }}>
        {SUBTEXT_LINES.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 + i * 0.4 }}
            style={{
              margin: 0,
              fontSize: 16,
              color: '#94A3B8',
              textAlign: 'center',
              lineHeight: 1.7,
            }}
          >
            {line}
          </motion.p>
        ))}
      </div>

      {/* Tap hint — appears after content settles */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0, duration: 0.5 }}
        style={{ marginTop: 40 }}
      >
        <motion.p
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            margin: 0,
            fontSize: 12,
            color: '#64748B',
            textAlign: 'center',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          tap to continue ↓
        </motion.p>
      </motion.div>
    </div>
  );
}

// ── Slide 2: Floating product icons ───────────────────────────────────────

const FLOAT_ICONS = [
  { emoji: '🧴', left: '7%',  top: '12%', size: 40, rotate: -15 },
  { emoji: '🧼', left: '64%', top: '4%',  size: 36, rotate:  13 },
  { emoji: '💊', left: '38%', top: '0%',  size: 44, rotate:  -5 },
  { emoji: '🥤', left: '76%', top: '44%', size: 34, rotate:  20 },
  { emoji: '🧃', left: '3%',  top: '46%', size: 38, rotate: -11 },
];

function Slide1Visual() {
  const containerRef = useRef(null);

  useGSAP(() => {
    Array.from(containerRef.current.children).forEach((el, i) => {
      gsap.to(el, {
        y: -(9 + i * 2.5),
        duration: 1.7 + i * 0.38,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.21,
      });
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 150 }}>
      {FLOAT_ICONS.map((item, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: item.left,
            top: item.top,
            fontSize: item.size,
            transform: `rotate(${item.rotate}deg)`,
            display: 'inline-block',
            userSelect: 'none',
            lineHeight: 1,
          }}
        >
          {item.emoji}
        </span>
      ))}
    </div>
  );
}

// ── Slide 3: GSAP stagger badges ──────────────────────────────────────────

const PILLS = [
  { label: 'Harmful',  color: '#EF4444', bg: 'rgba(239,68,68,0.13)',  border: 'rgba(239,68,68,0.42)',  glow: true  },
  { label: 'Moderate', color: '#F97316', bg: 'rgba(249,115,22,0.13)', border: 'rgba(249,115,22,0.42)', glow: false },
  { label: 'Safe',     color: '#22c55e', bg: 'rgba(34,197,94,0.13)',  border: 'rgba(34,197,94,0.42)',  glow: false },
];

function Slide2Visual() {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.from(containerRef.current.querySelectorAll('.pill-badge'), {
      y: 52,
      opacity: 0,
      scale: 0.68,
      duration: 0.58,
      stagger: 0.28,
      ease: 'back.out(1.9)',
    });
  }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}
    >
      {PILLS.map((pill) => (
        <div
          key={pill.label}
          className="pill-badge"
          style={{
            position: 'relative',
            padding: '12px 24px',
            borderRadius: 999,
            background: pill.bg,
            border: `1.5px solid ${pill.border}`,
            color: pill.color,
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '0.01em',
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          {pill.glow && (
            <div style={{
              position: 'absolute',
              inset: -20,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(239,68,68,0.22), transparent 70%)',
              pointerEvents: 'none',
              zIndex: -1,
            }} />
          )}
          {pill.label}
        </div>
      ))}
    </div>
  );
}

// ── Slide 4: Phone scanner ────────────────────────────────────────────────

function Slide3Visual() {
  const containerRef = useRef(null);
  const scanRef = useRef(null);

  useGSAP(() => {
    gsap.fromTo(
      scanRef.current,
      { top: '22%' },
      { top: '80%', duration: 1.5, repeat: -1, ease: 'none' }
    );
    gsap.from(containerRef.current.querySelectorAll('.scan-badge'), {
      opacity: 0,
      scale: 0.7,
      delay: 0.8,
      duration: 0.45,
      stagger: 0.15,
      ease: 'back.out(1.4)',
    });
  }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}
    >
      <div
        className="scan-badge"
        style={{
          padding: '7px 13px',
          borderRadius: 9,
          background: 'rgba(34,197,94,0.13)',
          border: '1px solid rgba(34,197,94,0.42)',
          color: '#22c55e',
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          whiteSpace: 'nowrap',
          letterSpacing: '0.01em',
        }}
      >
        8 / 10
      </div>

      <div style={{
        width: 140,
        height: 260,
        borderRadius: 22,
        border: '2px solid #38BDF8',
        background: 'rgba(56,189,248,0.04)',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '0 0 24px rgba(56,189,248,0.12)',
      }}>
        <div style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 28,
          height: 5,
          borderRadius: 4,
          background: 'rgba(56,189,248,0.35)',
        }} />
        {[37, 50, 63].map((pct) => (
          <div key={pct} style={{
            position: 'absolute',
            top: `${pct}%`,
            left: '12%',
            right: '12%',
            height: 2,
            borderRadius: 2,
            background: 'rgba(56,189,248,0.14)',
          }} />
        ))}
        <div
          ref={scanRef}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 2,
            top: '22%',
            background: 'linear-gradient(90deg, transparent, #38BDF8, transparent)',
            boxShadow: '0 0 10px 2px rgba(56,189,248,0.55)',
          }}
        />
      </div>

      <div
        className="scan-badge"
        style={{
          padding: '7px 13px',
          borderRadius: 9,
          background: 'rgba(239,68,68,0.13)',
          border: '1px solid rgba(239,68,68,0.42)',
          color: '#EF4444',
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          whiteSpace: 'nowrap',
          letterSpacing: '0.01em',
        }}
      >
        Harmful
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export default function Onboarding({ onComplete }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [progress, setProgress] = useState(0); // 0–1
  const [paused, setPaused] = useState(false);
  const [exiting, setExiting] = useState(false);

  const indexRef   = useRef(0);
  const progressRef = useRef(0);
  const lastTsRef  = useRef(null);
  const pausedRef  = useRef(false);
  const rafRef     = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const pressStartRef = useRef(null);
  const segmentFillRefs = useRef([]);
  const prevIndexRef = useRef(0);
  const navigateRef = useRef(null);

  indexRef.current = index;
  pausedRef.current = paused;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => onCompleteRef.current(), 300);
    return () => clearTimeout(t);
  }, [exiting]);

  const handleComplete = useCallback(() => {
    localStorage.setItem('onboarding_complete', 'true');
    setExiting(true);
  }, []);

  const navigate = useCallback((dir) => {
    const next = indexRef.current + dir;
    if (next >= SLIDES.length) { handleComplete(); return; }
    if (next < 0) return;
    progressRef.current = 0;
    lastTsRef.current = null;
    setProgress(0);
    setDirection(dir);
    setIndex(next);
  }, [handleComplete]);

  navigateRef.current = navigate;

  // Progress bar flash on segment complete
  useEffect(() => {
    if (index > prevIndexRef.current) {
      const el = segmentFillRefs.current[prevIndexRef.current];
      if (el) {
        gsap.fromTo(el,
          { filter: 'brightness(3.5)' },
          { filter: 'brightness(1)', duration: 0.45, ease: 'power2.out' }
        );
      }
    }
    prevIndexRef.current = index;
  }, [index]);

  // Confetti burst on slide 5 (last slide, now index 4)
  useEffect(() => {
    if (index !== 4) return;
    const t = setTimeout(() => {
      confetti({
        particleCount: 55,
        spread: 75,
        origin: { y: 0.45, x: 0.5 },
        colors: ['#38BDF8', '#4ADE80', '#FB923C', '#e2e8f0'],
        startVelocity: 22,
        gravity: 1.1,
        ticks: 90,
        scalar: 0.75,
        zIndex: 1100,
      });
    }, 450);
    return () => clearTimeout(t);
  }, [index]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') navigateRef.current(1);
      else if (e.key === 'ArrowLeft') navigateRef.current(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // RAF-based progress timer — uses per-slide duration
  useEffect(() => {
    progressRef.current = 0;
    lastTsRef.current = null;

    const tick = (ts) => {
      if (pausedRef.current) {
        lastTsRef.current = null;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (!lastTsRef.current) lastTsRef.current = ts;
      const delta = ts - lastTsRef.current;
      lastTsRef.current = ts;

      const slideDuration = SLIDES[indexRef.current].duration || SLIDE_DURATION;
      const newProg = Math.min(1, progressRef.current + delta / slideDuration);
      progressRef.current = newProg;
      setProgress(newProg);

      if (newProg >= 1) {
        const next = indexRef.current + 1;
        if (next >= SLIDES.length) {
          localStorage.setItem('onboarding_complete', 'true');
          setExiting(true);
        } else {
          progressRef.current = 0;
          lastTsRef.current = null;
          setProgress(0);
          setDirection(1);
          setIndex(next);
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Nav zone handlers ────────────────────────────────────────────────────

  const handleZoneDown = useCallback(() => {
    pressStartRef.current = Date.now();
    setPaused(true);
  }, []);

  const handleLeftUp = useCallback(() => {
    setPaused(false);
    if (pressStartRef.current === null) return;
    const dur = Date.now() - pressStartRef.current;
    pressStartRef.current = null;
    if (dur < TAP_THRESHOLD_MS) navigate(-1);
  }, [navigate]);

  const handleRightUp = useCallback(() => {
    setPaused(false);
    if (pressStartRef.current === null) return;
    const dur = Date.now() - pressStartRef.current;
    pressStartRef.current = null;
    if (dur < TAP_THRESHOLD_MS) navigate(1);
  }, [navigate]);

  const handleZoneLeave = useCallback(() => {
    setPaused(false);
    pressStartRef.current = null;
  }, []);

  const slide = SLIDES[index];

  return (
    <motion.div
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0A0F1E',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        zIndex: 1000,
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 420,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* ── Background accent blob ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`blob-${index}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse ${slide.blob.size} at ${slide.blob.pos}, ${slide.blob.color}, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
        </AnimatePresence>

        {/* ── Progress bar — 5 segments ── */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          padding: '14px 16px 0',
          display: 'flex',
          gap: 4,
          pointerEvents: 'none',
        }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: '#1E293B',
              overflow: 'hidden',
            }}>
              <div
                ref={el => { segmentFillRefs.current[i] = el; }}
                style={{
                  height: '100%',
                  borderRadius: 2,
                  background: '#ffffff',
                  width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* ── Skip button — hidden on slide 0 and last slide ── */}
        {index > 0 && index < SLIDES.length - 1 && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); handleComplete(); }}
            style={{
              position: 'absolute',
              top: 22,
              right: 16,
              zIndex: 20,
              background: 'none',
              border: 'none',
              color: '#64748B',
              fontSize: 13,
              cursor: 'pointer',
              padding: '8px 4px 8px 16px',
              minHeight: 44,
              minWidth: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            Skip
          </button>
        )}

        {/* ── LEFT nav zone ── */}
        <div
          onPointerDown={handleZoneDown}
          onPointerUp={handleLeftUp}
          onPointerLeave={handleZoneLeave}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            zIndex: 4,
            cursor: 'pointer',
          }}
        />

        {/* ── RIGHT nav zone ── */}
        <div
          onPointerDown={handleZoneDown}
          onPointerUp={handleRightUp}
          onPointerLeave={handleZoneLeave}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '50%',
            height: '100%',
            zIndex: 4,
            cursor: 'pointer',
          }}
        />

        {/* ── Slide content ── */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 6,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}>
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={index}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '96px 36px 72px',
                gap: 36,
              }}
            >
              {slide.isWelcome ? (
                <WelcomeSlide />
              ) : (
                <>
                  {/* Visual area */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 150,
                    width: '100%',
                  }}>
                    {index === 1 && <Slide1Visual />}
                    {index === 2 && <Slide2Visual />}
                    {index === 3 && <Slide3Visual />}
                  </div>

                  {/* Text */}
                  <div style={{
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    maxWidth: 320,
                  }}>
                    <h1 style={{
                      margin: 0,
                      fontSize: 28,
                      fontWeight: 700,
                      color: '#ffffff',
                      lineHeight: 1.25,
                      letterSpacing: '-0.02em',
                    }}>
                      {slide.heading}
                    </h1>
                    <p style={{
                      margin: 0,
                      fontSize: 16,
                      color: '#94A3B8',
                      lineHeight: 1.65,
                    }}>
                      {slide.subtext}
                    </p>
                  </div>

                  {/* CTA — last slide only */}
                  {index === SLIDES.length - 1 && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 14,
                      width: '100%',
                      pointerEvents: 'all',
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: 13,
                        color: '#475569',
                        fontFamily: "'DM Sans', system-ui, sans-serif",
                        letterSpacing: '0.02em',
                      }}>
                        Join 100+ people scanning smarter
                      </p>

                      <motion.button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); handleComplete(); }}
                        animate={{ scale: [1, 1.03, 1] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          width: '100%',
                          maxWidth: 340,
                          minHeight: 56,
                          borderRadius: 16,
                          background: 'rgba(45,212,191,0.1)',
                          border: '1.5px solid rgba(45,212,191,0.28)',
                          color: '#2dd4bf',
                          fontSize: 16,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: "'DM Sans', system-ui, sans-serif",
                          letterSpacing: '0.01em',
                        }}
                        whileHover={{ background: 'rgba(45,212,191,0.17)' }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Start Scanning →
                      </motion.button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
}
