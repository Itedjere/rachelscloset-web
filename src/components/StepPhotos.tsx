import { useRef, useState } from "react";
import { useAttachment } from "../hooks/useAttachment";
import { api, errorMessage } from "../lib/api";
import { shrinkImage } from "../lib/image";
import type { StepPhoto } from "../types/api";
import Icon from "./Icon";

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
  const [viewing, setViewing] = useState<StepPhoto | null>(null);

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
        {photos.map((photo) => (
          <Thumbnail
            key={photo.id}
            photo={photo}
            label={label}
            onOpen={() => setViewing(photo)}
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

      {viewing ? (
        <Lightbox
          photo={viewing}
          label={label}
          canDelete={canEdit}
          busy={busy}
          onDelete={() => void remove(viewing)}
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
 * Full size, over the page.
 *
 * A plain overlay rather than a native <dialog>: the public site can use one
 * because it is a single static page, but inside the app a dialog that
 * survives a route change is a worse bug than the twenty lines this saves.
 */
function Lightbox({
  photo,
  label,
  canDelete,
  busy,
  onDelete,
  onClose,
}: {
  photo: StepPhoto;
  label: string;
  canDelete: boolean;
  busy: boolean;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { objectUrl } = useAttachment(photo.url);
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${label}, photographed`}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      {/* Stops a tap on the picture itself from closing the thing. */}
      <div className="lightbox-inner" onClick={(event) => event.stopPropagation()}>
        {objectUrl ? <img src={objectUrl} alt={`${label}, photographed`} /> : null}

        <div className="lightbox-actions">
          {canDelete ? (
            confirming ? (
              <>
                <button type="button" className="btn danger" onClick={onDelete} disabled={busy}>
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
          ) : null}

          <button type="button" className="btn" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
