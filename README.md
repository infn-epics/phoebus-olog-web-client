# Olog Web Client

This project implements a web client for the Phoebus Olog logbook service. It provides read, write and search capabilities, but not the full feature set of the CS Studio (Java) logbook client, see https://github.com/ControlSystemStudio/phoebus

Technology stack:

- ReactJS (main framework)
- Redux Toolkit (app state, http clients)
- Remarkable for commonmark processing/rendering (https://github.com/jonschlinkert/remarkable)
- Jest for unit testing
- Cypress and docker-compose for end-to-end testing
- Storybook for previewing components in isolation (without a backend)

## Commonmark support

Markup as defined by the Commonmark specification is supported, see https://commonmark.org/.

Commonmark cheatsheet: https://commonmark.org/help/

### Commonmark extensions

The following extensions are supported:

- Image size, e.g. `![alt-text](http://foo.bar.com/image.jpg){width=640 height=480}`.
- Tables, see https://docs.github.com/en/free-pro-team@latest/github/writing-on-github/organizing-information-with-tables.

## Current state of affairs:

Available:

- Search and read log entries, no authentication required.
- Display log entry details, including image thumbnails, links to non-image attachments and properties.
- Login to Phoebus Olog backend.
- Create new log entry, including attachments. Input is validated.
- Search criteria: list of logbooks, list of tags, time span, title, description, level and author.
- Custom dialog for embedding images (from file system) into log entry body.
- Support for URLs to show single log entry, e.g. http://my.olog.server.com/logs/1234.
- Support for grouping log entries through a "reply" button.
- List view for search results.
- Properties editor.
- HTML preview of log entry, including embedded images.
- Editing log entries
- OAuth-authenticated logbook creation and collaborator management.
- INFN Identity search for assigning reader and writer permissions.

Backlog:

- Localization.

## Customization and Environment Variables

### Configuration File

The file `src/config/customization.js` contains customizable items, such as level/entry-type values, default search, and more. Please review its contents and adjust to your needs.

### Environment Variables

Environment variables can be set directly on the terminal, or they can be loaded via the `.env` file automatically when npm runs. Copy the `.env.example` file and rename to `.env`.

Note that, by default, `VITE_APP_*` variables are only embedded during build time they cannot be read from the environment during runtime. However, we have created a env.sh script which overrides our production env variables at run time.

| Environment variable                                | Description                                                                                                                                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VITE_APP_BASE_URL                                   | The [Phoebus Olog Backend](https://github.com/Olog/phoebus-olog) base URL (for example: `http://localhost:8080/Olog`). Default is the same host as the frontend; e.g. `http://localhost:3000` |
| VITE_APP_WEBSOCKET_BASE_URL                         | The Phoebus Olog Websocket base URL (for example: `ws://localhost:8080/Olog/web-socket`)                                                                                                      |
| default is `https://olog.readthedocs.io/en/latest/` |
| VITE_APP_SUPPORT_HREF                               | URL where support can be found for Olog. Shown on Help page only if provided.                                                                                                                 |
| VITE_APP_VERSION                                    | Version string for Olog; default is the version defined in `package.json`.                                                                                                                    |
| VITE_APP_IDENTITY_API_BASE_URL                      | INFN Identity API base URL. Defaults to `https://api.app.infn.it`.                                                                                                                            |
| VITE_APP_AUTH_UUID_CLAIM                            | JWT claim containing the INFN UUID. Defaults to `preferred_username`; it must match the backend `OAUTH2_CLAIMS_NAME`.                                                                          |

Authenticated users can open `/logbooks` (or use the **Logbooks** navigation button) to create a logbook. The creator becomes its administrator and can search INFN identities, then assign `READ`, `WRITE`, or both permissions.

## Development

### Tooling

In order to develop and test with reasonable effort you will need the proper toolchain:

- Node JS, install latest (>= 17.x) version.
- Docker; backend services are defined via compose files. IMPORTANT: Allocate at least 4 CPU cores and 8GB RAM, consider increasing if tests fail.
- A reasonably clever text editor. Visual Studio Code is a good alternative as it comes with some support for React development.
- Optional: a React JS add-on to your browser.
- pre-commit: A framework for managing and maintaining multi-language pre-commit hooks. (https://pre-commit.com/)

### Running / Building

Start the backend services via the docker:

```
docker compose up
```

Install and start the frontend:

```
npm ci
npm start
```

The application will be available on `http://localhost:3000`.

### Previewing Components (Storybook)

If you want to view components in isolation (without running the backend or starting the app above),
you can preview them via [Storybook](https://storybook.js.org/):

```
npm run storybook
```

Components can then be previewed at `http://localhost:6006/`

### Unit and Component Tests

This test script runs both React Testing Library (RTL) unit tests and [Cypress](https://www.cypress.io/) component tests:

```
./scripts/test.sh
```

> **Note:**
>
> You may see warnings or errors in the console related to being unable
> to reach the logbook service; these are part of negative tests that exercise
> the frontend when the service is unavailable, and can be ignored if passing.

### End-To-End Tests

End-to-end testing is run via [Cypress](https://www.cypress.io/), and is provided via a separate project in the `e2e/` folder that does not depend on the frontend code.

You can run tests interactively (this will open cypress, a browser, etc. and execute the tests live) or you can run them headlessly one-time via docker compose (videos of the tests are made available in the `cypress/videos` and `cypress/screenshots` folders, and is ignored by git)

Run end-to-end tests interactively (opens Cypress's test runner in a new window):

```
# (start the backend services in one console)
# (start the frontend in another console)
# In a new console:
cd e2e
npm ci
npm test
```

Run end-to-end tests headlessly (from the main project directory):

```
./scripts/e2e-test.sh
```

## Deployment

There are no special deployment considerations.

Please note the Dockerfile example here is simple and doesn't include all necessary build variables.

Otherwise, refer to the above section on customization and environment varialbes as required for your particular deployment environment / configuration management system.

Godiva node lookup uses the [Godiva OpenAPI specification](https://godiva.dsi.infn.it/api/openapi.json). Set `VITE_APP_GODIVA_API_BASE_URL` to override `https://godiva.dsi.infn.it/api`. Requests use the signed-in user’s bearer token; the service must allow the frontend origin (CORS).

The logbook creation form includes a Godiva source selector (structure, then experiment). Godiva creation saves `officialExperiment: true` and the selected experiment base path as `experimentLdapPath` (without trailing colons). The backend grants experiment affiliates automatic READ access; administrators can add individual WRITE grants. Manual creation sends `officialExperiment: false` and `experimentLdapPath: null`. The experiment lookup uses the selected structure path followed by `:csn.*` (for example `^i:infn:lnf:csn.*`), with an empty `listaDettagli`.

With the Godiva source, creation requires the exact membership `<experiment path>::resp:locale` in `isMemberOf`, returned by Identity's `/get/auth/{uuid}` endpoint using the signed-in user's UUID and bearer token. For example, the local responsible person for ATLAS at LNF must have `i:infn:lnf:csn1:atlas::resp:locale`. The form blocks creation while authorization is loading or unavailable. This responsibility check is enforced in the frontend. The PUT request to `/logbooks/{name}` includes `name`, `state`, `officialExperiment`, and `experimentLdapPath`. Existing logbooks created without the experiment fields need an explicit update through the backend API; the frontend does not migrate them automatically.

The Logbooks page lists all logbooks granted by the backend (READ, WRITE, or ADMIN),
including automatic experiment READ grants. Open is available to readers and writers;
collaborator management and deletion remain available only to logbook administrators.
Identity lookup defaults to `https://api.app.infn.it/identity`; overrides in
`VITE_APP_IDENTITY_API_BASE_URL` must include the Identity service path, as must
the backend's `INFN_IDENTITY_BASE_URL`.


Storage quotas apply separately to each logbook: the default is 1,000,000,000 bytes (1 GB)
per logbook. Usage includes compact UTF-8 JSON metadata in Elasticsearch for the logbook,
its entries, archived versions and collaborators. MongoDB binary attachments are excluded.
An entry associated with multiple logbooks counts towards each one's quota. The combined
usage of a creator's logbooks has no global limit.

`GET /Olog/storage/me` returns `quotaBytes` and any increase `request` inside each item
of `logbooks`. `POST /Olog/storage/requests` requires `logbook`, `requestedQuotaBytes`
and `reason`; only an administrator of that logbook can request an increase. Global
Olog administrators review requests using
`POST /Olog/storage/requests/{logbook}/{requestId}/review`. Approval changes only that
logbook's limit. Writes exceeding a logbook's limit return HTTP 507.

Per-logbook quota records use document IDs prefixed with `logbook:`. Existing per-user
quota records are retained but do not apply to logbooks; pending per-user requests must
be resubmitted for the relevant logbook. Startup adds the `logbook` keyword field to an
existing quota index. Deploy the backend and frontend together for this API change.

Quota usage is displayed in each row of **Your logbooks**, alongside the logbook
name, with used/total bytes, available space and the increase-request button.
The fill bar is green below 75% usage, amber from 75% to below 90%, and red
from 90% upwards. Usage above the limit fills the bar to 100%; available space
is shown as zero. Global administrator approvals are available in the dedicated Admin panel at
`/admin/storage`.

### Quota administration

Global Olog administrators see an **Admin** navigation button linking to
`/admin/storage`. The panel lists pending quota increases, ordered by request
time, with the logbook, requester, current/requested quota, reason and review
note. Administrators can filter, refresh, approve or reject requests.
Access comes from the backend's lightweight `GET /Olog/storage/permissions/me`
endpoint. Anonymous users are prompted to sign in, ordinary users cannot open
the panel, and the review APIs independently enforce global administrator
permissions. This permission lookup uses INFN Identity authorization and does not scan stored log documents.

Olog administrators are identified by the exact INFN entitlement
`i:infn:lnf:divisione_ricerca:servizio_infrastrutturale_calcolo_e_reti:reparto_sviluppo_applicazioni::n:resp`
in `isMemberOf` or `eduPersonEntitlement` returned by Identity's
`/get/auth/{uuid}`. The backend checks it using the authenticated user's
Bearer token and UUID. The Admin link and page follow the backend's
`administrator` result; local `ADMIN` roles alone do not enable them.

### Logbook export

In **Your logbooks**, administrators of each logbook can use **Export JSON** or **Export PDF**. Downloads include every current entry, including replies and inactive entries, in creation order. JSON preserves stored fields; PDF contains paginated text and metadata. Attachments are listed by metadata; binary files and historical archived versions are not included. The server checks logbook administrator permission on every export.
