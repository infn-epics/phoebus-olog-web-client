import { afterEach, expect, it, vi } from "vitest";
import { loadAttachmentUrl } from "./useAttachmentUrl";
vi.mock("src/config/customization", () => ({ default: { APP_BASE_URL: "https://olog.example/Olog" } }));
vi.mock("src/auth/authContext", () => ({ useAuthData: () => ({}) }));
afterEach(() => vi.unstubAllGlobals());

it("does not send tokens to external images", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  expect(await loadAttachmentUrl("https://external.example/image.png", "secret")).toBe("https://external.example/image.png");
  expect(fetch).not.toHaveBeenCalled();
});

it("authenticates Olog attachments and rejects denied downloads", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });
  vi.stubGlobal("fetch", fetch);
  await expect(loadAttachmentUrl("https://olog.example/Olog/attachment/file", "test-token")).rejects.toThrow("permission");
  expect(fetch).toHaveBeenCalledWith("https://olog.example/Olog/attachment/file", expect.objectContaining({ headers: { Authorization: "Bearer test-token" }, redirect: "error" }));
});
