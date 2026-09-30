export function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function formatFileSize(bytes: number): string {
  const megabytes = bytes / 1048576;

  return megabytes >= 0.1 ? `${megabytes.toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
}

/** Initials for somebody with no photograph. One letter, or two if there are two words. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";

  return (first + last).toUpperCase();
}

/**
 * A date somebody would say out loud: "4th October, 2025".
 *
 * Dates arrive as `YYYY-MM-DD` or a full ISO timestamp and were being printed
 * raw, or sliced to ten characters. Neither is readable, and "2026-09-23"
 * asks somebody to parse a format before she can work out whether that is
 * this week. The literacy constraint applies to numbers too.
 *
 * Parsed by hand rather than through `new Date(string)`: a bare `YYYY-MM-DD`
 * is treated as UTC midnight and then rendered in local time, which west of
 * Greenwich silently shows the day before. Lagos is UTC+1 so it would not
 * bite here, but a date that is wrong for half the world is wrong.
 */
export function longDate(value: string | null | undefined): string {
  if (!value) return "—";

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (!match) return value;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (Number.isNaN(date.getTime())) return value;

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return `${ordinal(date.getDate())} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

/** 1st, 2nd, 3rd, 4th — and 11th, 12th, 13th, which are the ones people get wrong. */
function ordinal(day: number): string {
  const teens = day % 100;

  if (teens >= 11 && teens <= 13) return `${day}th`;

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}
