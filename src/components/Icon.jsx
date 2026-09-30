import { MODULES as M } from '../core/index.js';
const paths = {
  frame: 'M3 3h18v18H3z M7 3v4H3m14-4v4h4M3 17h4v4m10 0v-4h4',
  cabinet: 'M4 5h16v15H4z M4 12h16M12 5v15m-3-8v3m6-3v3M6 20v2m12-2v2',
  lamp: 'M8 3h8l4 9H4z M12 12v8m-5 1h10M12 15l-3 3m6-3 3 3',
  scent: 'M7 8h10v13H7z M9 5c-3-2 3-2 0-4m6 4c-3-2 3-2 0-4M9 12h6',
  shelf: 'M3 13h18v3H3z M6 16v5m12-5v5M5 5h4v8m4-6h5v6',
  sign: 'M3 4h18v13H3z M12 17v5M7 8h10m-10 4h7',
  worktop: 'M3 10h18v3H3z M5 13v8m14-8v8M5 18l5-5m9 5-5-5',
  acoustic: 'M4 3h16v18H4z M8 3v18m4-18v18m4-18v18',
  pillar: 'M7 3h10v18H7z M10 3v18m4-18v18M4 6h3m10 0h3M4 12h3m10 0h3M4 18h3m10 0h3',
  pegboard: 'M4 4h16v16H4z M8 8h1m6 0h1m-8 6h1m6 0h1m-8 3h1m6 0h1',
  mesh: 'M4 4h16v16H4z M4 8h16M4 14h16M8 4v16M14 4v16',
  metal: 'M4 4h16v16H4z M7 8h10M7 12h10M7 16h10',
  rope: 'M4 4h16v16H4z M4 8c4 5 8-5 16 0M4 14c4 5 8-5 16 0',
};
export function Icon({ type }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[M[type]?.draw || type] || paths.frame} />
    </svg>
  );
}
