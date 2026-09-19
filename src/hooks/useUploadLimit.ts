import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ResourceResponse, ServerConfig } from "../types/api";

/**
 * The server's real upload ceiling, so a form can reject an oversized file
 * immediately instead of spending a slow upload to be told no.
 *
 * PHP's upload_max_filesize cannot be raised from application code, so this
 * value differs between machines -- hardcoding it in the client would go stale
 * the moment the shared host changed it.
 */
export function useUploadLimit(): ServerConfig | null {
  const [config, setConfig] = useState<ServerConfig | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    api
      .get<ResourceResponse<ServerConfig>>("/config", { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setConfig(response.data);
      })
      .catch(() => {
        // Non-fatal: without it the server still rejects oversized files, just
        // after the upload rather than before it.
      });

    return () => controller.abort();
  }, []);

  return config;
}
