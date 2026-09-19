import { useAttachment } from "../hooks/useAttachment";
import AudioPlayer from "./AudioPlayer";

interface AttachmentViewProps {
  /** The routed file URL from the API. */
  url: string | null;
  kind: "audio" | "image";
  /** Alt text for an image. Empty where the image is decorative. */
  alt?: string;
}

/**
 * An uploaded file, fetched through the authenticated endpoint.
 *
 * Every file on this platform is behind FileAccess, so nothing can be pointed
 * at with a plain src=. This is the one component that knows that, so a caller
 * only has to hand over the URL the API gave it.
 */
export default function AttachmentView({ url, kind, alt = "" }: AttachmentViewProps) {
  const { objectUrl, failed } = useAttachment(url);

  if (!url) return null;

  if (failed) {
    // Said plainly rather than shown as a broken icon. A file that will not
    // load is usually a permission that has been withdrawn, not a bad link.
    return <p className="notice bad">That file could not be opened.</p>;
  }

  if (kind === "audio") {
    return <AudioPlayer src={objectUrl} loading={!objectUrl} />;
  }

  if (!objectUrl) return <div className="attachment-placeholder" aria-hidden="true" />;

  return <img className="attachment-image" src={objectUrl} alt={alt} />;
}
