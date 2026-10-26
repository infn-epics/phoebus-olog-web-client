// @vitest-environment node
import { configureStore } from "@reduxjs/toolkit";
import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";
import { ologApi } from "./ologApi";
import { server } from "src/mocks/server";
import customization from "config/customization";
vi.hoisted(() => { vi.stubGlobal("window", { navigator: { userAgent: "test" } }); });
const makeStore = () => configureStore({
  reducer: { auth: () => ({ accessToken: "test-token" }), [ologApi.reducerPath]: ologApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(ologApi.middleware)
});

it("loads the authenticated user's total and per-logbook usage", async () => {
  const summary = { infnUuid: "owner", usedBytes: 123,
    measurement: "JSON_SOURCE_UTF8", logbooks: [{ logbook: "ATLAS", usedBytes: 123, quotaBytes: 1_000_000_000 }], administrator: false };
  server.use(http.get(`${customization.APP_BASE_URL}/storage/me`, ({ request }) => {
    expect(request.headers.get("Authorization")).toBe("Bearer test-token");
    return HttpResponse.json(summary);
  }));
  const store = makeStore();
  try {
    expect(await store.dispatch(ologApi.endpoints.getStorageSummary.initiate()).unwrap()).toEqual(summary);
  } finally { store.dispatch(ologApi.util.resetApiState()); }
});

it("requests a larger quota for the selected logbook", async () => {
  let body;
  server.use(http.post(`${customization.APP_BASE_URL}/storage/requests`, async ({ request }) => {
    body = await request.json();
    return HttpResponse.json({ quotaBytes: 1_000_000_000, request: { status: "PENDING" } }, { status: 201 });
  }));
  const store = makeStore();
  try {
    await store.dispatch(ologApi.endpoints.requestStorageIncrease.initiate({ logbook: "ATLAS", requestedQuotaBytes: 2_000_000_000, reason: "More history", infnUuid: "someone-else" })).unwrap();
    expect(body).toEqual({ logbook: "ATLAS", requestedQuotaBytes: 2_000_000_000, reason: "More history" });
  } finally { store.dispatch(ologApi.util.resetApiState()); }
});

it("reviews the request for the selected logbook", async () => {
  let body;
  server.use(http.post(`${customization.APP_BASE_URL}/storage/requests/ATLAS/request-1/review`, async ({ request }) => {
    body = await request.json();
    expect(request.headers.get("Authorization")).toBe("Bearer test-token");
    return HttpResponse.json({ quotaBytes: 2_000_000_000 });
  }));
  const store = makeStore();
  try {
    await store.dispatch(ologApi.endpoints.reviewStorageRequest.initiate({ logbook: "ATLAS", requestId: "request-1", approved: true, note: "Approved" })).unwrap();
    expect(body).toEqual({ approved: true, note: "Approved" });
  } finally { store.dispatch(ologApi.util.resetApiState()); }
});


it("checks administrator access without fetching the storage summary", async () => {
  server.use(http.get(`${customization.APP_BASE_URL}/storage/permissions/me`, ({ request }) => {
    expect(request.headers.get("Authorization")).toBe("Bearer test-token");
    return HttpResponse.json({ administrator: true });
  }));
  const store = makeStore();
  try {
    expect(await store.dispatch(ologApi.endpoints.getStoragePermissions.initiate()).unwrap()).toEqual({ administrator: true });
  } finally { store.dispatch(ologApi.util.resetApiState()); }
});
