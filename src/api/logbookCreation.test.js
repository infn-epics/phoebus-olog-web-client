// @vitest-environment node
import { configureStore } from "@reduxjs/toolkit";
import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";
import { ologApi } from "./ologApi";
import { server } from "src/mocks/server";
import customization from "config/customization";

vi.hoisted(() => {
  vi.stubGlobal("window", { navigator: { userAgent: "test" } });
});

it.each([
  ["official experiment", { name: "ATLAS test", officialExperiment: true, experimentLdapPath: "i:infn:lnf:csn1:atlas" },
    { name: "ATLAS test", state: "Active", officialExperiment: true, experimentLdapPath: "i:infn:lnf:csn1:atlas" }],
  ["manual", { name: "Operations", state: "Inactive" },
    { name: "Operations", state: "Inactive", officialExperiment: false, experimentLdapPath: null }]
])("sends the %s logbook properties in the authenticated PUT request", async (_, input, expected) => {
  let body;
  let authorization;
  let requestPath;
  server.use(http.put(`${customization.APP_BASE_URL}/logbooks/:name`, async ({ request }) => {
    body = await request.json();
    authorization = request.headers.get("Authorization");
    requestPath = new URL(request.url).pathname;
    return HttpResponse.json(body);
  }));
  const store = configureStore({
    reducer: {
      auth: () => ({ accessToken: "test-token" }),
      [ologApi.reducerPath]: ologApi.reducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(ologApi.middleware)
  });
  try {
    const result = await store.dispatch(ologApi.endpoints.createLogbook.initiate(input)).unwrap();
    expect(body).toEqual(expected);
    expect(result).toEqual(expected);
    expect(authorization).toBe("Bearer test-token");
    expect(requestPath).toBe(new URL(`${customization.APP_BASE_URL}/logbooks/${encodeURIComponent(input.name)}`).pathname);
  } finally {
    store.dispatch(ologApi.util.resetApiState());
  }
});
