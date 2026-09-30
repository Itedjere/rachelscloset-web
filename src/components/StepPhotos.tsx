import { useEffect, useRef, useState } from "react";
import { useAttachment, useAttachments } from "../hooks/useAttachment";
import { api, errorMessage } from "../lib/api";
import { shrinkImage } from "../lib/image";
import type { StepPhoto } from "../types/api";
import Icon from "./Icon";
import Lightbox from "./Lightbox";

/** Matches OrderStepPhoto::MAX_PER_STEP. The server is the one enforcing it. */
const MAX_PER_STEP = 3;

interface StepPhotosProps {
  orderId: number;
  stepId: number;
  label: string;
  photos: StepPhoto[];
  /** The tailor, while the order is still being worked on. */
  canEdit: boolean;
  onChanged: () => void;
}

/**
 * Photographs of one stage.
 *
 * The tracker lets a tailor say a stage is done; this is how she shows it.
 * The button opens the camera directly rather than a file picker -- `capture`
 * on the input -- because the work and the phone are in the same hands and
 * navigating a file system is exactly the kind of reading this platform is
 * built to avoid.
 */
export default function StepPhotos({
  orderId,
  stepId,
  label,
  photos,
  canEdit,
  onChanged,
}: StepPhotosProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);

  const full = photos.length >= MAX_PER_STEP;

  async function add(file: File) {
    setBusy(true);
    setProblem(null);

    try {
      // "document", not "avatar": this is stitching held up to a camera, and
      // 512px would throw away the thing being shown.
      const shrunk = await shrinkImage(file, "document");

      const form = new FormData();
      form.append("photo", shrunk);

      await api.post(`/orders/${orderId}/steps/${stepId}/photos`, form);
      onChanged();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(photo: StepPhoto) {
    setBusy(true);
    setProblem(null);

    try {
      await api.delete(`/orders/${orderId}/steps/${stepId}/photos/${photo.id}`);
      setViewing(null);
      onChanged();
    } catch (error: unknown) {
      setProblem(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (photos.length === 0 && !canEdit) return null;

  return (
    <div className="step-photos">
      <div className="step-photo-strip">
        {photos.map((photo, index) => (
          <Thumbnail
            key={photo.id}
            photo={photo}
            label={label}
            onOpen={() => setViewing(index)}
          />
        ))}

        {canEdit && !full ? (
          <>
            <button
              type="button"
              className="step-photo-add"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              aria-label={`Add a photo of ${label}`}
            >
              <Icon name="camera" size={22} />
              <span>{busy ? "Sending…" : "Photo"}</span>
            </button>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              // Opens the rear camera on a phone rather than a file browser.
              capture="environment"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void add(file);
              }}
            />
          </>
        ) : null}
      </div>

      {problem ? <p className="notice bad">{problem}</p> : null}

      {viewing !== null ? (
        <StepLightbox
          photos={photos}
          label={label}
          index={viewing}
          onIndex={setViewing}
          canDelete={canEdit}
          busy={busy}
          onDelete={(photo) => void remove(photo)}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </div>
  );
}

function Thumbnail({
  photo,
  label,
  onOpen,
}: {
  photo: StepPhoto;
  label: string;
  onOpen: () => void;
}) {
  const { objectUrl, failed } = useAttachment(photo.url);

  return (
    <button
      type="button"
      className="step-photo"
      onClick={onOpen}
      disabled={!objectUrl}
      aria-label={`See the photo of ${label} larger`}
    >
      {objectUrl ? (
        <img src={objectUrl} alt={`${label}, photographed`} />
      ) : (
        <span className="step-photo-pending" aria-hidden="true">
          {failed ? "!" : ""}
        </span>
      )}
    </button>
  );
}

/**
 * The stage photographs, full size, with a way through the set.
 *
 * Its own wrapper because these are the only private images in the app: they
 * stream through the authenticated file endpoint, so every one -- the big
 * picture and each thumbnail in the rail -- has to be fetched as a blob
 * before it can be shown. Three per stage, so all of them at once.
 *
 * The overlay this replaced was a plain div rather than a <dialog>, on the
 * grounds that a dialog surviving a route change is a worse bug than the
 * code it saves. The shared component closes itself in an effect cleanup, so
 * unmounting -- which is what a route change does -- shuts it.
 */
function StepLightbox({
  photos,
  label,
  index,
  onIndex,
  canDelete,
  busy,
  onDelete,
  onClose,
}: {
  photos: StepPhoto[];
  label: string;
  index: number;
  onIndex: (index: number) => void;
  canDelete: boolean;
  busy: boolean;
  onDelete: (photo: StepPhoto) => void;
  onClose: () => void;
}) {
  const resolved = useAttachments(photos.map((photo) => photo.url));
  const [confirming, setConfirming] = useState(false);
  const current = photos[index];

  // Moving to another photograph abandons a half-made decision about this
  // one, which is the only sane reading of tapping an arrow.
  useEffect(() => {
    setConfirming(false);
  }, [index]);

  const slides = photos
    .map((photo) => ({ photo, url: resolved[photo.url] }))
    .filter((entry): entry is { photo: StepPhoto; url: string } => Boolean(entry.url))
    .map((entry) => ({
      id: entry.photo.id,
      url: entry.url,
      alt: `${label}, photographed`,
    }));

  // Nothing has arrived yet. Showing an empty frame is better than showing
  // the page underneath with a dialog that has no picture in it.
  if (slides.length === 0 || !current) {
    return (
      <div className="lightbox" role="dialog" aria-modal="true" aria-label={label}>
        <p className="empty">Loading…</p>
      </div>
    );
  }

  return (
    <Lightbox
      slides={slides}
      index={Math.min(index, slides.length - 1)}
      onIndex={onIndex}
      onClose={onClose}
      actions={
        canDelete ? (
          confirming ? (
            <>
              <button
                type="button"
                className="btn danger"
                onClick={() => onDelete(current)}
                disabled={busy}
              >
                {busy ? "Removing…" : "Yes, remove it"}
              </button>
              <button type="button" className="btn quiet" onClick={() => setConfirming(false)}>
                Keep it
              </button>
            </>
          ) : (
            <button type="button" className="btn quiet" onClick={() => setConfirming(true)}>
              <Icon name="trash" size={18} />
              Remove
            </button>
          )
        ) : null
      }
    />
  );
}
