import { createRoot } from 'react-dom/client';
import './local-fonts.css';
import './vite-shell.css';
import '../docs/css/reset.css';
import '../docs/css/tokens.css';
import '../docs/css/base.css';
import '../docs/css/layout.css';
import '../docs/css/components.css';
import '../docs/css/opening.css';
import '../docs/css/invite.css';
import '../docs/css/timeline.css';
import '../docs/css/search.css';
import '../docs/css/compose.css';
import '../docs/css/magazine.css';
import '../docs/css/profile.css';
import '../docs/css/modal.css';
import { LegacyShell } from './LegacyShell.jsx';

createRoot(document.getElementById('root')).render(<LegacyShell />);
