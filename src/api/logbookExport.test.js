// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { fetchLogbookExport } from "./logbookExport";
vi.mock("config/customization", () => ({ default: { APP_BASE_URL: "https://olog.test/Olog/" } }));
afterEach(() => vi.unstubAllGlobals());
it.each(["json", "pdf"])("requests a complete %s export with credentials", async (format) => {
  const type = format === "pdf" ? "application/pdf" : "application/json";
  const fetch = vi.fn().mockResolvedValue(new Response("contents", { headers: { "Content-Type": type } }));
  vi.stubGlobal("fetch", fetch);
  const signal = new AbortController().signal;
  const result = await fetchLogbookExport({ name: "Test è +", format, token: "token", signal });
  expect(fetch).toHaveBeenCalledWith("https://olog.test/Olog/logbooks/Test%20%C3%A8%20%2B/export?format=" + format,
    expect.objectContaining({ credentials: "include", cache: "no-store", signal, headers: { Accept: type, Authorization: "Bearer token" } }));
  expect(result.filename).toBe(`olog-Test_è_.${format}`);
  expect(await result.blob.text()).toBe("contents");
});
it.each([[401, /Sign in/], [403, /administrator/], [503, /retry/]])("handles HTTP %i", async (status, message) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status })));
  await expect(fetchLogbookExport({ name: "A", format: "json" })).rejects.toThrow(message);
});
it("rejects a login page returned as successful HTML", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("login", { headers: { "Content-Type": "text/html" } })));
  await expect(fetchLogbookExport({ name: "A", format: "pdf" })).rejects.toThrow(/valid logbook export/);
});
