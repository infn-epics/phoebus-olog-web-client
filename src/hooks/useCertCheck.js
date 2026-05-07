import { useState, useEffect } from "react";
import customization from "config/customization";

/**
 * Probes the Olog API base URL on mount.
 * If the request fails with a network error (e.g. untrusted/self-signed
 * certificate), `certUntrusted` is set to `true` so the UI can prompt the
 * user to open the API URL directly and accept the certificate exception.
 *
 * A real HTTP error response (4xx/5xx) means the server is reachable and the
 * certificate IS trusted, so `certUntrusted` stays false in that case.
 */
export function useCertCheck() {
  const [certUntrusted, setCertUntrusted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const apiUrl = customization.APP_BASE_URL;
    if (!apiUrl) return;

    fetch(apiUrl, { mode: "no-cors" })
      .then(() => {
        // no-cors succeeds (opaque response) → server reachable, cert OK
        if (!cancelled) setCertUntrusted(false);
      })
      .catch(() => {
        // Network error → likely untrusted certificate
        if (!cancelled) setCertUntrusted(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { certUntrusted, apiUrl: customization.APP_BASE_URL };
}
