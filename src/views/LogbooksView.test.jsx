import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import LogbooksView from "./LogbooksView";

const mocks = vi.hoisted(() => ({ update: vi.fn(() => ({ unwrap: () => Promise.resolve() })), notify: vi.fn(),
  storageResult: {}, memberQuery: vi.fn(), authorizationResult: {}, user: { uuid: "owner" }, nodes: vi.fn(), refetch: vi.fn(), permissionResult: { currentData: [{ logbook: "operations", admin: true, permissions: ["ADMIN"] }] }
}));
vi.mock("src/auth/authContext", () => ({ useAuthData: () => ({ isAuthenticated: true }) }));
vi.mock("features/authSlice", () => ({ useUser: () => mocks.user }));
vi.mock("src/hooks/useCustomSnackbar", () => ({ useCustomSnackbar: () => ({ enqueueSnackbar: mocks.notify }) }));
vi.mock("components/log/StoragePanel", async (importOriginal) => ({
  ...await importOriginal(), default: () => null
}));
vi.mock("api/godivaApi", () => ({ godivaApi: { endpoints: {
  getNodiAdvancedSearch: { useQuery: (...args) => mocks.nodes(...args) ?? {} }
} } }));
vi.mock("api/identityApi", () => ({ identityApi: { endpoints: {
  getIdentityAuthorization: { useQuery: () => mocks.authorizationResult },
  getIdentity: { useQuery: () => ({ currentData: { nome: "Mario", cognome: "Rossi" } }) },
  searchIdentities: { useLazyQuery: () => [vi.fn(), { data: [] }] }
} } }));
vi.mock("api/ologApi", () => {
  const mutation = { useMutation: () => [mocks.update, {}] };
  const members = [{ infnUuid: "reader", permissions: ["READ"], visibleFrom: "2026-09-01", visibleTo: "2026-09-10" }];
  return { ologApi: { endpoints: {
    getStorageSummary: { useQuery: () => mocks.storageResult },
    requestStorageIncrease: mutation,
    getLogbooks: { useQuery: () => ({ data: [{ name: "operations", owner: "owner" }] }) },
    getMyLogbookPermissions: { useQuery: () => ({ ...mocks.permissionResult, refetch: mocks.refetch }) },
    getLogbookMembers: { useQuery: (...args) => { mocks.memberQuery(...args); return { data: members }; } },
    createLogbook: mutation, deleteLogbook: mutation, addLogbookMember: mutation,
    updateLogbookMember: mutation, deleteLogbookMember: mutation
  } } };
});
afterEach(() => {
  cleanup(); vi.clearAllMocks();
  mocks.authorizationResult = {};
  mocks.storageResult = {};
  mocks.user = { uuid: "owner" };
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
  expect(screen.queryByText("No accessible logbooks.")).toBeNull();
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


it("loads Godiva structures and resets the experiment when the structure changes", () => {
  mocks.nodes.mockImplementation(({ value, pathRegexp }) => ({
    currentData: value === "Struttura"
      ? [{ path: "i:infn:a", nome: "Structure A" }, { path: "i:infn:b", nome: "Structure B" }]
      : [{ path: "i:infn:a:csn1:exp", nome: pathRegexp === "^i:infn:a:csn.*:*$" ? "Experiment A" : "Experiment B" }]
  }));
  render(<LogbooksView />);
  fireEvent.mouseDown(screen.getByLabelText("User source"));
  fireEvent.click(screen.getByRole("option", { name: "Godiva — structure and experiment" }));
  expect(mocks.nodes).toHaveBeenCalledWith({ pathRegexp: "i:infn", value: "Struttura" });
  expect(screen.queryByLabelText("Experiment")).toBeNull();
  fireEvent.mouseDown(screen.getByLabelText("Structure"));
  fireEvent.click(screen.getByRole("option", { name: "Structure A" }));
  expect(mocks.nodes).toHaveBeenCalledWith({ pathRegexp: "^i:infn:a:csn.*:*$", listaDettagli: [] }, { skip: false });
  fireEvent.mouseDown(screen.getByLabelText("Experiment"));
  fireEvent.click(screen.getByRole("option", { name: "Experiment A" }));
  expect(screen.getByLabelText("Experiment").value).toBe("Experiment A");
  fireEvent.change(screen.getByLabelText("Structure"), { target: { value: "Structure B" } });
  fireEvent.click(screen.getByRole("option", { name: "Structure B" }));
  expect(screen.getByLabelText("Experiment").value).toBe("");
  expect(mocks.nodes).toHaveBeenCalledWith({ pathRegexp: "^i:infn:b:csn.*:*$", listaDettagli: [] }, { skip: false });
});

it("shows Godiva errors with a retry action", () => {
  mocks.nodes.mockReturnValue({ error: { status: 403 }, refetch: mocks.refetch });
  render(<LogbooksView />);
  fireEvent.mouseDown(screen.getByLabelText("User source"));
  fireEvent.click(screen.getByRole("option", { name: "Godiva — structure and experiment" }));
  expect(screen.getByText("Unable to load structures from Godiva.")).toBeTruthy();
  fireEvent.click(screen.getByText("Retry"));
  expect(mocks.refetch).toHaveBeenCalled();
});

const responsibleMembership = "i:infn:a:csn1:exp::resp:locale";

const selectGodivaExperiment = (path = "i:infn:a:csn1:exp") => {
  mocks.nodes.mockImplementation(({ value }) => ({
    currentData: value === "Struttura"
      ? [{ path: "i:infn:a", nome: "Structure A" }]
      : [{ path, nome: "Experiment A" }]
  }));
  render(<LogbooksView />);
  fireEvent.change(screen.getByLabelText("Logbook name"), { target: { value: "new-logbook" } });
  fireEvent.mouseDown(screen.getByLabelText("User source"));
  fireEvent.click(screen.getByRole("option", { name: "Godiva — structure and experiment" }));
  expect(screen.getByRole("button", { name: "Create" }).disabled).toBe(true);
  fireEvent.mouseDown(screen.getByLabelText("Structure"));
  fireEvent.click(screen.getByRole("option", { name: "Structure A" }));
  fireEvent.mouseDown(screen.getByLabelText("Experiment"));
  fireEvent.click(screen.getByRole("option", { name: "Experiment A" }));
};

it("creates a Godiva logbook for the responsible person of the selected experiment", async () => {
  mocks.authorizationResult = { currentData: { isMemberOf: [responsibleMembership] } };
  selectGodivaExperiment();
  expect(screen.getByRole("button", { name: "Create" }).disabled).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ name: "new-logbook", officialExperiment: true, experimentLdapPath: "i:infn:a:csn1:exp" }));
});

it("normalizes trailing Godiva separators before persisting the experiment path", async () => {
  mocks.authorizationResult = { currentData: { isMemberOf: [responsibleMembership] } };
  selectGodivaExperiment("i:infn:a:csn1:exp::");
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({
    name: "new-logbook", officialExperiment: true, experimentLdapPath: "i:infn:a:csn1:exp"
  }));
});

it.each([
  ["no roles", { currentData: { isMemberOf: [] } }],
  ["another experiment", { currentData: { isMemberOf: ["i:infn:a:csn1:other::resp:locale"] } }],
  ["another role", { currentData: { isMemberOf: ["i:infn:a:csn1:exp::member"] } }],
  ["pending verification", { currentData: { isMemberOf: [responsibleMembership] }, isFetching: true }],
  ["failed verification", { currentData: { isMemberOf: [responsibleMembership] }, error: { status: 500 }, refetch: mocks.refetch }]
])("blocks Godiva creation with %s", (_, result) => {
  mocks.authorizationResult = result;
  selectGodivaExperiment();
  const create = screen.getByRole("button", { name: "Create" });
  expect(create.disabled).toBe(true);
  fireEvent.click(create);
  expect(mocks.update).not.toHaveBeenCalled();
});

it("keeps manual creation available without Godiva roles", async () => {
  render(<LogbooksView />);
  fireEvent.change(screen.getByLabelText("Logbook name"), { target: { value: "manual-logbook" } });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ name: "manual-logbook", officialExperiment: false, experimentLdapPath: null }));
});


it.each(["READ", "WRITE"])("shows a logbook with %s access without administrative actions", (permission) => {
  mocks.permissionResult = { currentData: [
    { logbook: "TEST3ATLAS", admin: false, permissions: [permission] },
    { logbook: "Hidden", permissions: [] }
  ] };
  render(<LogbooksView />);
  expect(screen.getByText("TEST3ATLAS")).toBeTruthy();
  expect(screen.getByText(permission)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Open" }).getAttribute("href")).toBe("/logs?logbooks=TEST3ATLAS");
  expect(screen.queryByText("Hidden")).toBeNull();
  expect(screen.queryByText("Manage")).toBeNull();
  expect(screen.queryByRole("button", { name: /Export .* as/ })).toBeNull();
  expect(screen.queryByLabelText("Delete TEST3ATLAS")).toBeNull();
  expect(screen.queryByText(/Collaborators —/)).toBeNull();
  expect(mocks.memberQuery).toHaveBeenLastCalledWith(expect.anything(), { skip: true });
});

it("closes collaborator management when the current user loses administrator access", () => {
  const view = render(<LogbooksView />);
  fireEvent.click(screen.getByText("Manage"));
  expect(screen.getByText("Collaborators — operations")).toBeTruthy();
  mocks.permissionResult = { currentData: [{ logbook: "operations", admin: false, permissions: ["READ"] }] };
  view.rerender(<LogbooksView />);
  expect(screen.getByText("operations")).toBeTruthy();
  expect(screen.queryByText("Collaborators — operations")).toBeNull();
  expect(mocks.memberQuery).toHaveBeenLastCalledWith({ name: "operations" }, { skip: true });
});


it("shows storage consumption next to a logbook created by the current user", () => {
  mocks.storageResult = { currentData: { logbooks: [{ logbook: "operations", usedBytes: 12345, quotaBytes: 1_000_000_000 }] } };
  render(<LogbooksView />);
  const row = screen.getByText("operations").closest("tr");
  expect(within(row).getByRole("progressbar", { name: "Storage quota usage for operations" })).toBeTruthy();
  expect(within(row).getByText(/used of 1 GB/)).toBeTruthy();
  expect(within(row).getByText(/available$/)).toBeTruthy();
  expect(within(row).getByText("Request more space")).toBeTruthy();
  expect(screen.getByText("Storage quota")).toBeTruthy();
  expect(screen.queryByText("Storage quota per logbook")).toBeNull();
});


it("shows a storage error with retry inside Your logbooks", () => {
  mocks.storageResult = { error: { status: 503 }, refetch: mocks.refetch };
  render(<LogbooksView />);
  expect(screen.getByText("Unable to calculate storage usage.")).toBeTruthy();
  fireEvent.click(screen.getByText("Retry"));
  expect(mocks.refetch).toHaveBeenCalled();
  expect(screen.queryByRole("progressbar")).toBeNull();
});


it("shows JSON and PDF export actions in the administrator's logbook row", () => {
  render(<LogbooksView />);
  const row = screen.getByText("operations").closest("tr");
  expect(within(row).getByRole("button", { name: "Export operations as JSON" })).toBeTruthy();
  expect(within(row).getByRole("button", { name: "Export operations as PDF" })).toBeTruthy();
});
