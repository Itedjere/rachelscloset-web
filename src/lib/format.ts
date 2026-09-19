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
