/*
 * Inline SVG rather than an icon font or a sprite sheet: a handful of icons is
 * not worth a network request on a metered connection, and an icon font that
 * fails to load leaves squares.
 */

const PATHS: Record<string, string> = {
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  check: "M20 6 9 17l-5-5",
  sun: "M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8",
  out: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  cog: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
};

export default function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "sun" ? <circle cx="12" cy="12" r="4" /> : null}
      {name === "cog" ? <circle cx="12" cy="12" r="9" /> : null}
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}
