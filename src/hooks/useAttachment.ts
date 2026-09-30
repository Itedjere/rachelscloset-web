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

/**
 * The same thing for a set of files, so a gallery can be paged through.
 *
 * `useAttachment` is one hook per URL and the rules of hooks forbid calling
 * it in a loop, so a lightbox with a thumbnail rail needs this. Bounded by
 * what it is used for -- three photographs per stage -- so everything is
 * fetched at once rather than windowed.
 *
 * Returns a map keyed by the original URL. A key that is absent is still
 * loading; one mapped to null failed.
 */
export function useAttachments(urls: string[]): Record<string, string | null> {
  const [resolved, setResolved] = useState<Record<string, string | null>>({});

  // The array is rebuilt on every render by every caller, so the effect keys
  // off the contents rather than the identity.
  const key = urls.join("\u0000");

  useEffect(() => {
    const list = key === "" ? [] : key.split("\u0000");
    const controller = new AbortController();
    const created: string[] = [];

    setResolved({});

    list.forEach((url) => {
      fetchFileObjectUrl(url, controller.signal)
        .then((blobUrl) => {
          if (controller.signal.aborted) {
            URL.revokeObjectURL(blobUrl);

            return;
          }

          created.push(blobUrl);
          setResolved((current) => ({ ...current, [url]: blobUrl }));
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || isAbortError(error)) return;

          setResolved((current) => ({ ...current, [url]: null }));
        });
    });

    return () => {
      controller.abort();
      created.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
    };
  }, [key]);

  return resolved;
}
