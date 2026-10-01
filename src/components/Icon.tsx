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
  // A tape measure, for measurements.
  ruler: { path: "M2 9h20v6H2zM6 9v3M10 9v4M14 9v3M18 9v4" },

  // A padlock, for consent.
  lock: { path: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4" },

  // A framed picture, for the gallery.
  image: { path: "M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6", circles: [[8.5, 8.5, 1.5]] },

  // Three finder squares and a scatter: a QR code at icon size.
  qr: {
    path: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z",
  },

  star: { path: "m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z" },

  trash: { path: "M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" },
  menu: { path: "M3 6h18M3 12h18M3 18h18" },
  close: { path: "M18 6 6 18M6 6l12 12" },

  /* ---- The doors in: sign-in and joining. ---- */

  // A handset outline, for "your phone number" -- the username here.
  phone: { path: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM11 18h2" },
  // Scissors: "I sew". Recognisable to anybody who has stood in a shop.
  scissors: {
    path: "M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12",
    circles: [
      [6, 6, 3],
      [6, 18, 3],
    ],
  },
  // A hanger: "I want clothes made".
  hanger: {
    path: "M10 5.5a2 2 0 1 1 3 1.7c-.6.4-1 .9-1 1.6V9l8.6 5.7a1 1 0 0 1-.6 1.8H4a1 1 0 0 1-.6-1.8L12 9",
  },
  store: { path: "M3 9 4.5 4h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6" },
  pin: { path: "M20 10c0 6.5-8 12-8 12s-8-5.5-8-12a8 8 0 0 1 16 0Z", circles: [[12, 10, 3]] },
  map: { path: "M2 6v16l7-4 6 4 7-4V2l-7 4-6-4-7 4ZM9 2v16M15 6v16" },
  eye: { path: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z", circles: [[12, 12, 3]] },
  shield: { path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4" },
  key: { path: "M11.5 11.5 21 2M17 6l3 3M14.5 8.5 17 11", circles: [[7.5, 15.5, 5]] },
  chat: { path: "M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5Z" },
  spark: { path: "M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2ZM19 3v4M17 5h4" },
  arrow: { path: "M5 12h14M13 6l6 6-6 6" },
  back: { path: "M19 12H5M11 6l-6 6 6 6" },
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
