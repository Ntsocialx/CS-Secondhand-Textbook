const localDevelopmentApiUrl = "http://localhost:5000";

/**
 * Express API origin for server-side calls (auth proxy routes).
 * Production never falls back to localhost: a missing API_URL returns null so callers can
 * answer with a clear "not configured" error instead of failing against the wrong host.
 */
export function getServerApiUrl(): string | null {
  const configured = process.env.API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return process.env.NODE_ENV === "production" ? null : localDevelopmentApiUrl;
}
