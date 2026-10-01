import type { ReactNode } from "react";
import Icon from "./Icon";

export interface AuthPoint {
  icon: string;
  title: string;
  text: string;
}

/**
 * The two doors in -- sign-in and joining -- as one card in two halves.
 *
 * The violet half says what this place is FOR, as three pictures with a line
 * each, because the person arriving here may have scanned a QR code on a
 * tailor's card and never heard of Rachels Closet. Icons first and words
 * second: somebody who reads slowly gets the gist from the pictures. On a
 * phone the list folds away and only the headline stays, so the form is not
 * a scroll below a sales pitch.
 *
 * The dashed inset border is stitching. It is the one decorative idea, and it
 * is the trade.
 */
export default function AuthFrame({
  headline,
  points,
  children,
}: {
  headline: ReactNode;
  points: AuthPoint[];
  children: ReactNode;
}) {
  return (
    <div className="auth-frame">
      <aside className="auth-frame__aside">
        {/* Sticky, so the long tailor form does not scroll away from it. */}
        <div className="auth-frame__inner">
          <img className="auth-frame__mark" src="/brand/mark.svg" width="48" height="48" alt="" aria-hidden="true" />
          <h2 className="auth-frame__headline">{headline}</h2>

          <ul className="auth-points">
            {points.map((point) => (
              <li key={point.title}>
                <span className="auth-points__icon">
                  <Icon name={point.icon} size={22} />
                </span>
                <span>
                  <strong>{point.title}</strong>
                  <span>{point.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="auth-frame__main">{children}</div>
    </div>
  );
}

/**
 * A text field with a picture in front of it. The picture is the label's
 * meaning at a glance -- a phone, a shop, a pin on a map -- so the words
 * above it are a confirmation rather than the only clue.
 */
export function IconField({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="icon-input">
      <span className="icon-input__icon">
        <Icon name={icon} size={20} />
      </span>
      {children}
    </div>
  );
}
