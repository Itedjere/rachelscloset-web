/**
 * Previous and next, for a list that comes a page at a time.
 *
 * Two big buttons and "Page 2 of 5" rather than a strip of page numbers: a
 * row of small numbered targets is hard to hit on a phone and asks somebody to
 * read and choose, when what she wants is "more" or "back".
 *
 * Renders nothing for a single page, so a short list carries no furniture.
 */
export default function Pager({
  page,
  lastPage,
  busy = false,
  onPage,
}: {
  page: number;
  lastPage: number;
  busy?: boolean;
  onPage: (page: number) => void;
}) {
  if (lastPage <= 1) return null;

  return (
    <nav className="pager" aria-label="Pages">
      <button
        type="button"
        className="btn ghost"
        onClick={() => onPage(page - 1)}
        disabled={busy || page <= 1}
      >
        ← Previous
      </button>

      <span className="pager__where" aria-live="polite">
        Page {page} of {lastPage}
      </span>

      <button
        type="button"
        className="btn ghost"
        onClick={() => onPage(page + 1)}
        disabled={busy || page >= lastPage}
      >
        Next →
      </button>
    </nav>
  );
}
