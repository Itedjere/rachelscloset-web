import type { BusinessCardData } from "../types/api";

/*
 * Drawing the card, both sides, in either theme.
 *
 * Kept out of the component because it is arithmetic, not React, and because
 * the numbers below are the design: a business card is a physical object with
 * a standard size, and getting that wrong is not a styling bug but a printing
 * one.
 *
 * THE TWO SIDES DO DIFFERENT JOBS, which is the whole reason to have two.
 * The front is who she is — the thing she hands across a counter. The back is
 * the scan side, and the code gets a whole face to itself rather than a
 * corner, which is what lets it be big enough to read from a purse.
 */

/** 85 x 55 mm, the standard card, at 300dpi. */
const WIDTH = 1004;
const HEIGHT = 650;

/** A safe margin from the trimmed edge. Printers cut inaccurately. */
const PAD = 64;

export type CardSide = "front" | "back";
export type CardTheme = "light" | "dark";

interface Palette {
  ground: string;
  ink: string;
  muted: string;
  accent: string;
  rule: string;
  /** Whether the QR needs a white tile under it. See drawBack. */
  tile: boolean;
}

/*
 * Two palettes, taken from the design system rather than invented.
 *
 * The dark one is violet-ink rather than black: black on a card prints as a
 * heavy slab and shows every fingerprint, and the whole brand carries a
 * violet cast anyway.
 */
const PALETTES: Record<CardTheme, Palette> = {
  light: {
    ground: "#ffffff",
    ink: "#251540",
    muted: "#6b5f78",
    accent: "#8257bd",
    rule: "#8257bd",
    tile: false,
  },
  dark: {
    ground: "#251540",
    ink: "#fcfaff",
    muted: "#b9a8cf",
    accent: "#c2a0ea",
    rule: "#c2a0ea",
    tile: true,
  },
};

export function drawBusinessCard(
  canvas: HTMLCanvasElement,
  card: BusinessCardData,
  side: CardSide = "front",
  theme: CardTheme = "light",
): void {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const palette = PALETTES[theme];

  ctx.fillStyle = palette.ground;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (side === "front") drawFront(ctx, card, palette);
  else drawBack(ctx, card, palette);
}

/**
 * The front: who she is.
 *
 * No QR here. It used to share this face and was the worse for it — a code
 * squeezed beside a column of text is smaller than it needs to be, and the
 * instruction beside it pointed across the card at nothing.
 */
function drawFront(ctx: CanvasRenderingContext2D, card: BusinessCardData, p: Palette): void {
  // A rule down the left edge: enough brand for a card this size.
  ctx.fillStyle = p.rule;
  ctx.fillRect(0, 0, 14, HEIGHT);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  let y = PAD + 76;

  ctx.fillStyle = p.ink;
  ctx.font = `600 62px "Zilla Slab", Georgia, serif`;
  y = wrapText(ctx, card.business_name, PAD, y, WIDTH - PAD * 2, 70);

  if (card.location) {
    y += 46;
    ctx.fillStyle = p.muted;
    ctx.font = `400 30px Monda, system-ui, sans-serif`;
    ctx.fillText(card.location, PAD, y);
  }

  if (card.whatsapp) {
    y += 54;
    ctx.fillStyle = p.ink;
    ctx.font = `700 36px Monda, system-ui, sans-serif`;
    ctx.fillText(card.whatsapp, PAD, y);
  }

  /*
   * A cue to turn it over.
   *
   * Without this the back is a surprise, and a card whose most useful face
   * is the one nobody looks at is a wasted card.
   */
  ctx.fillStyle = p.accent;
  ctx.font = `600 24px Monda, system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("See my work →", WIDTH - PAD, HEIGHT - PAD - 30);

  // The platform, so the card is not a name and a phone number from nobody.
  ctx.textAlign = "left";
  ctx.fillStyle = p.ink;
  ctx.font = `600 28px "Zilla Slab", Georgia, serif`;
  ctx.fillText("Rachels Closet", PAD, HEIGHT - PAD - 26);

  ctx.fillStyle = p.muted;
  ctx.font = `400 20px Monda, system-ui, sans-serif`;
  ctx.fillText(card.url_label, PAD, HEIGHT - PAD + 4);
}

/**
 * The back: the scan side.
 *
 * The code is centred and given the whole face, with the instruction directly
 * under it. On a 55mm card this is about a 32mm code — half again the size it
 * managed when it shared the front, which matters more than anything else
 * here because a code that will not scan is the only way this card can
 * actually fail.
 */
function drawBack(ctx: CanvasRenderingContext2D, card: BusinessCardData, p: Palette): void {
  const qrSize = 340;
  const qrX = (WIDTH - qrSize) / 2;
  const qrY = 58;

  drawQr(ctx, card.qr, qrX, qrY, qrSize, p.tile);

  ctx.textAlign = "center";

  ctx.fillStyle = p.muted;
  ctx.font = `400 26px Monda, system-ui, sans-serif`;
  ctx.fillText("Point your camera here", WIDTH / 2, qrY + qrSize + 58);

  ctx.fillStyle = p.accent;
  ctx.font = `600 30px Monda, system-ui, sans-serif`;
  ctx.fillText("to see my work", WIDTH / 2, qrY + qrSize + 96);

  // The address in words too: a camera is not always to hand, and a card with
  // no readable address is a dead end.
  ctx.fillStyle = p.muted;
  ctx.font = `400 20px Monda, system-ui, sans-serif`;
  ctx.fillText(card.url_label, WIDTH / 2, HEIGHT - PAD + 4);

  ctx.textAlign = "left";
}

/**
 * The QR itself, drawn module by module.
 *
 * From the grid rather than an image: no fetch, no rasterising, and every
 * module lands on a whole pixel at any size, which is what makes it scan
 * after being printed small. The quiet zone is added here rather than baked
 * into the grid — four modules all round, which is what the spec asks for and
 * what cheap scanners actually need.
 *
 * ALWAYS DARK MODULES ON A LIGHT GROUND, in both themes. An inverted code —
 * light modules on dark — is read by some scanners and silently refused by
 * others, and a card that works on the designer's phone and not on a
 * customer's is the worst possible outcome for an object that cannot be
 * recalled. On the dark card the code therefore sits on a white tile, which
 * also gives the quiet zone somewhere honest to be.
 */
function drawQr(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  x: number,
  y: number,
  size: number,
  tile: boolean,
): void {
  const count = rows.length;
  if (count === 0) return;

  const quiet = 4;
  const module = Math.floor(size / (count + quiet * 2));
  const drawn = module * (count + quiet * 2);

  // Centre whatever rounding left over, so the code is not off by a pixel
  // against the text beneath it.
  const left = x + Math.floor((size - drawn) / 2);
  const top = y + Math.floor((size - drawn) / 2);

  if (tile) {
    // A little larger than the code, so the white reads as a deliberate tile
    // rather than as the quiet zone having been forgotten.
    const bleed = module * 2;
    roundedRect(ctx, left - bleed, top - bleed, drawn + bleed * 2, drawn + bleed * 2, 18);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(left, top, drawn, drawn);
  }

  // Pure black, not the ink colour: contrast is what a scanner reads, and a
  // tinted code is the classic way to make one that does not work.
  ctx.fillStyle = "#000000";

  for (let r = 0; r < count; r++) {
    const row = rows[r];
    if (!row) continue;

    for (let c = 0; c < count; c++) {
      if (row[c] !== "1") continue;

      ctx.fillRect(left + (c + quiet) * module, top + (r + quiet) * module, module, module);
    }
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
