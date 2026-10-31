import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AuthContext } from "react-oauth2-code-pkce";
import { AuthDataProvider, useAuthData } from "./authContext";

const customization = vi.hoisted(() => ({ OAUTH2_ENABLED: true }));
vi.mock("react-redux", () => ({ useDispatch: () => dispatch }));
vi.mock("features/authSlice", () => ({
  setOAuthSession: (payload) => ({ type: "session", payload }),
  clearOAuthSession: () => ({ type: "clear" }),
  useUser: () => sessionUser
}));
vi.mock("src/config/customization", () => ({ default: customization }));
const dispatch = vi.fn();
let sessionUser = null;

function SessionStatus() {
  const { isAuthenticated, isAuthenticating, authError } = useAuthData();
  return <div data-testid="session">{JSON.stringify({ isAuthenticated, isAuthenticating, authError })}</div>;
}

function renderSession(overrides) {
  render(<AuthContext.Provider value={{ token: "", tokenData: null, loginInProgress: false, error: null, ...overrides }}>
    <AuthDataProvider><SessionStatus /></AuthDataProvider>
  </AuthContext.Provider>);
  return JSON.parse(screen.getByTestId("session").textContent);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  customization.OAUTH2_ENABLED = true;
  sessionUser = null;
});

describe("OAuth session status", () => {
  it("keeps a token authenticated during its final 30 seconds", () => {
    const status = renderSession({ token: "valid", tokenData: { exp: Date.now() / 1000 + 20 } });
    expect(status.isAuthenticated).toBe(true);
    expect(status.isAuthenticating).toBe(false);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "session" }));
  });

  it("does not authenticate an expired token", () => {
    expect(renderSession({ token: "expired", tokenData: { exp: Date.now() / 1000 - 1 } }).isAuthenticated).toBe(false);
  });

  it("exposes pending login while waiting for the token", () => {
    expect(renderSession({ loginInProgress: true }).isAuthenticating).toBe(true);
  });

  it("stops the loading state when authentication fails", () => {
    const status = renderSession({ loginInProgress: true, error: "Token request failed" });
    expect(status.isAuthenticating).toBe(false);
    expect(status.authError).toBe("Token request failed");
  });
});

describe("Classic session status", () => {
  it("is authenticated once Olog returned a user", () => {
    customization.OAUTH2_ENABLED = false;
    sessionUser = { userName: "epics" };
    expect(renderSession({}).isAuthenticated).toBe(true);
  });

  it("is not authenticated without a user", () => {
    customization.OAUTH2_ENABLED = false;
    expect(renderSession({}).isAuthenticated).toBe(false);
  });

  it("ignores the placeholder token of a missing AuthProvider", () => {
    customization.OAUTH2_ENABLED = false;
    const status = renderSession({ token: "placeholder", loginInProgress: true });
    expect(status.isAuthenticated).toBe(false);
    expect(status.isAuthenticating).toBe(false);
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: "session" }));
  });
});
