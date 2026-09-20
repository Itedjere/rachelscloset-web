interface StarsProps {
  value: number;
  /** Omit to render a read-only rating. */
  onChange?: (value: number) => void;
  size?: number;
  label?: string;
}

/**
 * Five stars, read-only or tappable.
 *
 * Deliberately not a range input or a select. The whole platform is built for
 * people who find reading hard, and five shapes you touch is the one rating
 * control that needs no words at all -- which is also why the tappable
 * version is 44px per star rather than the 20px a desktop design would use.
 */
export default function Stars({ value, onChange, size, label }: StarsProps) {
  const interactive = Boolean(onChange);
  const starSize = size ?? (interactive ? 34 : 18);

  if (!interactive) {
    return (
      <span className="stars" aria-label={`${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} filled={star <= value} size={starSize} />
        ))}
      </span>
    );
  }

  return (
    <div className="stars-input" role="radiogroup" aria-label={label ?? "Your rating"}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
          onClick={() => onChange?.(star)}
        >
          <Star filled={star <= value} size={starSize} />
        </button>
      ))}
    </div>
  );
}

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      className={filled ? "star on" : "star"}
      aria-hidden="true"
    >
      <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z" />
    </svg>
  );
}
