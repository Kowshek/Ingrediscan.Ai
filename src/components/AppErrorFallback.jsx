/**
 * AppErrorFallback — shown by Sentry.ErrorBoundary when an unhandled JS
 * exception reaches the root of the app.
 *
 * This replaces the white screen of death. The error is already captured
 * by Sentry at this point — the user just needs a way out.
 *
 * Props injected by Sentry.ErrorBoundary:
 *   error      — the Error object
 *   resetError — function to unmount/remount the tree (try again)
 */
export default function AppErrorFallback({ error, resetError }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: '#08090a',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-0 right-0 h-[300px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative text-center max-w-sm w-full">
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.18)',
          }}
        >
          ⚠
        </div>

        {/* Heading */}
        <h1
          className="text-xl font-bold mb-2"
          style={{ color: '#f4f4f5' }}
        >
          Something went wrong
        </h1>

        {/* Subtext */}
        <p
          className="text-sm leading-relaxed mb-8"
          style={{ color: '#71717a' }}
        >
          We hit an unexpected error. It's been reported automatically — our
          team will look into it.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={resetError}
            className="w-full px-6 py-3 rounded-xl font-semibold text-sm cursor-pointer transition-opacity"
            style={{
              background: '#2dd4bf',
              color: '#000',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            Try again
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 rounded-xl font-medium text-sm cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#a1a1aa',
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          >
            Reload page
          </button>
        </div>

        {/* Dev-only error detail */}
        {import.meta.env.DEV && error && (
          <details
            className="mt-8 text-left"
            style={{ color: '#52525b' }}
          >
            <summary
              className="text-xs cursor-pointer mb-2"
              style={{ color: '#71717a' }}
            >
              Error details (dev only)
            </summary>
            <pre
              className="text-xs overflow-auto p-3 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#ef4444',
                maxHeight: '200px',
              }}
            >
              {error.stack || error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
