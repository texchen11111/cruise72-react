import { MODULES as M } from '../model/index.js';
const paths = {
  frame: 'M3 3h18v18H3z M7 3v4H3m14-4v4h4M3 17h4v4m10 0v-4h4',
  cabinet: 'M4 5h16v15H4z M4 12h16M12 5v15m-3-8v3m6-3v3M6 20v2m12-2v2',
  lamp: 'M8 3h8l4 9H4z M12 12v8m-5 1h10M12 15l-3 3m6-3 3 3',
  scent: 'M7 8h10v13H7z M9 5c-3-2 3-2 0-4m6 4c-3-2 3-2 0-4M9 12h6',
  shelf: 'M3 13h18v3H3z M6 16v5m12-5v5M5 5h4v8m4-6h5v6',
  sign: 'M3 4h18v13H3z M12 17v5M7 8h10m-10 4h7',
  worktop: 'M3 10h18v3H3z M5 13v8m14-8v8M5 18l5-5m9 5-5-5',
  acoustic: 'M4 3h16v18H4z M8 3v18m4-18v18m4-18v18',
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
