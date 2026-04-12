import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

const HINT_TAGS = ['Food labels', 'Skincare', 'Supplements', 'Snacks', 'Beverages'];

export default function UploadZone({ onAnalyze }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback(
    (file) => {
      if (file?.type.startsWith('image/')) {
        onAnalyze(file);
      }
    },
    [onAnalyze]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragging(false);
    }
  }, []);

  const handleChange = useCallback(
    (e) => {
      handleFile(e.target.files[0]);
      e.target.value = '';
    },
    [handleFile]
  );

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16, scale: 0.98 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className="relative overflow-hidden rounded-3xl cursor-pointer select-none"
        style={{
          background: dragging
            ? 'rgba(45, 212, 191, 0.04)'
            : 'rgba(255,255,255,0.02)',
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
        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Corner accents when dragging */}
        <AnimatePresence>
          {dragging && (
            <>
              {[
                'top-3 left-3 border-l-2 border-t-2 rounded-tl-sm',
                'top-3 right-3 border-r-2 border-t-2 rounded-tr-sm',
                'bottom-3 left-3 border-l-2 border-b-2 rounded-bl-sm',
                'bottom-3 right-3 border-r-2 border-b-2 rounded-br-sm',
              ].map((cls, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-5 h-5 border-teal-400 ${cls}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.04 }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        <div className="relative flex flex-col items-center justify-center px-8 py-20 gap-7">
          {/* Icon */}
          <motion.div
            className="w-20 h-20 rounded-2xl flex items-center justify-center transition-colors duration-300"
            style={{
              background: dragging ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${dragging ? 'rgba(45,212,191,0.3)' : 'rgba(255,255,255,0.07)'}`,
              color: dragging ? '#2dd4bf' : '#52525b',
            }}
            animate={dragging ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {dragging ? <ScanIcon /> : <UploadIcon />}
          </motion.div>

          {/* Text */}
          <div className="text-center space-y-2">
            <motion.p
              className="text-xl font-semibold"
              style={{ color: dragging ? '#2dd4bf' : '#f4f4f5' }}
              transition={{ duration: 0.2 }}
            >
              {dragging ? 'Release to scan' : 'Upload ingredient photo'}
            </motion.p>
            <p className="text-zinc-500 text-sm">
              Drag & drop or{' '}
              <span className="text-zinc-400 underline underline-offset-2 decoration-dotted">
                click to browse
              </span>{' '}
              · JPG, PNG, WEBP
            </p>
          </div>

          {/* Tag hints */}
          <div className="flex flex-wrap gap-2 justify-center">
            {HINT_TAGS.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  color: '#adadad',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </motion.div>

      {/* Tip */}
      <motion.p
        className="mt-4 text-center text-xs text-silver-600 flex items-center justify-center gap-1.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        Ensure ingredient text is clear and well-lit for best results
      </motion.p>
    </motion.div>
  );
}
