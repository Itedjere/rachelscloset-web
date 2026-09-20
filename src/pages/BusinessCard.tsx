import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../lib/api";
import { drawBusinessCard, type CardTheme } from "../lib/businessCard";
import type { BusinessCardData } from "../types/api";

/**
 * Her business card: two sides, two themes.
 *
 * Drawn on a canvas rather than laid out in HTML, for one reason: the primary
 * action here is "save it as a picture", and a canvas can already do that.
 * The alternative is an HTML-to-canvas library, which is a large dependency
 * for a screenshot — and rasterising an SVG through an <img> loses the
 * webfonts, which is most of what makes the card look like this platform.
 *
 * Saving is primary and printing secondary, because a tailor sends this to a
 * print shop on WhatsApp. Home printing is not how this works here.
 */
export default function BusinessCard() {
  const frontRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);

  const [card, setCard] = useState<BusinessCardData | null>(null);
  const [theme, setTheme] = useState<CardTheme>("light");
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<{ data: BusinessCardData }>("/business-card")
      .then((response) => setCard(response.data))
      .catch((error: unknown) => setProblem(errorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  const render = useCallback(async () => {
    if (!card) return;

    /*
     * The fonts have to be in before anything is measured, or the card is
     * drawn in Times and silently stays that way — canvas takes no second
     * pass when a font arrives late.
     */
    try {
      await document.fonts.ready;
    } catch {
      // No Font Loading API: it falls back to the generic stack.
    }

    if (frontRef.current) drawBusinessCard(frontRef.current, card, "front", theme);
    if (backRef.current) drawBusinessCard(backRef.current, card, "back", theme);
  }, [card, theme]);

  useEffect(() => {
    void render();
  }, [render]);

  function save(which: "front" | "back") {
    const canvas = which === "front" ? frontRef.current : backRef.current;
    if (!canvas || !card) return;

    canvas.toBlob((blob) => {
      if (!blob) return setProblem("That did not work. Try again.");

      // An object URL and a synthetic click: no library, and the file lands
      // in her downloads where WhatsApp can pick it up.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${card.slug}-card-${which}-${theme}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setSaved(which);
      window.setTimeout(() => setSaved(null), 3000);
    }, "image/png");
  }

  if (loading) return <p className="empty">Loading…</p>;

  if (!card) {
    return (
      <>
        <div className="page-head">
          <h1>Your card</h1>
        </div>
        <p className="notice bad">{problem ?? "Not available."}</p>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>Your card</h1>
        <p>
          Save both sides and send them to a printer. Anyone who scans the code lands on your
          page, with your work on it.
        </p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-themes" role="radiogroup" aria-label="Card colour">
          {(["light", "dark"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={theme === option}
              className={`card-theme card-theme--${option}${theme === option ? " is-on" : ""}`}
              onClick={() => setTheme(option)}
            >
              {option === "light" ? "White card" : "Dark card"}
            </button>
          ))}
        </div>
        <p className="hint">
          Dark cards cost more to print, and the ink shows fingerprints. Both scan the same —
          the code always stays black on white.
        </p>
      </div>

      <div className="card-sides">
        <div className="card card-preview">
          <h2 style={{ fontSize: 16 }}>Front</h2>
          <canvas ref={frontRef} className="business-card" />
          <button type="button" className="btn" onClick={() => save("front")}>
            Save the front
          </button>
          {saved === "front" ? <p className="notice">Saved. Look in your downloads.</p> : null}
        </div>

        <div className="card card-preview">
          <h2 style={{ fontSize: 16 }}>Back</h2>
          <canvas ref={backRef} className="business-card" />
          <button type="button" className="btn" onClick={() => save("back")}>
            Save the back
          </button>
          {saved === "back" ? <p className="notice">Saved. Look in your downloads.</p> : null}
        </div>
      </div>

      <div className="card">
        <button type="button" className="btn quiet" onClick={() => window.print()}>
          Print both sides
        </button>
        <p className="hint">
          The address on your card is <strong>{card.url_label}</strong>. It never changes, even
          if you rename your business — so cards already printed keep working.
        </p>
      </div>
    </>
  );
}
