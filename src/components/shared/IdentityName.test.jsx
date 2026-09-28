import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import IdentityName from "./IdentityName";

const query = vi.hoisted(() => vi.fn());
vi.mock("api/identityApi", () => ({ identityApi: { endpoints: { getIdentity: { useQuery: query } } } }));
vi.mock("src/auth/authContext", () => ({ useAuthData: () => ({ isAuthenticated: true }) }));
const uuid = "7f2b792b-0c88-4041-88d7-d55886d5976e";
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it("displays the full name returned by Identity", () => {
  query.mockReturnValue({ currentData: { nome: "Mario", cognome: "Rossi" } });
  render(<IdentityName identifier={uuid} />);
  expect(screen.getByText("Mario Rossi")).toBeTruthy();
  expect(query).toHaveBeenCalledWith(uuid, { skip: false });
});

it("keeps legacy author names without requesting Identity", () => {
  query.mockReturnValue({});
  render(<IdentityName identifier="olog-user" />);
  expect(screen.getByText("olog-user")).toBeTruthy();
  expect(query).toHaveBeenCalledWith("olog-user", { skip: true });
});

it("falls back to the identifier if Identity is unavailable", () => {
  query.mockReturnValue({ isError: true });
  render(<IdentityName identifier={uuid} />);
  expect(screen.getByText(uuid)).toBeTruthy();
});
