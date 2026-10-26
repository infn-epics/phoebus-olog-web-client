import customization from "config/customization";

export async function fetchLogbookExport({ name, format, token, signal }) {
  if (!["json", "pdf"].includes(format)) throw new Error("Unsupported export format.");
  const type = format === "pdf" ? "application/pdf" : "application/json";
  const base = (customization.APP_BASE_URL ?? "").replace(/\/+$/, "");
  const response = await fetch(`${base}/logbooks/${encodeURIComponent(name)}/export?format=${format}`, {
    credentials: "include", redirect: "error", cache: "no-store", signal,
    headers: { Accept: type, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    throw new Error(response.status === 401 ? "Sign in again to export this logbook."
      : response.status === 403 ? "Only a logbook administrator can export its entries."
      : details?.message || "Unable to export the logbook. Please retry.");
  }
  if (response.headers.get("Content-Type")?.split(";")[0].trim() !== type) {
    throw new Error("The server did not return a valid logbook export.");
  }
  const blob = await response.blob();
  const safeName = Array.from(name.replace(/[^\p{L}\p{N}._-]+/gu, "_")).slice(0, 80).join("");
  return { blob, filename: `olog-${safeName}.${format}` };
}

export function saveLogbookExport({ blob, filename }) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  try {
    link.href = url; link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
