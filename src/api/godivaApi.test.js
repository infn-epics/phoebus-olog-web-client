// @vitest-environment node
import { configureStore } from "@reduxjs/toolkit";
import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { godivaApi } from "./godivaApi";
import { server } from "src/mocks/server";
import customization from "config/customization";

const makeStore = (accessToken = "test-token") =>
  configureStore({
    reducer: {
      auth: (state = { accessToken }, action) =>
        action.type === "test/session"
          ? { accessToken: action.payload }
          : state,
      [godivaApi.reducerPath]: godivaApi.reducer
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(godivaApi.middleware)
  });

it("posts the Godiva filter with authentication and unwraps the payload", async () => {
  let requestBody;
  let authorization;
  server.use(
    http.post(
      `${customization.GODIVA_API_BASE_URL}/nodo/getNodiAdvancedSearch`,
      async ({ request }) => {
        requestBody = await request.json();
        authorization = request.headers.get("Authorization");
        return HttpResponse.json({
          errorCode: 0,
          payload: [{ nome: "Roma", path: "i:infn:roma" }]
        });
      }
    )
  );
  const store = makeStore();
  try {
    const result = await store
      .dispatch(
        godivaApi.endpoints.getNodiAdvancedSearch.initiate({
          pathRegexp: "i:infn",
          value: "Struttura"
        })
      )
      .unwrap();
    expect(requestBody).toEqual({
      pathRegexp: "i:infn",
      listaDettagli: [
        { key: "structure:organization:unit", value: "Struttura" }
      ]
    });
    expect(authorization).toBe("Bearer test-token");
    expect(result).toEqual([{ nome: "Roma", path: "i:infn:roma" }]);
  } finally {
    store.dispatch(godivaApi.util.resetApiState());
  }
});

it("treats Godiva application errors as failures even with HTTP 200", async () => {
  server.use(
    http.post(
      `${customization.GODIVA_API_BASE_URL}/nodo/getNodiAdvancedSearch`,
      () =>
        HttpResponse.json({ errorCode: 7, errorMessage: "Failed", payload: [] })
    )
  );
  const store = makeStore();
  try {
    await expect(
      store
        .dispatch(
          godivaApi.endpoints.getNodiAdvancedSearch.initiate({
            pathRegexp: "i:infn",
            value: "Struttura"
          })
        )
        .unwrap()
    ).rejects.toMatchObject({ data: { errorCode: 7 } });
  } finally {
    store.dispatch(godivaApi.util.resetApiState());
  }
});

it("uses the current user's token after the session refreshes", async () => {
  const authorizations = [];
  server.use(
    http.post(
      `${customization.GODIVA_API_BASE_URL}/nodo/getNodiAdvancedSearch`,
      ({ request }) => {
        authorizations.push(request.headers.get("Authorization"));
        return HttpResponse.json({ errorCode: 0, payload: [] });
      }
    )
  );
  const store = makeStore("original-user-token");
  const filter = { pathRegexp: "i:infn", value: "Struttura" };
  try {
    await store
      .dispatch(godivaApi.endpoints.getNodiAdvancedSearch.initiate(filter))
      .unwrap();
    store.dispatch({ type: "test/session", payload: "refreshed-user-token" });
    await store
      .dispatch(
        godivaApi.endpoints.getNodiAdvancedSearch.initiate(filter, {
          forceRefetch: true
        })
      )
      .unwrap();
    expect(authorizations).toEqual([
      "Bearer original-user-token",
      "Bearer refreshed-user-token"
    ]);
  } finally {
    store.dispatch(godivaApi.util.resetApiState());
  }
});

it("does not send a request without a user access token", async () => {
  let requests = 0;
  server.use(
    http.post(
      `${customization.GODIVA_API_BASE_URL}/nodo/getNodiAdvancedSearch`,
      () => {
        requests += 1;
        return HttpResponse.json({ errorCode: 0, payload: [] });
      }
    )
  );
  const store = makeStore(null);
  try {
    await expect(
      store
        .dispatch(
          godivaApi.endpoints.getNodiAdvancedSearch.initiate({
            pathRegexp: "i:infn",
            value: "Struttura"
          })
        )
        .unwrap()
    ).rejects.toMatchObject({
      status: "CUSTOM_ERROR",
      error: "Sign in before accessing Godiva."
    });
    expect(requests).toBe(0);
  } finally {
    store.dispatch(godivaApi.util.resetApiState());
  }
});

it("preserves a Godiva 401 when the server rejects the user's token", async () => {
  server.use(
    http.post(
      `${customization.GODIVA_API_BASE_URL}/nodo/getNodiAdvancedSearch`,
      () => HttpResponse.json({ message: "Unauthorized" }, { status: 401 })
    )
  );
  const store = makeStore();
  try {
    await expect(
      store
        .dispatch(
          godivaApi.endpoints.getNodiAdvancedSearch.initiate({
            pathRegexp: "i:infn",
            value: "Struttura"
          })
        )
        .unwrap()
    ).rejects.toMatchObject({ status: 401 });
  } finally {
    store.dispatch(godivaApi.util.resetApiState());
  }
});

it("sends an empty detail list when searching CSN nodes", async () => {
  let requestBody;
  server.use(http.post(`${customization.GODIVA_API_BASE_URL}/nodo/getNodiAdvancedSearch`, async ({ request }) => {
    requestBody = await request.json();
    return HttpResponse.json({ errorCode: 0, payload: [] });
  }));
  const store = makeStore();
  try {
    await store.dispatch(godivaApi.endpoints.getNodiAdvancedSearch.initiate({
      pathRegexp: "^i:infn:lnf:csn.*",
      listaDettagli: []
    })).unwrap();
    expect(requestBody).toEqual({ pathRegexp: "^i:infn:lnf:csn.*", listaDettagli: [] });
  } finally {
    store.dispatch(godivaApi.util.resetApiState());
  }
});
