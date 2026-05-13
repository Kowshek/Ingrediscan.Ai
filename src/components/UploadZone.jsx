import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

const HINT_TAGS = ['Food labels', 'Skincare', 'Snacks', 'Beverages'];

export default function UploadZone({ onAnalyze, onJoinWaitlist }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const cameraRef = useRef(null);

  const handleFile = useCallback(
    (file) => { if (file?.type.startsWith('image/')) onAnalyze(file); },
    [onAnalyze]
  );

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);

  const handleDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
  }, []);

  const handleChange = useCallback((e) => {
    handleFile(e.target.files[0]);
    e.target.value = '';
  }, [handleFile]);

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16, scale: 0.98 }}
      transition={{ duration: 0.35 }}
    >
      {/* Camera button — mobile only */}
      <div className="md:hidden mb-3">
        <motion.button
          className="w-full flex items-center justify-center gap-3 rounded-2xl font-semibold text-base"
          style={{ background: 'rgba(45,212,191,0.1)', border: '1.5px solid rgba(45,212,191,0.28)', color: '#2dd4bf', minHeight: '56px', padding: '0 24px', cursor: 'pointer' }}
          onClick={() => cameraRef.current?.click()}
          whileHover={{ background: 'rgba(45,212,191,0.17)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15 }}
        >
          <CameraIcon />
          Open Camera
        </motion.button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
      </div>

      {/* or divider — mobile only */}
      <div className="md:hidden flex items-center gap-3 mb-3">
        <div className="flex-1" style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
        <span className="text-xs" style={{ color: '#3f3f46' }}>or choose from gallery</span>
        <div className="flex-1" style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Upload / drag-drop zone */}
      <motion.div
        className="relative overflow-hidden rounded-3xl cursor-pointer select-none w-full"
        style={{
          background: dragging ? 'rgba(45,212,191,0.04)' : 'rgba(255,255,255,0.02)',
          border: `2px dashed ${dragging ? '#2dd4bf' : '#2a2b32'}`,
          transition: 'border-color 0.25s, background 0.25s',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={{ scale: 1.004 }}
        whileTap={{ scale: 0.997 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <AnimatePresence>
          {dragging && (
            <>
              {['top-3 left-3 border-l-2 border-t-2 rounded-tl-sm','top-3 right-3 border-r-2 border-t-2 rounded-tr-sm','bottom-3 left-3 border-l-2 border-b-2 rounded-bl-sm','bottom-3 right-3 border-r-2 border-b-2 rounded-br-sm'].map((cls, i) => (
                <motion.div key={i} className={`absolute w-5 h-5 border-teal-400 ${cls}`} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }} />
              ))}
            </>
          )}
        </AnimatePresence>

        <div className="relative flex flex-col items-center justify-center px-6 py-10 md:px-8 md:py-20 gap-5 md:gap-7">
          <motion.div
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-colors duration-300"
            style={{ background: dragging ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${dragging ? 'rgba(45,212,191,0.3)' : 'rgba(255,255,255,0.07)'}`, color: dragging ? '#2dd4bf' : '#52525b' }}
            animate={dragging ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {dragging ? <ScanIcon /> : <UploadIcon />}
          </motion.div>

          <div className="text-center space-y-2">
            <motion.p className="text-lg md:text-xl font-semibold" style={{ color: dragging ? '#2dd4bf' : '#f4f4f5' }} transition={{ duration: 0.2 }}>
              {dragging ? 'Release to scan' : 'Upload ingredient photo'}
            </motion.p>
            <p className="text-zinc-500 text-sm">
              Drag &amp; drop or{' '}
              <span className="text-zinc-400 underline underline-offset-2 decoration-dotted">click to browse</span>
              {' '}&middot; JPG, PNG, WEBP
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {HINT_TAGS.map((tag) => (
              <span key={tag} className="text-xs px-3 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: '#adadad', border: '1px solid rgba(255,255,255,0.07)', minHeight: '28px', display: 'inline-flex', alignItems: 'center' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      </motion.div>

      {/* Tip */}
      <motion.p className="mt-5 px-4 text-center text-xs flex items-center justify-center gap-1.5" style={{ color: '#a0a0a0' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        Ensure ingredient text is clear and well-lit for best results
      </motion.p>

      {/* Waitlist nudge */}
      {onJoinWaitlist && (
        <motion.div className="mt-5 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <motion.button
            onClick={onJoinWaitlist}
            className="group relative flex flex-col items-center gap-1 px-6 py-3 rounded-2xl cursor-pointer overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(45,212,191,0.15) 0%, rgba(45,212,191,0.06) 100%)',
              border: '1.5px solid rgba(45,212,191,0.35)',
              color: '#2dd4bf',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              boxShadow: '0 0 18px rgba(45,212,191,0.12)',
            }}
            whileHover={{
              background: 'linear-gradient(135deg, rgba(45,212,191,0.22) 0%, rgba(45,212,191,0.10) 100%)',
              borderColor: 'rgba(45,212,191,0.6)',
              boxShadow: '0 0 28px rgba(45,212,191,0.22)',
              y: -1,
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            {/* Top row: icon + main label */}
            <span className="flex items-center gap-2 text-sm font-semibold">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
              </svg>
              Get 10 free scans at launch
              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ display: 'inline-block', fontSize: '17px', lineHeight: 1 }}
              >
                →
              </motion.span>
            </span>
            {/* Bottom row: sub-label */}
            <span style={{ fontSize: '11px', opacity: 0.65, letterSpacing: '0.02em', fontWeight: 500 }}>
              Click to join the waitlist
            </span>
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}
