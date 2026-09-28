import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import customization from "config/customization";

export const identityApi = createApi({
  reducerPath: "identityApi",
  baseQuery: fetchBaseQuery({
    baseUrl: customization.IDENTITY_API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.accessToken;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    }
  }),
  endpoints: (builder) => ({
    getIdentity: builder.query({
      query: (uuid) => `/get/${encodeURIComponent(uuid)}`,
      transformResponse: (response) => response?.payload ?? null
    }),
    searchIdentities: builder.query({
      query: ({ search, start = 0, length = 10 }) => ({
        url: "/search/identities/paginated",
        method: "POST",
        body: {
          draw: 1,
          start,
          length,
          search: { value: search, regex: false },
          order: [{ column: 0, dir: "asc" }],
          columns: [
            {
              data: "identity.cognome",
              name: "identity.cognome",
              searchable: true,
              orderable: true,
              search: { value: "", regex: false }
            }
          ]
        }
      }),
      transformResponse: (response) => response?.payload?.data ?? []
    })
  })
});
