import { afterEach, expect, it } from "vitest";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useEnhancedSearchParams } from "./useEnhancedSearchParams";
import SimpleSearch from "components/search/SimpleSearch";

afterEach(cleanup);

const callback = "session_state=test-session&code=test-code&state=test-state&iss=https%3A%2F%2Flogin.example.org";
const wrapper = ({ children }) => <MemoryRouter initialEntries={[`/?${callback}`]}>{children}</MemoryRouter>;

it("keeps login callback parameters out of the search input", () => {
  render(<SimpleSearch />, { wrapper });
  expect(screen.getByPlaceholderText("Search").value).toBe("");
});

it("does not activate search or remove the callback URL before login consumes it", () => {
  const { result } = renderHook(() => ({ search: useEnhancedSearchParams(), location: useLocation() }), { wrapper });
  expect(result.current.search.searchParams).toEqual({});
  expect(result.current.search.isSearchActive).toBe(false);
  expect(result.current.location.search).toContain("code=test-code");
});

it("preserves real search filters alongside login parameters", () => {
  const mixedWrapper = ({ children }) => <MemoryRouter initialEntries={[`/?${callback}&text=beam&logbooks=atlas,padme`]}>{children}</MemoryRouter>;
  const { result } = renderHook(useEnhancedSearchParams, { wrapper: mixedWrapper });
  expect(result.current.searchParams).toEqual({ text: "beam", logbooks: ["atlas", "padme"] });
  expect(result.current.isSearchActive).toBe(true);
  expect(result.current.toSearchParams(`text=beam&${callback}`)).toEqual({ text: "beam" });
  expect(result.current.toQueryString({ text: "beam", code: "test-code", session_state: "test-session" })).toBe("text=beam");
});
