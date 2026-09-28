/**
 * Copyright (C) 2021 European Spallation Source ERIC.
 * <p>
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 * <p>
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * <p>
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import customization from "config/customization";
import OlogAttachment from "components/log/EntryEditor/Description/OlogAttachment";

export function ologClientInfoHeader() {
  return {
    "X-Olog-Client-Info":
      "Olog Web " + customization.VERSION + " on " + window.navigator.userAgent
  };
}

const ologApi = createApi({
  reducerPath: "ologApi",
  baseQuery: fetchBaseQuery({
    baseUrl: customization.BACKEND_URL, // e.g. http://localhost:8080/Olog
    credentials: "include", // send credentials with requests
    headers: { ...ologClientInfoHeader() },
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.accessToken;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    }
  }),
  keepUnusedDataFor: 0, // Don't cache anything
  endpoints: (builder) => ({
    searchLogs: builder.query({
      query: ({
        query,
        title,
        desc,
        properties,
        start,
        end,
        level,
        logbooks,
        tags,
        owner,
        attachments,
        from,
        size,
        sort,
        getTemplate
      }) => {
        return {
          url: "/logs/search",
          params: {
            query,
            title,
            desc,
            properties,
            start,
            end,
            level,
            logbooks,
            tags,
            owner,
            attachments,
            from,
            size,
            sort,
            getTemplate
          }
        };
      }
    }),
    getTags: builder.query({
      query: () => ({
        url: "/tags"
      })
    }),
    getLogbooks: builder.query({
      query: () => ({
        url: "/logbooks"
      })
    }),
    getMyLogbookPermissions: builder.query({
      query: () => ({ url: "/logbooks/permissions/me" })
    }),
    createLogbook: builder.mutation({
      query: ({ name, state = "Active" }) => ({
        url: `/logbooks/${encodeURIComponent(name)}`,
        method: "PUT",
        body: { name, state }
      })
    }),
    deleteLogbook: builder.mutation({
      query: ({ name }) => ({
        url: `/logbooks/${encodeURIComponent(name)}`,
        method: "DELETE"
      })
    }),
    getLogbookMembers: builder.query({
      query: ({ name }) => ({
        url: `/logbooks/${encodeURIComponent(name)}/members`
      })
    }),
    addLogbookMember: builder.mutation({
      query: ({ name, infnUuid, permissions, visibleFrom = null, visibleTo = null }) => ({
        url: `/logbooks/${encodeURIComponent(name)}/members`,
        method: "POST",
        body: { infnUuid, permissions, visibleFrom, visibleTo }
      })
    }),
    updateLogbookMember: builder.mutation({
      query: ({ name, infnUuid, permissions, visibleFrom = null, visibleTo = null }) => ({
        url: `/logbooks/${encodeURIComponent(name)}/members/${encodeURIComponent(infnUuid)}`,
        method: "PUT",
        body: { infnUuid, permissions, visibleFrom, visibleTo }
      })
    }),
    deleteLogbookMember: builder.mutation({
      query: ({ name, infnUuid }) => ({
        url: `/logbooks/${encodeURIComponent(name)}/members/${encodeURIComponent(infnUuid)}`,
        method: "DELETE"
      })
    }),
    getArchivedLogbooks: builder.query({
      query: ({ id }) => ({
        url: `logs/archived/${id}`
      })
    }),
    getProperties: builder.query({
      query: () => ({
        url: "/properties"
      }),
      transformResponse: (res) => {
        return res?.filter((property) => property.name !== "Log Entry Group");
      }
    }),
    getLog: builder.query({
      query: ({ id }) => ({
        url: `/logs/${id}`
      })
    }),
    getLogGroup: builder.query({
      query: ({ groupId }) => ({
        url: `/logs?properties=Log Entry Group.id.${groupId}`
      })
    }),
    createLog: builder.mutation({
      query: ({ log, replyTo, token }) => {
        const bodyFormData = new FormData();

        // Append all files. Each is added with name "files", and that is actually OK
        if (log.attachments && log.attachments.length > 0) {
          for (let i = 0; i < log.attachments.length; i++) {
            bodyFormData.append(
              "files",
              log.attachments[i].file,
              log.attachments[i].file.name
            );
          }
        }
        // Log entry must be added as JSON blob, otherwise the content type cannot be set.
        bodyFormData.append(
          "logEntry",
          new Blob([JSON.stringify(log)], { type: "application/json" })
        );
        if (import.meta.env.VITE_APP_OAUTH2_ENABLED) {
          return {
            url: `/logs/multipart?markup=commonmark${replyTo ? `&inReplyTo=${replyTo}` : ""}`,
            method: "PUT",
            body: bodyFormData,
            formData: true,
            headers: {
              Authorization: `Bearer ${token}`
            }
          };
        } else {
          return {
            url: `/logs/multipart?markup=commonmark${replyTo ? `&inReplyTo=${replyTo}` : ""}`,
            method: "PUT",
            body: bodyFormData,
            formData: true
          };
        }
      }
    }),
    editLog: builder.mutation({
      query: ({ log, token }) => {
        const bodyFormData = new FormData();

        // Append all files. Each is added with name "files", and that is actually OK
        if (log.attachments && log.attachments.length > 0) {
          for (let i = 0; i < log.attachments.length; i++) {
            if (log.attachments[i] instanceof OlogAttachment) {
              bodyFormData.append(
                "files",
                log.attachments[i].file,
                log.attachments[i].filename
              );
            }
          }
        }
        // Log entry must be added as JSON blob, otherwise the content type cannot be set.
        bodyFormData.append(
          "logEntry",
          new Blob([JSON.stringify(log)], { type: "application/json" })
        );
        return {
          url: `/logs/${log.id}?markup=commonmark`,
          method: "POST",
          body: bodyFormData,
          formData: true,
          headers: {
            Authorization: `Bearer ${token}`
          }
        };
      }
    }),
    getUser: builder.query({
      query: () => ({
        url: "/user"
      })
    }),
    login: builder.mutation({
      query: ({ username, password }) => {
        return {
          url: "/login",
          method: "POST",
          body: { username: username, password: password }
        };
      }
    }),
    logout: builder.mutation({
      query: () => ({
        url: "/logout",
        method: "GET" // yes this is a GET...
      })
    }),
    getServerInfo: builder.query({
      query: () => ({
        url: "/"
      })
    }),
    getTemplates: builder.query({
      query: () => ({
        url: "/templates",
        method: "GET"
      })
    }),
    getLevels: builder.query({
      query: () => ({
        url: "/levels"
      })
    })
  })
});

export const TagTypes = {
  GetLogs: "GetLogs",
  Logbooks: "Logbooks",
  LogbookPermissions: "LogbookPermissions",
  LogbookMembers: "LogbookMembers"
};

const enhancedApiWithTags = ologApi.enhanceEndpoints({
  addTagTypes: Object.values(TagTypes),
  endpoints: {
    searchLogs: {
      providesTags: [TagTypes.GetLogs]
    },
    getLogbooks: {
      providesTags: [TagTypes.Logbooks]
    },
    getMyLogbookPermissions: {
      providesTags: [TagTypes.LogbookPermissions]
    },
    createLogbook: {
      invalidatesTags: [TagTypes.Logbooks, TagTypes.LogbookPermissions]
    },
    deleteLogbook: {
      invalidatesTags: [TagTypes.Logbooks, TagTypes.LogbookPermissions]
    },
    getLogbookMembers: {
      providesTags: [TagTypes.LogbookMembers]
    },
    addLogbookMember: {
      invalidatesTags: [TagTypes.LogbookMembers]
    },
    updateLogbookMember: {
      invalidatesTags: [TagTypes.LogbookMembers]
    },
    deleteLogbookMember: {
      invalidatesTags: [TagTypes.LogbookMembers]
    },
    getLogGroup: {
      providesTags: [TagTypes.GetLogs]
    },
    getLog: {
      providesTags: (result, error, { noInvalidate }) =>
        noInvalidate ? [] : [TagTypes.GetLogs]
    }
  }
});

export { enhancedApiWithTags as ologApi };
