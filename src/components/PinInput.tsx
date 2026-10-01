import { useEffect, useRef } from "react";

const LENGTH = 6;

/**
 * Six boxes, one digit each.
 *
 * The PIN is six digits because a numeric keypad asks nothing of somebody who
 * reads poorly — and one long masked field undoes half of that. Six boxes show
 * how many digits are in and how many are left without anybody counting dots,
 * which is the same reason a tracker circle beats a checkbox.
 *
 * It fills itself in and gets out of the way: the last digit fires
 * `onComplete`, so nobody has to find a button afterwards.
 */
export default function PinInput({
  value,
  onChange,
  onComplete,
  label,
  autoComplete = "one-time-code",
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Fired once the sixth digit lands. */
  onComplete?: (value: string) => void;
  /** Describes the whole group to a screen reader; the boxes are numbered. */
  label: string;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  /*
   * Fired from an effect rather than inline, so it cannot run twice for one
   * digit — a paste and a keystroke can both complete the value, and
   * submitting a form twice is worse than any of this is worth.
   */
  const fired = useRef(false);

  useEffect(() => {
    if (value.length < LENGTH) {
      fired.current = false;

      return;
    }

    if (fired.current) return;

    fired.current = true;
    onComplete?.(value);
    // onComplete is an inline arrow on every caller; in the dependency list
    // this would re-fire on each render of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  /*
   * THE VALUE AS OF THE LAST KEYSTROKE, not as of the last render.
   *
   * Two digits can arrive before React re-renders -- a fast typist, a quick
   * Android keyboard -- and building the second from the `value` prop rebuilt
   * it from the stale string, overwriting the first. The focus handler was
   * fooled the same way and shoved the caret back a box. Six digits typed
   * correctly came out as three, and sign-in said the PIN was wrong. Every
   * read below goes through this ref, and `emit` updates it immediately.
   */
  const latest = useRef(value);
  latest.current = value;

  function emit(next: string) {
    latest.current = next;
    onChange(next);
  }

  function focusBox(index: number) {
    boxes.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();
  }

  function setDigit(index: number, digit: string) {
    const next = latest.current.padEnd(LENGTH, " ").split("");
    next[index] = digit || " ";
    emit(next.join("").replace(/ +$/, "").replace(/ /g, ""));
  }

  function handleChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");

    if (digits === "") {
      setDigit(index, "");

      return;
    }

    /*
     * More than one digit means a paste, or an Android keyboard delivering a
     * whole autofilled code into whichever box had focus. Spread it forward
     * rather than keeping the first and dropping the rest.
     */
    if (digits.length > 1) {
      const merged = (latest.current.slice(0, index) + digits).slice(0, LENGTH);
      emit(merged);
      focusBox(merged.length);

      return;
    }

    setDigit(index, digits);
    focusBox(index + 1);
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      /*
       * An empty box swallows Backspace and nothing appears to happen, which
       * on a phone reads as the app being broken. Step back and clear instead.
       */
      if (latest.current[index] === undefined || latest.current[index] === "") {
        event.preventDefault();
        emit(latest.current.slice(0, Math.max(0, index - 1)));
        focusBox(index - 1);
      }

      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(index - 1);
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(index + 1);
    }
  }

  return (
    <div
      className="pin-boxes"
      role="group"
      aria-label={label}
      onPaste={(event) => {
        const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);

        if (pasted === "") return;

        event.preventDefault();
        emit(pasted);
        focusBox(pasted.length);
      }}
    >
      {Array.from({ length: LENGTH }, (_, index) => (
        <input
          key={index}
          ref={(element) => {
            boxes.current[index] = element;
          }}
          /*
           * `password`, so the digits are masked as they were in the single
           * field this replaces. `inputMode` numeric is what opens the keypad;
           * the type alone does not.
           */
          type="password"
          inputMode="numeric"
          autoComplete={index === 0 ? autoComplete : "off"}
          aria-label={`${label}, digit ${index + 1}`}
          maxLength={1}
          value={value[index] ?? ""}
          autoFocus={autoFocus && index === 0}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          // A tap in the middle of a half-filled row should land where typing
          // will actually go, not leave the caret behind the gap.
          onFocus={(event) => {
            event.target.select();

            if (index > latest.current.length) focusBox(latest.current.length);
          }}
        />
      ))}
    </div>
  );
}
