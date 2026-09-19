import { initials } from "../lib/format";
import { useAttachment } from "../hooks/useAttachment";

interface AvatarProps {
  name: string;
  /** The routed file URL from the API, not a disk path. */
  url: string | null;
  size?: number;
}

/**
 * Somebody's photograph, or their initials.
 *
 * Initials rather than a generic silhouette: in a directory of tailors, forty
 * identical grey outlines is a page you cannot scan, and two letters in the
 * brand colour is something the eye can tell apart at a glance.
 */
export default function Avatar({ name, url, size = 40 }: AvatarProps) {
  const { objectUrl, failed } = useAttachment(url);

  const style = { width: size, height: size, fontSize: Math.round(size / 2.6) };

  // A photograph that fails to load falls back to initials rather than a broken
  // image icon. The fallback is always correct, so there is nothing to lose.
  if (!url || failed || !objectUrl) {
    return (
      <span className="avatar" style={style} aria-hidden="true">
        {initials(name)}
      </span>
    );
  }

  return <img className="avatar" style={style} src={objectUrl} alt="" />;
}
