import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import StoragePanel, { LogbookQuota, formatStorageBytes } from "./StoragePanel";

const StorageContent = ({ summary }) => <>
  {(summary?.logbooks ?? []).map((book) => <LogbookQuota key={book.logbook} logbook={book} />)}
  <StoragePanel summary={summary} />
</>;

const mocks = vi.hoisted(() => ({ send: vi.fn(() => ({ unwrap: () => Promise.resolve() })),
  review: vi.fn(() => ({ unwrap: () => Promise.resolve() })), notify: vi.fn(),
  pending: { currentData: [] }, query: vi.fn() }));
vi.mock("src/hooks/useCustomSnackbar", () => ({ useCustomSnackbar: () => ({ enqueueSnackbar: mocks.notify }) }));
vi.mock("api/ologApi", () => ({ ologApi: { endpoints: {
  requestStorageIncrease: { useMutation: () => [mocks.send, {}] },
  reviewStorageRequest: { useMutation: () => [mocks.review, {}] },
  getStorageRequests: { useQuery: (...args) => { mocks.query(...args); return mocks.pending; } }
} } }));
const book = { logbook: "atlas", quotaBytes: 1_000_000_000, usedBytes: 250_000_000 };
const summary = { infnUuid: "owner", logbooks: [book], administrator: false };
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.pending = { currentData: [] }; });

it("shows the per-logbook quota in GB and requests administrator review", async () => {
  render(<StorageContent summary={summary} />);
  expect(screen.getByText("250 MB used of 1 GB")).toBeTruthy();
  expect(mocks.query).toHaveBeenLastCalledWith(undefined, expect.objectContaining({ skip: true }));
  fireEvent.click(screen.getByText("Request more space"));
  fireEvent.change(screen.getByLabelText("Reason for increase"), { target: { value: " More history " } });
  fireEvent.click(screen.getByText("Submit request"));
  await waitFor(() => expect(mocks.send).toHaveBeenCalledWith({ logbook: "atlas", requestedQuotaBytes: 2_000_000_000, reason: "More history" }));
});

it("blocks requests below the existing quota or without a reason", () => {
  render(<StorageContent summary={summary} />);
  fireEvent.click(screen.getByText("Request more space"));
  expect(screen.getByText("Submit request").closest("button").disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Reason for increase"), { target: { value: "More logs" } });
  fireEvent.change(screen.getByLabelText("Requested total quota (GB)"), { target: { value: "1" } });
  expect(screen.getByText("Submit request").closest("button").disabled).toBe(true);
});

it("shows pending status and prevents duplicate requests", () => {
  render(<StorageContent summary={{ ...summary, logbooks: [{ ...book, request: { status: "PENDING", requestedQuotaBytes: 2_000_000_000 } }] }} />);
  expect(screen.getByText(/Storage request: pending/)).toBeTruthy();
  expect(screen.getByText("Request more space").closest("button").disabled).toBe(true);
});

it.each([true, false])("lets Olog administrators review requests with approved=%s", async (approved) => {
  mocks.pending = { currentData: [{ logbook: "atlas", infnUuid: "owner", quotaBytes: 1_000_000_000,
    request: { id: "request-1", requestedQuotaBytes: 2_000_000_000, reason: "More history" } }] };
  render(<StorageContent summary={{ ...summary, administrator: true }} />);
  fireEvent.change(screen.getByLabelText("Review note"), { target: { value: "Reviewed" } });
  fireEvent.click(screen.getByText(approved ? "Approve" : "Reject"));
  await waitFor(() => expect(mocks.review).toHaveBeenCalledWith({ logbook: "atlas", requestId: "request-1", approved, note: "Reviewed" }));
});

it("does not show a made-up zero quota when storage values are missing", () => {
  render(<LogbookQuota logbook={{ logbook: "atlas" }} />);
  expect(screen.getByText("Storage quota unavailable.")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
});

const books = [
  { logbook: "atlas", usedBytes: 700_000_000, quotaBytes: 1_000_000_000 },
  { logbook: "padme", usedBytes: 600_000_000, quotaBytes: 1_000_000_000 }
];

it("shows independent limits when combined usage exceeds 1 GB", () => {
  render(<StorageContent summary={{ usedBytes: 1_300_000_000, logbooks: books }} />);
  expect(screen.getAllByText(/used of 1 GB/)).toHaveLength(2);
  expect(screen.getByRole("progressbar", { name: "Storage quota usage for atlas" }).getAttribute("aria-valuenow")).toBe("70");
  expect(screen.getByRole("progressbar", { name: "Storage quota usage for padme" }).getAttribute("aria-valuenow")).toBe("60");
  expect(screen.queryByRole("alert")).toBeNull();
});

it("requests more space for the selected logbook only", async () => {
  render(<StorageContent summary={{ logbooks: books }} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Request more space" })[1]);
  fireEvent.change(screen.getByLabelText("Reason for increase"), { target: { value: "More data" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit request" }));
  await waitFor(() => expect(mocks.send).toHaveBeenCalledWith({ logbook: "padme", requestedQuotaBytes: 2_000_000_000, reason: "More data" }));
});

it("a pending request blocks only its own logbook", () => {
  render(<StorageContent summary={{ logbooks: [{ ...books[0], request: { status: "PENDING", requestedQuotaBytes: 2_000_000_000 } }, books[1]] }} />);
  const buttons = screen.getAllByRole("button", { name: "Request more space" });
  expect(buttons[0].disabled).toBe(true);
  expect(buttons[1].disabled).toBe(false);
});


it.each([
  [0, "success", "1000000000"],
  [749_999_999, "success", "250000001"],
  [750_000_000, "warning", "250000000"],
  [899_999_999, "warning", "100000001"],
  [900_000_000, "error", "100000000"],
  [1_000_000_000, "error", "0"],
  [1_100_000_000, "error", "0"]
])("colors the quota bar at %s bytes as %s", (usedBytes, color, remainingBytes) => {
  render(<LogbookQuota logbook={{ ...book, usedBytes }} />);
  const bar = screen.getByRole("progressbar", { name: "Storage quota usage for atlas" });
  expect(bar.classList.contains(`MuiLinearProgress-color${color[0].toUpperCase()}${color.slice(1)}`)).toBe(true);
  expect(Number(bar.getAttribute("aria-valuenow"))).toBeCloseTo(Math.min(100, usedBytes / book.quotaBytes * 100), 5);
  expect(bar.getAttribute("aria-valuetext")).toBe(`${formatStorageBytes(Number(remainingBytes))} available of 1 GB`);
});


it("filters the pending admin requests by logbook or requester and allows refreshing", () => {
  mocks.pending = { currentData: [
    { logbook: "atlas", infnUuid: "owner-a", quotaBytes: 1_000_000_000, request: { id: "1", reason: "More history", requestedQuotaBytes: 2_000_000_000 } },
    { logbook: "padme", infnUuid: "owner-b", quotaBytes: 1_000_000_000, request: { id: "2", reason: "More entries", requestedQuotaBytes: 3_000_000_000 } }
  ], refetch: mocks.notify };
  render(<StoragePanel summary={{ administrator: true }} />);
  expect(screen.getByText("Storage increase requests (2 pending)")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Filter quota requests"), { target: { value: "owner-b" } });
  expect(screen.queryByRole("region", { name: "Quota request for atlas" })).toBeNull();
  expect(screen.getByRole("region", { name: "Quota request for padme" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Filter quota requests"), { target: { value: "missing" } });
  expect(screen.getByText("No requests match this filter.")).toBeTruthy();
  fireEvent.click(screen.getByText("Refresh"));
  expect(mocks.notify).toHaveBeenCalled();
});

it("hides cached request details if the server denies access", () => {
  mocks.pending = { error: { status: 403 }, currentData: [{ logbook: "Secret", infnUuid: "owner", quotaBytes: 1,
    request: { id: "1", requestedQuotaBytes: 2, reason: "Private reason" } }] };
  render(<StoragePanel summary={{ administrator: true }} />);
  expect(screen.getByText("Unable to load storage requests.")).toBeTruthy();
  expect(screen.queryByText("Private reason")).toBeNull();
});
