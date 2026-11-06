import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('AetherEngine Studio root element was not found.');
}

createRoot(root).render(<App />);

// Production builds are installable and keep the Studio shell/assets available offline.
// Development mode deliberately bypasses the service worker to preserve reliable HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // OPFS + IndexedDB still provide local persistence if SW registration is blocked.
    });
  });
}
