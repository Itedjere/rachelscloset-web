import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../lib/api";
import { drawBusinessCard } from "../lib/businessCard";
import type { BusinessCardData } from "../types/api";

/**
 * Her business card, with the QR that points at her Fashion House page.
 *
 * Drawn on a canvas rather than laid out in HTML, for one reason: the
 * primary action here is "save it as a picture", and a canvas can already do
 * that. The alternative is an HTML-to-canvas library, which is a large
 * dependency to add for a screenshot — and rasterising an SVG through an
 * <img> loses the webfonts, which is most of what makes the card look like
 * this platform rather than a template.
 *
 * Saving is the primary action and printing is secondary, because a tailor
 * will send this to a print shop on WhatsApp. Home printing is not how this
 * works here.
 */
export default function BusinessCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [card, setCard] = useState<BusinessCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void api
      .get<{ data: BusinessCardData }>("/business-card")
      .then((response) => setCard(response.data))
      .catch((error: unknown) => setProblem(errorMessage(error)))
      .finally(() => setLoading(false));
  }, []);

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !card) return;

    /*
     * The fonts have to be in before anything is measured, or the card is
     * drawn in Times and then silently stays that way -- canvas takes no
     * second pass when a font arrives late.
     */
    try {
      await document.fonts.ready;
    } catch {
      // No Font Loading API: it will fall back to the generic stack.
    }

    drawBusinessCard(canvas, card);
  }, [card]);

  useEffect(() => {
    void render();
  }, [render]);

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || !card) return;

    canvas.toBlob((blob) => {
      if (!blob) return setProblem("That did not work. Try again.");

      // An object URL and a synthetic click: no library, and the file lands
      // in her downloads where WhatsApp can pick it up.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${card.slug}-card.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
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
          Save it as a picture and send it to a printer. Anyone who scans the code lands on
          your page, with your work on it.
        </p>
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      <div className="card card-preview">
        {/* The canvas is the card. Sized in lib/businessCard.ts. */}
        <canvas ref={canvasRef} className="business-card" />

        <div className="row-actions">
          <button type="button" className="btn" onClick={save}>
            Save card as picture
          </button>
          <button type="button" className="btn quiet" onClick={() => window.print()}>
            Print it
          </button>
        </div>

        {saved ? <p className="notice">Saved. Look in your downloads.</p> : null}

        <p className="hint">
          The address on your card is <strong>{card.url_label}</strong>. It never changes,
          even if you rename your business — so cards already printed keep working.
        </p>
      </div>
    </>
  );
}
