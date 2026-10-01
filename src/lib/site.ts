/**
 * Where the public site lives -- the Blade half, with the directory and the
 * landing page.
 *
 * A build-time value rather than something fetched from /api/config: it is
 * the href on the logo, which has to be right on the first paint of the
 * sign-in page, not after a request returns. In development the API serves the
 * public site on 8001; in production set VITE_SITE_URL.
 */
export const SITE_URL: string =
  import.meta.env.VITE_SITE_URL || (import.meta.env.DEV ? "http://localhost:8001" : "/");
