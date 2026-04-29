import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './local-fonts.css';
import ReferenceEditor from '../docs/references/pretext-magazine-editor/src/App.tsx';
import '../docs/references/pretext-magazine-editor/src/styles.css';
import './pretext-shell.css';

function getTargetOrigin() {
  return window.location.origin === 'null' ? '*' : window.location.origin;
}

function isAcceptedMessageOrigin(origin) {
  if (window.location.origin === 'null') {
    return origin === 'null' || origin === '';
  }
  return origin === window.location.origin;
}

function EmbeddedPretextPage() {
  const [initialBoxes, setInitialBoxes] = useState(null);
  const [editorKey, setEditorKey] = useState(0);
  const [externalCommand, setExternalCommand] = useState(null);

  useEffect(() => {
    document.documentElement.classList.add('pretext-embedded-root');
    document.body.classList.add('pretext-embedded-body');

    const handleMessage = (event) => {
      if (!isAcceptedMessageOrigin(event.origin)) return;
      const payload = event.data;
      if (!payload || typeof payload !== 'object') return;
      if (payload.type === 'memories:pretext:init' && Array.isArray(payload.boxes)) {
        setInitialBoxes(payload.boxes);
        setEditorKey((value) => value + 1);
        return;
      }
      if (payload.type === 'memories:pretext:command' && payload.command && typeof payload.command === 'object') {
        setExternalCommand(payload.command);
      }
    };

    window.addEventListener('message', handleMessage);
    window.parent?.postMessage({ type: 'memories:pretext:ready' }, getTargetOrigin());

    return () => {
      document.documentElement.classList.remove('pretext-embedded-root');
      document.body.classList.remove('pretext-embedded-body');
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <ReferenceEditor
      key={editorKey}
      embedded
      initialBoxes={initialBoxes ?? undefined}
      externalCommand={externalCommand}
      onBoxesChange={(boxes) => {
        window.parent?.postMessage({ type: 'memories:pretext:change', boxes }, getTargetOrigin());
      }}
    />
  );
}

function PretextEditorPage() {
  const isEmbedded = new URLSearchParams(window.location.search).get('embedded') === '1';

  if (isEmbedded) {
    return <EmbeddedPretextPage />;
  }

  return (
    <div className="pretext-page">
      <header className="pretext-page__chrome">
        <div>
          <p className="pretext-page__eyebrow">Reference Workspace</p>
          <h1 className="pretext-page__title">Pretext Magazine Editor</h1>
        </div>
        <a className="pretext-page__link" href="./index.html">
          Back To memories
        </a>
      </header>
      <ReferenceEditor />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<PretextEditorPage />);
