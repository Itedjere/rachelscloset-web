import type { BusinessCardData } from "../types/api";

/*
 * Drawing the card.
 *
 * Kept out of the component because it is arithmetic, not React, and because
 * the numbers below are the design: a business card is a physical object with
 * a standard size, and getting that wrong is not a styling bug but a printing
 * one.
 */

/** 85 x 55 mm, the standard card, at 300dpi. Whole pixels at 3x. */
const WIDTH = 1004;
const HEIGHT = 650;

/** A safe margin from the trimmed edge. Printers cut inaccurately. */
const PAD = 64;

const INK = "#251540";
const LILAC = "#8257bd";
const MUTED = "#6b5f78";

/**
 * Draws the card at full print resolution.
 *
 * The canvas is sized in device pixels and scaled down in CSS, so what is
 * saved is 1004x650 regardless of how big it looks on screen -- which is the
 * whole point, since the file goes to a print shop.
 */
export function drawBusinessCard(canvas: HTMLCanvasElement, card: BusinessCardData): void {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Pure white, pure black-ish. A tinted card costs more to print and scans
  // worse, and the quiet zone around a QR has to be genuinely white.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // A thin lilac rule down the left edge: enough brand for a card this size.
  ctx.fillStyle = LILAC;
  ctx.fillRect(0, 0, 14, HEIGHT);

  const qrSize = 300;
  const qrX = WIDTH - PAD - qrSize;
  const qrY = PAD + 10;

  drawQr(ctx, card.qr, qrX, qrY, qrSize);

  /*
   * The instruction belongs UNDER THE CODE, not across the card from it.
   * An arrow-less "point your camera here" beside a block of text points at
   * nothing, and this platform's premise is never assuming somebody will
   * work it out.
   */
  ctx.textAlign = "center";
  const qrCentre = qrX + qrSize / 2;

  ctx.fillStyle = MUTED;
  ctx.font = `400 22px Monda, system-ui, sans-serif`;
  ctx.fillText("Point your camera here", qrCentre, qrY + qrSize + 34);

  ctx.fillStyle = LILAC;
  ctx.font = `600 24px Monda, system-ui, sans-serif`;
  ctx.fillText("to see my work", qrCentre, qrY + qrSize + 64);

  ctx.textAlign = "left";

  // Everything textual lives left of the code, and wraps inside that column.
  const textWidth = qrX - PAD - 40;

  let y = PAD + 56;

  ctx.fillStyle = INK;
  ctx.textBaseline = "alphabetic";

  ctx.font = `600 52px "Zilla Slab", Georgia, serif`;
  y = wrapText(ctx, card.business_name, PAD, y, textWidth, 60);

  if (card.location) {
    y += 38;
    ctx.fillStyle = MUTED;
    ctx.font = `400 26px Monda, system-ui, sans-serif`;
    ctx.fillText(card.location, PAD, y);
  }

  if (card.whatsapp) {
    y += 46;
    ctx.fillStyle = INK;
    ctx.font = `700 32px Monda, system-ui, sans-serif`;
    ctx.fillText(card.whatsapp, PAD, y);
  }

  /*
   * The platform, bottom left.
   *
   * Without it the card carries a web address and no indication of what it
   * is -- and the QR is a square somebody is being asked to trust. The name
   * is what makes both legible, and it is what a printed card is doing for
   * the platform in return.
   */
  ctx.fillStyle = INK;
  ctx.font = `600 26px "Zilla Slab", Georgia, serif`;
  ctx.fillText("Rachel’s Closet", PAD, HEIGHT - PAD - 26);

  ctx.fillStyle = MUTED;
  ctx.font = `400 20px Monda, system-ui, sans-serif`;
  ctx.fillText(card.url_label, PAD, HEIGHT - PAD + 4);
}

/**
 * The QR itself, drawn module by module.
 *
 * From the grid rather than an image: no fetch, no rasterising, and every
 * module lands on a whole pixel at any size, which is what makes it scan
 * after being printed small.
 *
 * The quiet zone is added here rather than baked into the grid -- four
 * modules of white all round, which is what the spec asks for and what cheap
 * scanners actually need.
 */
function drawQr(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  x: number,
  y: number,
  size: number,
): void {
  const count = rows.length;
  if (count === 0) return;

  const quiet = 4;
  const module = Math.floor(size / (count + quiet * 2));
  const drawn = module * (count + quiet * 2);

  // Centre whatever rounding left over, so the code is not off by a pixel
  // against the text beside it.
  const left = x + Math.floor((size - drawn) / 2);
  const top = y + Math.floor((size - drawn) / 2);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(left, top, drawn, drawn);

  // Pure black, not the ink colour: contrast is what a scanner reads, and a
  // tinted code is the classic way to make one that does not work.
  ctx.fillStyle = "#000000";

  for (let r = 0; r < count; r++) {
    const row = rows[r];
    if (!row) continue;

    for (let c = 0; c < count; c++) {
      if (row[c] !== "1") continue;

      ctx.fillRect(
        left + (c + quiet) * module,
        top + (r + quiet) * module,
        module,
        module,
      );
    }
  }
}

/** Wraps to `maxWidth`, returns the baseline of the last line drawn. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(/\s+/);
  let line = "";
  let cursor = y;

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;

    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, cursor);
      cursor += lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) ctx.fillText(line, x, cursor);

  return cursor;
}
