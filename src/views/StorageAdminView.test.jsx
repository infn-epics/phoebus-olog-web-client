import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StorageAdminView from "./StorageAdminView";

const mocks = vi.hoisted(() => ({ auth: {}, access: {}, query: vi.fn(), panel: vi.fn(), login: vi.fn(), refetch: vi.fn() }));
vi.mock("src/auth/authContext", () => ({ useAuthData: () => ({ ...mocks.auth, logIn: mocks.login }) }));
vi.mock("api/ologApi", () => ({ ologApi: { endpoints: { getStoragePermissions: {
  useQuery: (...args) => { mocks.query(...args); return { ...mocks.access, refetch: mocks.refetch }; }
} } } }));
vi.mock("components/log/StoragePanel", () => ({ default: (props) => {
  mocks.panel(props); return <div>Administrator request queue</div>;
} }));
const open = () => render(<MemoryRouter initialEntries={["/admin/storage"]}><StorageAdminView /></MemoryRouter>);
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.auth = {}; mocks.access = {}; });

it("asks anonymous users to sign in without loading the request queue", () => {
  mocks.auth = { isAuthenticated: false };
  mocks.access = { currentData: { administrator: true } };
  open();
  expect(screen.queryByText("Administrator request queue")).toBeNull();
  fireEvent.click(screen.getByText("Sign in"));
  expect(mocks.login).toHaveBeenCalled();
  expect(mocks.query).toHaveBeenLastCalledWith(undefined, expect.objectContaining({ skip: true }));
  expect(mocks.panel).not.toHaveBeenCalled();
});

it("denies ordinary users even when navigating directly to the admin URL", () => {
  mocks.auth = { isAuthenticated: true };
  mocks.access = { currentData: { administrator: false } };
  open();
  expect(screen.getByText("Access restricted to global Olog administrators.")).toBeTruthy();
  expect(mocks.panel).not.toHaveBeenCalled();
});

it("waits for the backend permission check before showing any queue", () => {
  mocks.auth = { isAuthenticated: true };
  mocks.access = { isFetching: true, currentData: { administrator: true } };
  open();
  expect(screen.getByLabelText("Checking administrator access")).toBeTruthy();
  expect(mocks.panel).not.toHaveBeenCalled();
});

it("shows the dedicated panel for global Olog administrators", () => {
  mocks.auth = { isAuthenticated: true };
  mocks.access = { currentData: { administrator: true } };
  open();
  expect(screen.getByText("Administration")).toBeTruthy();
  expect(screen.getByText("Administrator request queue")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Your logbooks" }).getAttribute("href")).toBe("/logbooks");
  expect(mocks.panel).toHaveBeenLastCalledWith({ summary: { administrator: true } });
});

it.each([401, 403, 503])("does not expose a cached admin queue after HTTP %s", (status) => {
  mocks.auth = { isAuthenticated: true };
  mocks.access = { currentData: { administrator: true }, error: { status } };
  open();
  expect(mocks.panel).not.toHaveBeenCalled();
  if (status === 503) {
    fireEvent.click(screen.getByText("Retry"));
    expect(mocks.refetch).toHaveBeenCalled();
  }
});
