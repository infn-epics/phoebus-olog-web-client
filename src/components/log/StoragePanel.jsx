import { useState } from "react";
import { Alert, Button, CircularProgress, LinearProgress, Paper, Stack, TextField, Typography } from "@mui/material";
import { ologApi } from "api/ologApi";
import { useCustomSnackbar } from "src/hooks/useCustomSnackbar";

const GB = 1_000_000_000;
export const formatStorageBytes = (bytes) => {
  const value = Math.max(0, bytes ?? 0);
  if (value < 1000) return `${value} B`;
  const unit = Math.min(4, Math.floor(Math.log10(value) / 3));
  return `${(value / (1000 ** unit)).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${["B", "kB", "MB", "GB", "TB"][unit]}`;
};
const message = (error) => error?.data?.message || error?.data?.reason || "Unable to save the storage request. Please retry.";

function ReviewRequest({ quota }) {
  const [review, { isLoading }] = ologApi.endpoints.reviewStorageRequest.useMutation();
  const [note, setNote] = useState("");
  const { enqueueSnackbar } = useCustomSnackbar();
  const decide = async (approved) => {
    try {
      await review({ logbook: quota.logbook, requestId: quota.request.id, approved, note }).unwrap();
      enqueueSnackbar(approved ? "Storage increase approved." : "Storage increase rejected.", { severity: "success" });
    } catch (error) {
      enqueueSnackbar(message(error), { severity: "error" });
    }
  };
  return <Paper variant="outlined" component="section" aria-label={`Quota request for ${quota.logbook}`} sx={{ p: 2 }}>
    <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>{quota.logbook} ({quota.infnUuid}): {formatStorageBytes(quota.quotaBytes)} → {formatStorageBytes(quota.request.requestedQuotaBytes)}</Typography>
    {quota.request.requestedAt && <Typography variant="caption" color="text.secondary">Requested on {new Date(quota.request.requestedAt).toLocaleString()}</Typography>}
    <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", my: 1 }}>{quota.request.reason}</Typography>
    <TextField label="Review note" value={note} onChange={(event) => setNote(event.target.value)} inputProps={{ maxLength: 2000 }} fullWidth />
    <Button disabled={isLoading} onClick={() => decide(true)}>Approve</Button>
    <Button disabled={isLoading} onClick={() => decide(false)}>Reject</Button>
  </Paper>;
}

export function LogbookQuota({ logbook: summary }) {
  const [open, setOpen] = useState(false);
  const [requestedGB, setRequestedGB] = useState("");
  const [reason, setReason] = useState("");
  const [requestIncrease, { isLoading: isRequesting }] = ologApi.endpoints.requestStorageIncrease.useMutation();
  const { enqueueSnackbar } = useCustomSnackbar();
  const pending = summary?.request?.status === "PENDING";
  const bytes = Number(requestedGB) * GB;
  const valid = Number.isSafeInteger(bytes) && bytes > (summary?.quotaBytes ?? GB) && reason.trim().length > 0 && reason.length <= 2000;
  const send = async () => {
    if (!valid || pending) return;
    try {
      await requestIncrease({ logbook: summary.logbook, requestedQuotaBytes: bytes, reason: reason.trim() }).unwrap();
      setOpen(false); setReason("");
      enqueueSnackbar("Storage increase requested. An administrator will review it.", { severity: "success" });
    } catch (failure) {
      enqueueSnackbar(message(failure), { severity: "error" });
    }
  };
  const validUsage = Number.isFinite(summary.usedBytes) && Number.isFinite(summary.quotaBytes) && summary.quotaBytes > 0;
  if (!validUsage) return <Typography color="text.secondary">Storage quota unavailable.</Typography>;
  const percentage = Math.max(0, summary.usedBytes / summary.quotaBytes * 100);
  const remaining = Math.max(0, summary.quotaBytes - summary.usedBytes);
  const color = percentage >= 90 ? "error" : percentage >= 75 ? "warning" : "success";
  return <Stack gap={0.75} sx={{ minWidth: 220, maxWidth: 340 }}>
    <Typography>{formatStorageBytes(summary.usedBytes)} used of {formatStorageBytes(summary.quotaBytes)}</Typography>
    <LinearProgress variant="determinate" value={Math.min(100, percentage)} color={color}
      aria-label={`Storage quota usage for ${summary.logbook}`}
      aria-valuetext={`${formatStorageBytes(remaining)} available of ${formatStorageBytes(summary.quotaBytes)}`}
      sx={{ height: 8, borderRadius: 1 }} />
    <Typography variant="caption" color="text.secondary">{formatStorageBytes(remaining)} available</Typography>
    {summary.usedBytes >= summary.quotaBytes && <Alert severity="warning">The storage quota for this logbook has been reached.</Alert>}
    {summary.request && <Alert severity={pending ? "info" : summary.request.status === "APPROVED" ? "success" : "warning"}>
      Storage request: {summary.request.status.toLowerCase()} — total quota requested: {formatStorageBytes(summary.request.requestedQuotaBytes)}.
      {summary.request.reviewNote && ` ${summary.request.reviewNote}`}
    </Alert>}
    <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => { setRequestedGB(String(Math.floor(summary.quotaBytes / GB) + 1)); setOpen(true); }} disabled={pending || isRequesting}>Request more space</Button>
    {open && !pending && <Stack gap={2}>
      <TextField type="number" label="Requested total quota (GB)" value={requestedGB} onChange={(event) => setRequestedGB(event.target.value)} inputProps={{ min: 1, step: 1 }} />
      <TextField label="Reason for increase" multiline value={reason} onChange={(event) => setReason(event.target.value)} inputProps={{ maxLength: 2000 }} />
      <Stack direction="row"><Button onClick={send} disabled={!valid || isRequesting}>Submit request</Button><Button onClick={() => setOpen(false)} disabled={isRequesting}>Cancel</Button></Stack>
    </Stack>}
  </Stack>;
}

export default function StoragePanel({ summary }) {
  const [filter, setFilter] = useState("");
  const requests = ologApi.endpoints.getStorageRequests.useQuery(undefined, { skip: !summary?.administrator, refetchOnMountOrArgChange: true });
  if (!summary?.administrator) return null;
  const pending = requests.error ? [] : [...(requests.currentData ?? [])].sort((a, b) =>
    (a.request.requestedAt ?? "").localeCompare(b.request.requestedAt ?? ""));
  const search = filter.trim().toLowerCase();
  const visible = pending.filter((quota) => `${quota.logbook} ${quota.infnUuid ?? ""} ${quota.request.reason}`.toLowerCase().includes(search));
  return <Paper sx={{ p: 3 }}>
    <Stack gap={2}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" gap={2}>
        <Typography variant="h6">Storage increase requests{!requests.error && ` (${pending.length} pending)`}</Typography>
        <Button onClick={requests.refetch} disabled={requests.isFetching}>Refresh</Button>
      </Stack>
      <TextField type="search" label="Filter quota requests" placeholder="Logbook, requester or reason" value={filter} onChange={(event) => setFilter(event.target.value)} />
      {requests.isFetching && <CircularProgress aria-label="Loading storage requests" />}
      {requests.error && <Alert severity="error" action={<Button onClick={requests.refetch}>Retry</Button>}>Unable to load storage requests.</Alert>}
      {!requests.isFetching && !requests.error && requests.currentData?.length === 0 && <Typography>No pending requests.</Typography>}
      {!requests.isFetching && !requests.error && pending.length > 0 && visible.length === 0 && <Typography>No requests match this filter.</Typography>}
      {visible.map((quota) => <ReviewRequest key={quota.request.id} quota={quota} />)}
    </Stack>
  </Paper>;
}
