import { useEffect, useState } from "react";
import { useAuthData } from "src/auth/authContext";
import customization from "src/config/customization";

export function isProtectedAttachment(url) {
  if (!url) {return false;}
  const base = new URL(`${customization.BACKEND_URL.replace(/\/$/, "")}/`, window.location.origin);
  const target = new URL(url, window.location.origin);
  return target.origin === base.origin && (target.pathname.startsWith(`${base.pathname}attachment/`) || target.pathname.startsWith(`${base.pathname}logs/attachments/`));
}

export async function loadAttachmentUrl(url, token, signal) {
  if (!isProtectedAttachment(url)) {return url;}
  const response = await fetch(url, { signal, credentials: "include", redirect: "error", cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {throw new Error(response.status === 403 ? "You do not have permission to view this attachment." : "Unable to load attachment.");}
  return URL.createObjectURL(await response.blob());
}

export function useAttachmentUrl(url) {
  const { token } = useAuthData() ?? {};
  const [result, setResult] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    if (isProtectedAttachment(url)) {
      loadAttachmentUrl(url, token, controller.signal).then((resolved) => {
        if (controller.signal.aborted) { URL.revokeObjectURL(resolved); return; }
        objectUrl = resolved;
        setResult({ source: url, token, url: resolved });
      }).catch(() => {
        if (!controller.signal.aborted) {setResult({ source: url, token, error: true });}
      });
    }
    return () => { controller.abort(); if (objectUrl) {URL.revokeObjectURL(objectUrl);} };
  }, [url, token]);
  if (!isProtectedAttachment(url)) {return { url };}
  return result?.source === url && result?.token === token ? result : {};
}
