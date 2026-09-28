import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import LogbooksView from "./LogbooksView";

const mocks = vi.hoisted(() => ({ update: vi.fn(() => ({ unwrap: () => Promise.resolve() })), notify: vi.fn(),
  refetch: vi.fn(), permissionResult: { currentData: [{ logbook: "operations", admin: true, permissions: ["ADMIN"] }] }
}));
vi.mock("src/auth/authContext", () => ({ useAuthData: () => ({ isAuthenticated: true }) }));
vi.mock("features/authSlice", () => ({ useUser: () => ({ uuid: "owner" }) }));
vi.mock("src/hooks/useCustomSnackbar", () => ({ useCustomSnackbar: () => ({ enqueueSnackbar: mocks.notify }) }));
vi.mock("api/identityApi", () => ({ identityApi: { endpoints: {
  getIdentity: { useQuery: () => ({ currentData: { nome: "Mario", cognome: "Rossi" } }) },
  searchIdentities: { useLazyQuery: () => [vi.fn(), { data: [] }] }
} } }));
vi.mock("api/ologApi", () => {
  const mutation = { useMutation: () => [mocks.update, {}] };
  const members = [{ infnUuid: "reader", permissions: ["READ"], visibleFrom: "2026-09-01", visibleTo: "2026-09-10" }];
  return { ologApi: { endpoints: {
    getLogbooks: { useQuery: () => ({ data: [{ name: "operations", owner: "owner" }] }) },
    getMyLogbookPermissions: { useQuery: () => ({ ...mocks.permissionResult, refetch: mocks.refetch }) },
    getLogbookMembers: { useQuery: () => ({ data: members }) },
    createLogbook: mutation, deleteLogbook: mutation, addLogbookMember: mutation,
    updateLogbookMember: mutation, deleteLogbookMember: mutation
  } } };
});
afterEach(() => {
  cleanup(); vi.clearAllMocks();
  mocks.permissionResult = { currentData: [{ logbook: "operations", admin: true, permissions: ["ADMIN"] }] };
});

it("shows backend administrator grants even if the local user has a different UUID", () => {
  mocks.permissionResult = { currentData: [{ logbook: "delegated", admin: true, permissions: ["ADMIN"] }] };
  render(<LogbooksView />);
  expect(screen.getByText("delegated")).toBeTruthy();
  expect(screen.getByText("Manage")).toBeTruthy();
});

it("shows a loading failure and allows retrying instead of an empty list", () => {
  mocks.permissionResult = { error: { status: 500 } };
  render(<LogbooksView />);
  expect(screen.getByText("Unable to load your logbooks. Please retry.")).toBeTruthy();
  expect(screen.queryByText("You do not administer any logbooks.")).toBeNull();
  fireEvent.click(screen.getByText("Retry"));
  expect(mocks.refetch).toHaveBeenCalled();
});

it("sends the edited visibility period and clears dates as null", async () => {
  render(<LogbooksView />);
  fireEvent.click(screen.getByText("Manage"));
  const from = screen.getAllByLabelText("Visible from (UTC)")[1];
  const to = screen.getAllByLabelText("Visible to (UTC)")[1];
  fireEvent.change(from, { target: { value: "2026-09-02" } });
  fireEvent.click(screen.getByText("Save"));
  await waitFor(() => expect(mocks.update).toHaveBeenLastCalledWith({ name: "operations", infnUuid: "reader", permissions: ["READ"], visibleFrom: "2026-09-02", visibleTo: "2026-09-10" }));
  fireEvent.change(from, { target: { value: "" } });
  fireEvent.change(to, { target: { value: "" } });
  fireEvent.click(screen.getByText("Save"));
  await waitFor(() => expect(mocks.update).toHaveBeenLastCalledWith(expect.objectContaining({ visibleFrom: null, visibleTo: null })));
});

it("blocks reversed intervals", () => {
  render(<LogbooksView />);
  fireEvent.click(screen.getByText("Manage"));
  fireEvent.change(screen.getAllByLabelText("Visible from (UTC)")[1], { target: { value: "2026-09-11" } });
  expect(screen.getByText("Save").closest("button").disabled).toBe(true);
  expect(mocks.update).not.toHaveBeenCalled();
});
