import { useEffect, useRef } from "react";

/**
 * Why the button she just pressed did not work -- shown beside that button.
 *
 * Errors used to sit at the top of each page. On a phone the top is a scroll
 * away from the button at the bottom of a form, so the form simply seemed not
 * to submit, and somebody who reads poorly has no reason to scroll up and
 * look. This goes where the action is; and if even that is just off-screen
 * (a tall card, a keyboard open), it brings itself into view.
 *
 * Page-level load failures ("Not found", a list that would not load) stay at
 * the top: no button was pressed, so there is nothing to put them beside.
 */
export default function ActionProblem({ message }: { message: string | null | undefined }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // "nearest": moves only as far as needed, and not at all if it is
    // already on screen -- a page that jumps on every error is its own problem.
    if (message) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [message]);

  if (!message) return null;

  return (
    <p ref={ref} className="notice bad" role="alert">
      {message}
    </p>
  );
}
