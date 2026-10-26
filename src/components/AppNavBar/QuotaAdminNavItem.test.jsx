import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QuotaAdminNavItem from "./QuotaAdminNavItem";
const mocks = vi.hoisted(() => ({ auth: {}, access: {}, query: vi.fn() }));
vi.mock("src/auth/authContext", () => ({ useAuthData: () => mocks.auth }));
vi.mock("api/ologApi", () => ({ ologApi: { endpoints: { getStoragePermissions: {
  useQuery: (...args) => { mocks.query(...args); return mocks.access; }
} } } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it.each([
  ["administrator", true, { currentData: { administrator: true } }, true],
  ["ordinary user", true, { currentData: { administrator: false } }, false],
  ["anonymous user with cached access", false, { currentData: { administrator: true } }, false],
  ["failed check", true, { currentData: { administrator: true }, error: { status: 403 } }, false]
])("shows the Admin link only to an authenticated %s", (_, authenticated, access, visible) => {
  mocks.auth = { isAuthenticated: authenticated }; mocks.access = access;
  render(<MemoryRouter><ul><QuotaAdminNavItem /></ul></MemoryRouter>);
  const link = screen.queryByRole("link", { name: "Admin" });
  expect(!!link).toBe(visible);
  if (visible) expect(link.getAttribute("href")).toBe("/admin/storage");
  expect(mocks.query).toHaveBeenLastCalledWith(undefined, expect.objectContaining({ skip: !authenticated }));
});
