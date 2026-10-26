import { useEffect, useRef, useState } from "react";
import { Button, ButtonGroup, CircularProgress } from "@mui/material";
import { fetchLogbookExport, saveLogbookExport } from "api/logbookExport";
import { useCustomSnackbar } from "src/hooks/useCustomSnackbar";

export default function LogbookExportActions({ name, token }) {
  const [busy, setBusy] = useState(null);
  const controller = useRef(null);
  const { enqueueSnackbar } = useCustomSnackbar();
  useEffect(() => () => controller.current?.abort(), [name, token]);
  const download = async (format) => {
    if (controller.current && !controller.current.signal.aborted) return;
    const request = new AbortController();
    controller.current = request;
    setBusy(format);
    try {
      const file = await fetchLogbookExport({ name, format, token, signal: request.signal });
      if (!request.signal.aborted) saveLogbookExport(file);
    } catch (error) {
      if (!request.signal.aborted) enqueueSnackbar(error.message || "Unable to export the logbook.", { severity: "error" });
    } finally {
      if (controller.current === request) { controller.current = null; setBusy(null); }
    }
  };
  return <ButtonGroup size="small" variant="outlined" disabled={!!busy}
    aria-label={`Export logs from ${name}`} aria-busy={!!busy} sx={{ ml: 1, verticalAlign: "middle" }}>
    {["json", "pdf"].map((format) => <Button key={format} onClick={() => download(format)}
      aria-label={`Export ${name} as ${format.toUpperCase()}`}
      startIcon={busy === format ? <CircularProgress size={14} /> : undefined}>
      {busy === format ? "Exporting…" : `Export ${format.toUpperCase()}`}
    </Button>)}
  </ButtonGroup>;
}
