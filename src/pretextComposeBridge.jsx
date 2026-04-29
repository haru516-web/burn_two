import './pretextComposeBridge.css';
import { getDefaultPretextBoxes, serializePretextBoxes } from './pretextLayoutAdapter.js';

const EMBEDDED_PRETEXT_STYLE_ID = 'memories-pretext-embedded-overrides';
const DEFAULT_EMBEDDED_PRETEXT_BACKGROUND = '#f8f4ee';
const EMBEDDED_PRETEXT_STAGE_BACKGROUND = '#ffffff';

function getEmbeddedPretextStyle(backgroundColor) {
  return `
html,
body,
#root {
  background: ${EMBEDDED_PRETEXT_STAGE_BACKGROUND} !important;
}

html,
body {
  margin: 0 !important;
  min-height: 100% !important;
}

body::before,
body::after {
  display: none !important;
}

.app-shell,
.app-shell--embedded,
.workspace,
.canvas-area,
.canvas-area--embedded,
.page-stage-shell,
.page-stage {
  background: ${EMBEDDED_PRETEXT_STAGE_BACKGROUND} !important;
  border: 0 !important;
  box-shadow: none !important;
}

.app-shell--embedded,
.canvas-area--embedded {
  min-height: 100dvh !important;
  height: 100dvh !important;
  padding: 0 !important;
}

.canvas-area--embedded {
  place-items: center !important;
}

.page-stage-shell,
.page-stage,
.page-shadow,
.page {
  border-radius: 0 !important;
}

.app-shell--embedded .page-shadow,
.page-shadow {
  display: none !important;
  background: transparent !important;
  filter: none !important;
}

.app-shell--embedded .page,
.page {
  background: ${backgroundColor} !important;
  box-shadow: none !important;
  outline: 0 !important;
}
`;
}

function getTargetOrigin() {
  return window.location.origin === 'null' ? '*' : window.location.origin;
}

function isAcceptedMessageOrigin(origin) {
  if (window.location.origin === 'null') {
    return origin === 'null' || origin === '';
  }
  return origin === window.location.origin;
}

export function mountComposePretextEditor(container, options = {}) {
  let latestBoxes = getDefaultPretextBoxes(options.customLayout, options.textValues);
  let currentBackgroundColor = options.backgroundColor || DEFAULT_EMBEDDED_PRETEXT_BACKGROUND;
  const frame = document.createElement('iframe');
  frame.className = 'compose-pretext-iframe';
  frame.src = './pretext-editor.html?embedded=1';
  frame.title = 'Pretext editor';
  frame.setAttribute('loading', 'eager');
  frame.setAttribute('allow', 'clipboard-read; clipboard-write');
  frame.setAttribute('allowtransparency', 'true');
  container.replaceChildren(frame);

  const applyEmbeddedOverrides = () => {
    const doc = frame.contentDocument;
    if (!doc) return;
    const root = doc.documentElement;
    const body = doc.body;
    if (!root || !body) return;

    frame.style.setProperty('background', EMBEDDED_PRETEXT_STAGE_BACKGROUND, 'important');
    container.style.setProperty('background', EMBEDDED_PRETEXT_STAGE_BACKGROUND, 'important');
    root.style.setProperty('background', EMBEDDED_PRETEXT_STAGE_BACKGROUND, 'important');
    body.style.setProperty('background', EMBEDDED_PRETEXT_STAGE_BACKGROUND, 'important');
    root.style.setProperty('color-scheme', 'light', 'important');
    body.style.setProperty('color-scheme', 'light', 'important');

    let styleTag = doc.getElementById(EMBEDDED_PRETEXT_STYLE_ID);
    if (!styleTag) {
      styleTag = doc.createElement('style');
      styleTag.id = EMBEDDED_PRETEXT_STYLE_ID;
      doc.head.appendChild(styleTag);
    }
    styleTag.textContent = getEmbeddedPretextStyle(currentBackgroundColor);
  };

  const sendInit = () => {
    applyEmbeddedOverrides();
    frame.contentWindow?.postMessage(
      {
        type: 'memories:pretext:init',
        boxes: latestBoxes,
      },
      getTargetOrigin(),
    );
  };

  const handleMessage = (event) => {
    if (!isAcceptedMessageOrigin(event.origin)) return;
    if (event.source !== frame.contentWindow) return;
    const payload = event.data;
    if (!payload || typeof payload !== 'object') return;

    if (payload.type === 'memories:pretext:ready') {
      applyEmbeddedOverrides();
      sendInit();
      return;
    }

    if (payload.type === 'memories:pretext:change' && Array.isArray(payload.boxes)) {
      latestBoxes = payload.boxes;
    }
  };

  frame.addEventListener('load', sendInit);
  window.addEventListener('message', handleMessage);

  return {
    unmount() {
      frame.removeEventListener('load', sendInit);
      window.removeEventListener('message', handleMessage);
      frame.remove();
    },
    sendCommand(command) {
      frame.contentWindow?.postMessage(
        {
          type: 'memories:pretext:command',
          command,
        },
        getTargetOrigin(),
      );
    },
    getBoxes() {
      return latestBoxes;
    },
    getSerializedLayout() {
      return serializePretextBoxes(latestBoxes);
    },
    setBackgroundColor(backgroundColor) {
      currentBackgroundColor = backgroundColor || DEFAULT_EMBEDDED_PRETEXT_BACKGROUND;
      applyEmbeddedOverrides();
    },
  };
}
