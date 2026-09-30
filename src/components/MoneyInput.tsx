/**
 * A naira field that reads like money while it is being typed.
 *
 * `40000` and `400000` are one glance apart and an order of magnitude apart,
 * which is the mistake this exists to prevent — somebody quoting four hundred
 * thousand naira for a kaftan because of one keystroke. With separators the
 * two are unmistakable.
 *
 * It is deliberately NOT `type="number"`: a number input cannot display
 * grouped digits at all, and its spinner arrows are a hazard on a field that
 * means money. `inputMode="decimal"` is what opens the numeric keypad, so
 * nothing is lost on a phone.
 *
 * The value handed out is always a plain decimal string — "40000.00" — never
 * a formatted one and never a float, because the server compares money with
 * bccomp on decimal strings and a separator reaching it would be a 422 with
 * nothing on screen to explain it.
 */
export default function MoneyInput({
  value,
  onChange,
  id,
  placeholder,
  disabled,
  max,
  required,
}: {
  /** A plain decimal string, as the API sends and receives it. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  max?: string;
  required?: boolean;
}) {
  return (
    <div className="money-input">
      <span className="money-input__mark" aria-hidden="true">
        ₦
      </span>

      <input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        value={group(value)}
        onChange={(event) => onChange(clean(event.target.value, max))}
      />
    </div>
  );
}

/**
 * Separators on the whole-naira part only.
 *
 * The decimal part is left exactly as typed — grouping it makes no sense, and
 * touching it would fight somebody halfway through "1500." with the point
 * entered and the kobo not yet.
 */
function group(value: string): string {
  if (value === "") return "";

  const [whole, ...rest] = value.split(".");
  const grouped = whole === "" ? "" : Number(whole).toLocaleString("en-NG");

  return rest.length > 0 ? `${grouped}.${rest.join("")}` : grouped;
}

/** Back to something the server will accept. */
function clean(raw: string, max?: string): string {
  // Separators out, everything but digits and one point out.
  let value = raw.replace(/[^\d.]/g, "");

  const first = value.indexOf(".");

  if (first !== -1) {
    value = value.slice(0, first + 1) + value.slice(first + 1).replace(/\./g, "");
  }

  // Kobo exists on the wire but nobody prices in it; two places is the column.
  const [whole = "", fraction] = value.split(".");
  value = fraction === undefined ? whole : `${whole}.${fraction.slice(0, 2)}`;

  // A leading zero before real digits is somebody's stray keystroke, not an
  // amount. "0" and "0.50" both survive.
  if (/^0\d/.test(value)) value = value.replace(/^0+/, "");

  if (max !== undefined && value !== "" && Number(value) > Number(max)) return max;

  return value;
}
