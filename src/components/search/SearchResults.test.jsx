import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { SearchResults } from "./SearchResults";
import { server } from "mocks/server";
import { cleanup, render, screen, waitFor } from "test-utils/rtl-utils";

const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: true }
}));
vi.mock("src/auth/authContext", () => ({ useAuthData: () => mocks.auth }));
// heic2any needs a Web Worker as soon as it is imported, which jsdom lacks
vi.mock("heic2any", () => ({ default: vi.fn() }));

const makeLog = (id) => ({
  id,
  title: `Entry ${id}`,
  owner: "tester",
  source: `Body ${id}`,
  description: `Body ${id}`,
  level: "Normal",
  state: "Active",
  createdDate: 1656599929021 + id,
  logbooks: [{ name: "REDD", state: "Active" }],
  tags: [],
  properties: [],
  attachments: []
});

/**
 * Serves `total` entries, honouring the requested size, and records each size asked for.
 */
const serveLogs = (total) => {
  const sizes = [];
  server.use(
    http.get("*/logs/search", ({ request }) => {
      const size = Number(new URL(request.url).searchParams.get("size"));
      sizes.push(size);
      const logs = Array.from({ length: Math.min(size, total) }, (_, i) =>
        makeLog(i + 1)
      );
      return HttpResponse.json({ hitCount: total, logs });
    })
  );
  return sizes;
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

const renderResults = () =>
  render(
    <MemoryRouter initialEntries={["/?logbooks=REDD"]}>
      <SearchResults />
    </MemoryRouter>
  );

describe("SearchResults infinite scroll", () => {
  beforeEach(() => {
    // Node's Request rejects jsdom's AbortSignal and relative URLs
    const NodeRequest = globalThis.Request;
    vi.stubGlobal(
      "Request",
      class extends NodeRequest {
        constructor(input, init = {}) {
          super(
            typeof input === "string"
              ? new URL(input, "http://localhost").href
              : input,
            { ...init, signal: undefined }
          );
        }
      }
    );
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    // Like a browser: a new observer reports its target as soon as it observes it.
    // The target is always in view, as with a list shorter than the viewport.
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback) {
          this.callback = callback;
        }
        observe(target) {
          this.callback([{ isIntersecting: true, target }]);
        }
        unobserve() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not request more entries when every match is already loaded", async () => {
    const sizes = serveLogs(3);
    renderResults();

    await screen.findByText("Entry 1");
    await settle();

    expect(sizes).toEqual([50]);
  });

  it("loads further pages only until every match is loaded", async () => {
    const sizes = serveLogs(120);
    renderResults();

    await waitFor(() => expect(sizes).toContain(150));
    await settle();

    expect(sizes).toEqual([50, 100, 150]);
  });

  it("keeps the entries on screen while the next page loads", async () => {
    serveLogs(120);
    const { container } = renderResults();
    const seenEmpty = [];
    const observer = new MutationObserver(() => {
      if (container.textContent.includes("No records found")) {
        seenEmpty.push(true);
      }
    });

    await screen.findByText("Entry 1");
    observer.observe(container, { childList: true, subtree: true });
    await settle();
    observer.disconnect();

    expect(seenEmpty).toEqual([]);
    expect(screen.getByText("Entry 120")).toBeTruthy();
  });

  it("shows no records only once a search has finished with no matches", async () => {
    serveLogs(0);
    renderResults();

    expect(screen.queryByText("No records found")).toBeNull();
    await screen.findByText("No records found");
  });
});
