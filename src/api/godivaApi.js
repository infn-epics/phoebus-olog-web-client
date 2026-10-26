import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import customization from "config/customization";

// Contract: https://godiva.dsi.infn.it/api/openapi.json
const authenticatedBaseQuery = fetchBaseQuery({
  baseUrl: customization.GODIVA_API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  }
});

export const godivaApi = createApi({
  reducerPath: "godivaApi",
  baseQuery: (args, api, extraOptions) => {
    if (!api.getState().auth.accessToken) {
      return {
        error: {
          status: "CUSTOM_ERROR",
          error: "Sign in before accessing Godiva."
        }
      };
    }
    return authenticatedBaseQuery(args, api, extraOptions);
  },
  endpoints: (builder) => ({
    getNodiAdvancedSearch: builder.query({
      query: ({ pathRegexp, value, listaDettagli = value ? [{ key: "structure:organization:unit", value }] : [] }) => ({
        url: "/nodo/getNodiAdvancedSearch",
        method: "POST",
        body: {
          pathRegexp,
          listaDettagli
        },
        validateStatus: (response, body) =>
          response.status >= 200 &&
          response.status < 300 &&
          !body?.errorCode &&
          Array.isArray(body?.payload)
      }),
      transformResponse: (response) => response.payload
    })
  })
});
