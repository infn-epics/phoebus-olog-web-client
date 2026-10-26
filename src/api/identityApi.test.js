// @vitest-environment node
import { configureStore } from "@reduxjs/toolkit";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { identityApi } from "./identityApi";
import { server } from "src/mocks/server";
import customization from "config/customization";

it.each([
  ["valid memberships", { errorCode: 0, payload: { isMemberOf: ["i:infn:lnf:csn1:atlas::resp:locale"] } }, 200, true],
  ["empty memberships", { errorCode: 0, payload: { isMemberOf: [] } }, 200, true],
  ["missing memberships", { errorCode: 0, payload: {} }, 200, false],
  ["malformed memberships", { errorCode: 0, payload: { isMemberOf: [null] } }, 200, false],
  ["application error", { errorCode: 7, payload: [] }, 200, false],
  ["malformed response", { errorCode: 0, payload: null }, 200, false],
  ["unauthorized", { message: "Unauthorized" }, 401, false]
])("loads identity authorization securely: %s", async (_, body, status, succeeds) => {
  const uuid = "current-user";
  let authorization;
  server.use(http.get(`${customization.IDENTITY_API_BASE_URL}/get/auth/${uuid}`, ({ request }) => {
    authorization = request.headers.get("Authorization");
    return HttpResponse.json(body, { status });
  }));
  const store = configureStore({
    reducer: {
      auth: () => ({ accessToken: "user-token" }),
      [identityApi.reducerPath]: identityApi.reducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(identityApi.middleware)
  });
  try {
    const result = await store.dispatch(identityApi.endpoints.getIdentityAuthorization.initiate(uuid));
    expect(authorization).toBe("Bearer user-token");
    expect(result.isSuccess).toBe(succeeds);
    if (succeeds) expect(result.data).toEqual(body.payload);
    else expect(result.error).toBeTruthy();
  } finally {
    store.dispatch(identityApi.util.resetApiState());
  }
});
