import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LogbookBrowser from "./LogbookBrowser";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  auth: { isAuthenticated: true, isAuthenticating: false },
  search: vi.fn(() => ({ currentData: { logs: [{ id: 42, title: "Test entry", owner: "Test author", source: "Entry preview", createdDate: 1790239053702, properties: [] }], hitCount: 26 } })),
  permissions: vi.fn(() => ({ currentData: [
    { logbook: "Readable", permissions: ["READ"] },
    { logbook: "Writable", permissions: ["WRITE"] },
    { logbook: "Private", permissions: [] }
  ] }))
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate, useParams: () => ({}) }));
vi.mock("src/auth/authContext", () => ({ useAuthData: () => mocks.auth }));
vi.mock("api/identityApi", () => ({ identityApi: { endpoints: { getIdentity: { useQuery: () => ({}) } } } }));
vi.mock("src/features/advancedSearchReducer", () => ({ useAdvancedSearch: () => ({ condensedEntries: false }) }));
vi.mock("src/hooks/useEnhancedSearchParams", () => ({ useEnhancedSearchParams: () => ({ isSearchActive: false }) }));
vi.mock("api/ologApi", () => ({ ologApi: { endpoints: {
  getMyLogbookPermissions: { useQuery: mocks.permissions },
  searchLogs: { useQuery: mocks.search }
} } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.auth.isAuthenticated = true; });

describe("Logbook browser", () => {
  it("shows readable and writable logbooks without fetching entries until expanded", () => {
    render(<LogbookBrowser />);
    expect(screen.getByText("Readable")).toBeTruthy();
    expect(screen.getByText("Writable")).toBeTruthy();
    expect(screen.queryByText("Private")).toBeNull();
    expect(mocks.search).not.toHaveBeenCalled();
  });

  it("expands entries, opens a detail and paginates within the selected logbook", () => {
    render(<LogbookBrowser />);
    fireEvent.click(screen.getByText("Readable"));
    expect(screen.getByText("Test author")).toBeTruthy();
    expect(screen.getByText("Entry preview")).toBeTruthy();
    expect(mocks.search).toHaveBeenLastCalledWith(expect.objectContaining({ logbooks: "Readable", from: 0, size: 25 }), expect.anything());
    fireEvent.click(screen.getByText("Test entry"));
    expect(mocks.navigate).toHaveBeenCalledWith("/logs/42");
    fireEvent.click(screen.getByText("Next"));
    expect(mocks.search).toHaveBeenLastCalledWith(expect.objectContaining({ from: 25 }), expect.anything());
    expect(screen.getByText("Next").closest("button").disabled).toBe(true);
  });

  it("does not expose cached logbooks after logout", () => {
    mocks.auth.isAuthenticated = false;
    render(<LogbookBrowser />);
    expect(screen.queryByText("Readable")).toBeNull();
    expect(mocks.permissions).toHaveBeenCalledWith(undefined, expect.objectContaining({ skip: true }));
  });
});
