import { expect, it, vi } from "vitest";
import reducer, { setOAuthSession } from "./authSlice";

vi.mock("api/ologApi", () => ({ ologApi: { endpoints: {
  login: { matchFulfilled: (action) => action.type === "legacyLogin" },
  getUser: { matchFulfilled: (action) => action.type === "legacyUser", matchRejected: () => false },
  logout: { matchFulfilled: (action) => action.type === "legacyLogout" }
} } }));

it("keeps the OAuth identity when a delayed legacy user request completes", () => {
  const user = { uuid: "oauth-uuid", userName: "Mario Rossi" };
  const state = reducer(undefined, setOAuthSession({ user, accessToken: "token" }));
  const next = reducer(state, { type: "legacyUser", payload: { userName: "legacy" } });
  expect(next.user).toEqual(user);
  expect(next.accessToken).toBe("token");
});

it("still loads the user for a classic session", () => {
  const next = reducer(undefined, { type: "legacyUser", payload: { userName: "legacy" } });
  expect(next.user.userName).toBe("legacy");
});
