import { lazy, Suspense } from 'react';
import { IslandStudio, SharedPlayer } from './studio/IslandStudio';

// Older projects and collaboration/playtest invitations retain their original runtime.
// Do not download Three.js just to open the beginner's 2.5D workbench.
const ClassicStudio = lazy(() => import('./ClassicStudio'));
export default function App() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  if (mode === 'pulau') return <SharedPlayer />;
  if (
    mode === 'classic' ||
    mode === 'play' ||
    mode === 'mobile' ||
    (mode === 'editor' &&
      ['room', 'template', 'project'].some((key) => params.has(key)))
  ) {
    return (
      <Suspense
        fallback={<p className="p-6 text-slate-300">Membuka Studio klasik…</p>}
      >
        <ClassicStudio />
      </Suspense>
    );
  }
  return <IslandStudio />;
}
