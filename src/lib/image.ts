/*
 * Shrinks a photo in the browser before it is uploaded.
 *
 * A phone camera produces four or five megabytes. Sending that to be displayed
 * at forty pixels wastes the one thing this platform's users pay for by the
 * megabyte, and it is the difference between an upload that works on a patchy
 * connection and one that times out.
 *
 * Done on a canvas rather than with an image library: this is about twenty
 * lines and every browser has had it for a decade. The server still validates
 * type and size -- the client is doing a kindness, not enforcing a rule.
 */

/**
 * How far down a photo may be shrunk, per kind.
 *
 * BizyFarmers hardcodes one number, 512, which is right for a face at forty
 * pixels and **would destroy handwriting on a photographed measurement book**.
 * That book is not decoration: it is the record, and it is the record precisely
 * because a tailor who reads poorly can still write numbers in it and read them
 * back. Downscaling it to 512 would throw away the only thing it is for.
 *
 * This is also, in effect, the storage policy. Nine step photos per order at
 * 1600px is the number that decides whether a thousand orders fit on a shared
 * host, so it is written down in one place rather than guessed at each call.
 */
export const MAX_EDGE = {
  /** A face in a list. Small on purpose. */
  avatar: 512,
  /** Handwriting, and stitching held up to a camera. */
  document: 1600,
} as const;

export type PhotoKind = keyof typeof MAX_EDGE;

export async function shrinkImage(file: File, kind: PhotoKind = "avatar"): Promise<File> {
  const bitmap = await loadBitmap(file);

  const maxEdge = MAX_EDGE[kind];
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  // No canvas means no shrinking; the server will still take the original if it
  // is small enough, and say so plainly if it is not.
  if (!context) return file;

  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    // 0.85 for a face, 0.92 for a document. JPEG artefacts around thin dark
    // strokes on white are exactly what ruins pencil on paper, and the extra
    // bytes are worth more than the saving on a photo taken once per customer.
    canvas.toBlob(resolve, "image/jpeg", kind === "document" ? 0.92 : 0.85),
  );

  if (!blob) return file;

  // Named after the kind, not hardcoded to "avatar.jpg" as BizyFarmers does --
  // the server logs and the storage disk should not claim every photograph on
  // the platform is somebody's face.
  return new File([blob], `${kind}.jpg`, { type: "image/jpeg" });
}

/** createImageBitmap where it exists, an <img> where it does not. */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }

  const url = URL.createObjectURL(file);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("That file could not be read as an image."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
