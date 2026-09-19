/*
 * Inline SVG rather than an icon font or a sprite sheet: a handful of icons is
 * not worth a network request on a metered connection, and an icon font that
 * fails to load leaves squares where the navigation should be.
 *
 * Every icon is a 24-unit stroke drawing so they all share one weight. A few
 * need a circle as well as a path, which is what `circles` is for.
 */

interface Glyph {
  path: string;
  circles?: [number, number, number][];
}

const GLYPHS: Record<string, Glyph> = {
  home: { path: "M3 10.4 12 3l9 7.4V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },

  // A shirt, for garments. Reads at 20px, which a needle and thread does not.
  garment: {
    path: "M7.8 3 4 5.2l1.7 3.6L8 7.6V21h8V7.6l2.3 1.2L20 5.2 16.2 3a4.2 4.2 0 0 1-8.4 0Z",
  },

  // A list with markers, for the step library.
  list: { path: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" },

  bell: { path: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" },
  check: { path: "M20 6 9 17l-5-5" },
  sun: {
    path: "M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
    circles: [[12, 12, 4]],
  },
  moon: { path: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8" },
  out: { path: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" },
  cog: { path: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6", circles: [[12, 12, 9]] },
  user: { path: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", circles: [[12, 7, 4]] },
  chevron: { path: "m6 9 6 6 6-6" },

  // A camera, for proof of work. The lens is the circle.
  camera: {
    path: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5L9 3h6l2.5 3H21a2 2 0 0 1 2 2Z",
    circles: [[12, 13, 3.6]],
  },
  trash: { path: "M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" },
  menu: { path: "M3 6h18M3 12h18M3 18h18" },
  close: { path: "M18 6 6 18M6 6l12 12" },
};

export default function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const glyph = GLYPHS[name];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {glyph?.circles?.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}-${r}`} cx={cx} cy={cy} r={r} />
      ))}
      <path d={glyph?.path ?? ""} />
    </svg>
  );
}
