// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LogbookExportActions from "./LogbookExportActions";
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), save: vi.fn(), notify: vi.fn() }));
vi.mock("api/logbookExport", () => ({ fetchLogbookExport: mocks.fetch, saveLogbookExport: mocks.save }));
vi.mock("src/hooks/useCustomSnackbar", () => ({ useCustomSnackbar: () => ({ enqueueSnackbar: mocks.notify }) }));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
it.each(["JSON", "PDF"])("downloads %s with the authenticated user", async (format) => {
  const file = { blob: new Blob(["export"]), filename: `book.${format}` };
  mocks.fetch.mockResolvedValue(file);
  render(<LogbookExportActions name="ATLAS" token="access-token" />);
  fireEvent.click(screen.getByRole("button", { name: `Export ATLAS as ${format}` }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(file));
  expect(mocks.fetch).toHaveBeenCalledWith(expect.objectContaining({ name: "ATLAS", format: format.toLowerCase(), token: "access-token", signal: expect.any(AbortSignal) }));
});
it("disables duplicate requests and reports failure", async () => {
  let reject;
  mocks.fetch.mockImplementation(() => new Promise((_, failure) => { reject = failure; }));
  render(<LogbookExportActions name="ATLAS" />);
  fireEvent.click(screen.getByRole("button", { name: "Export ATLAS as PDF" }));
  expect(screen.getByRole("button", { name: "Export ATLAS as JSON" }).disabled).toBe(true);
  reject(new Error("Export unavailable"));
  await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith("Export unavailable", { severity: "error" }));
  expect(mocks.save).not.toHaveBeenCalled();
});
it("aborts on identity changes and never downloads the previous user's export", async () => {
  let resolve;
  mocks.fetch.mockImplementation(() => new Promise(success => { resolve = success; }));
  const { rerender } = render(<LogbookExportActions name="ATLAS" token="old" />);
  fireEvent.click(screen.getByRole("button", { name: "Export ATLAS as JSON" }));
  const signal = mocks.fetch.mock.calls[0][0].signal;
  rerender(<LogbookExportActions name="ATLAS" token="new" />);
  expect(signal.aborted).toBe(true);
  resolve({ blob: new Blob(), filename: "old.json" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Export ATLAS as JSON" }).disabled).toBe(false));
  expect(mocks.save).not.toHaveBeenCalled();
});
