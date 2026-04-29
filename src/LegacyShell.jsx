import { useEffect, useRef, useState } from 'react';

export function LegacyShell() {
  const mountRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    window.__MEMORIES_REACT_HOST__ = true;

    async function boot() {
      try {
        const { bootLegacyApp } = await import('../docs/js/app.js');
        if (cancelled || !mountRef.current) return;
        mountRef.current.innerHTML = '';
        bootLegacyApp(mountRef.current);
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : String(nextError));
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="vite-shell">
      {error ? <p className="vite-shell__error">{error}</p> : null}
      <div className="vite-shell__legacy-root" ref={mountRef} />
    </div>
  );
}
