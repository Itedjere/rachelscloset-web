import { useEffect, useState } from "react";
import { fetchFileObjectUrl, isAbortError } from "../lib/api";

/**
 * Fetches a file as a blob.
 *
 * Uploads sit behind the authenticated file endpoint, so they cannot simply be
 * pointed at with src= -- the browser would send no Authorization header.
 */
export function useAttachment(url: string | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();
    let created: string | null = null;

    setFailed(false);
    setObjectUrl(null);

    fetchFileObjectUrl(url, controller.signal)
      .then((blobUrl) => {
        if (controller.signal.aborted) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        created = blobUrl;
        setObjectUrl(blobUrl);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setFailed(true);
      });

    return () => {
      controller.abort();
      if (created) URL.revokeObjectURL(created);
    };
  }, [url]);

  return { objectUrl, failed };
}
