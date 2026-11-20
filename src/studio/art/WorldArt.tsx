import { memo, useId } from 'react';
import { coast, projectPoint } from '../model';
import terrain from './sprites/island.webp';

const contour = coast
  .map(([x, z]) => projectPoint({ x, z }))
  .map((p) => `${p.x},${p.y}`)
  .join(' ');
const gridLines = Array.from({ length: 17 }, (_, i) => (i - 8) / 2)
  .map((n) => {
    const a = projectPoint({ x: n, z: -4 }),
      b = projectPoint({ x: n, z: 4 }),
      c = projectPoint({ x: -4, z: n }),
      d = projectPoint({ x: 4, z: n });
    return `M${a.x},${a.y}L${b.x},${b.y}M${c.x},${c.y}L${d.x},${d.y}`;
  })
  .join(' ');
export const Terrain = memo(function Terrain({ grid }: { grid: boolean }) {
  const clip = useId();
  return (
    <g aria-hidden="true" pointerEvents="none">
      {/* The terrain painting follows the same projected coast polygon used for movement. */}
      <image
        href={terrain}
        x="90"
        y="65"
        width="520"
        height="264"
        preserveAspectRatio="none"
      />
      <g
        className="falls-drops"
        fill="#d4fff3"
        stroke="#70c8bd"
        strokeWidth=".6"
      >
        <ellipse cx="491" cy="320" rx="1.1" ry="3.6" />
        <ellipse cx="498" cy="327" rx=".9" ry="2.5" />
        <ellipse cx="494" cy="334" rx=".8" ry="2" />
      </g>
      {grid && (
        <>
          <defs>
            <clipPath id={clip}>
              <polygon points={contour} />
            </clipPath>
          </defs>
          <path
            d={gridLines}
            clipPath={`url(#${clip})`}
            stroke="#47664b"
            strokeOpacity=".42"
            strokeWidth="1.1"
            strokeDasharray="4 3"
            fill="none"
          />
        </>
      )}
    </g>
  );
});
